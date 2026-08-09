export type YouTubeResource = {
  id: string;
  watchUrl: string;
  thumbnailUrl: string;
};

const VIDEO_ID = /^[A-Za-z0-9_-]{3,32}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export function parseYouTubeUrl(raw: string): YouTubeResource | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;

    let id = "";
    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (YOUTUBE_HOSTS.has(host)) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
      else if (parts[0] === "shorts" || parts[0] === "embed") id = parts[1] ?? "";
    }

    if (!VIDEO_ID.test(id)) return null;
    return {
      id,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}
