import React, { useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { PostCard } from "@/components/community/PostCard";
import type { Post } from "@/types/community";

const mockCommentCount = 3;
const commentsSectionMock = vi.fn();

type CommentsSectionMockProps = {
  isExpanded: boolean;
  onCountChange?: (count: number) => void;
};

vi.mock("@/components/community/CommentsSection", () => ({
  CommentsSection: ({ isExpanded, onCountChange }: CommentsSectionMockProps) => {
    commentsSectionMock({ isExpanded, onCountChange });
    useEffect(() => {
      if (isExpanded) {
        onCountChange?.(mockCommentCount);
      }
    }, [isExpanded, onCountChange]);
    return <div data-testid="comments-section-mock" />;
  },
}));

const buildPost = (overrides: Partial<Post> = {}): Post => {
  const now = Timestamp.fromDate(new Date("2024-01-01"));
  return {
    id: "post-1",
    authorId: "author-1",
    content: "What inspired you today?",
    intentTag: "reflecting",
    createdAt: now,
    updatedAt: now,
    commentsCount: 0,
    ...overrides,
  };
};

describe("PostCard", () => {
  it("updates the comment count label when CommentsSection reports a new count", () => {
    render(
      <PostCard
        clubId="club-1"
        post={buildPost()}
        currentUserId="author-1"
      />
    );

    expect(screen.getByText("0 comments")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view comments/i }));

    expect(screen.getByText("3 comments")).toBeInTheDocument();
  });
});


