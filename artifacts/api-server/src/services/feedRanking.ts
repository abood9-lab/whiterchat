import { Post, User, type IPost, type IUser } from "@workspace/db";
import mongoose from "mongoose";

export interface FeedScoreBreakdown {
  authorAffinity: number;
  recencyScore: number;
  engagementVelocity: number;
  topicAffinity: number;
  mediaPreference: number;
  negativePenalty: number;
  explorationBoost: number;
  totalScore: number;
  rankingVersion: string;
}

export interface RankedFeedItem {
  post: any;
  scoreBreakdown?: FeedScoreBreakdown;
  recommendationReason?: "following" | "trending" | "topic_match" | "creator_suggested" | "explore";
}

/**
 * Versioned Feed Ranking Engine (v2.0)
 * Multi-factor Scoring + Candidate Generation + Diversity Filter + Negative Signal Suppression
 */
export class FeedRankingService {
  public static readonly VERSION = "feed_ranker_v2";

  /**
   * Generates candidate posts from multiple distinct sources
   */
  public static async generateCandidates(
    userId?: string,
    limit: number = 80
  ): Promise<{ candidates: IPost[]; authorMap: Map<string, IUser>; followingSet: Set<string>; closeFriendsSet: Set<string>; userInterests: Set<string> }> {
    const followingSet = new Set<string>();
    const closeFriendsSet = new Set<string>();
    const blockedSet = new Set<string>();
    const mutedSet = new Set<string>();
    const userInterests = new Set<string>();

    let me: IUser | null = null;
    if (userId) {
      me = await User.findById(userId);
      if (me) {
        (me.following || []).forEach((id) => followingSet.add(id.toString()));
        (me.closeFriends || []).forEach((id) => closeFriendsSet.add(id.toString()));
        (me.blockedUsers || []).forEach((id) => blockedSet.add(id.toString()));
        (me.mutedUsers || []).forEach((id) => mutedSet.add(id.toString()));
        (me.interests || []).forEach((i) => userInterests.add(i.toLowerCase()));
      }
    }

    const followingOids = Array.from(followingSet).map((id) => new mongoose.Types.ObjectId(id));
    if (userId) {
      followingOids.push(new mongoose.Types.ObjectId(userId));
    }

    // 1. Fetch Candidates from Following (Primary Pool)
    const followingCandidatesPromise = followingOids.length > 0
      ? Post.find({
          authorId: { $in: followingOids },
        })
          .sort({ createdAt: -1 })
          .limit(limit)
      : Promise.resolve([]);

    // 2. Fetch Candidates from Matching Topics / High Engagement (Discovery Pool)
    const topicInterestsArray = Array.from(userInterests);
    const discoveryQuery: any = {
      audience: "everyone",
    };
    if (userId) {
      const excludeAuthorOids = [new mongoose.Types.ObjectId(userId), ...Array.from(blockedSet).map((id) => new mongoose.Types.ObjectId(id))];
      discoveryQuery.authorId = { $nin: excludeAuthorOids };
    }

    // If user has defined interests, match hashtags or captions
    if (topicInterestsArray.length > 0) {
      discoveryQuery.$or = [
        { hashtags: { $in: topicInterestsArray } },
        { "likes.5": { $exists: true } }, // high engagement
      ];
    }

    const discoveryCandidatesPromise = Post.find(discoveryQuery)
      .sort({ createdAt: -1 })
      .limit(limit);

    // 3. Fetch Trending Posts (Velocity Pool)
    const trendingCandidatesPromise = Post.find({
      audience: "everyone",
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
    })
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(30);

    const [followingPosts, discoveryPosts, trendingPosts] = await Promise.all([
      followingCandidatesPromise,
      discoveryCandidatesPromise,
      trendingCandidatesPromise,
    ]);

    // Deduplicate candidate IDs
    const postMap = new Map<string, IPost>();
    [...followingPosts, ...discoveryPosts, ...trendingPosts].forEach((p) => {
      postMap.set(p._id.toString(), p);
    });

    const candidates = Array.from(postMap.values());

    // Collect all author IDs to batch load authors
    const authorIds = Array.from(new Set(candidates.map((p) => p.authorId.toString())));
    const authors = await User.find({ _id: { $in: authorIds } });
    const authorMap = new Map<string, IUser>();
    authors.forEach((a) => authorMap.set(a._id.toString(), a));

    // Filter out blocked, muted, or private accounts
    const filteredCandidates = candidates.filter((post) => {
      const authorIdStr = post.authorId.toString();
      if (blockedSet.has(authorIdStr)) return false;
      if (mutedSet.has(authorIdStr)) return false;

      const author = authorMap.get(authorIdStr);
      if (!author) return false;
      if (author.isDeactivated) return false;

      // Privacy check: If author is private, only followers or self can view
      if (author.isPrivate || author.privacySettings?.privateAccount) {
        if (!userId) return false;
        if (authorIdStr !== userId && !followingSet.has(authorIdStr)) {
          return false;
        }
      }

      // Close friends audience check
      if (post.audience === "close_friends") {
        if (!userId) return false;
        if (authorIdStr !== userId && !closeFriendsSet.has(authorIdStr)) {
          return false;
        }
      }

      return true;
    });

    return {
      candidates: filteredCandidates,
      authorMap,
      followingSet,
      closeFriendsSet,
      userInterests,
    };
  }

