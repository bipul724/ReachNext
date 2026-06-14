"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useCampaigns } from "../../../hooks/use-campaigns";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  MousePointerClick,
  Loader2,
  AlertCircle,
  Check,
  Trophy,
  Sparkles,
  RefreshCw,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Success score — same pure function used on the campaign detail page
// ---------------------------------------------------------------------------

function calculateSuccessScore(stats: any): number {
  const sent = stats.sent || 0;
  if (sent === 0) return 0;

  const delivered = stats.delivered || 0;
  const opened = stats.opened || 0;
  const clicked = stats.clicked || 0;
  const converted = stats.convertedOrders || 0;

  const delRate = delivered / sent;
  const openRate = delivered > 0 ? opened / delivered : 0;
  const clickRate = opened > 0 ? clicked / opened : 0;
  const convRate = clicked > 0 ? converted / clicked : 0;

  const score = delRate * 15 + openRate * 25 + clickRate * 30 + convRate * 30;
  return Math.min(100, Math.round(score * 1.3));
}

// ---------------------------------------------------------------------------
// Metric row definitions
// ---------------------------------------------------------------------------

interface MetricRow {
  label: string;
  getValue: (stats: any, campaign: any) => string | number;
  getRaw: (stats: any, campaign: any) => number;
  format: "number" | "percent" | "currency" | "score";
  winnerBadgeColor: string;
  higherIsBetter: boolean;
}

const METRICS: MetricRow[] = [
  {
    label: "Recipients",
    getValue: (_, c) => c.totalRecipients?.toLocaleString() || "0",
    getRaw: (_, c) => c.totalRecipients || 0,
    format: "number",
    winnerBadgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400",
    higherIsBetter: true,
  },
  {
    label: "Delivery Rate",
    getValue: (s) => {
      const sent = s.sent || 0;
      const delivered = s.delivered || 0;
      return sent > 0 ? `${((delivered / sent) * 100).toFixed(1)}%` : "—";
    },
    getRaw: (s) => {
      const sent = s.sent || 0;
      return sent > 0 ? (s.delivered || 0) / sent : 0;
    },
    format: "percent",
    winnerBadgeColor: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400",
    higherIsBetter: true,
  },
  {
    label: "Open Rate",
    getValue: (s) => {
      const delivered = s.delivered || 0;
      const opened = s.opened || 0;
      return delivered > 0 ? `${((opened / delivered) * 100).toFixed(1)}%` : "—";
    },
    getRaw: (s) => {
      const delivered = s.delivered || 0;
      return delivered > 0 ? (s.opened || 0) / delivered : 0;
    },
    format: "percent",
    winnerBadgeColor: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400",
    higherIsBetter: true,
  },
  {
    label: "Click-Through Rate",
    getValue: (s) => {
      const opened = s.opened || 0;
      const clicked = s.clicked || 0;
      return opened > 0 ? `${((clicked / opened) * 100).toFixed(1)}%` : "—";
    },
    getRaw: (s) => {
      const opened = s.opened || 0;
      return opened > 0 ? (s.clicked || 0) / opened : 0;
    },
    format: "percent",
    winnerBadgeColor: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400",
    higherIsBetter: true,
  },
  {
    label: "Conversions",
    getValue: (s) => s.convertedOrders || 0,
    getRaw: (s) => s.convertedOrders || 0,
    format: "number",
    winnerBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400",
    higherIsBetter: true,
  },
  {
    label: "Revenue",
    getValue: (s) => {
      const rev = s.conversionRevenue || 0;
      return rev > 0 ? `₹${rev.toLocaleString("en-IN")}` : "—";
    },
    getRaw: (s) => s.conversionRevenue || 0,
    format: "currency",
    winnerBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400",
    higherIsBetter: true,
  },
  {
    label: "Success Score",
    getValue: (s) => `${calculateSuccessScore(s)}/100`,
    getRaw: (s) => calculateSuccessScore(s),
    format: "score",
    winnerBadgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400",
    higherIsBetter: true,
  },
];

