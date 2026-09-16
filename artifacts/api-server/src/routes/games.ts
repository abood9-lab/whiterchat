import { Router, type IRouter } from "express";
import { GameSession, Conversation, Message, User } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

export function serializeGame(g: any, currentUserId?: string) {
  // For RPS, if round is in progress, do not reveal opponent's unrevealed move to prevent cheating
  let sanitizedState = { ...g.gameState };
  if (g.gameType === "rps" && g.status === "in_progress" && sanitizedState.currentRoundMoves) {
    const safeMoves: Record<string, any> = {};
    for (const [uid, move] of Object.entries(sanitizedState.currentRoundMoves)) {
      if (uid === currentUserId) {
        safeMoves[uid] = move;
      } else {
        // Obfuscate opponent's move until both have played
        safeMoves[uid] = "submitted";
      }
    }
    sanitizedState = {
      ...sanitizedState,
      currentRoundMoves: safeMoves,
    };
  }

  return {
    id: g._id.toString(),
    conversationId: g.conversationId.toString(),
    gameType: g.gameType,
    status: g.status,
    invitedBy: g.invitedBy.toString(),
    opponentId: g.opponentId.toString(),
    players: (g.players ?? []).map((p: any) => p.toString()),
    currentTurn: g.currentTurn?.toString() ?? null,
    winnerId: g.winnerId?.toString() ?? null,
    isDraw: g.isDraw ?? false,
    gameState: sanitizedState,
    createdAt: g.createdAt?.toISOString(),
    updatedAt: g.updatedAt?.toISOString(),
  };
}

// ── Default Quiz Questions ────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    q: "What is the capital of Australia?",
    options: ["Sydney", "Canberra", "Melbourne", "Perth"],
    answerIndex: 1,
  },
  {
    q: "How many planets are in our solar system?",
    options: ["7", "8", "9", "10"],
    answerIndex: 1,
  },
  {
    q: "What is the longest river in the world?",
    options: ["Amazon River", "Nile River", "Mississippi River", "Yangtze River"],
    answerIndex: 1,
  },
  {
    q: "What is the most abundant chemical element in the universe?",
    options: ["Oxygen", "Hydrogen", "Carbon", "Nitrogen"],
    answerIndex: 1,
  },
  {
    q: "In which year did WhiterChat first launch?",
    options: ["2008", "2010", "2012", "2015"],
    answerIndex: 1,
  },
];

// ── Helpers to initialize game state ──────────────────────────────────────────
function initGameState(gameType: string, p1: string, p2: string) {
  switch (gameType) {
    case "tictactoe":
      return {
        board: Array(9).fill(null),
        symbols: { [p1]: "X", [p2]: "O" },
      };
    case "rps":
      return {
        scores: { [p1]: 0, [p2]: 0 },
        rounds: [],
        currentRoundMoves: {},
        targetScore: 3,
      };
    case "guess_number":
      return {
        targetNumber: Math.floor(Math.random() * 100) + 1,
        attempts: [],
        maxAttempts: 10,
      };
    case "quiz":
      return {
        questions: QUIZ_QUESTIONS,
        currentIndex: 0,
        scores: { [p1]: 0, [p2]: 0 },
        answers: {},
      };
    case "connect4":
      return {
        board: Array(6).fill(null).map(() => Array(7).fill(null)),
        symbols: { [p1]: "red", [p2]: "yellow" },
      };
    default:
      return {};
  }
}

// ── Connect4 Win Check ────────────────────────────────────────────────────────
function checkConnect4Win(board: (string | null)[][], row: number, col: number, color: string): boolean {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1],  // diagonal /
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    // Positive direction
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === color) {
      count++;
      r += dr;
      c += dc;
    }
    // Negative direction
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === color) {
      count++;
      r -= dr;
      c -= dc;
    }
    if (count >= 4) return true;
  }
  return false;
}