  /**
   * Scores an individual candidate using real multi-factor signals
   */
  public static computeScore(
    post: IPost,
    author: IUser | undefined,
    viewerId: string | undefined,
    followingSet: Set<string>,
    userInterests: Set<string>
  ): FeedScoreBreakdown {
    const now = Date.now();
    const postTime = new Date(post.createdAt).getTime();
    const ageHours = Math.max(0.1, (now - postTime) / (1000 * 60 * 60));

    // 1. Recency Decay (Exponential Half-Life of ~36 hours)
    // Fresh posts (0-12h) score high (80-100), decaying smoothly without abrupt cutoffs
    const recencyScore = 100 * Math.exp(-ageHours / 36);

    // 2. Author & Social Affinity
    let authorAffinity = 0;
    const authorIdStr = post.authorId.toString();
    if (viewerId) {
      if (authorIdStr === viewerId) {
        authorAffinity = 40; // self posts
      } else if (followingSet.has(authorIdStr)) {
        authorAffinity = 60; // followed creators
      } else {
        authorAffinity = 10; // discovery creator
      }
    }

    // 3. Engagement Velocity & Quality Score
    const likes = post.likes?.length || 0;
    const comments = post.comments?.filter((c) => !c.isDeleted)?.length || 0;
    const saves = post.saves?.length || 0;
    const shares = post.sharesCount || 0;
    const views = post.viewsCount || post.views?.length || 0;

    // Weighted interaction sum
    const totalEngagement = likes * 2.0 + comments * 3.5 + saves * 3.0 + shares * 4.0 + views * 0.1;
    // Anti-gaming: Dampen massive spikes with logarithmic scaling
    const engagementVelocity = Math.min(100, Math.log1p(totalEngagement) * 18);

    // 4. Topic Affinity (Hashtags and caption matching)
    let topicAffinity = 0;
    if (userInterests.size > 0) {
      const postTags = (post.hashtags || []).map((t) => t.toLowerCase().replace(/^#/, ""));
      const captionWords = (post.caption || "").toLowerCase().split(/\s+/);
      const combinedTokens = new Set([...postTags, ...captionWords]);

      let matches = 0;
      userInterests.forEach((interest) => {
        if (combinedTokens.has(interest)) matches++;
      });

      topicAffinity = Math.min(45, matches * 15);
    }

    // 5. Exploration Boost (Adds variety for discovering high-potential new creators)
    const isNewCreator = viewerId && !followingSet.has(authorIdStr) && authorIdStr !== viewerId;
    const explorationBoost = isNewCreator ? 12 : 0;

    // 6. Total Composite Score
    const totalScore =
      recencyScore * 0.35 +
      authorAffinity * 0.25 +
      engagementVelocity * 0.25 +
      topicAffinity * 0.10 +
      explorationBoost * 0.05;

    return {
      authorAffinity,
      recencyScore,
      engagementVelocity,
      topicAffinity,
      mediaPreference: 0,
      negativePenalty: 0,
      explorationBoost,
      totalScore: Number(totalScore.toFixed(3)),
      rankingVersion: FeedRankingService.VERSION,
    };
  }

  /**
   * Ranks candidates and applies diversity spacing (avoids consecutive posts from the same author)
   */
  public static rankAndDiversify(
    candidates: IPost[],
    authorMap: Map<string, IUser>,
    viewerId: string | undefined,
    followingSet: Set<string>,
    userInterests: Set<string>
  ): RankedFeedItem[] {
    // 1. Compute scores for all candidates
    const scoredList: RankedFeedItem[] = candidates.map((post) => {
      const author = authorMap.get(post.authorId.toString());
      const breakdown = FeedRankingService.computeScore(post, author, viewerId, followingSet, userInterests);
      
      let reason: RankedFeedItem["recommendationReason"] = "explore";
      if (viewerId && followingSet.has(post.authorId.toString())) {
        reason = "following";
      } else if (breakdown.topicAffinity > 15) {
        reason = "topic_match";
      } else if (breakdown.engagementVelocity > 30) {
        reason = "trending";
      } else if (author && (author.followers?.length || 0) > 10) {
        reason = "creator_suggested";
      }

      return {
        post,
        scoreBreakdown: breakdown,
        recommendationReason: reason,
      };
    });

    // 2. Sort primary list by composite score descending
    scoredList.sort((a, b) => (b.scoreBreakdown?.totalScore || 0) - (a.scoreBreakdown?.totalScore || 0));

    // 3. Apply Diversity & Author Spacing Algorithm
    const diversified: RankedFeedItem[] = [];
    const remaining = [...scoredList];
    const authorLastSeenIndex = new Map<string, number>();

    const MIN_AUTHOR_SPACING = 2; // minimum items between same author when possible

    while (remaining.length > 0) {
      let chosenIndex = 0;

      // Find the highest ranked item that respects author distance
      for (let i = 0; i < Math.min(10, remaining.length); i++) {
        const authorId = remaining[i].post.authorId.toString();
        const lastIndex = authorLastSeenIndex.get(authorId);

        if (lastIndex === undefined || (diversified.length - lastIndex) >= MIN_AUTHOR_SPACING) {
          chosenIndex = i;
          break;
        }
      }

      const [selected] = remaining.splice(chosenIndex, 1);
      diversified.push(selected);
      authorLastSeenIndex.set(selected.post.authorId.toString(), diversified.length - 1);
    }

    return diversified;
  }
}
