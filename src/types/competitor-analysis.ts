export interface SearchInsight {
  title: string;
  snippet: string;
  url: string;
  source?: string;
  publishedAt?: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface RegionInterest {
  region: string;
  value: number;
}

export interface GoogleTrendsSummary {
  success: boolean;
  request: {
    query: string;
    geo: string;
    dateRange: string;
    widgets: string;
  };
  interestOverTime: TrendPoint[];
  topRegions: RegionInterest[];
  rawExcerpt?: string;
  error?: string;
}

export interface CompetitorAnalysisPayload {
  query: string;
  searchInsights: SearchInsight[];
  searchRaw?: unknown;
  googleTrends: GoogleTrendsSummary;
}

export interface CompetitorAnalysisMetadata {
  kind: 'brightdata-analysis';
  query: string;
}

export interface CompetitorAnalysisDataPart {
  query: string;
  payload?: CompetitorAnalysisPayload;
  error?: string;
  generatedAt: string;
  durationMs?: number;
  source: 'brightdata';
}
