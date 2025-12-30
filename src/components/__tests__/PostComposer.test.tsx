import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import {
  PostComposer,
  validatePostInput,
  MAX_POST_LENGTH,
  VALIDATION_MESSAGES,
} from "../community/PostComposer";
import { createPost } from "@/lib/firestore/community";

vi.mock("@/lib/firestore/community", () => ({
  createPost: vi.fn(),
  MAX_POST_LENGTH: 800,
}));

const mockedCreatePost = createPost as unknown as vi.Mock;

describe("validatePostInput", () => {
  it("rejects empty content", () => {
    const result = validatePostInput({ content: "   ", intentTag: "celebration" });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(VALIDATION_MESSAGES.missingContent);
  });

  it("rejects content over the max length", () => {
    const longContent = "a".repeat(MAX_POST_LENGTH + 1);
    const result = validatePostInput({ content: longContent, intentTag: "celebration" });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(VALIDATION_MESSAGES.overLimit);
  });

  it("rejects missing intent tag", () => {
    const result = validatePostInput({ content: "Valid", intentTag: null });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(VALIDATION_MESSAGES.missingTag);
  });

  it("accepts trimmed valid content with a tag", () => {
    const result = validatePostInput({ content: "  Hello club ", intentTag: "celebration" });
    expect(result.isValid).toBe(true);
    expect(result.sanitizedContent).toBe("Hello club");
  });
});

describe("PostComposer", () => {
  const defaultProps = {
    clubId: "club-123",
    authorId: "user-456",
  };

  beforeEach(() => {
    mockedCreatePost.mockReset();
  });

  it("disables submit until content and tag are provided", () => {
    render(<PostComposer {...defaultProps} />);

    expect(screen.queryByRole("button", { name: /post/i })).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("What would you like to explore together?"),
      { target: { value: "Thought of the day" } }
    );

    const submitButton = screen.getByRole("button", { name: /post/i });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Open for Discussion" }));
    expect(submitButton).not.toBeDisabled();
  });

  it("creates a post and clears the textarea on success", async () => {
    mockedCreatePost.mockResolvedValue("new-post-id");

    render(<PostComposer {...defaultProps} />);

    fireEvent.change(
      screen.getByPlaceholderText("What would you like to explore together?"),
      { target: { value: "What energised you this week?" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Open for Discussion" }));
    fireEvent.click(screen.getByRole("button", { name: /post/i }));

    await waitFor(() => {
      expect(mockedCreatePost).toHaveBeenCalledWith(defaultProps.clubId, {
        authorId: defaultProps.authorId,
        content: "What energised you this week?",
        intentTag: "open_for_discussion",
        commentsCount: 0,
      });
    });

    expect(
      screen.getByPlaceholderText("What would you like to explore together?")
    ).toHaveValue("");
    expect(screen.getByText(VALIDATION_MESSAGES.success)).toBeInTheDocument();
  });

  it("sends sanitized payload to onPostCreated callback", async () => {
    mockedCreatePost.mockResolvedValue("optimistic-post-id");
    const onPostCreated = vi.fn();

    render(<PostComposer {...defaultProps} onPostCreated={onPostCreated} />);

    fireEvent.change(
      screen.getByPlaceholderText("What would you like to explore together?"),
      { target: { value: "  Optimistic hello world  " } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Open for Discussion" }));
    fireEvent.click(screen.getByRole("button", { name: /post/i }));

    await waitFor(() => {
      expect(onPostCreated).toHaveBeenCalledWith({
        postId: "optimistic-post-id",
        content: "Optimistic hello world",
        intentTag: "open_for_discussion",
        authorId: defaultProps.authorId,
      });
    });
  });

  it("prompts the user to pick a tag when content exists without a selection", () => {
    render(<PostComposer {...defaultProps} />);

    fireEvent.change(
      screen.getByPlaceholderText("What would you like to explore together?"),
      { target: { value: "Need input" } }
    );

    expect(screen.getByText(VALIDATION_MESSAGES.missingTag)).toBeInTheDocument();
    expect(mockedCreatePost).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /post/i })).toBeDisabled();
  });

  it("shows an error when Firestore call fails", async () => {
    mockedCreatePost.mockRejectedValue(new Error("network"));

    render(<PostComposer {...defaultProps} />);

    fireEvent.change(
      screen.getByPlaceholderText("What would you like to explore together?"),
      { target: { value: "Need help with OKRs" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Seeking Help" }));
    fireEvent.click(screen.getByRole("button", { name: /post/i }));

    await waitFor(() => {
      expect(
        screen.getByText(VALIDATION_MESSAGES.genericError)
      ).toBeInTheDocument();
    });
  });
});
