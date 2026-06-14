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

  // Process locationSales to only show top 7
  const topLocationSales = locationSales
    ? [...locationSales].sort((a: any, b: any) => b.sales - a.sales).slice(0, 7)
    : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Stats Cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="bg-orange-50 border-orange-200 shadow-none rounded-2xl p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium text-gray-500">
              Revenue
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm border border-orange-100">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-sm font-medium text-gray-500 mt-2">
              From {summary.totalOrders.toLocaleString()} attributed orders
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="bg-blue-50 border-blue-200 shadow-none rounded-2xl p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium text-gray-500">
              Target Shoppers
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm border border-blue-100">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {summary.totalCustomers.toLocaleString()}
            </div>
            <p className="text-sm font-medium text-gray-500 mt-2">
              Active subscriber profiles in DB
            </p>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="bg-emerald-50 border-emerald-200 shadow-none rounded-2xl p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium text-gray-500">
              Campaigns
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm border border-emerald-100">
              <Send className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {summary.totalCampaigns}
            </div>
            <p className="text-sm font-medium text-gray-500 mt-2">
              Draft & launched campaigns
            </p>
          </CardContent>
        </Card>

        {/* Sales Conversions */}
        <Card className="bg-purple-50 border-purple-200 shadow-none rounded-2xl p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium text-gray-500">
              Sales Conversions
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple-600 shadow-sm border border-purple-100">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {summary.totalOrders.toLocaleString()}
            </div>
            <p className="text-sm font-medium text-gray-500 mt-2">
              Storewide purchases recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Slim CTA Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-gray-900">
            Launch campaign drafts using plain English objectives
          </span>
        </div>
        <Link href="/campaigns/new" className="shrink-0 w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white shadow-none font-semibold px-6 py-5 rounded-xl transition-colors">
            Create Campaign Autopilot
            <ArrowUpRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* 3. Chart & Highlights layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sales by Store location Bar Chart */}
        <Card className="md:col-span-2 bg-white border-gray-200 shadow-none rounded-2xl p-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Sales by Location</CardTitle>
            <CardDescription className="text-sm text-gray-500 font-medium">Attributed store revenue across locations</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topLocationSales}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                  dx={-10}
                />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E5E7EB",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    color: "#111827",
                  }}
                  labelStyle={{ fontWeight: "700", color: "#6B7280", marginBottom: "4px" }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="sales" radius={[6, 6, 0, 0]} maxBarSize={48} fill="#2563EB" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Performance Quick stats */}
        <Card className="bg-white border-gray-200 shadow-none rounded-2xl p-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">AI Autopilot Performance</CardTitle>
            <CardDescription className="text-sm text-gray-500 font-medium">Key success ratios across launched channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-700">WhatsApp Conversion</span>
                <span className="text-emerald-600">24.2%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full w-[24.2%] rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-700">Email Click Rate</span>
                <span className="text-amber-600">14.8%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full w-[14.8%] rounded-full bg-amber-500" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-700">SMS Delivery Success</span>
                <span className="text-blue-600">91.5%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full w-[91.5%] rounded-full bg-blue-500" />
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm space-y-2 text-gray-700">
              <span className="font-bold flex items-center gap-2 text-gray-900">
                <Sparkles className="h-4 w-4 text-gray-500" />
                Recommendation
              </span>
              <p className="leading-relaxed">WhatsApp campaigns target premium cafe segments with 2.3x higher order conversion speeds compared to traditional SMS discount lists.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Revenue Opportunity Copilot */}
      {insightsLoading ? (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gray-400 animate-pulse" />
              Revenue Opportunity Copilot
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 shadow-none rounded-2xl border border-gray-200 bg-white p-2">
                <CardHeader className="pb-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-12 w-full bg-gray-100 rounded animate-pulse"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : insightsError && (!opportunities || opportunities.length === 0) ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700 shadow-none mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">Error loading AI Insights</h3>
            <Button 
              className="bg-white border-red-200 text-red-700 hover:bg-red-50 shadow-none rounded-xl"
              variant="outline" 
              onClick={() => fetchCopilot(false)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
          <p className="text-sm font-medium mt-1">Failed to generate insights. Check connection.</p>
        </div>
      ) : opportunities && opportunities.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gray-400" />
              Revenue Opportunity Copilot
            </h2>
            <div className="flex items-center gap-4">
              {timestampStr && (
                <span className="text-sm text-gray-500 font-medium">{timestampStr}</span>
              )}
              <Button 
                className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-none rounded-xl font-semibold"
                disabled={isFetching}
                onClick={() => fetchCopilot(true)}
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {opportunities.map((opp: Opportunity, idx: number) => {
              let cardBg = "bg-white border-gray-200";
              let badgeStyle = "bg-gray-100 text-gray-700";
              let valueColor = "text-gray-900";
              
              if (opp.confidence === "HIGH") {
                cardBg = "bg-green-50 border-green-200";
                badgeStyle = "bg-green-600 text-white";
                valueColor = "text-green-700";
              } else if (opp.confidence === "MEDIUM") {
                cardBg = "bg-amber-50 border-amber-200";
                badgeStyle = "bg-amber-500 text-white";
                valueColor = "text-amber-700";
              } else if (opp.confidence === "LOW") {
                cardBg = "bg-red-50 border-red-200";
                badgeStyle = "bg-red-600 text-white";
                valueColor = "text-red-700";
              }

              return (
                <Card key={idx} className={`shadow-none rounded-2xl flex flex-col justify-between p-2 ${cardBg}`}>
                  <CardHeader className="pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                        {opp.type.replace("_", " ")}
                      </span>
                      <Badge className={`text-[10px] px-2.5 py-1 font-bold rounded-full uppercase tracking-wider border-transparent shadow-none ${badgeStyle}`}>
                        {opp.confidence} CONFIDENCE
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900 leading-snug">
                      {opp.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                      {opp.whyItMatters}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-0 mt-auto">
                    <div className="border-t border-gray-200/60 pt-4 flex justify-between items-baseline">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 block mb-1">AFFECTED AUDIENCE</span>
                        <span className="text-sm font-bold text-gray-900">{opp.affectedCustomers} Customers</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-500 block mb-1">POTENTIAL RECOVERY</span>
                        <span className={`text-xl font-black tracking-tight ${valueColor}`}>
                          {formatCurrency(opp.estimatedRevenue)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-white/60 border border-gray-200/50 rounded-xl p-4 space-y-1.5">
                      <span className="text-xs font-bold tracking-wider text-gray-900 uppercase block mb-1">Recommended Action</span>
                      <p className="text-sm font-medium text-gray-700 leading-relaxed">
                        {opp.recommendedAction}
                      </p>
                    </div>

                    <Link
                      href={`/campaigns/new?goal=${encodeURIComponent(opp.suggestedGoal)}&autoplay=true`}
                      className="block w-full pt-1"
                    >
                      <Button
                        className="w-full text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 shadow-sm rounded-xl py-5 transition-colors gap-2"
                      >
                        Launch Autopilot
                        <ArrowUpRight className="h-4 w-4" />
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
      <div className="grid gap-6 md:grid-cols-2 pt-4">
        {/* Recent Campaigns */}
        <Card className="bg-white border-gray-200 shadow-none rounded-2xl p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-gray-900">Recent Campaigns</CardTitle>
              <CardDescription className="text-sm font-medium text-gray-500">Latest campaign drafts and executions</CardDescription>
            </div>
            <Link href="/campaigns">
              <Button className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-none rounded-xl text-sm font-semibold px-4">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recentCampaigns.length === 0 ? (
              <p className="text-sm font-medium text-gray-500 text-center py-10">No campaigns found. Create one above!</p>
            ) : (
              <div className="flex flex-col">
                {recentCampaigns.map((camp: any) => {
                  const statusColors: Record<string, string> = {
                    draft: "bg-gray-100 text-gray-600 border-transparent",
                    sending: "bg-blue-100 text-blue-700 border-transparent",
                    sent: "bg-emerald-100 text-emerald-700 border-transparent",
                    completed: "bg-purple-100 text-purple-700 border-transparent",
                  };

                  return (
                    <div key={camp.id} className="flex items-center justify-between border-b border-gray-100 py-4 hover:bg-gray-50 px-4 -mx-4 transition-colors last:border-0 rounded-lg">
                      <div className="flex flex-col gap-1">
                        <Link href={`/campaigns/${camp.id}`} className="text-sm font-bold text-gray-900 hover:underline">
                          {camp.name}
                        </Link>
                        <span className="text-xs font-medium text-gray-500">
                          {camp.segment.name} • {camp.channel.toUpperCase()}
                        </span>
                      </div>
                      <Badge className={`shadow-none font-bold px-2.5 py-1 ${statusColors[camp.status] || "bg-gray-100"}`}>
                        {camp.status.toUpperCase()}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-white border-gray-200 shadow-none rounded-2xl p-2">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-gray-900">Recent Store Orders</CardTitle>
              <CardDescription className="text-sm font-medium text-gray-500">Latest coffee transactions synced in DB</CardDescription>
            </div>
            <Link href="/customers">
              <Button className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-none rounded-xl text-sm font-semibold px-4">
                View Customers
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recentOrders.length === 0 ? (
              <p className="text-sm font-medium text-gray-500 text-center py-10">No orders found.</p>
            ) : (
              <div className="flex flex-col">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between border-b border-gray-100 py-4 hover:bg-gray-50 px-4 -mx-4 transition-colors last:border-0 rounded-lg">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-gray-900">
                        {order.customer.name}
                      </span>
                      <span suppressHydrationWarning className="text-xs font-medium text-gray-500">
                        {order.storeLocation} • {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-base font-black tracking-tight text-gray-900">
                        ₹{order.totalAmount.toLocaleString()}
                      </span>
                      {order.attributedCampaignId && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 shadow-none uppercase tracking-wider">
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
