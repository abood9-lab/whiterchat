import { Post, User, type IPost, type IUser } from "@workspace/db";
import mongoose from "mongoose";

export interface ReelScoreBreakdown {
  completionRateScore: number;
  engagementVelocity: number;
  audioTopicAffinity: number;
  creatorAffinity: number;
  recencyScore: number;
  diversityPenalty: number;
  totalScore: number;
  rankingVersion: string;
}

export interface RankedReelItem {
  reel: any;
  scoreBreakdown?: ReelScoreBreakdown;
  recommendationReason?: "trending" | "foryou" | "audio_match" | "creator_suggested" | "following";
}

/**
 * Dedicated Reels Recommendation Algorithm (v2.0)
 * Uses Watch Completion signals, Audio/Topic Affinity, and Session-Aware Diversity
 */
export class ReelsRankingService {
  public static readonly VERSION = "reels_ranker_v2";

  /**
   * Generates candidate reels from database with audience and safety checks
   */
  public static async generateCandidates(
    userId?: string,
    options: {
      feedType?: "foryou" | "following";
      hashtag?: string;
      audio?: string;
      targetUserId?: string;
      limit?: number;
    } = {}
  ): Promise<{ candidates: IPost[]; authorMap: Map<string, IUser>; followingSet: Set<string> }> {
    const limit = options.limit || 60;
    const followingSet = new Set<string>();
    const blockedSet = new Set<string>();
    const mutedSet = new Set<string>();
    const userInterests = new Set<string>();

    let me: IUser | null = null;
    if (userId) {
      me = await User.findById(userId);
      if (me) {
        (me.following || []).forEach((id) => followingSet.add(id.toString()));
        (me.blockedUsers || []).forEach((id) => blockedSet.add(id.toString()));
        (me.mutedUsers || []).forEach((id) => mutedSet.add(id.toString()));
        (me.interests || []).forEach((i) => userInterests.add(i.toLowerCase()));
      }
    }

    const query: any = {
      $or: [{ mediaType: "video" }, { isReel: true }],
    };

    if (options.targetUserId) {
      query.authorId = new mongoose.Types.ObjectId(options.targetUserId);
    } else if (userId && options.feedType === "following") {
      const followingOids = Array.from(followingSet).map((id) => new mongoose.Types.ObjectId(id));
      followingOids.push(new mongoose.Types.ObjectId(userId));
      query.authorId = { $in: followingOids };
    }

    if (options.hashtag) {
      const cleanTag = options.hashtag.replace(/^#/, "");
      query.$or = [
        { hashtags: { $in: [cleanTag, `#${cleanTag}`] } },
        { caption: { $regex: new RegExp(`#${cleanTag}\\b`, "i") } },
      ];
    }

    if (options.audio) {
      query.audioTitle = { $regex: new RegExp(options.audio, "i") };
    }

    // Safety: Exclude blocked/muted creators
    if (blockedSet.size > 0 || mutedSet.size > 0) {
      const excludedOids = [...Array.from(blockedSet), ...Array.from(mutedSet)].map((id) => new mongoose.Types.ObjectId(id));
      query.authorId = { ...(query.authorId || {}), $nin: excludedOids };
    }

    const candidates = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Fetch author details
    const authorIds = Array.from(new Set(candidates.map((p) => p.authorId.toString())));
    const authors = await User.find({ _id: { $in: authorIds } });
    const authorMap = new Map<string, IUser>();
    authors.forEach((a) => authorMap.set(a._id.toString(), a));

    // Filter by privacy
    const filteredCandidates = candidates.filter((post) => {
      const authorIdStr = post.authorId.toString();
      const author = authorMap.get(authorIdStr);
      if (!author || author.isDeactivated) return false;

      if (author.isPrivate || author.privacySettings?.privateAccount) {
        if (!userId) return false;
        if (authorIdStr !== userId && !followingSet.has(authorIdStr)) {
          return false;
        }
      }

      return true;
    });

    return { candidates: filteredCandidates, authorMap, followingSet };
  }

  /**
   * Scores an individual Reel based on watch time / completion metrics and engagement
   */
  public static computeReelScore(
    post: IPost,
    author: IUser | undefined,
    viewerId: string | undefined,
    followingSet: Set<string>
  ): ReelScoreBreakdown {
    const now = Date.now();
    const ageHours = Math.max(0.1, (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));

    // 1. Recency Curve (Smooth decay over 7 days for video content)
    const recencyScore = 100 * Math.exp(-ageHours / 72);

    // 2. Engagement & Interaction Velocity
    const likes = post.likes?.length || 0;
    const comments = post.comments?.filter((c) => !c.isDeleted)?.length || 0;
    const shares = post.sharesCount || 0;
    const saves = post.saves?.length || 0;
    const views = post.viewsCount || post.views?.length || 0;

    const engagementScore = Math.min(100, Math.log1p(likes * 1.5 + comments * 3.0 + shares * 5.0 + saves * 4.0 + views * 0.2) * 16);

    // 3. Completion / Watch Proxy Signal (calculated from views-to-engagement ratio)
    const viewsRatio = views > 0 ? (likes + comments + shares + saves) / Math.max(1, views) : 0.05;
    const completionRateScore = Math.min(100, viewsRatio * 250);

    // 4. Creator & Social Affinity
    const authorIdStr = post.authorId.toString();
    const isFollowing = viewerId ? followingSet.has(authorIdStr) : false;
    const creatorAffinity = isFollowing ? 50 : 15;

    // 5. Audio & Topic
    const audioTopicAffinity = post.audioTitle ? 20 : 5;

    const totalScore =
      recencyScore * 0.20 +
      engagementScore * 0.30 +
      completionRateScore * 0.25 +
      creatorAffinity * 0.15 +
      audioTopicAffinity * 0.10;

    return {
      completionRateScore: Number(completionRateScore.toFixed(2)),
      engagementVelocity: Number(engagementScore.toFixed(2)),
      audioTopicAffinity,
      creatorAffinity,
      recencyScore: Number(recencyScore.toFixed(2)),
      diversityPenalty: 0,
      totalScore: Number(totalScore.toFixed(2)),
      rankingVersion: ReelsRankingService.VERSION,
    };
  }

  /**
   * Ranks reels with in-session awareness (avoids showing same creator in short succession)
   */
  public static rankReels(
    candidates: IPost[],
    authorMap: Map<string, IUser>,
    viewerId: string | undefined,
    followingSet: Set<string>,
    seenReelIds: Set<string> = new Set()
  ): RankedReelItem[] {
    const scoredList: RankedReelItem[] = candidates.map((post) => {
      const author = authorMap.get(post.authorId.toString());
      const breakdown = ReelsRankingService.computeReelScore(post, author, viewerId, followingSet);
      
      let reason: RankedReelItem["recommendationReason"] = "foryou";
      if (viewerId && followingSet.has(post.authorId.toString())) {
        reason = "following";
      } else if (breakdown.engagementVelocity > 40) {
        reason = "trending";
      } else if (post.audioTitle) {
        reason = "audio_match";
      }

      return {
        reel: post,
        scoreBreakdown: breakdown,
        recommendationReason: reason,
      };
    });

    // Sort by composite score
    scoredList.sort((a, b) => (b.scoreBreakdown?.totalScore || 0) - (a.scoreBreakdown?.totalScore || 0));

    // Apply Session-Aware spacing: Avoid same author within 3 scrolls
    const finalReels: RankedReelItem[] = [];
    const remaining = [...scoredList];
    const authorLastSeen = new Map<string, number>();

    while (remaining.length > 0) {
      let pickIndex = 0;
      for (let i = 0; i < Math.min(8, remaining.length); i++) {
        const item = remaining[i];
        const authorId = item.reel.authorId.toString();
        const lastSeen = authorLastSeen.get(authorId);

        // Prioritize items that haven't been seen in this session or respect author spacing
        const isAlreadySeen = seenReelIds.has(item.reel._id.toString());
        if (!isAlreadySeen && (lastSeen === undefined || (finalReels.length - lastSeen) >= 3)) {
          pickIndex = i;
          break;
        }
      }

      const [chosen] = remaining.splice(pickIndex, 1);
      finalReels.push(chosen);
      authorLastSeen.set(chosen.reel.authorId.toString(), finalReels.length - 1);
    }

    return finalReels;
  }
}