// ---------------------------------------------------------------------------
// computeFacts — deterministic fact extraction reusing METRICS winner logic
// ---------------------------------------------------------------------------

interface ComparisonWinner {
  name: string;
  value: number;
}

interface ComparisonFacts {
  revenueWinner: ComparisonWinner | null;
  openRateWinner: ComparisonWinner | null;
  ctrWinner: ComparisonWinner | null;
  conversionWinner: ComparisonWinner | null;
  successScoreWinner: ComparisonWinner | null;
  campaigns: { name: string; channel: string }[];
}

interface InsightsResponse {
  summary: string;
  patterns: string[];
  recommendations: string[];
}

function computeFacts(selectedCampaigns: any[]): ComparisonFacts {
  const findWinner = (metricLabel: string): ComparisonWinner | null => {
    const metric = METRICS.find((m) => m.label === metricLabel);
    if (!metric) return null;

    let bestCampaign: any = null;
    let bestVal = -Infinity;

    for (const c of selectedCampaigns) {
      const v = metric.getRaw(c.stats || {}, c);
      if (v > bestVal) {
        bestVal = v;
        bestCampaign = c;
      }
    }

    if (!bestCampaign || bestVal <= 0) return null;

    // For percentages, send as human-readable values (e.g. 45.2 not 0.452)
    const displayValue =
      metric.format === "percent"
        ? Math.round(bestVal * 1000) / 10
        : Math.round(bestVal * 100) / 100;

    return { name: bestCampaign.name, value: displayValue };
  };

  return {
    revenueWinner: findWinner("Revenue"),
    openRateWinner: findWinner("Open Rate"),
    ctrWinner: findWinner("Click-Through Rate"),
    conversionWinner: findWinner("Conversions"),
    successScoreWinner: findWinner("Success Score"),
    campaigns: selectedCampaigns.map((c) => ({
      name: c.name,
      channel: c.channel,
    })),
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CampaignComparison() {
  const { campaigns, isLoading, isError } = useCampaigns();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- AI Insights state ---
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const insightsCacheRef = useRef<Map<string, InsightsResponse>>(new Map());

  // Filter to launched campaigns only (have stats)
  const launchedCampaigns = useMemo(
    () => (campaigns || []).filter((c: any) => c.status !== "draft"),
    [campaigns]
  );

  const selectedCampaigns = useMemo(
    () => launchedCampaigns.filter((c: any) => selectedIds.has(c.id)),
    [launchedCampaigns, selectedIds]
  );

  // Find winner for each metric row
  const winners = useMemo(() => {
    if (selectedCampaigns.length < 2) return new Map<string, string>();
    const map = new Map<string, string>();

    for (const metric of METRICS) {
      let bestId = "";
      let bestVal = -Infinity;

      for (const camp of selectedCampaigns) {
        const raw = metric.getRaw(camp.stats || {}, camp);
        if (raw > bestVal) {
          bestVal = raw;
          bestId = camp.id;
        }
      }

      if (bestVal > 0) {
        map.set(metric.label, bestId);
      }
    }

    return map;
  }, [selectedCampaigns]);

  // Top-level winner cards
  const topWinners = useMemo(() => {
    if (selectedCampaigns.length < 2) return null;

    const revenueMetric = METRICS.find((m) => m.label === "Revenue")!;
    const openMetric = METRICS.find((m) => m.label === "Open Rate")!;
    const convMetric = METRICS.find((m) => m.label === "Conversions")!;

    const findBest = (metric: MetricRow) => {
      let best: any = null;
      let bestVal = -Infinity;
      for (const c of selectedCampaigns) {
        const v = metric.getRaw(c.stats || {}, c);
        if (v > bestVal) {
          bestVal = v;
          best = c;
        }
      }
      return best && bestVal > 0 ? { campaign: best, value: metric.getValue(best.stats || {}, best) } : null;
    };

    return {
      revenue: findBest(revenueMetric),
      engagement: findBest(openMetric),
      conversions: findBest(convMetric),
    };
  }, [selectedCampaigns]);

  // --- AI Insights handler ---
  const generateInsights = useCallback(
    async (forceRegenerate = false) => {
      if (selectedCampaigns.length < 2) return;

      // Build cache key from sorted campaign IDs
      const cacheKey = [...selectedIds].sort().join("-");

      // Check cache (skip if force-regenerating)
      if (!forceRegenerate && insightsCacheRef.current.has(cacheKey)) {
        setInsights(insightsCacheRef.current.get(cacheKey)!);
        setInsightsError(null);
        return;
      }

      setIsLoadingInsights(true);
      setInsightsError(null);

      try {
        const facts = computeFacts(selectedCampaigns);

        const res = await fetch("/api/compare/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facts }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            errBody.error || `Request failed with status ${res.status}`
          );
        }

        const data: InsightsResponse = await res.json();

        // Cache the result
        insightsCacheRef.current.set(cacheKey, data);
        setInsights(data);
      } catch (err: any) {
        setInsightsError(
          err.message || "Failed to generate insights. Please try again."
        );
      } finally {
        setIsLoadingInsights(false);
      }
    },
    [selectedCampaigns, selectedIds]
  );

  function toggleCampaign(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      // Clear displayed insights when selection changes
      setInsights(null);
      setInsightsError(null);
      return next;
    });
  }

  // Loading / error states
  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-bold">Error loading campaigns</h3>
          <p className="text-sm mt-1">Check your connection and refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Campaign Comparison
        </h2>
        <p className="text-xs text-muted-foreground">
          Select 2–5 launched campaigns to compare performance side-by-side.
        </p>
      </div>

      {/* Campaign Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Select Campaigns</span>
            <Badge variant="outline" className="font-semibold text-[10px] uppercase">
              {selectedIds.size} / 5 selected
            </Badge>
          </CardTitle>
          <CardDescription>
            Choose launched campaigns to compare. Draft campaigns are excluded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {launchedCampaigns.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No launched campaigns found. Launch campaigns first to compare them.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {launchedCampaigns.map((camp: any) => {
                const isSelected = selectedIds.has(camp.id);
                const isDisabled = !isSelected && selectedIds.size >= 5;
                const stats = camp.stats || {};
                const revenue = stats.conversionRevenue || 0;

                return (
                  <button
                    key={camp.id}
                    onClick={() => !isDisabled && toggleCampaign(camp.id)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : isDisabled
                          ? "border-border/50 opacity-40 cursor-not-allowed"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>

                    {/* Campaign info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {camp.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {camp.channel.toUpperCase()} • {camp.totalRecipients} recipients
                        {revenue > 0 ? ` • ₹${revenue.toLocaleString("en-IN")}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Winner Summary Cards */}
      {topWinners && (topWinners.revenue || topWinners.engagement || topWinners.conversions) && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Best Revenue */}
          {topWinners.revenue && (
            <Card className="border-emerald-200/60 dark:border-emerald-900/30 hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Highest Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-lg font-extrabold text-foreground">
                  {topWinners.revenue.value}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {topWinners.revenue.campaign.name}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Best Engagement */}
          {topWinners.engagement && (
            <Card className="border-orange-200/60 dark:border-orange-900/30 hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Highest Open Rate
                </CardTitle>
                <MousePointerClick className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-lg font-extrabold text-foreground">
                  {topWinners.engagement.value}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {topWinners.engagement.campaign.name}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Best Conversions */}
          {topWinners.conversions && (
            <Card className="border-purple-200/60 dark:border-purple-900/30 hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Most Conversions
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-lg font-extrabold text-foreground">
                  {topWinners.conversions.value} orders
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {topWinners.conversions.campaign.name}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {selectedCampaigns.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <Trophy className="h-4.5 w-4.5 text-primary" />
              Side-by-Side Comparison
            </CardTitle>
            <CardDescription>
              {selectedCampaigns.length} campaigns compared.{" "}
              <span className="text-primary font-medium">★</span> marks the leader in each metric.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold text-xs text-muted-foreground w-[160px]">
                      Metric
                    </TableHead>
                    {selectedCampaigns.map((camp: any) => (
                      <TableHead
                        key={camp.id}
                        className="font-semibold text-xs text-foreground text-right"
                      >
                        <div className="flex flex-col items-end gap-0.5">
                          <Link href={`/campaigns/${camp.id}`} target="_blank" className="truncate max-w-[140px] hover:text-primary hover:underline underline-offset-2 transition-colors">{camp.name}</Link>
                          <span className="text-[9px] text-muted-foreground font-normal uppercase">
                            {camp.channel}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {METRICS.map((metric) => {
                    const winnerId = winners.get(metric.label);

                    return (
                      <TableRow key={metric.label}>
                        <TableCell className="text-xs font-medium text-muted-foreground py-3">
                          {metric.label}
                        </TableCell>
                        {selectedCampaigns.map((camp: any) => {
                          const stats = camp.stats || {};
                          const value = metric.getValue(stats, camp);
                          const isWinner = winnerId === camp.id;

                          return (
                            <TableCell
                              key={camp.id}
                              className="text-right py-3"
                            >
                              <span
                                className={`text-xs font-semibold ${
                                  isWinner ? "text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                {value}
                              </span>
                              {isWinner && (
                                <span className={`ml-1.5 inline-flex items-center rounded-full border px-1 py-0.5 text-[9px] font-bold ${metric.winnerBadgeColor}`}>
                                  ★
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Marketing Analyst Section */}
      {selectedCampaigns.length >= 2 && (
        <Card className="border-primary/20 dark:border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              AI Marketing Analyst
            </CardTitle>
            <CardDescription>
              Get AI-powered insights explaining campaign performance patterns and actionable recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Generate / Regenerate button */}
            {!insights && !isLoadingInsights && (
              <Button
                onClick={() => generateInsights()}
                disabled={isLoadingInsights}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate AI Insights
              </Button>
            )}

            {/* Loading state */}
            {isLoadingInsights && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Analyzing campaigns…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Our AI analyst is reviewing your comparison data.
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {insightsError && !isLoadingInsights && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Insight generation failed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insightsError}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateInsights(true)}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}

            {/* Insights result */}
            {insights && !isLoadingInsights && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg border bg-muted/20 p-4">
                  <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-2">
                    Analysis Summary
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {insights.summary}
                  </p>
                </div>

                {/* Patterns */}
                {insights.patterns && insights.patterns.length > 0 && (
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Patterns Identified
                    </h4>
                    <ul className="space-y-2">
                      {insights.patterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-primary mt-1 shrink-0">•</span>
                          <span className="leading-relaxed">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {insights.recommendations.length > 0 && (
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {insights.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Regenerate button */}
                <div className="pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateInsights(true)}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </Button>
                </div>
              </div>
            )}

            {/* Confidence Note — always visible */}
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <span className="font-semibold">How this works:</span> Campaign winners are computed from PostgreSQL-backed metrics. AI only interprets validated facts — it never decides rankings or invents numbers.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt when less than 2 selected */}
      {selectedCampaigns.length < 2 && selectedIds.size > 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-card/45">
          Select at least <span className="font-semibold text-foreground">2 campaigns</span> to see the comparison table.
        </div>
      )}

      {selectedIds.size === 0 && launchedCampaigns.length > 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-card/45 space-y-1">
          <p className="font-medium">Select campaigns above to begin comparing.</p>
          <p>You can compare up to 5 campaigns side-by-side.</p>
        </div>
      )}
    </div>
  );
}
