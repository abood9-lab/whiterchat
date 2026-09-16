import mongoose from "mongoose";

let connected = false;

mongoose.set("bufferCommands", false);

export async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[Database] MONGODB_URI is not set. The application will start, but database operations require MONGODB_URI.");
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log("[Database] MongoDB connected successfully.");
  } catch (err: any) {
    console.warn(`[Database] MongoDB connection failed: ${err.message}.`);
  }
}

export function isDbConnected() {
  return connected && mongoose.connection.readyState === 1;
}

export * from "./models/User.js";
export * from "./models/Post.js";
export * from "./models/Story.js";
export * from "./models/Message.js";
export * from "./models/Notification.js";
export * from "./models/RefreshToken.js";
export * from "./models/Vault.js";
export * from "./models/PushSubscription.js";
export * from "./models/Report.js";
export * from "./models/Note.js";
export * from "./models/Poll.js";
export * from "./models/Game.js";
export * from "./models/AiAssistant.js";
export * from "./models/Feedback.js";
export * from "./models/OtpVerification.js";
export * from "./models/Institutional.js";
