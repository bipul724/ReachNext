"use client";

import { use, useState, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "../../../../lib/api";
import { useCampaigns } from "../../../../hooks/use-campaigns";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import {
  ArrowLeft,
  Layers,
  Users,
  Send,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  MousePointerClick,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  ShieldCheck,
  Calendar,
  Trophy,
  Radio,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SegmentInsights {
  insight: string;
  patterns: string[];
  recommendations: string[];
  recommendedChannel: {
    channel: string;
    confidence: string;
    reason: string;
  };
}

interface BestCampaign {
  name: string;
  channel: string;
  openRate: number;
  ctr: number;
  conversions: number;
  revenue: number;
}

interface SegmentFacts {
  segmentName: string;
  customerCount: number;
  campaignCount: number;
  campaigns: {
    name: string;
    channel: string;
    openRate: number;
    ctr: number;
    conversions: number;
    revenue: number;
  }[];
  aggregates: {
    avgOpenRate: number;
    avgCtr: number;
    totalConversions: number;
    totalRevenue: number;
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: segment, isLoading, error } = useSWR(
    `/api/segments/${id}`,
    fetcher
  );

  // --- AI Insights state ---
  const [insights, setInsights] = useState<SegmentInsights | null>(null);
  const [facts, setFacts] = useState<SegmentFacts | null>(null);
  const [bestCampaign, setBestCampaign] = useState<BestCampaign | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const insightsCacheRef = useRef<{ insights: SegmentInsights; facts: SegmentFacts; bestCampaign: BestCampaign | null } | null>(null);

  // Fetch campaigns to check if this segment has any launched campaigns
  const { campaigns: allCampaigns } = useCampaigns();
  const segmentCampaignCount = useMemo(
    () => (allCampaigns || []).filter((c: any) => c.segmentId === id && c.status !== "draft").length,
    [allCampaigns, id]
  );

  const generateInsights = useCallback(
    async (forceRegenerate = false) => {
      // Check cache
      if (!forceRegenerate && insightsCacheRef.current) {
        setInsights(insightsCacheRef.current.insights);
        setFacts(insightsCacheRef.current.facts);
        setBestCampaign(insightsCacheRef.current.bestCampaign);
        setInsightsError(null);
        return;
      }

      setIsLoadingInsights(true);
      setInsightsError(null);

      try {
        const res = await fetch(`/api/segments/${id}/insights`);

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            errBody.error || `Request failed with status ${res.status}`
          );
        }

        const data = await res.json();

        insightsCacheRef.current = { insights: data.insights, facts: data.facts, bestCampaign: data.bestCampaign };
        setInsights(data.insights);
        setFacts(data.facts);
        setBestCampaign(data.bestCampaign || null);
      } catch (err: any) {
        setInsightsError(
          err.message || "Failed to generate insights. Please try again."
        );
      } finally {
        setIsLoadingInsights(false);
      }
    },
    [id]
  );

  // --- Loading / Error states ---

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !segment) {
    return (
      <div className="space-y-4">
        <Link
          href="/segments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to segments
        </Link>
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <h3 className="font-bold">Segment not found</h3>
            <p className="text-sm mt-1">
              This segment may have been deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rules = (segment.rules as any)?.and || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/segments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to segments
        </Link>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          {segment.name}
        </h2>
        {segment.description && (
          <p className="text-xs text-muted-foreground">
            {segment.description}
          </p>
        )}
      </div>

      {/* Segment Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Audience Size
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-lg font-extrabold text-foreground">
              {segment.customerCount?.toLocaleString() || 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              customers in segment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Segment Type
            </CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-lg font-extrabold text-foreground">
              {segment.naturalLanguageQuery ? "AI Generated" : "Manual Rules"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {segment.createdBy === "autopilot" ? "Created by Autopilot" : `Created by ${segment.createdBy}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Created
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-lg font-extrabold text-foreground">
              {new Date(segment.createdAt).toLocaleDateString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {rules.length} filter rule{rules.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Rules */}
      {rules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">
              Segment Rules
            </CardTitle>
            {segment.naturalLanguageQuery && (
              <CardDescription className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="italic">
                  &quot;{segment.naturalLanguageQuery}&quot;
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {rules.map((rule: any, i: number) => {
                const fieldLabels: Record<string, string> = {
                  totalSpent: "Total Spent",
                  totalOrders: "Total Orders",
                  lastOrderAt: "Last Order",
                  createdAt: "Created",
                  city: "City",
                  daysSinceLastOrder: "Days Since Last Order",
                };
                const opLabels: Record<string, string> = {
                  gt: ">",
                  lt: "<",
                  gte: "≥",
                  lte: "≤",
                  eq: "is",
                  contains: "contains",
                };
                const field = fieldLabels[rule.field] || rule.field;
                const op = opLabels[rule.op] || rule.op;
                const val = rule.field === "totalSpent" || rule.field === "totalOrders"
                  ? Number(rule.value).toLocaleString()
                  : String(rule.value);

                return (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-xs px-2.5 py-1"
                  >
                    {field} {op} {val}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights Section */}
      {segmentCampaignCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <div className="inline-flex flex-col items-center rounded-lg border bg-muted/20 px-6 py-3">
                <Send className="h-5 w-5 text-muted-foreground/50 mb-1" />
                <p className="text-2xl font-extrabold text-foreground">0</p>
                <p className="text-[10px] text-muted-foreground">Campaigns</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  This audience hasn&apos;t been targeted yet.
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Launch your first campaign to discover how this segment responds across channels and unlock AI-powered recommendations.
                </p>
              </div>
              <Link href={`/campaigns/new?segmentId=${id}`}>
                <Button size="sm" className="gap-2 mt-2">
                  <Send className="h-3.5 w-3.5" />
                  Create Campaign Using This Segment
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
      <Card className="border-primary/20 dark:border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            Segment Performance Insights
          </CardTitle>
          <CardDescription>
            Aggregate performance across all campaigns targeting this segment, with AI-powered analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Performance Stats (show when facts are loaded) */}
          {facts && (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <Send className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-foreground">{facts.campaignCount}</p>
                  <p className="text-[10px] text-muted-foreground">campaigns</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <MousePointerClick className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-foreground">{facts.aggregates.avgOpenRate}%</p>
                  <p className="text-[10px] text-muted-foreground">avg open rate</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <ShoppingBag className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-foreground">{facts.aggregates.totalConversions}</p>
                  <p className="text-[10px] text-muted-foreground">total conversions</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <DollarSign className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-foreground">₹{facts.aggregates.totalRevenue.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">revenue generated</p>
                </div>
              </div>

              {/* Best Campaign + Recommended Channel cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Best Performing Campaign */}
                {bestCampaign && (
                  <Card className="border-amber-200/60 dark:border-amber-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
                      <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        Best Performing Campaign
                      </CardTitle>
                      <Trophy className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-base font-extrabold text-foreground">{bestCampaign.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>Revenue: <span className="font-semibold text-foreground">₹{bestCampaign.revenue.toLocaleString("en-IN")}</span></span>
                        <span>Open Rate: <span className="font-semibold text-foreground">{bestCampaign.openRate}%</span></span>
                        <span>Conversions: <span className="font-semibold text-foreground">{bestCampaign.conversions}</span></span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Highest revenue and engagement for this audience.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Channel */}
                {insights?.recommendedChannel && (
                  <Card className="border-blue-200/60 dark:border-blue-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
                      <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        Recommended Channel
                      </CardTitle>
                      <Radio className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-extrabold text-foreground uppercase">{insights.recommendedChannel.channel}</p>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] font-bold uppercase ${
                            insights.recommendedChannel.confidence === "High"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : insights.recommendedChannel.confidence === "Medium"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                          }`}
                        >
                          {insights.recommendedChannel.confidence} Confidence
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {insights.recommendedChannel.reason}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Campaign Breakdown Table */}
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Campaign</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Channel</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">Open Rate</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">CTR</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">Conversions</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facts.campaigns.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-semibold text-foreground py-3">
                          {c.name}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                            {c.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold py-3">{c.openRate}%</TableCell>
                        <TableCell className="text-xs text-right font-semibold py-3">{c.ctr}%</TableCell>
                        <TableCell className="text-xs text-right font-semibold py-3">{c.conversions}</TableCell>
                        <TableCell className="text-xs text-right font-semibold py-3">
                          {c.revenue > 0 ? `₹${c.revenue.toLocaleString("en-IN")}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Generate button */}
          {!insights && !isLoadingInsights && !insightsError && (
            <Button
              onClick={() => generateInsights()}
              disabled={isLoadingInsights}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate Segment Insights
            </Button>
          )}

          {/* Loading state */}
          {isLoadingInsights && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Analyzing segment performance…</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reviewing campaigns and computing cross-campaign patterns.
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

          {/* AI Insights result */}
          {insights && !isLoadingInsights && (
            <div className="space-y-4">
              {/* AI Insight */}
              <div className="rounded-lg border bg-muted/20 p-4">
                <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-2">
                  AI Insight
                </h4>
                <p className="text-sm text-foreground leading-relaxed">
                  {insights.insight}
                </p>
              </div>

              {/* Patterns */}
              {insights.patterns.length > 0 && (
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

              {/* Regenerate */}
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

          {/* Confidence Note */}
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              <span className="font-semibold">How this works:</span> Segment performance metrics are computed from PostgreSQL-backed campaign data. AI only interprets validated facts — it never invents numbers.
            </p>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
