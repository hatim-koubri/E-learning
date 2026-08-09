import {describe, expect, it} from "vitest";
import {parseYouTubeUrl} from "@/lib/youtube";

describe("normalisation des liens YouTube", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123XYZ_-&t=45", "abc123XYZ_-"],
    ["https://youtu.be/abc123XYZ_-?si=tracking", "abc123XYZ_-"],
    ["https://youtube.com/shorts/abc123XYZ_-?feature=share", "abc123XYZ_-"],
    ["https://m.youtube.com/embed/abc123XYZ_-", "abc123XYZ_-"],
  ])("normalise %s", (url, id) => {
    expect(parseYouTubeUrl(url)).toEqual({
      id,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  });

  it.each([
    "http://youtube.com/watch?v=abc123XYZ_-",
    "https://youtube.com.evil.test/watch?v=abc123XYZ_-",
    "https://www.youtube.com/channel/abc123XYZ_-",
    "javascript:alert(1)",
  ])("rejette une URL non autorisée : %s", (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });
});