// ── TicTacToe Win Check ───────────────────────────────────────────────────────
function checkTicTacToeWin(board: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diags
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// ── POST /api/conversations/:conversationId/games/invite ──────────────────────
router.post("/conversations/:conversationId/games/invite", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId;
  const { gameType } = req.body as { gameType?: string };

  const validGames = ["tictactoe", "rps", "guess_number", "quiz", "connect4"];
  if (!gameType || !validGames.includes(gameType)) {
    res.status(400).json({ error: "Invalid gameType. Must be one of: " + validGames.join(", ") });
    return;
  }

  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Participant check (1-on-1 private chat support)
  const isP1 = conv.user1Id?.toString() === req.userId;
  const isP2 = conv.user2Id?.toString() === req.userId;
  if (!isP1 && !isP2) {
    res.status(403).json({ error: "Only 1-on-1 private chat participants can invite to games" });
    return;
  }

  const opponentId = isP1 ? conv.user2Id! : conv.user1Id!;
  const myId = new mongoose.Types.ObjectId(req.userId!);

  const initialGameState = initGameState(gameType, myId.toString(), opponentId.toString());

  const game = await GameSession.create({
    conversationId: conv._id,
    gameType: gameType as any,
    status: "invited",
    invitedBy: myId,
    opponentId,
    players: [myId, opponentId],
    currentTurn: myId,
    gameState: initialGameState,
  });

  if (!game) {
    res.status(500).json({ error: "Failed to create game session" });
    return;
  }

  const gameNames: Record<string, string> = {
    tictactoe: "Tic Tac Toe",
    rps: "Rock Paper Scissors",
    guess_number: "Guess the Number",
    quiz: "Trivia Quiz",
    connect4: "Connect 4",
  };

  // Create native message in chat stream
  const msg = await Message.create({
    conversationId: conv._id,
    senderId: myId,
    text: `🎮 Game invite: ${gameNames[gameType] || gameType}`,
    gameId: game._id,
  });

  await Conversation.findByIdAndUpdate(conv._id, { lastActivityAt: new Date() });

  const gameData = serializeGame(game, req.userId);
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conversationId}`).emit("game_updated", gameData);
    io.to(`conversation:${conversationId}`).emit("new_message", {
      id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      text: msg.text,
      mediaUrl: null,
      mediaType: null,
      fileName: null,
      isRead: false,
      isEdited: false,
      isDeleted: false,
      reactions: {},
      isPinned: false,
      starredBy: [],
      clientId: null,
      replyToId: null,
      replyTo: null,
      isSnap: false,
      gameId: game._id.toString(),
      game: gameData,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    });
  }

  res.status(201).json(gameData);
});

// ── GET /api/games/:gameId ────────────────────────────────────────────────────
router.get("/games/:gameId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const game = await GameSession.findById(req.params.gameId).catch(() => null);
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const isPlayer = (game.players ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (!isPlayer) { res.status(403).json({ error: "Not a participant in this game" }); return; }

  res.json(serializeGame(game, req.userId));
});

// ── POST /api/games/:gameId/respond (Accept or Decline) ───────────────────────
router.post("/games/:gameId/respond", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { action } = req.body as { action?: "accept" | "decline" };
  if (action !== "accept" && action !== "decline") {
    res.status(400).json({ error: "action must be 'accept' or 'decline'" });
    return;
  }

  const game = await GameSession.findById(req.params.gameId).catch(() => null);
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  if (game.status !== "invited") {
    res.status(400).json({ error: "Game invitation is no longer pending" });
    return;
  }

  // Only the opponent can accept or decline
  if (game.opponentId.toString() !== req.userId) {
    res.status(403).json({ error: "Only the invited opponent can respond to this invite" });
    return;
  }

  if (action === "accept") {
    game.status = "in_progress";
  } else {
    game.status = "declined";
  }

  await game.save();

  const gameData = serializeGame(game, req.userId);
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${game.conversationId}`).emit("game_updated", gameData);
  }

  res.json(gameData);
});

