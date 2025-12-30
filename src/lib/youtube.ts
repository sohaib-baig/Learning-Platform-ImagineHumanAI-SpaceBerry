const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const NORMALIZED_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
]);

function normalizeHost(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

function extractIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  return segments[segments.length - 1] || null;
}

export function extractYouTubeVideoId(rawValue: string | null | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (YOUTUBE_ID_REGEX.test(value)) {
    return value;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = normalizeHost(url.hostname);
  if (!NORMALIZED_HOSTS.has(host)) {
    return null;
  }

  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = extractIdFromPath(url.pathname);
  } else {
    const pathname = url.pathname;
    if (pathname.startsWith("/embed/") || pathname.startsWith("/shorts/") || pathname.startsWith("/live/")) {
      videoId = extractIdFromPath(pathname);
    } else if (pathname === "/watch" || pathname === "/playlist") {
      videoId = url.searchParams.get("v");
    } else {
      videoId = extractIdFromPath(pathname);
    }
  }

  if (!videoId) {
    return null;
  }

  const sanitized = videoId.split("?")[0].split("&")[0];
  return YOUTUBE_ID_REGEX.test(sanitized) ? sanitized : null;
}

export function isValidYouTubeUrl(value: string | null | undefined): boolean {
  return extractYouTubeVideoId(value) !== null;
}

export function getYouTubeEmbedUrl(value: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(value);
  if (!videoId) {
    return null;
  }
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}


