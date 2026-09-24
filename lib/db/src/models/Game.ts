import mongoose, { Schema, type Document } from "mongoose";

export type GameType = "tictactoe" | "rps" | "guess_number" | "quiz" | "connect4";
export type GameStatus = "invited" | "in_progress" | "completed" | "declined" | "cancelled";

export interface IGameSession extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  gameType: GameType;
  status: GameStatus;
  invitedBy: mongoose.Types.ObjectId;
  opponentId: mongoose.Types.ObjectId;
  players: mongoose.Types.ObjectId[];
  currentTurn?: mongoose.Types.ObjectId | null;
  winnerId?: mongoose.Types.ObjectId | null;
  isDraw?: boolean;
  gameState: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    gameType: {
      type: String,
      enum: ["tictactoe", "rps", "guess_number", "quiz", "connect4"],
      required: true,
    },
    status: {
      type: String,
      enum: ["invited", "in_progress", "completed", "declined", "cancelled"],
      default: "invited",
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    players: [{ type: Schema.Types.ObjectId, ref: "User" }],
    currentTurn: { type: Schema.Types.ObjectId, ref: "User", default: null },
    winnerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDraw: { type: Boolean, default: false },
    gameState: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const GameSession: mongoose.Model<IGameSession> = (mongoose.models.GameSession as any) ?? mongoose.model<IGameSession>("GameSession", GameSessionSchema);
