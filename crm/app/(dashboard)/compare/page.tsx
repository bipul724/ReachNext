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
    winnerBadgeColor: "bg-[#DBEAFE] text-[#2563EB]",
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
    winnerBadgeColor: "bg-[#DBEAFE] text-[#2563EB]",
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
    winnerBadgeColor: "bg-[#FFF7ED] text-[#EA580C]",
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
    winnerBadgeColor: "bg-[#FCE7F3] text-[#DB2777]",
    higherIsBetter: true,
  },
  {
    label: "Conversions",
    getValue: (s) => s.convertedOrders || 0,
    getRaw: (s) => s.convertedOrders || 0,
    format: "number",
    winnerBadgeColor: "bg-[#DCFCE7] text-[#16A34A]",
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
    winnerBadgeColor: "bg-[#DCFCE7] text-[#059669]",
    higherIsBetter: true,
  },
  {
    label: "Success Score",
    getValue: (s) => `${calculateSuccessScore(s)}`,
    getRaw: (s) => calculateSuccessScore(s),
    format: "score",
    winnerBadgeColor: "bg-[#EDE9FE] text-[#7C3AED]",
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-600 flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-bold">Error loading campaigns</h3>
          <p className="text-sm mt-1">Check your connection and refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#FAFAFA] min-h-screen pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
        <div className="space-y-1.5">
          <h2 className="text-[32px] font-bold text-[#111827] tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-[#2563EB]" />
            Campaign Comparison
          </h2>
          <p className="text-[15px] text-[#6B7280]">
            Select 2–5 launched campaigns to compare performance side-by-side.
          </p>
        </div>
      </div>

      {/* Campaign Selector */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[18px] p-6 shadow-none">
        <div className="flex items-center justify-between mb-6">
            <span className="text-[20px] font-extrabold text-[#111827]">Select Campaigns</span>
            <div className="px-3 py-1.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] rounded-full text-[13px] font-semibold">
              {selectedIds.size} / 5 Selected
            </div>
        </div>
        
        {launchedCampaigns.length === 0 ? (
          <div className="text-center py-8 text-sm text-[#6B7280]">
            No launched campaigns found. Launch campaigns first to compare them.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {launchedCampaigns.map((camp: any) => {
              const isSelected = selectedIds.has(camp.id);
              const isDisabled = !isSelected && selectedIds.size >= 5;
              const stats = camp.stats || {};
              const revenue = stats.conversionRevenue || 0;
              
              let channelClasses = "bg-gray-50 text-gray-700 border-gray-200";
              if (camp.channel === "email") channelClasses = "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
              if (camp.channel === "whatsapp") channelClasses = "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
              if (camp.channel === "sms") channelClasses = "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]";

              return (
                <button
                  key={camp.id}
                  onClick={() => !isDisabled && toggleCampaign(camp.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-[#2563EB] border-[2px] bg-[#EFF6FF]"
                      : isDisabled
                        ? "border-[#D1D5DB] opacity-40 cursor-not-allowed bg-[#FFFFFF]"
                        : "border-[#D1D5DB] hover:border-[#9CA3AF] hover:bg-[#F9FAFB] bg-[#FFFFFF]"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                      isSelected
                        ? "bg-[#2563EB] border-[#2563EB] text-white"
                        : "border-gray-400 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>

                  {/* Campaign info */}
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <p className="text-[13px] font-semibold text-[#111827] truncate leading-none mt-0.5">
                      {camp.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide leading-none ${channelClasses}`}>
                          {camp.channel}
                        </span>
                        <span className="text-[11px] text-[#6B7280] font-medium leading-none">
                          {camp.totalRecipients.toLocaleString()} rec.
                        </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Winner Summary Cards */}
      {topWinners && (topWinners.revenue || topWinners.engagement || topWinners.conversions) && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Best Revenue */}
          {topWinners.revenue && (
            <div className="bg-[#FFFFFF] border border-[#A7F3D0] rounded-[16px] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase">
                  Highest Revenue
                </span>
                <TrendingUp className="h-4.5 w-4.5 text-[#10B981]" />
              </div>
              <div className="text-[24px] font-bold text-[#111827]">
                {topWinners.revenue.value}
              </div>
              <p className="text-[13px] text-[#6B7280] mt-1 font-medium truncate">
                {topWinners.revenue.campaign.name}
              </p>
            </div>
          )}

          {/* Best Engagement */}
          {topWinners.engagement && (
            <div className="bg-[#FFFFFF] border border-[#FED7AA] rounded-[16px] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase">
                  Highest Open Rate
                </span>
                <MousePointerClick className="h-4.5 w-4.5 text-[#F97316]" />
              </div>
              <div className="text-[24px] font-bold text-[#111827]">
                {topWinners.engagement.value}
              </div>
              <p className="text-[13px] text-[#6B7280] mt-1 font-medium truncate">
                {topWinners.engagement.campaign.name}
              </p>
            </div>
          )}

          {/* Best Conversions */}
          {topWinners.conversions && (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[16px] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase">
                  Most Conversions
                </span>
                <ShoppingBag className="h-4.5 w-4.5 text-[#6B7280]" />
              </div>
              <div className="text-[24px] font-bold text-[#111827]">
                {topWinners.conversions.value} orders
              </div>
              <p className="text-[13px] text-[#6B7280] mt-1 font-medium truncate">
                {topWinners.conversions.campaign.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {selectedCampaigns.length >= 2 && (
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[18px] overflow-hidden shadow-none">
          <div className="px-6 py-5 border-b border-[#E5E7EB]">
            <h3 className="text-[16px] font-bold flex items-center gap-2 text-[#111827]">
              <Trophy className="h-5 w-5 text-[#2563EB]" />
              Side-by-Side Comparison
            </h3>
            <p className="text-[14px] text-[#6B7280] mt-1.5">
              {selectedCampaigns.length} campaigns compared.{" "}
              <span className="text-[#2563EB] font-bold">★</span> marks the leader in each metric.
            </p>
          </div>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="font-semibold text-[13px] tracking-[0.03em] uppercase text-[#6B7280] h-[52px] px-6 w-[180px]">
                    Metric
                  </TableHead>
                  {selectedCampaigns.map((camp: any) => (
                    <TableHead
                      key={camp.id}
                      className="font-semibold text-[13px] tracking-[0.03em] uppercase text-[#6B7280] h-[52px] px-6 text-right"
                    >
                      <div className="flex flex-col items-end gap-1">
                        <Link href={`/campaigns/${camp.id}`} target="_blank" className="truncate max-w-[150px] text-[#111827] hover:text-[#2563EB] hover:underline underline-offset-2 transition-colors">
                            {camp.name.replace(/^Autopilot:\s*/i, "")}
                        </Link>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRICS.map((metric) => {
                  const winnerId = winners.get(metric.label);

                  return (
                    <TableRow key={metric.label} className="h-[64px] border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors">
                      <TableCell className="text-[14px] font-semibold text-[#374151] px-6 py-0">
                        {metric.label}
                      </TableCell>
                      {selectedCampaigns.map((camp: any) => {
                        const stats = camp.stats || {};
                        const value = metric.getValue(stats, camp);
                        const isWinner = winnerId === camp.id;
                        
                        let valueClass = "text-[14px] font-semibold text-[#111827]";
                        if (metric.label === "Revenue") {
                            valueClass = "text-[15px] font-bold text-[#059669]";
                        } else if (metric.label === "Success Score") {
                            const score = metric.getRaw(stats, camp);
                            if (score >= 90) valueClass = "text-[14px] font-bold text-[#16A34A]";
                            else if (score >= 70) valueClass = "text-[14px] font-bold text-[#2563EB]";
                            else if (score >= 50) valueClass = "text-[14px] font-bold text-[#D97706]";
                            else valueClass = "text-[14px] font-bold text-[#DC2626]";
                        }

                        return (
                          <TableCell
                            key={camp.id}
                            className="px-6 py-0 text-right"
                          >
                            <div className="flex items-center justify-end gap-2.5">
                                <span className={valueClass}>
                                  {value}
                                </span>
                                {isWinner ? (
                                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${metric.winnerBadgeColor}`}>
                                    ★
                                  </span>
                                ) : (
                                  <span className="w-6 h-6" />
                                )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* AI Marketing Analyst Section */}
      {selectedCampaigns.length >= 2 && (
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[18px] p-6 shadow-none mt-6">
          <div className="mb-6">
            <h3 className="text-[18px] font-bold flex items-center gap-2 text-[#111827]">
              <Sparkles className="h-5 w-5 text-[#9333EA]" />
              AI Marketing Analyst
            </h3>
            <p className="text-[14px] text-[#6B7280] mt-1.5 font-medium">
              Get AI-powered insights explaining campaign performance patterns and actionable recommendations.
            </p>
          </div>
          
          <div className="space-y-5">
            {/* Generate button */}
            {!insights && !isLoadingInsights && (
              <Button
                onClick={() => generateInsights()}
                disabled={isLoadingInsights}
                className="gap-2 bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-[12px] h-10 px-6 font-semibold transition-colors shadow-none"
              >
                <Sparkles className="h-4 w-4" />
                Generate AI Insights
              </Button>
            )}

            {/* Loading state */}
            {isLoadingInsights && (
              <div className="flex items-center gap-3 rounded-[14px] border border-purple-100 bg-[#FAF5FF] p-5">
                <Loader2 className="h-5 w-5 animate-spin text-[#9333EA] shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">Analyzing campaigns…</p>
                  <p className="text-[13px] text-[#6B7280] mt-0.5 font-medium">
                    Our AI analyst is reviewing your comparison data.
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {insightsError && !isLoadingInsights && (
              <div className="rounded-[14px] border border-red-200 bg-[#FEF2F2] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-semibold text-[#DC2626]">Insight generation failed</p>
                    <p className="text-[13px] text-[#6B7280] mt-0.5 font-medium">{insightsError}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateInsights(true)}
                  className="gap-1.5 rounded-[10px]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Insights result */}
            {insights && !isLoadingInsights && (
              <div className="space-y-5">
                {/* Summary */}
                <div className="rounded-[14px] border border-[#E9D5FF] bg-[#FAF5FF] p-6">
                  <h4 className="text-[13px] font-bold tracking-wide text-[#7C3AED] uppercase mb-3">
                    Analysis Summary
                  </h4>
                  <p className="text-[14px] text-[#111827] leading-relaxed font-medium">
                    {insights.summary}
                  </p>
                </div>

                {/* Patterns */}
                {insights.patterns && insights.patterns.length > 0 && (
                  <div className="rounded-[14px] border border-[#BFDBFE] bg-[#EFF6FF] p-6">
                    <h4 className="text-[13px] font-bold tracking-wide text-[#2563EB] uppercase mb-4 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      Patterns Identified
                    </h4>
                    <ul className="space-y-3">
                      {insights.patterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-3 text-[14px] text-[#374151] font-medium">
                          <span className="text-[#2563EB] mt-0.5 shrink-0 text-[18px] leading-none">•</span>
                          <span className="leading-relaxed">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {insights.recommendations.length > 0 && (
                  <div className="rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] p-6">
                    <h4 className="text-[13px] font-bold tracking-wide text-[#D97706] uppercase mb-4 flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <ul className="space-y-4">
                      {insights.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3.5 text-[14px] text-[#111827] font-semibold">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309] text-[12px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed pt-0.5">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Regenerate button */}
                <div className="pt-2">
                  <button
                    onClick={() => generateInsights(true)}
                    className="flex items-center gap-1.5 text-[13px] font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate Insights
                  </button>
                </div>
              </div>
            )}

            {/* Confidence Note — always visible */}
            <div className="flex items-start gap-3 rounded-[14px] border border-[#A7F3D0] bg-[#ECFDF5] px-5 py-4 mt-8">
              <ShieldCheck className="h-5 w-5 text-[#047857] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#065F46] leading-relaxed">
                <span className="font-bold">How this works:</span> Campaign winners are computed from PostgreSQL-backed metrics. <span className="font-bold">AI only interprets validated facts</span> — it never decides rankings or invents numbers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prompts when nothing selected */}
      {selectedCampaigns.length < 2 && selectedIds.size > 0 && (
        <div className="rounded-[16px] border border-dashed border-[#E5E7EB] p-8 text-center text-[14px] text-[#6B7280] bg-[#FFFFFF] font-medium mt-6">
          Select at least <span className="font-bold text-[#111827]">2 campaigns</span> to see the comparison table.
        </div>
      )}

      {selectedIds.size === 0 && launchedCampaigns.length > 0 && (
        <div className="rounded-[16px] border border-dashed border-[#E5E7EB] p-8 text-center text-[14px] text-[#6B7280] bg-[#FFFFFF] font-medium mt-6">
          <p className="font-semibold text-[#111827] mb-1">Select campaigns above to begin comparing.</p>
          <p>You can compare up to 5 campaigns side-by-side.</p>
        </div>
      )}
    </div>
  );
}