// ── POST /api/games/:gameId/move ──────────────────────────────────────────────
router.post("/games/:gameId/move", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const game = await GameSession.findById(req.params.gameId).catch(() => null);
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  if (game.status !== "in_progress") {
    res.status(400).json({ error: "Game is not in progress" });
    return;
  }

  const isPlayer = (game.players ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (!isPlayer) {
    res.status(403).json({ error: "Not a player in this game" });
    return;
  }

  const myId = req.userId!;
  const opponentId = game.players.find(id => id.toString() !== myId)?.toString()!;
  const state = { ...game.gameState };

  // 1. TIC TAC TOE
  if (game.gameType === "tictactoe") {
    if (game.currentTurn?.toString() !== myId) {
      res.status(400).json({ error: "Not your turn" });
      return;
    }
    const { cellIndex } = req.body as { cellIndex: number };
    if (typeof cellIndex !== "number" || cellIndex < 0 || cellIndex > 8) {
      res.status(400).json({ error: "Invalid cellIndex (0-8)" });
      return;
    }
    if (state.board[cellIndex] !== null) {
      res.status(400).json({ error: "Cell is already occupied" });
      return;
    }

    const symbol = state.symbols[myId] || "X";
    state.board[cellIndex] = symbol;

    const winnerSymbol = checkTicTacToeWin(state.board);
    if (winnerSymbol) {
      game.status = "completed";
      game.winnerId = new mongoose.Types.ObjectId(myId);
      game.isDraw = false;
    } else if (state.board.every((c: any) => c !== null)) {
      game.status = "completed";
      game.winnerId = null;
      game.isDraw = true;
    } else {
      game.currentTurn = new mongoose.Types.ObjectId(opponentId);
    }
  }

  // 2. ROCK PAPER SCISSORS
  else if (game.gameType === "rps") {
    const { move } = req.body as { move: "rock" | "paper" | "scissors" };
    const validMoves = ["rock", "paper", "scissors"];
    if (!move || !validMoves.includes(move)) {
      res.status(400).json({ error: "Invalid move. Must be rock, paper, or scissors" });
      return;
    }

    state.currentRoundMoves = state.currentRoundMoves || {};
    if (state.currentRoundMoves[myId]) {
      res.status(400).json({ error: "You have already made your move for this round" });
      return;
    }

    state.currentRoundMoves[myId] = move;

    // Check if both players have made their move
    if (state.currentRoundMoves[opponentId]) {
      const p1 = myId;
      const p2 = opponentId;
      const m1 = state.currentRoundMoves[p1];
      const m2 = state.currentRoundMoves[p2];

      let roundWinner: string | "draw" = "draw";
      if (m1 === m2) {
        roundWinner = "draw";
      } else if (
        (m1 === "rock" && m2 === "scissors") ||
        (m1 === "scissors" && m2 === "paper") ||
        (m1 === "paper" && m2 === "rock")
      ) {
        roundWinner = p1;
        state.scores[p1] = (state.scores[p1] || 0) + 1;
      } else {
        roundWinner = p2;
        state.scores[p2] = (state.scores[p2] || 0) + 1;
      }

      state.rounds = state.rounds || [];
      state.rounds.push({
        moves: { [p1]: m1, [p2]: m2 },
        winner: roundWinner,
      });

      state.currentRoundMoves = {}; // Reset for next round

      // Check win target
      const targetScore = state.targetScore || 3;
      if (state.scores[p1] >= targetScore) {
        game.status = "completed";
        game.winnerId = new mongoose.Types.ObjectId(p1);
      } else if (state.scores[p2] >= targetScore) {
        game.status = "completed";
        game.winnerId = new mongoose.Types.ObjectId(p2);
      }
    }
  }

  // 3. GUESS THE NUMBER
  else if (game.gameType === "guess_number") {
    if (game.currentTurn?.toString() !== myId) {
      res.status(400).json({ error: "Not your turn" });
      return;
    }
    const { guess } = req.body as { guess: number };
    if (typeof guess !== "number" || guess < 1 || guess > 100) {
      res.status(400).json({ error: "Guess must be an integer between 1 and 100" });
      return;
    }

    const target = state.targetNumber;
    let hint: "higher" | "lower" | "correct" = "correct";
    if (guess < target) hint = "higher";
    else if (guess > target) hint = "lower";

    state.attempts = state.attempts || [];
    state.attempts.push({
      userId: myId,
      guess,
      hint,
      createdAt: new Date().toISOString(),
    });

    if (hint === "correct") {
      game.status = "completed";
      game.winnerId = new mongoose.Types.ObjectId(myId);
    } else if (state.attempts.length >= (state.maxAttempts || 10)) {
      game.status = "completed";
      game.winnerId = null;
      game.isDraw = true;
    } else {
      game.currentTurn = new mongoose.Types.ObjectId(opponentId);
    }
  }

  // 4. QUIZ
  else if (game.gameType === "quiz") {
    const { optionIndex } = req.body as { optionIndex: number };
    if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex > 3) {
      res.status(400).json({ error: "Invalid optionIndex (0-3)" });
      return;
    }

    const currentIndex = state.currentIndex || 0;
    const questions = state.questions || QUIZ_QUESTIONS;
    const currentQ = questions[currentIndex];
    if (!currentQ) {
      res.status(400).json({ error: "Quiz finished" });
      return;
    }

    state.answers = state.answers || {};
    state.answers[currentIndex] = state.answers[currentIndex] || {};

    if (state.answers[currentIndex][myId] !== undefined) {
      res.status(400).json({ error: "You have already answered this question" });
      return;
    }

    state.answers[currentIndex][myId] = optionIndex;

    // Check if both answered this question
    if (state.answers[currentIndex][opponentId] !== undefined) {
      // Award scores
      const p1Answer = state.answers[currentIndex][myId];
      const p2Answer = state.answers[currentIndex][opponentId];

      if (p1Answer === currentQ.answerIndex) {
        state.scores[myId] = (state.scores[myId] || 0) + 1;
      }
      if (p2Answer === currentQ.answerIndex) {
        state.scores[opponentId] = (state.scores[opponentId] || 0) + 1;
      }

      state.currentIndex = currentIndex + 1;

      // If finished all questions
      if (state.currentIndex >= questions.length) {
        game.status = "completed";
        const myScore = state.scores[myId] || 0;
        const opScore = state.scores[opponentId] || 0;
        if (myScore > opScore) {
          game.winnerId = new mongoose.Types.ObjectId(myId);
        } else if (opScore > myScore) {
          game.winnerId = new mongoose.Types.ObjectId(opponentId);
        } else {
          game.winnerId = null;
          game.isDraw = true;
        }
      }
    }
  }

  // 5. CONNECT FOUR
  else if (game.gameType === "connect4") {
    if (game.currentTurn?.toString() !== myId) {
      res.status(400).json({ error: "Not your turn" });
      return;
    }
    const { column } = req.body as { column: number };
    if (typeof column !== "number" || column < 0 || column > 6) {
      res.status(400).json({ error: "Column must be between 0 and 6" });
      return;
    }

    // Find lowest available row in column
    let targetRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (state.board[r][column] === null) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) {
      res.status(400).json({ error: "Column is full, choose another column" });
      return;
    }

    const color = state.symbols[myId] || "red";
    state.board[targetRow][column] = color;

    const hasWon = checkConnect4Win(state.board, targetRow, column, color);
    if (hasWon) {
      game.status = "completed";
      game.winnerId = new mongoose.Types.ObjectId(myId);
    } else {
      // Check draw (board full)
      const isFull = state.board[0].every((cell: any) => cell !== null);
      if (isFull) {
        game.status = "completed";
        game.winnerId = null;
        game.isDraw = true;
      } else {
        game.currentTurn = new mongoose.Types.ObjectId(opponentId);
      }
    }
  }

  game.gameState = state;
  game.markModified("gameState");
  await game.save();

  const gameData = serializeGame(game, myId);
  const io = getIo(req);
  if (io) {
    // Send customized game data to each player room (vital for RPS hidden moves)
    io.to(`user:${myId}`).emit("game_updated", serializeGame(game, myId));
    io.to(`user:${opponentId}`).emit("game_updated", serializeGame(game, opponentId));
    io.to(`conversation:${game.conversationId}`).emit("game_updated", gameData);
  }

  res.json(gameData);
});

