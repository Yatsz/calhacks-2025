"use server";

import type {
  CompetitorAnalysisPayload,
  GoogleTrendsSummary,
  RegionInterest,
  SearchInsight,
  TrendPoint,
} from "@/types/competitor-analysis";

const ANTHROPIC_API_URL = process.env.CLAUDE_COMPETITOR_ENDPOINT ?? "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = process.env.CLAUDE_COMPETITOR_MODEL ?? "claude-4-5-sonnet-20241022";
const CLAUDE_WEBSEARCH_BETA = (() => {
  const value = process.env.CLAUDE_WEBSEARCH_BETA?.trim();
  return value ? value : undefined;
})();
const CLAUDE_MAX_OUTPUT_TOKENS = (() => {
  const raw = process.env.CLAUDE_COMPETITOR_MAX_TOKENS;
  const parsed = raw ? Number.parseInt(raw, 10) : 1600;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1600;
})();
const CLAUDE_WEBSEARCH_ENABLED = process.env.CLAUDE_COMPETITOR_DISABLE_WEB_SEARCH === "" ? false : true;

interface ClaudeMessageResponse {
  content: Array<{ type: string; text?: string }>;
}

interface ClaudeStructuredPayload {
  query?: string;
  searchInsights?: unknown;
  searchRaw?: unknown;
  googleTrends?: unknown;
}

/**
 * Builds a competitor analysis payload by delegating research to Claude with web search enabled.
 */
export async function buildCompetitorAnalysisPayload(query: string): Promise<CompetitorAnalysisPayload> {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    throw new Error("Competitor analysis query is required.");
  }

  let claudePayload: ClaudeStructuredPayload;
  try {
    claudePayload = await callClaudeWebSearch(trimmedQuery);
  } catch (error) {
    console.error("BrightData proxy error", error);
    throw new Error(buildBrightDataFriendlyError(error));
  }

  return normalizeClaudePayload(trimmedQuery, claudePayload);
}

interface ClaudeRequestAttempt {
  label: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  allowToolFallback?: boolean;
}

