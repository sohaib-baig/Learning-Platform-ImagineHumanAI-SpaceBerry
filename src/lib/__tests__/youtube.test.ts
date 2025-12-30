import { describe, expect, it } from "vitest";
import {
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
  isValidYouTubeUrl,
} from "@/lib/youtube";

describe("youtube utils", () => {
  it("extracts ids from common URL formats", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(extractYouTubeVideoId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("handles raw ids", () => {
    expect(extractYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rejects invalid values", () => {
    expect(extractYouTubeVideoId("https://example.com/video")).toBeNull();
    expect(extractYouTubeVideoId("not-a-valid-id")).toBeNull();
  });

  it("validates embed URL generation", () => {
    expect(getYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1"
    );
  });

  it("validates URLs", () => {
    expect(isValidYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeUrl("https://example.com/video")).toBe(false);
  });
});


