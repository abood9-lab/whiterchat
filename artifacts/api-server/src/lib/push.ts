import webpush from "web-push";
import { PushSubscription, User } from "@workspace/db";

function requireVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:notifications@whiterchat.app";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

let configured = false;
function ensureConfigured(): boolean {
  const config = requireVapidConfig();
  if (!config) return false;
  if (!configured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/** Sends a web push notification to every subscribed device of a user. Silently no-ops if push isn't configured. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const subs = await PushSubscription.find({ userId });
  if (!subs.length) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 404/410 means the subscription is gone (browser unsubscribed, device removed, etc.) — clean it up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    })
  );
}

const TYPE_LABELS: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  message: "sent you a message",
  mention: "mentioned you in a post",
  share: "shared a reel with you",
};

/** Builds a human-readable push payload for a notification type + acting user, then sends it. */
export async function notifyUserPush(
  userId: string,
  actorId: string,
  type: "like" | "comment" | "follow" | "message" | "mention" | "share",
  extra?: { commentText?: string; conversationId?: string; postId?: string }
): Promise<void> {
  if (!ensureConfigured()) return;
  const [recipient, actor] = await Promise.all([
    User.findById(userId).select("notificationSettings"),
    User.findById(actorId).select("username fullName avatarUrl"),
  ]);
  if (!actor || !recipient) return;

  // Check recipient notification preferences
  const notifSettings = recipient.notificationSettings;
  if (notifSettings?.pushEnabled === false) return;

  if (type === "like" && notifSettings?.likes === false) return;
  if (type === "comment" && notifSettings?.comments === false) return;
  if (type === "follow" && notifSettings?.followers === false) return;
  if (type === "message" && notifSettings?.messages === false) return;
  if (type === "mention" && notifSettings?.mentions === false) return;

  const name = actor.fullName || actor.username;
  const action = TYPE_LABELS[type] ?? "sent you a notification";
  const body = type === "comment" && extra?.commentText ? `${name} ${action}: "${extra.commentText}"` : `${name} ${action}`;
  const url = type === "message" ? "/messages" : type === "follow" ? `/profile/${actor.username}` : "/notifications";
  await sendPushToUser(userId, {
    title: "WhiterChat",
    body,
    icon: actor.avatarUrl,
    url,
    tag: type,
  });
}

