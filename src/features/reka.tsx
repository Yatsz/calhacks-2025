// --- Highlight Reel Generation ---------------------------------------------
// Docs: POST /v1/creator/reels (submit), GET /v1/creator/reels/{id} (poll)
// https://docs.reka.ai/vision/highlight-reel-generation

import axios from "axios";

const BASE_URL = "https://vision-agent.api.reka.ai";

export type ReelTemplate = "moments" | "compilation";

export interface ReelGenerationConfig {
  template?: ReelTemplate;          // default: "moments"
  num_generations?: number;         // default: 1
  min_duration_seconds?: number;    // optional
  max_duration_seconds?: number;    // optional
}

export interface ReelRenderingConfig {
  subtitles?: boolean;              // default: true
  aspect_ratio?: string;            // default: "9:16"
}

export interface CreateReelRequest {
  video_urls: string[];             // input videos (public/presigned)
  prompt: string;                   // “what to make”
  generation_config?: ReelGenerationConfig;
  rendering_config?: ReelRenderingConfig;
  stream?: boolean;                 // optional (SSE); this helper uses submit+poll
}

export interface ReelJob {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  created_at?: string;
  updated_at?: string;
  // When completed, API returns an `output` array. Keep loose typing to avoid breakage.
  output?: Array<{
    url?: string;                   // downloadable reel URL
    // … other fields may be present (duration, subtitles url, etc.)
    [k: string]: unknown;
  }>;
  error?: string | null;
  [k: string]: unknown;
}

/** Submit a highlight-reel job. Returns the job metadata with `id`. */
export async function createReel(
  apiKey: string,
  body: CreateReelRequest
): Promise<ReelJob> {
  const { data } = await axios.post<ReelJob>(
    `${BASE_URL}/v1/creator/reels`,
    body,
    { headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" } }
  );
  return data;
}

/** Get highlight-reel job status by id. When `status === "completed"`, `output` is populated. */
export async function getReelStatus(
  apiKey: string,
  id: string
): Promise<ReelJob> {
  const { data } = await axios.get<ReelJob>(
    `${BASE_URL}/v1/creator/reels/${id}`,
    { headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" } }
  );
  return data;
}

/** Poll until the reel is completed or failed. */
export async function waitForReel(
  apiKey: string,
  id: string,
  {
    intervalMs = 4000,
    timeoutMs = 20 * 60 * 1000,
  }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<ReelJob> {
  const start = Date.now();
  while (true) {
    const job = await getReelStatus(apiKey, id);
    if (job.status === "completed" || job.status === "failed") return job;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Reel generation timed out (last status=${job.status})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// --- Video Q&A --------------------------------------------------------------
// Docs: POST /qa/chat (non-stream), POST /qa/stream (SSE)
// https://docs.reka.ai/vision/video-qa

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VideoQARequest {
  video_id?: string;          // one of video_id or video_url
  video_url?: string;         // (indexed video_id recommended)
  messages: ChatMessage[];    // single- or multi-turn
}

export interface VideoQAResponse {
  answer: string;
  confidence?: number;
  video_id?: string;
  question?: string;
  timestamp?: number;
  [k: string]: unknown;
}

/** Ask a question (non-streaming). */
export async function askVideo(
  apiKey: string,
  req: VideoQARequest
): Promise<VideoQAResponse> {
  const { data } = await axios.post<VideoQAResponse>(
    `${BASE_URL}/qa/chat`,
    req,
    { headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" } }
  );
  return data;
}

/**
 * Stream a Q&A response (SSE).
 * Emits parsed "data:" JSON events via onEvent. Returns the final JSON event it saw.
 */
export async function streamVideoQA(
  apiKey: string,
  req: VideoQARequest,
  onEvent: (evt: any) => void
): Promise<any> {
  const res = await axios.post(`${BASE_URL}/qa/stream`, req, {
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    responseType: "stream",
  });

  return await new Promise((resolve, reject) => {
    let last: any = null;
    const stream = res.data as NodeJS.ReadableStream;

    stream.on("data", (chunk: Buffer) => {
      const lines = chunk.toString("utf8").split(/\r?\n/);
      for (const line of lines) {
        if (!line || !line.startsWith("data:")) continue;
        const json = line.slice(5).trim(); // after "data:"
        try {
          const evt = JSON.parse(json);
          last = evt;
          onEvent?.(evt);
        } catch {
          // swallow partials / keep-alives
        }
      }
    });

    stream.on("end", () => resolve(last));
    stream.on("error", reject);
  });
}
