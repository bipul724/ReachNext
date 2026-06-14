"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "../../../lib/api";
import {
  TrendingUp,
  Users,
  Send,
  ShoppingBag,
  ArrowUpRight,
  Coffee,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "../../../components/ui/badge";

// Helper to format currency in INR Indian numbering format
function formatCurrency(amount: number) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const COLORS = ["#3B82F6"];

interface Opportunity {
  type: string;
  title: string;
  whyItMatters: string;
  recommendedAction: string;
  suggestedGoal: string;
  affectedCustomers: number;
  estimatedRevenue: number;
  confidence: string;
  historicalSpend: number;
}

export default function Dashboard() {
  const { data: statsData, error: statsError, isLoading: statsLoading } = useSWR("/api/dashboard/stats", fetcher);

  // Copilot Caching State
  const [cachedOpportunities, setCachedOpportunities] = useState<Opportunity[] | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<any>(null);
  const [timestampStr, setTimestampStr] = useState<string>("");
  
  const isFetchingRef = useRef(false);
  const [isFetching, setIsFetching] = useState(false);

  const formatTimestamp = (ts: number) => {
    const elapsed = Date.now() - ts;
    if (elapsed < 60000) return "Updated just now";
    if (elapsed < 3600000) return `Updated ${Math.floor(elapsed / 60000)} min ago`;
    if (elapsed < 86400000) return `Updated ${Math.floor(elapsed / 3600000)} hr ago`;
    const days = Math.floor(elapsed / 86400000);
    return `Updated ${days} day${days > 1 ? 's' : ''} ago`;
  };

  const fetchCopilot = async (isBackground: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);
    
    if (!isBackground) {
      setInsightsLoading(true);
    }
    setInsightsError(null);

    try {
      const res = await fetcher("/api/dashboard/insights");
      const opps = res.opportunities || [];
      setOpportunities(opps);
      setCachedOpportunities(opps);
      
      const now = Date.now();
      localStorage.setItem("copilot_cache", JSON.stringify(res));
      localStorage.setItem("copilot_cache_ts", String(now));
      setTimestampStr("Updated just now");
    } catch (err: any) {
      if (isBackground && cachedOpportunities) {
        setOpportunities(cachedOpportunities);
        // Error toast pattern could be added here if existing, but we preserve cards silently
      } else {
        setInsightsError(err);
      }
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("copilot_cache");
    const cache_ts = localStorage.getItem("copilot_cache_ts");
    
    let cache_data = null;
    if (raw) {
      try {
        cache_data = JSON.parse(raw);
      } catch (e) {
        cache_data = null;
        localStorage.removeItem("copilot_cache");
        localStorage.removeItem("copilot_cache_ts");
      }
    }

    const ts = Number(cache_ts);
    const cache_age = Date.now() - ts;
    const cache_valid = cache_data != null && cache_age < 24 * 60 * 60 * 1000;

    if (cache_valid) {
      const opps = cache_data.opportunities || [];
      setCachedOpportunities(opps);
      setOpportunities(opps);
      setTimestampStr(formatTimestamp(ts));
      setInsightsLoading(false);
      fetchCopilot(true);
    } else {
      fetchCopilot(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (statsLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 animate-in fade-in duration-1000">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing your workspace...</p>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive">
        <h3 className="font-bold">Error loading stats</h3>
        <p className="text-sm mt-1">{statsError.message || "Please check your network and database connections."}</p>
      </div>
    );
  }

  const { summary, locationSales, recentCampaigns, recentOrders } = statsData;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Stats Cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Total Revenue
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              From {summary.totalOrders} attributed orders
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Target Shoppers
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalCustomers.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Active subscriber profiles in DB
            </p>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Campaigns
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
              <Send className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalCampaigns}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Draft & launched campaigns
            </p>
          </CardContent>
        </Card>

        {/* Sales Conversions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Sales Conversions
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalOrders.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Storewide purchases recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Slim CTA Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between overflow-hidden rounded-xl border border-primary/10 bg-radial-[circle_at_right] from-primary/10 via-muted/40 to-muted/20 px-4 py-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            Launch campaign drafts using plain English objectives
          </span>
        </div>
        <Link href="/campaigns/new" className="shrink-0">
          <Button size="sm" className="font-semibold h-9 w-full sm:w-auto">
            Create Campaign Autopilot
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* 3. Chart & Highlights layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sales by Store location Bar Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Sales by Cafe Location</CardTitle>
            <CardDescription>Attributed store revenue across locations</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={locationSales}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {locationSales.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Performance Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">AI Autopilot Performance</CardTitle>
            <CardDescription>Key success ratios across launched channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>WhatsApp Conversion</span>
                <span className="text-emerald-600 font-semibold">24.2%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[24.2%] rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Email Click Rate</span>
                <span className="text-orange-600 font-semibold">14.8%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[14.8%] rounded-full bg-orange-500" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>SMS Delivery Success</span>
                <span className="text-blue-600 font-semibold">91.5%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[91.5%] rounded-full bg-blue-500" />
              </div>
            </div>

            <div className="rounded-lg bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 p-4 text-xs space-y-1 text-orange-800 dark:text-orange-300 leading-relaxed">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                AI Recommendation:
              </span>
              WhatsApp campaigns target premium cafe segments with 2.3x higher order conversion speeds compared to traditional SMS discount lists.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Revenue Opportunity Copilot */}
      {insightsLoading ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
              Revenue Opportunity Copilot
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/50 animate-pulse hidden sm:inline-flex">
                Generating Insights...
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 border-border bg-card text-foreground"
                disabled={true}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 border-indigo-100/40 flex flex-col justify-between">
                <CardHeader className="pb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-muted rounded-full animate-pulse"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse mt-2"></div>
                  <div className="h-12 w-full bg-muted rounded animate-pulse mt-2"></div>
                </CardHeader>
                <CardContent className="mt-auto space-y-4 pt-0">
                  <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : insightsError && (!opportunities || opportunities.length === 0) ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">Error loading AI Insights</h3>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isFetching}
              onClick={() => fetchCopilot(false)}
            >
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Retry
            </Button>
          </div>
          <p className="text-sm mt-1">{insightsError.message || "Failed to generate insights."}</p>
        </div>
      ) : opportunities && opportunities.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Revenue Opportunity Copilot
            </h2>
            <div className="flex items-center gap-3">
              {timestampStr && (
                <span className="text-xs text-muted-foreground font-medium">{timestampStr}</span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 border-border bg-card text-foreground"
                disabled={isFetching}
                onClick={() => fetchCopilot(true)}
              >
                {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {opportunities.map((opp: Opportunity, idx: number) => {
              let badgeColor = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200/50";
              if (opp.confidence === "HIGH") {
                badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50";
              } else if (opp.confidence === "MEDIUM") {
                badgeColor = "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50";
              }

              return (
                <Card key={idx} className="hover:shadow-md transition-all border-indigo-100/40 bg-radial-[circle_at_bottom_right] from-indigo-500/[0.01] via-transparent to-transparent flex flex-col justify-between">
                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        {opp.type.replace("_", " ")}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${badgeColor}`}>
                        {opp.confidence} CONFIDENCE
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold leading-snug">
                      {opp.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {opp.whyItMatters}
                    </p>
                    <div className="text-[11px] leading-relaxed text-muted-foreground/90 bg-muted/40 rounded border border-border/20 p-2 mt-2">
                      <span className="font-bold text-foreground block text-[9px] uppercase tracking-wider mb-0.5">Why We Are Confident</span>
                      {opp.affectedCustomers} customers match this cohort, representing {formatCurrency(opp.historicalSpend)} historical spend.
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0 mt-auto">
                    <div className="border-t border-border/60 pt-3 flex justify-between items-baseline">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">AFFECTED AUDIENCE</span>
                        <span className="text-xs font-bold text-foreground">{opp.affectedCustomers} Customers</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">POTENTIAL RECOVERY</span>
                        <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(opp.estimatedRevenue)} potential recovery
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/10 rounded-lg p-2.5 space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">RECOMMENDED ACTION</span>
                      <p className="text-[11px] leading-snug font-medium text-foreground">
                        {opp.recommendedAction}
                      </p>
                    </div>

                    <Link
                      href={`/campaigns/new?goal=${encodeURIComponent(opp.suggestedGoal)}&autoplay=true`}
                      className="block w-full"
                    >
                      <Button
                        size="sm"
                        className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Launch Autopilot
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Grid of Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent Campaigns</CardTitle>
              <CardDescription>Latest campaign drafts and executions</CardDescription>
            </div>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No campaigns found. Create one above!</p>
            ) : (
              <div className="space-y-4">
                {recentCampaigns.map((camp: any) => {
                  const statusColors: Record<string, string> = {
                    draft: "bg-muted text-muted-foreground",
                    sending: "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400",
                    sent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
                    completed: "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400",
                  };

                  return (
                    <div key={camp.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <Link href={`/campaigns/${camp.id}`} className="text-sm font-semibold hover:underline text-foreground">
                          {camp.name}
                        </Link>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Segment: {camp.segment.name} • Channel: {camp.channel.toUpperCase()}
                        </span>
                      </div>
                      <Badge className={statusColors[camp.status] || "bg-muted"} variant="outline">
                        {camp.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent Store Orders</CardTitle>
              <CardDescription>Latest coffee transactions synced in DB</CardDescription>
            </div>
            <Link href="/customers">
              <Button variant="ghost" size="sm" className="text-xs">
                View Customers
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No orders found.</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {order.customer.name}
                      </span>
                      <span suppressHydrationWarning className="text-[10px] text-muted-foreground mt-0.5">
                        Location: {order.storeLocation} • {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-foreground">
                        ₹{order.totalAmount.toLocaleString()}
                      </span>
                      {order.attributedCampaignId && (
                        <Badge variant="outline" className="bg-emerald-50/50 text-[9px] text-emerald-700 border-emerald-100 py-0 px-1 mt-0.5">
                          Attributed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
