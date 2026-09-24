import { User, Post, type IUser, type IPost } from "@workspace/db";
import mongoose from "mongoose";

export interface UserSearchResult {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified?: boolean;
  followersCount: number;
  isFollowing?: boolean;
  score: number;
  matchType: "exact" | "prefix" | "partial" | "name";
}

export interface HashtagSearchResult {
  tag: string;
  postsCount: number;
  score: number;
}

export interface PostSearchResult {
  id: string;
  caption: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  likesCount: number;
  commentsCount: number;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export interface UnifiedSearchResults {
  users: UserSearchResult[];
  hashtags: HashtagSearchResult[];
  posts: PostSearchResult[];
  reels: PostSearchResult[];
}

export class SearchRankingService {
  /**
   * Sanitizes and normalizes query text
   */
  public static sanitizeQuery(q: string): string {
    return q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Multi-entity search ranking across users, hashtags, posts, and reels
   */
  public static async searchAll(
    queryRaw: string,
    viewerId?: string,
    limit: number = 20
  ): Promise<UnifiedSearchResults> {
    const q = queryRaw.trim();
    if (!q) {
      return { users: [], hashtags: [], posts: [], reels: [] };
    }

    const cleanQ = SearchRankingService.sanitizeQuery(q);
    const qLower = q.toLowerCase();

    // 1. Search Users
    const viewer = viewerId ? await User.findById(viewerId).select("following") : null;
    const followingSet = new Set((viewer?.following || []).map((id) => id.toString()));

    const userCandidates = await User.find({
      $or: [
        { username: { $regex: cleanQ, $options: "i" } },
        { fullName: { $regex: cleanQ, $options: "i" } },
      ],
      isDeactivated: { $ne: true },
    })
      .limit(30)
      .select("username fullName avatarUrl isVerified followers following");

    const scoredUsers: UserSearchResult[] = userCandidates.map((u) => {
      const uNameLower = u.username.toLowerCase();
      const fNameLower = u.fullName.toLowerCase();
      let score = 0;
      let matchType: UserSearchResult["matchType"] = "partial";

      if (uNameLower === qLower) {
        score = 100;
        matchType = "exact";
      } else if (uNameLower.startsWith(qLower)) {
        score = 80;
        matchType = "prefix";
      } else if (fNameLower.startsWith(qLower)) {
        score = 65;
        matchType = "name";
      } else {
        score = 40;
      }

      // Popularity boost (logarithmic follower score)
      const followersCount = u.followers?.length || 0;
      score += Math.min(20, Math.log1p(followersCount) * 4);

      // Verified boost
      if (u.isVerified) score += 10;

      // Social graph boost (if viewer follows this person)
      if (followingSet.has(u._id.toString())) score += 15;

      return {
        id: u._id.toString(),
        username: u.username,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl || null,
        isVerified: u.isVerified || false,
        followersCount,
        isFollowing: viewerId ? followingSet.has(u._id.toString()) : false,
        score,
        matchType,
      };
    });

    scoredUsers.sort((a, b) => b.score - a.score);

    // 2. Search Hashtags (from Post hashtags collection)
    const tagMatch = cleanQ.replace(/^#/, "");
    const tagPosts = await Post.find({
      hashtags: { $regex: `^${tagMatch}`, $options: "i" },
      audience: "everyone",
    })
      .select("hashtags")
      .limit(50);

    const tagCounts = new Map<string, number>();
    tagPosts.forEach((p) => {
      (p.hashtags || []).forEach((t) => {
        const norm = t.toLowerCase().replace(/^#/, "");
        if (norm.includes(tagMatch.toLowerCase())) {
          tagCounts.set(norm, (tagCounts.get(norm) || 0) + 1);
        }
      });
    });

    const hashtags: HashtagSearchResult[] = Array.from(tagCounts.entries())
      .map(([tag, count]) => {
        let score = count * 5;
        if (tag === tagMatch.toLowerCase()) score += 50;
        return { tag: `#${tag}`, postsCount: count, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 3. Search Posts & Reels
    const postQuery: any = {
      audience: "everyone",
      $or: [
        { caption: { $regex: cleanQ, $options: "i" } },
        { hashtags: { $in: [tagMatch, `#${tagMatch}`] } },
      ],
    };

    const matchingPosts = await Post.find(postQuery)
      .sort({ createdAt: -1 })
      .limit(limit);

    const authorIds = Array.from(new Set(matchingPosts.map((p) => p.authorId.toString())));
    const postAuthors = await User.find({ _id: { $in: authorIds } }).select("username fullName avatarUrl");
    const authorMap = new Map<string, IUser>();
    postAuthors.forEach((a) => authorMap.set(a._id.toString(), a));

    const posts: PostSearchResult[] = [];
    const reels: PostSearchResult[] = [];

    matchingPosts.forEach((p) => {
      const author = authorMap.get(p.authorId.toString());
      const item: PostSearchResult = {
        id: p._id.toString(),
        caption: p.caption || null,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        likesCount: p.likes?.length || 0,
        commentsCount: p.comments?.filter((c) => !c.isDeleted)?.length || 0,
        author: {
          id: p.authorId.toString(),
          username: author?.username || "user",
          fullName: author?.fullName || "User",
          avatarUrl: author?.avatarUrl || null,
        },
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      };

      if (p.isReel || p.mediaType === "video") {
        reels.push(item);
      } else {
        posts.push(item);
      }
    });

    return {
      users: scoredUsers.slice(0, 15),
      hashtags,
      posts: posts.slice(0, 15),
      reels: reels.slice(0, 15),
    };
  }

  /**
   * Fast autocomplete endpoint for instant debounced search UI
   */
  public static async autocomplete(queryRaw: string, viewerId?: string): Promise<{
    users: UserSearchResult[];
    hashtags: string[];
  }> {
    const q = queryRaw.trim();
    if (!q) return { users: [], hashtags: [] };

    const results = await SearchRankingService.searchAll(q, viewerId, 8);
    return {
      users: results.users.slice(0, 6),
      hashtags: results.hashtags.map((h) => h.tag).slice(0, 5),
    };
  }
}
