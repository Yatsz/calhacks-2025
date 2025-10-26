// Shared types for the application

export interface ContentItem {
  id: string;
  section: "inspiration" | "past-work" | "current-work";
  type: "image" | "video" | "pdf" | "text";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}
