export interface User {
  _id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  website?: string;
  isVerified?: boolean;
  role?: string;
  plan?: "free" | "pro" | "vip" | "business";
  accountType?: "personal" | "creator" | "business";
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isPrivate?: boolean;
  isFollowing?: boolean;
  createdAt?: string;
}

export interface Post {
  _id: string;
  authorId: User | string;
  author?: User;
  caption?: string;
  mediaUrls: string[];
  mediaType: "image" | "video" | "carousel";
  aspectRatio?: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  location?: string;
  tags?: string[];
  createdAt: string;
}

export interface Story {
  _id: string;
  authorId: User | string;
  author?: User;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  viewsCount: number;
  isViewed?: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface Comment {
  _id: string;
  postId: string;
  author: User;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken?: string;
}
