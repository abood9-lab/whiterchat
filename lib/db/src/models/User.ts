import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
  website?: string;
  gender?: string;
  pronouns?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  interests: string[];
  profileCompleted: boolean;
  isVerified?: boolean;
  role?: string; // 'user' | 'creator' | 'admin'
  isPrivate?: boolean;
  isDeactivated?: boolean;
  vaultPin?: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  closeFriends: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  mutedUsers: mongoose.Types.ObjectId[];
  restrictedUsers: mongoose.Types.ObjectId[];
  mutedWords: string[];
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  sessions?: Array<{
    id: string;
    deviceName: string;
    browser: string;
    os: string;
    ip: string;
    location: string;
    lastActive: Date;
  }>;
  loginAlerts?: Array<{
    id: string;
    deviceName: string;
    location: string;
    timestamp: Date;
    ip: string;
    isRead?: boolean;
  }>;
  privacySettings?: {
    privateAccount?: boolean;
    whoCanMessage?: string; // 'everyone' | 'following' | 'none'
    whoCanComment?: string; // 'everyone' | 'following' | 'none'
    whoCanMention?: string; // 'everyone' | 'following' | 'none'
    whoCanTag?: string; // 'everyone' | 'following' | 'none'
    whoCanReplyNotes?: string; // 'followers' | 'close_friends'
    showActivityStatus?: boolean;
    showOnlineStatus?: boolean;
    showFollowLists?: boolean;
    storyAudience?: string; // 'everyone' | 'followers' | 'close_friends'
  };
  notificationSettings?: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
    likes?: boolean;
    reactions?: boolean;
    comments?: boolean;
    replies?: boolean;
    mentions?: boolean;
    followers?: boolean;
    messages?: boolean;
    notes?: boolean;
    reels?: boolean;
    securityAlerts?: boolean;
  };
  messageSettings?: {
    readReceipts?: boolean;
    typingIndicators?: boolean;
    filterMessageRequests?: boolean;
    mediaAutoDownload?: boolean;
  };
  contentSettings?: {
    sensitiveContent?: string; // 'standard' | 'less' | 'permissive'
    autoplayVideos?: boolean;
    dataSaver?: boolean;
    highQualityUploads?: boolean;
  };
  languageSettings?: {
    language?: string; // 'ar' | 'en'
    region?: string;
    dateFormat?: string;
    timeFormat?: string;
  };
  accessibilitySettings?: {
    reducedMotion?: boolean;
    highContrast?: boolean;
    largeText?: boolean;
  };
  customLinks?: Array<{ title: string; url: string }>;
  savedCollections?: Array<{
    id: string;
    name: string;
    coverUrl?: string;
    postIds: mongoose.Types.ObjectId[];
    createdAt: Date;
  }>;
  archivedPostIds?: mongoose.Types.ObjectId[];
  searchHistory?: Array<{ query: string; timestamp: Date }>;
  recentViews?: Array<{
    type: string; // 'reel' | 'profile'
    targetId: string;
    title?: string;
    avatarUrl?: string;
    timestamp: Date;
  }>;
  verificationRequest?: {
    status: string; // 'none' | 'pending' | 'approved' | 'rejected'
    category?: string;
    documentType?: string;
    details?: string;
    submittedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    location: { type: String, default: null },
    website: { type: String, default: null },
    gender: { type: String, default: null },
    pronouns: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    phoneNumber: { type: String, default: null },
    interests: [{ type: String }],
    profileCompleted: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, default: "user" },
    isPrivate: { type: Boolean, default: false },
    isDeactivated: { type: Boolean, default: false },
    vaultPin: { type: String, default: null },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    closeFriends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    mutedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    restrictedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    mutedWords: [{ type: String }],
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    twoFactorBackupCodes: [{ type: String }],
    sessions: [
      {
        id: { type: String, required: true },
        deviceName: { type: String, default: "Current Device" },
        browser: { type: String, default: "Web Browser" },
        os: { type: String, default: "Unknown OS" },
        ip: { type: String, default: "127.0.0.1" },
        location: { type: String, default: "Online" },
        lastActive: { type: Date, default: Date.now },
      },
    ],
    loginAlerts: [
      {
        id: { type: String, required: true },
        deviceName: { type: String },
        location: { type: String },
        timestamp: { type: Date, default: Date.now },
        ip: { type: String },
        isRead: { type: Boolean, default: false },
      },
    ],
    privacySettings: {
      privateAccount: { type: Boolean, default: false },
      whoCanMessage: { type: String, default: "everyone" },
      whoCanComment: { type: String, default: "everyone" },
      whoCanMention: { type: String, default: "everyone" },
      whoCanTag: { type: String, default: "everyone" },
      whoCanReplyNotes: { type: String, default: "followers" },
      showActivityStatus: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      showFollowLists: { type: Boolean, default: true },
      storyAudience: { type: String, default: "everyone" },
    },
    notificationSettings: {
      pushEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: true },
      inAppEnabled: { type: Boolean, default: true },
      likes: { type: Boolean, default: true },
      reactions: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      replies: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      followers: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      notes: { type: Boolean, default: true },
      reels: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
    },
    messageSettings: {
      readReceipts: { type: Boolean, default: true },
      typingIndicators: { type: Boolean, default: true },
      filterMessageRequests: { type: Boolean, default: true },
      mediaAutoDownload: { type: Boolean, default: true },
    },
    contentSettings: {
      sensitiveContent: { type: String, default: "standard" },
      autoplayVideos: { type: Boolean, default: true },
      dataSaver: { type: Boolean, default: false },
      highQualityUploads: { type: Boolean, default: true },
    },
    languageSettings: {
      language: { type: String, default: "en" },
      region: { type: String, default: "US" },
      dateFormat: { type: String, default: "DD/MM/YYYY" },
      timeFormat: { type: String, default: "12h" },
    },
    accessibilitySettings: {
      reducedMotion: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      largeText: { type: Boolean, default: false },
    },
    customLinks: [
      {
        title: { type: String },
        url: { type: String },
      },
    ],
    savedCollections: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        coverUrl: { type: String },
        postIds: [{ type: Schema.Types.ObjectId, ref: "Post" }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    archivedPostIds: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    searchHistory: [
      {
        query: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    recentViews: [
      {
        type: { type: String, required: true },
        targetId: { type: String, required: true },
        title: { type: String },
        avatarUrl: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    verificationRequest: {
      status: { type: String, default: "none" },
      category: { type: String },
      documentType: { type: String },
      details: { type: String },
      submittedAt: { type: Date },
    },
  },
  { timestamps: true }
);

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });

export const User: mongoose.Model<IUser> = (mongoose.models.User as any) ?? mongoose.model<IUser>("User", UserSchema);
