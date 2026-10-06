import { User, Post, type IUser } from "@workspace/db";
import mongoose from "mongoose";
import { buildUserSummary } from "../routes/users";

export const STANDARD_TOPICS = [
  { id: "technology", label: "Technology", icon: "Laptop", description: "AI, Gadgets, Coding, Startups" },
  { id: "gaming", label: "Gaming", icon: "Gamepad2", description: "Esports, Streaming, Game Dev" },
  { id: "sports", label: "Sports & Fitness", icon: "Trophy", description: "Football, Gym, Athletics" },
  { id: "photography", label: "Photography", icon: "Camera", description: "Portraits, Landscape, Street" },
  { id: "music", label: "Music & Audio", icon: "Music", description: "Artists, Beats, Production" },
  { id: "education", label: "Education & Science", icon: "GraduationCap", description: "Courses, Science, Books" },
  { id: "entertainment", label: "Entertainment", icon: "Film", description: "Movies, Series, Memes" },
  { id: "art", label: "Art & Design", icon: "Palette", description: "Digital Art, UI/UX, Illustration" },
  { id: "travel", label: "Travel & Nature", icon: "Plane", description: "Destinations, Guides, Outdoors" },
  { id: "business", label: "Business & Finance", icon: "TrendingUp", description: "Investing, Crypto, Growth" },
];

export class OnboardingService {
  /**
   * Generates high-quality creator suggestions for onboarding
   */
  public static async getFollowSuggestions(
    userId?: string,
    selectedTopics?: string[],
    limit: number = 15
  ): Promise<any[]> {
    const excludeIds: mongoose.Types.ObjectId[] = [];
    let userInterests: string[] = selectedTopics || [];

    if (userId) {
      excludeIds.push(new mongoose.Types.ObjectId(userId));
      const me = await User.findById(userId).select("following interests");
      if (me) {
        (me.following || []).forEach((id) => excludeIds.push(id));
        if (userInterests.length === 0 && me.interests) {
          userInterests = me.interests;
        }
      }
    }

    // Query active creators not in exclusion list
    const candidateQuery: any = {
      _id: { $nin: excludeIds },
      isDeactivated: { $ne: true },
    };

    const users = await User.find(candidateQuery)
      .select("username fullName avatarUrl bio interests followers isVerified role")
      .limit(50);

    // Score candidates based on popularity, verification, and topic overlap
    const scored = users.map((u) => {
      let score = 0;
      const followerCount = u.followers?.length || 0;
      score += Math.min(50, followerCount * 2);

      if (u.isVerified) score += 25;
      if (u.role === "creator") score += 20;
      if (u.avatarUrl) score += 10;
      if (u.bio) score += 10;

      // Topic overlap
      if (userInterests.length > 0 && u.interests) {
        const matching = u.interests.filter((i) =>
          userInterests.some((t) => t.toLowerCase() === i.toLowerCase())
        );
        score += matching.length * 15;
      }

      return {
        user: u,
        score,
        commonInterests: u.interests || [],
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return Promise.all(
      scored.slice(0, limit).map(async ({ user, score, commonInterests }) => {
        const summary = await buildUserSummary(user, userId);
        return {
          ...summary,
          bio: user.bio || null,
          followersCount: user.followers?.length || 0,
          isVerified: user.isVerified || false,
          commonInterests,
          rankingScore: score,
        };
      })
    );
  }

  /**
   * Complete onboarding by saving topics, following initial creators, and completing profile
   */
  public static async completeOnboarding(
    userId: string,
    data: {
      interests?: string[];
      followUserIds?: string[];
      bio?: string;
      avatarUrl?: string;
    }
  ): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (Array.isArray(data.interests)) {
      user.interests = Array.from(new Set([...(user.interests || []), ...data.interests]));
    }
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl;
    user.profileCompleted = true;

    // Follow requested initial creators
    if (Array.isArray(data.followUserIds) && data.followUserIds.length > 0) {
      for (const targetId of data.followUserIds) {
        if (!targetId || targetId === userId) continue;
        const targetOid = new mongoose.Types.ObjectId(targetId);
        
        if (!user.following.some((id) => id.toString() === targetId)) {
          user.following.push(targetOid);
          // Add to target's followers
          await User.findByIdAndUpdate(targetId, {
            $addToSet: { followers: user._id },
          });
        }
      }
    }

    await user.save();
    return user;
  }
}