// ── POST /api/games/:gameId/rematch ───────────────────────────────────────────
router.post("/games/:gameId/rematch", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const oldGame = await GameSession.findById(req.params.gameId).catch(() => null);
  if (!oldGame) { res.status(404).json({ error: "Game not found" }); return; }

  const myId = req.userId!;
  const opponentId = oldGame.players.find(id => id.toString() !== myId)?.toString()!;

  const initialGameState = initGameState(oldGame.gameType, myId, opponentId);

  const newGame = await GameSession.create({
    conversationId: oldGame.conversationId,
    gameType: oldGame.gameType,
    status: "in_progress", // Rematch starts immediately!
    invitedBy: new mongoose.Types.ObjectId(myId),
    opponentId: new mongoose.Types.ObjectId(opponentId),
    players: [new mongoose.Types.ObjectId(myId), new mongoose.Types.ObjectId(opponentId)],
    currentTurn: new mongoose.Types.ObjectId(myId),
    gameState: initialGameState,
  });

  const gameNames: Record<string, string> = {
    tictactoe: "Tic Tac Toe",
    rps: "Rock Paper Scissors",
    guess_number: "Guess the Number",
    quiz: "Trivia Quiz",
    connect4: "Connect 4",
  };

  const msg = await Message.create({
    conversationId: oldGame.conversationId,
    senderId: myId,
    text: `🔄 Rematch: ${gameNames[oldGame.gameType] || oldGame.gameType}!`,
    gameId: newGame._id,
  });

  await Conversation.findByIdAndUpdate(oldGame.conversationId, { lastActivityAt: new Date() });

  const gameData = serializeGame(newGame, myId);
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${oldGame.conversationId}`).emit("game_updated", gameData);
    io.to(`conversation:${oldGame.conversationId}`).emit("new_message", {
      id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      text: msg.text,
      mediaUrl: null,
      mediaType: null,
      fileName: null,
      isRead: false,
      isEdited: false,
      isDeleted: false,
      reactions: {},
      isPinned: false,
      starredBy: [],
      clientId: null,
      replyToId: null,
      replyTo: null,
      isSnap: false,
      gameId: newGame._id.toString(),
      game: gameData,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    });
  }

  res.status(201).json(gameData);
});

export default router;
