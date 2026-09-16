import { User, Post, type IUser, type IPost } from "@workspace/db";

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: string;
  ogImage?: string;
  twitterCard?: string;
  noIndex?: boolean;
  structuredData?: Record<string, any>;
}

export class SeoService {
  public static readonly SITE_NAME = "WhiterChat";
  public static readonly DEFAULT_TITLE = "WhiterChat – Next-Gen Social Connection & Discovery";
  public static readonly DEFAULT_DESC = "Connect, share moments, discover trending Reels, chat with end-to-end security, and explore creators worldwide on WhiterChat.";
  public static readonly DEFAULT_IMAGE = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&fit=crop&q=80";

  /**
   * Generates dynamic XML Sitemap for public crawlable URLs
   */
  public static async generateSitemap(baseUrl: string): Promise<string> {
    const cleanBase = baseUrl.replace(/\/$/, "");

    // 1. Static Public Pages
    interface SitemapItem {
      loc: string;
      lastmod?: string;
      changefreq: string;
      priority: string;
    }

    const staticRoutes: SitemapItem[] = [
      { loc: `${cleanBase}/`, changefreq: "daily", priority: "1.0" },
      { loc: `${cleanBase}/explore`, changefreq: "hourly", priority: "0.9" },
      { loc: `${cleanBase}/reels`, changefreq: "hourly", priority: "0.9" },
      { loc: `${cleanBase}/about`, changefreq: "weekly", priority: "0.6" },
      { loc: `${cleanBase}/features`, changefreq: "weekly", priority: "0.6" },
      { loc: `${cleanBase}/community`, changefreq: "weekly", priority: "0.6" },
    ];

    // 2. Public User Profiles
    const publicUsers = await User.find({
      isDeactivated: { $ne: true },
      isPrivate: { $ne: true },
      "privacySettings.privateAccount": { $ne: true },
    })
      .select("username updatedAt")
      .limit(500);

    const userUrls = publicUsers.map((u) => ({
      loc: `${cleanBase}/profile/${encodeURIComponent(u.username)}`,
      lastmod: u.updatedAt ? new Date(u.updatedAt).toISOString().split("T")[0] : undefined,
      changefreq: "daily",
      priority: "0.8",
    }));

    // 3. Public Posts & Reels
    const publicPosts = await Post.find({
      audience: "everyone",
    })
      .select("_id isReel mediaType updatedAt createdAt")
      .sort({ createdAt: -1 })
      .limit(1000);

    const postUrls = publicPosts.map((p) => {
      const isVideo = p.isReel || p.mediaType === "video";
      const routePrefix = isVideo ? "reel" : "post";
      return {
        loc: `${cleanBase}/${routePrefix}/${p._id.toString()}`,
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : undefined,
        changefreq: "weekly",
        priority: isVideo ? "0.8" : "0.7",
      };
    });

    const allUrls = [...staticRoutes, ...userUrls, ...postUrls];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const item of allUrls) {
      xml += `  <url>\n`;
      xml += `    <loc>${item.loc}</loc>\n`;
      if (item.lastmod) {
        xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
      }
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
      xml += `    <priority>${item.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;
    return xml;
  }

  /**
   * Generates standard compliant robots.txt
   */
  public static generateRobotsTxt(baseUrl: string): string {
    const cleanBase = baseUrl.replace(/\/$/, "");
    return `User-agent: *
Allow: /
Allow: /explore
Allow: /reels
Allow: /profile/
Allow: /post/
Allow: /reel/
Allow: /about
Allow: /features
Allow: /community
Allow: /login
Allow: /register

# Disallow private user spaces and API internals
Disallow: /api/
Disallow: /settings
Disallow: /messages
Disallow: /direct
Disallow: /notifications
Disallow: /create
Disallow: /snap
Disallow: /setup-profile

Sitemap: ${cleanBase}/sitemap.xml
`;
  }

  /**
   * Builds rich metadata and Schema.org Structured Data for Public Profiles
   */
  public static buildProfileMetadata(user: IUser, baseUrl: string): SeoMetadata {
    const cleanBase = baseUrl.replace(/\/$/, "");
    const profileUrl = `${cleanBase}/profile/${user.username}`;
    const title = `${user.fullName} (@${user.username}) on ${SeoService.SITE_NAME}`;
    const description = user.bio
      ? `${user.bio.slice(0, 140)} - Check out photos, Reels, and updates from ${user.fullName} on ${SeoService.SITE_NAME}.`
      : `See photos, Reels, and updates from ${user.fullName} (@${user.username}) on ${SeoService.SITE_NAME}.`;

    const isPrivate = user.isPrivate || user.privacySettings?.privateAccount;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      dateCreated: user.createdAt?.toISOString(),
      dateModified: user.updatedAt?.toISOString(),
      mainEntity: {
        "@type": "Person",
        name: user.fullName,
        alternateName: user.username,
        description: user.bio || undefined,
        image: user.avatarUrl || undefined,
        url: profileUrl,
        interactionStatistic: [
          {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/FollowAction",
            userInteractionCount: user.followers?.length || 0,
          },
        ],
      },
    };

    return {
      title,
      description,
      canonicalUrl: profileUrl,
      ogType: "profile",
      ogImage: user.avatarUrl || SeoService.DEFAULT_IMAGE,
      twitterCard: "summary",
      noIndex: isPrivate,
      structuredData: isPrivate ? undefined : structuredData,
    };
  }

  /**
   * Builds rich metadata and Schema.org for Public Posts
   */
  public static buildPostMetadata(post: IPost, author: IUser | null, baseUrl: string): SeoMetadata {
    const cleanBase = baseUrl.replace(/\/$/, "");
    const postUrl = `${cleanBase}/post/${post._id.toString()}`;
    const authorName = author ? author.fullName : "User";
    const authorUsername = author ? author.username : "user";

    const title = post.caption
      ? `${post.caption.slice(0, 50)} by ${authorName} (@${authorUsername})`
      : `Post by ${authorName} (@${authorUsername}) on ${SeoService.SITE_NAME}`;

    const description = post.caption
      ? `${post.caption.slice(0, 140)} - Explore this photo and join the conversation on ${SeoService.SITE_NAME}.`
      : `View this post by @${authorUsername} on ${SeoService.SITE_NAME}.`;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SocialMediaPosting",
      headline: post.caption || `Post by ${authorName}`,
      image: [post.mediaUrl, ...(post.additionalMediaUrls || [])],
      datePublished: post.createdAt?.toISOString(),
      dateModified: post.updatedAt?.toISOString(),
      author: {
        "@type": "Person",
        name: authorName,
        url: `${cleanBase}/profile/${authorUsername}`,
      },
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/LikeAction",
          userInteractionCount: post.likes?.length || 0,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/CommentAction",
          userInteractionCount: post.comments?.filter((c) => !c.isDeleted)?.length || 0,
        },
      ],
    };

    return {
      title,
      description,
      canonicalUrl: postUrl,
      ogType: "article",
      ogImage: post.mediaUrl || SeoService.DEFAULT_IMAGE,
      twitterCard: "summary_large_image",
      noIndex: post.audience !== "everyone",
      structuredData,
    };
  }

  /**
   * Builds rich VideoObject Schema.org and metadata for Public Reels
   */
  public static buildReelMetadata(post: IPost, author: IUser | null, baseUrl: string): SeoMetadata {
    const cleanBase = baseUrl.replace(/\/$/, "");
    const reelUrl = `${cleanBase}/reel/${post._id.toString()}`;
    const authorName = author ? author.fullName : "Creator";
    const authorUsername = author ? author.username : "creator";

    const title = post.caption
      ? `${post.caption.slice(0, 50)} – Reel by ${authorName}`
      : `Reel by ${authorName} (@${authorUsername}) on ${SeoService.SITE_NAME}`;

    const description = post.caption
      ? `${post.caption.slice(0, 140)} - Watch this short video on ${SeoService.SITE_NAME}.`
      : `Watch trending short video by @${authorUsername} on ${SeoService.SITE_NAME}.`;

    const thumbnail = post.thumbnailUrl || post.mediaUrl || SeoService.DEFAULT_IMAGE;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: title,
      description: description,
      thumbnailUrl: [thumbnail],
      uploadDate: post.createdAt?.toISOString(),
      contentUrl: post.mediaUrl,
      author: {
        "@type": "Person",
        name: authorName,
        url: `${cleanBase}/profile/${authorUsername}`,
      },
    };

    return {
      title,
      description,
      canonicalUrl: reelUrl,
      ogType: "video.other",
      ogImage: thumbnail,
      twitterCard: "player",
      noIndex: post.audience !== "everyone",
      structuredData,
    };
  }
}
