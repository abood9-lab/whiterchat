import { useEffect } from "react";

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: string;
  type?: string;
  ogImage?: string;
  image?: string;
  structuredData?: Record<string, any>;
  noIndex?: boolean;
}

export function SEOHead({
  title = "WhiterChat – Next-Gen Social Connection & Discovery",
  description = "Connect, share moments, discover trending Reels, and explore creators worldwide on WhiterChat.",
  canonicalPath,
  ogType = "website",
  type,
  ogImage,
  image,
  structuredData,
  noIndex = false,
}: SEOHeadProps) {
  const effectiveOgType = type || ogType;
  const effectiveOgImage = image || ogImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&fit=crop&q=80";
  useEffect(() => {
    // 1. Page Title
    document.title = title;

    // 2. Helper to set or update meta tag
    const setMeta = (nameOrProperty: string, content: string, isProperty = false) => {
      const selector = isProperty
        ? `meta[property="${nameOrProperty}"]`
        : `meta[name="${nameOrProperty}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (isProperty) {
          el.setAttribute("property", nameOrProperty);
        } else {
          el.setAttribute("name", nameOrProperty);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Standard Description & Robots
    setMeta("description", description);
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large");

    // Canonical Link
    const currentOrigin = window.location.origin;
    const fullCanonical = canonicalPath
      ? `${currentOrigin}${canonicalPath}`
      : `${currentOrigin}${window.location.pathname}`;

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", fullCanonical);

    // OpenGraph Tags
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", effectiveOgType, true);
    setMeta("og:url", fullCanonical, true);
    setMeta("og:image", effectiveOgImage, true);
    setMeta("og:site_name", "WhiterChat", true);

    // Twitter Card Tags
    setMeta("twitter:card", effectiveOgType.includes("video") ? "player" : "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", effectiveOgImage);

    // Schema.org Structured Data (JSON-LD)
    const scriptId = "dynamic-json-ld-schema";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (structuredData) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(structuredData);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, canonicalPath, ogType, ogImage, structuredData, noIndex]);

  return null;
}
