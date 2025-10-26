// Shared types for the application

export interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text" | "link" | "campaign";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}
