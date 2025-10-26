"use client";

import { useEffect, useId, type ReactNode } from "react";
import { Activity, ExternalLink, MapPin, Timer, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type {
  CompetitorAnalysisDataPart,
  RegionInterest,
  SearchInsight,
  TrendPoint,
} from "@/types/competitor-analysis";

interface CompetitorMindmapOverlayProps {
  analysis: CompetitorAnalysisDataPart;
  onClose: () => void;
}

export function CompetitorMindmapOverlay({
  analysis,
  onClose,
}: CompetitorMindmapOverlayProps) {
  const { payload, generatedAt, durationMs, error } = analysis;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const generatedLabel = formatExactTimestamp(generatedAt);
  const durationLabel =
    typeof durationMs === "number"
      ? `${Math.max(0.1, durationMs / 1000).toFixed(1)}s`
      : "n/a";

  if (!payload) {
    return (
      <OverlayShell
        onClose={onClose}
        generatedLabel={generatedLabel}
        durationLabel={durationLabel}
        query={analysis.query}
      >
        <div className="px-8 py-12 text-center text-sm text-red-600">
          <p className="font-semibold">
            BrightData competitor intelligence is unavailable.
          </p>
          {error && <p className="mt-3 text-red-500">{error}</p>}
          <p className="mt-6 text-xs text-gray-500">
            Try again in a few moments or adjust your query to broaden the
            results.
          </p>
        </div>
      </OverlayShell>
    );
  }

  const insights = payload.searchInsights;
  const trends = payload.googleTrends;
  const interestPoints = trends.interestOverTime;
  const topRegions = trends.topRegions;
  const rawDataUrl = createDataUrl(analysis);

  const keySignals = buildKeySignals(
    insights,
    interestPoints,
    topRegions,
    trends.success
  );

  return (
    <OverlayShell
      onClose={onClose}
      generatedLabel={generatedLabel}
      durationLabel={durationLabel}
      query={payload.query}
      insightsCount={insights.length}
      trendSummary={
        trends.success
          ? `${interestPoints.length} datapoints`
          : "Trends unavailable"
      }
      showErrorBanner={Boolean(error)}
      errorMessage={error}
    >
      <ScrollArea className="max-h-[calc(90vh-10rem)] px-8 py-6">
        <div
          className="relative grid gap-8 py-4"
          style={{ gridTemplateColumns: "minmax(0,1fr) 260px minmax(0,1fr)" }}
        >
          <div className="space-y-4">
            <SectionTitle label="Competitive Signals" align="right" />
            {insights.length ? (
              insights.map((insight, index) => (
                <MindmapNode
                  key={insight.url ?? `${insight.title}-${index}`}
                  direction="left"
                  badge={`#${index + 1}`}
                  title={insight.title}
                  description={insight.snippet}
                  href={insight.url}
                  meta={insight.source}
                />
              ))
            ) : (
              <EmptyState
                direction="left"
                message="No competitive signals returned for this query."
              />
            )}
          </div>

          <div className="relative flex flex-col items-center gap-6">
            <MindmapHub
              query={payload.query}
              insightsCount={insights.length}
              trendAvailable={trends.success}
              primaryDomain={safeHostname(insights[0]?.url)}
            />
            <TrendsMiniChart points={interestPoints} success={trends.success} />
            {keySignals.length > 0 && <SignalCard signals={keySignals} />}
          </div>

          <div className="space-y-4">
            <SectionTitle label="Trend Hotspots" align="left" />
            {trends.success ? (
              topRegions
                .slice(0, 4)
                .map((region, index) => (
                  <MindmapNode
                    key={`${region.region}-${index}`}
                    direction="right"
                    badge={index === 0 ? "Peak region" : `Region #${index + 1}`}
                    title={region.region}
                    description={`Interest score ${region.value}`}
                    icon={<MapPin className="h-3 w-3" />}
                  />
                ))
            ) : (
              <EmptyState
                direction="right"
                message={
                  trends.error ??
                  "Google Trends data unavailable for this query."
                }
              />
            )}
            {rawDataUrl && (
              <MindmapNode
                direction="right"
                badge="Raw snapshot"
                title="Download JSON excerpt"
                description="Capture the BrightData payload for deeper offline analysis."
                href={rawDataUrl}
                downloadName={`${payload.query.replace(
                  /\s+/g,
                  "-"
                )}-brightdata.json`}
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </OverlayShell>
  );
}

interface OverlayShellProps {
  children: ReactNode;
  onClose: () => void;
  generatedLabel: string;
  durationLabel: string;
  query: string;
  insightsCount?: number;
  trendSummary?: string;
  showErrorBanner?: boolean;
  errorMessage?: string;
}

function OverlayShell({
  children,
  onClose,
  generatedLabel,
  durationLabel,
  query,
  insightsCount,
  trendSummary,
  showErrorBanner,
  errorMessage,
}: OverlayShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex h-full w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-sky-100 bg-linear-to-br from-white via-sky-50 to-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-500 transition hover:text-slate-900"
          aria-label="Close mindmap overlay"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-none flex-wrap items-start justify-between gap-6 border-b border-white/70 bg-white/60 px-8 py-6 pr-16">
          <div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-sky-200 bg-sky-50 text-sky-700"
              >
                BrightData
              </Badge>
              <span className="text-xs uppercase tracking-[0.20em] text-sky-500">
                Competitor Intelligence Graph
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              {query}
            </h2>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>Generated {generatedLabel}</span>
              <span>
                <Timer className="mr-1 inline h-3 w-3" />
                {durationLabel}
              </span>
              {typeof insightsCount === "number" && (
                <span>{insightsCount} web signals</span>
              )}
              {trendSummary && <span>{trendSummary}</span>}
            </div>
          </div>
        </div>

        {showErrorBanner && errorMessage && (
          <div className="flex-none border-b border-red-100 bg-red-50 px-8 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

interface MindmapNodeProps {
  direction: "left" | "right";
  title: string;
  description?: string;
  href?: string;
  meta?: string;
  badge?: string;
  icon?: React.ReactNode;
  downloadName?: string;
}

function MindmapNode({
  direction,
  title,
  description,
  href,
  meta,
  badge,
  icon,
  downloadName,
}: MindmapNodeProps) {
  const alignment =
    direction === "left"
      ? "items-end text-right pr-6"
      : "items-start text-left pl-6";
  const linePosition = direction === "left" ? "-right-12" : "-left-12";
  const dotPosition = direction === "left" ? "-right-3" : "-left-3";
  const palette =
    direction === "left"
      ? "border-sky-100 bg-sky-50/80"
      : "border-emerald-100 bg-emerald-50/80";

  return (
    <div
      className={`relative flex flex-col gap-1 rounded-2xl border ${palette} px-4 py-3 shadow-sm ${alignment}`}
    >
      <span
        className={`pointer-events-none absolute top-1/2 h-px w-12 bg-sky-200 ${linePosition}`}
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute top-1/2 h-3 w-3 rounded-full border-2 border-white ${dotPosition} ${
          direction === "left" ? "bg-sky-400" : "bg-emerald-400"
        }`}
        aria-hidden
      />
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-sky-600">
        {badge}
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          download={downloadName}
          className="group flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline"
        >
          {icon}
          <span>{title}</span>
          <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
        </a>
      ) : (
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
        </span>
      )}
      {meta && (
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          {meta}
        </span>
      )}
      {description && (
        <p className="text-xs text-slate-600 line-clamp-3">{description}</p>
      )}
    </div>
  );
}

interface MindmapHubProps {
  query: string;
  insightsCount: number;
  trendAvailable: boolean;
  primaryDomain?: string | null;
}

function MindmapHub({
  query,
  insightsCount,
  trendAvailable,
  primaryDomain,
}: MindmapHubProps) {
  return (
    <div className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-full border-2 border-sky-200 bg-white/85 px-8 py-8 text-center shadow-xl">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-500">
        Focus
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{query}</h3>
      <p className="text-xs text-slate-500">
        {insightsCount} web signals •{" "}
        {trendAvailable ? "Trends active" : "Trends offline"}
      </p>
      {primaryDomain && (
        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] uppercase tracking-wide text-sky-600">
          Primary coverage: {primaryDomain}
        </span>
      )}
    </div>
  );
}

interface TrendsMiniChartProps {
  points: TrendPoint[];
  success: boolean;
}

function TrendsMiniChart({ points, success }: TrendsMiniChartProps) {
  const gradientId = useId();

  if (!success) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-xs text-slate-500">
        Google Trends data unavailable for this query.
      </div>
    );
  }

  if (!points.length) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-xs text-slate-500">
        No interest-over-time datapoints returned.
      </div>
    );
  }

  const { linePath, areaPath, maxValue, minValue } = buildTrendPaths(points);
  const peak = points.reduce(
    (prev, current) => (current.value > prev.value ? current : prev),
    points[0]
  );

  return (
    <div className="w-full max-w-sm rounded-2xl border border-sky-100 bg-white/80 px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
        <Activity className="h-4 w-4" />
        Interest timeline
      </div>
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="mt-3 h-28 w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-slate-400">
        <span>{points[0]?.label}</span>
        <span>Peak {peak.value}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        Range {minValue} – {maxValue}
      </div>
    </div>
  );
}

function SignalCard({ signals }: { signals: string[] }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-4 text-sm text-amber-900 shadow-inner">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Key signals
      </p>
      <ul className="mt-2 space-y-2 text-xs leading-relaxed">
        {signals.map((signal, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>{signal}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTitle({
  label,
  align,
}: {
  label: string;
  align: "left" | "right";
}) {
  const alignment = align === "left" ? "text-left" : "text-right";
  return (
    <div
      className={`text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 ${alignment}`}
    >
      {label}
    </div>
  );
}

function EmptyState({
  direction,
  message,
}: {
  direction: "left" | "right";
  message: string;
}) {
  const alignment = direction === "left" ? "text-right" : "text-left";
  return (
    <div
      className={`rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-500 ${alignment}`}
    >
      {message}
    </div>
  );
}

function buildKeySignals(
  insights: ReadonlyArray<SearchInsight>,
  points: ReadonlyArray<TrendPoint>,
  regions: ReadonlyArray<RegionInterest>,
  trendsSuccess: boolean
) {
  const signals: string[] = [];

  if (insights.length) {
    const primary = insights[0];
    const domain = primary.url ? safeHostname(primary.url) : undefined;
    signals.push(
      `Top web signal${domain ? ` (${domain})` : ""}: ${primary.title}`
    );
  }

  if (trendsSuccess && points.length) {
    const peak = points.reduce(
      (prev, current) => (current.value > prev.value ? current : prev),
      points[0]
    );
    signals.push(
      `Peak Google interest at "${peak.label}" (score ${peak.value}).`
    );

    const trough = points.reduce(
      (prev, current) => (current.value < prev.value ? current : prev),
      points[0]
    );
    if (trough.value !== peak.value) {
      signals.push(
        `Lowest interest around "${trough.label}" (${trough.value}).`
      );
    }
  }

  if (regions.length) {
    const topRegion = regions[0];
    signals.push(
      `Strongest demand in ${topRegion.region} (score ${topRegion.value}).`
    );
  }

  return signals.slice(0, 4);
}

function buildTrendPaths(points: TrendPoint[]) {
  if (!points.length) {
    return { linePath: "", areaPath: "", maxValue: 0, minValue: 0 };
  }

  const maxValue = Math.max(...points.map((point) => point.value));
  const minValue = Math.min(...points.map((point) => point.value));
  const chartHeight = 60;
  const topPadding = 6;
  const bottomPadding = 6;
  const usableHeight = chartHeight - topPadding - bottomPadding;

  const coordinates = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * 100;
    const valueRange = Math.max(maxValue - minValue, 1);
    const normalised = (point.value - minValue) / valueRange;
    const y = chartHeight - bottomPadding - normalised * usableHeight;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  const linePath = coordinates
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");

  const areaPath = `${linePath} L 100 ${chartHeight} L 0 ${chartHeight} Z`;

  return { linePath, areaPath, maxValue, minValue };
}

function createDataUrl(analysis: CompetitorAnalysisDataPart) {
  if (!analysis.payload) {
    return undefined;
  }

  try {
    const snapshot = {
      generatedAt: analysis.generatedAt,
      durationMs: analysis.durationMs,
      query: analysis.payload.query,
      searchInsights: analysis.payload.searchInsights,
      googleTrends: analysis.payload.googleTrends,
      error: analysis.error,
    };

    return `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(snapshot, null, 2)
    )}`;
  } catch (err) {
    console.error("Failed to build BrightData snapshot url", err);
    return undefined;
  }
}

function safeHostname(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function formatExactTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }
  return date.toLocaleString();
}