async function callClaudeWebSearch(query: string): Promise<ClaudeStructuredPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": process.env.CLAUDE_COMPETITOR_API_VERSION ?? "2023-06-01",
  };

  const attempts: ClaudeRequestAttempt[] = [];

  if (CLAUDE_WEBSEARCH_ENABLED) {
    const headersWithBeta = { ...baseHeaders };
    if (CLAUDE_WEBSEARCH_BETA) {
      headersWithBeta["anthropic-beta"] = CLAUDE_WEBSEARCH_BETA;
    }

    attempts.push({
      label: CLAUDE_WEBSEARCH_BETA ? "web-search-with-beta" : "web-search",
      headers: headersWithBeta,
      body: buildClaudeRequestBody(query, { includeWebSearchTool: true }),
      allowToolFallback: true,
    });

    if (CLAUDE_WEBSEARCH_BETA) {
      attempts.push({
        label: "web-search-no-beta",
        headers: baseHeaders,
        body: buildClaudeRequestBody(query, { includeWebSearchTool: true }),
        allowToolFallback: true,
      });
    }
  }

  attempts.push({
    label: "baseline",
    headers: baseHeaders,
    body: buildClaudeRequestBody(query, { includeWebSearchTool: false }),
  });

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: attempt.headers,
        body: JSON.stringify(attempt.body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const normalizedError = errorText.toLowerCase();
        const isBetaRejection = normalizedError.includes("anthropic-beta");
        const isToolRejection = normalizedError.includes("web_search") || normalizedError.includes("tool");

        const attemptError = new Error(
          `Claude web search request failed (${response.status} ${response.statusText}): ${errorText || "unknown error"
          }`
        );

        if (attempt.allowToolFallback && (isBetaRejection || isToolRejection)) {
          console.warn(`Claude attempt "${attempt.label}" rejected; retrying without web search tools.`);
          lastError = attemptError;
          continue;
        }

        throw attemptError;
      }

      const json = (await response.json()) as ClaudeMessageResponse;
      const rawText = extractTextContent(json);
      const parsed = safeJsonParse(rawText);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Claude web search returned an unexpected payload shape.");
      }

      if (attempt.label !== "baseline") {
        console.info(`Claude attempt "${attempt.label}" succeeded.`);
      }

      return parsed as ClaudeStructuredPayload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Claude attempt "${attempt.label}" failed`, lastError);
    }
  }

  throw lastError ?? new Error("Claude web search failed for all attempts.");
}

function buildUserPrompt(query: string) {
  return [
    "Research the following competitor landscape using web search:",
    `Query: "${query}"`,
    "",
    "Return STRICT JSON that matches this schema:",
    "{",
    '  "query": string; // echo the user query',
    '  "searchInsights": Array<{',
    '     "title": string;',
    '     "snippet": string;',
    '     "url": string;',
    '     "source"?: string;',
    '     "publishedAt"?: string;',
    '  }>; // at least 3 distinct URLs from the past 12 months',
    '  "googleTrends": {',
    '     "success": boolean;',
    '     "request": { "query": string; "geo": string; "dateRange": string; "widgets": string; };',
    '     "interestOverTime": Array<{ "label": string; "value": number; }>; // normalized 0-100 scale',
    '     "topRegions": Array<{ "region": string; "value": number; }>;',
    '     "rawExcerpt"?: string;',
    '     "error"?: string;',
    '  };',
    '  "searchRaw"?: unknown; // optional debug metadata or retrieved snippets',
    "}",
    "",
    "If web search yields limited data, keep the schema but populate empty arrays and set success=false. Do not fabricate URLs.",
    "Only return this JSON object.",
  ].join("\n");
}

function buildClaudeRequestBody(query: string, options: { includeWebSearchTool: boolean }) {
  const tools = options.includeWebSearchTool
    ? [
      {
        type: "web_search",
        name: "web_search",
        description:
          "Search the live web for up-to-date competitor information, recent campaigns, pricing changes, and market activity.",
      },
    ]
    : undefined;

  const body: Record<string, unknown> = {
    system:
      "You are an on-demand competitive intelligence analyst. Use web search to surface recent competitor moves, marketing campaigns, and market signals. " +
      "Always respond with STRICT JSON that matches the provided schema. Do not include commentary, preambles, or code fences.",
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildUserPrompt(query),
          },
        ],
      },
    ],
  };

  if (tools) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  return body;
}

function extractTextContent(response: ClaudeMessageResponse) {
  if (!response?.content?.length) {
    return "";
  }

  for (const item of response.content) {
    if (item.type === "text" && typeof item.text === "string" && item.text.trim().length > 0) {
      return stripCodeFence(item.text.trim());
    }
  }

  return "";
}

function stripCodeFence(payload: string) {
  const fenceMatch = payload.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return payload;
}

function normalizeClaudePayload(query: string, payload: ClaudeStructuredPayload): CompetitorAnalysisPayload {
  const insights = normalizeSearchInsights(payload.searchInsights);
  const trends = normalizeTrends(payload.googleTrends, query);

  return {
    query: payload.query && typeof payload.query === "string" ? payload.query : query,
    searchInsights: insights,
    searchRaw: payload.searchRaw ?? payload,
    googleTrends: trends,
  };
}

function normalizeSearchInsights(value: unknown): SearchInsight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupe = new Set<string>();

  return value
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((item) => {
      const title = coerceString(item!.title) ?? coerceString(item!.snippet) ?? "Untitled insight";
      const url = coerceString(item!.url);
      if (!url) return null;

      const snippet = coerceString(item!.snippet) ?? "";
      const source = coerceString(item!.source);
      const publishedAt = coerceString(item!.publishedAt);

      const dedupeKey = `${title}-${url}`;
      if (dedupe.has(dedupeKey)) {
        return null;
      }
      dedupe.add(dedupeKey);

      return {
        title,
        snippet,
        url,
        source: source || inferSourceFromUrl(url),
        publishedAt: publishedAt ?? undefined,
      } satisfies SearchInsight;
    })
    .filter((item): item is SearchInsight => Boolean(item))
    .slice(0, 6);
}

function normalizeTrends(value: unknown, query: string): GoogleTrendsSummary {
  if (!value || typeof value !== "object") {
    return buildEmptyTrendSummary(query, "BrightData service did not return trend data.");
  }

  const data = value as Record<string, unknown>;
  const request = data.request && typeof data.request === "object" ? (data.request as Record<string, unknown>) : {};

  const normalizedRequest = {
    query: coerceString(request.query) ?? query,
    geo: coerceString(request.geo) ?? "us",
    dateRange: coerceString(request.dateRange) ?? "last-12-months",
    widgets: coerceString(request.widgets) ?? "interest_over_time,geo_map",
  };

  const interestOverTime = normalizeTrendPoints(data.interestOverTime);
  const topRegions = normalizeRegionInterest(data.topRegions);
  const success = interestOverTime.length > 0 || topRegions.length > 0
    ? Boolean(data.success ?? true)
    : Boolean(data.success ?? false);

  return {
    success,
    request: normalizedRequest,
    interestOverTime,
    topRegions,
    rawExcerpt: coerceString(data.rawExcerpt),
    error: coerceString(data.error),
  };
}

function normalizeTrendPoints(value: unknown): TrendPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((item) => {
      const label = coerceString(item!.label) ?? coerceString(item!.time) ?? coerceString(item!.formattedTime);
      const valueNum = coerceNumber(item!.value);
      if (!label || valueNum === undefined) return null;
      return {
        label,
        value: clampNumber(valueNum, 0, 100),
      } satisfies TrendPoint;
    })
    .filter((item): item is TrendPoint => Boolean(item))
    .slice(-12);
}

function normalizeRegionInterest(value: unknown): RegionInterest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((item) => {
      const region =
        coerceString(item!.region) ??
        coerceString(item!.geoName) ??
        coerceString(item!.location) ??
        coerceString(item!.country);
      const score = coerceNumber(item!.value);
      if (!region || score === undefined) return null;
      return {
        region,
        value: clampNumber(score, 0, 100),
      } satisfies RegionInterest;
    })
    .filter((item): item is RegionInterest => Boolean(item))
    .slice(0, 10);
}

function buildEmptyTrendSummary(query: string, error?: string): GoogleTrendsSummary {
  return {
    success: false,
    request: {
      query,
      geo: "us",
      dateRange: "last-12-months",
      widgets: "interest_over_time,geo_map",
    },
    interestOverTime: [],
    topRegions: [],
    error: error ?? "Trend data unavailable.",
  };
}

function coerceString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function coerceNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function inferSourceFromUrl(url: string | undefined) {
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function safeJsonParse(payload: string | null | undefined) {
  if (!payload || typeof payload !== "string") {
    return payload;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function buildBrightDataFriendlyError(error: unknown) {
  if (error instanceof Error) {
    const statusMatch = error.message.match(/\((\d{3}[^)]*)\)/);
    const statusNote = statusMatch ? statusMatch[1].trim() : undefined;
    return `BrightData service request failed${statusNote ? ` (${statusNote})` : ""}. Please try again later.`;
  }
  return "BrightData service request failed. Please try again later.";
}
