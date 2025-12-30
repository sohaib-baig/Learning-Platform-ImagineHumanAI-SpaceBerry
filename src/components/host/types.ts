export interface HostLesson {
  id: string;
  title: string;
  description?: string;
  order: number;
  durationMinutes: number | null;
  videoUrl?: string;
  contentType: "video" | "article" | "exercise";
  contentBlocks?: Array<{ type: string; value: string }>;
  content?: string;
  isPublished: boolean;
  isArchived: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

