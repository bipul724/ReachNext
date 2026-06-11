"use client";

import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "../lib/api";
import {
  TrendingUp,
  Users,
  Send,
  ShoppingBag,
  ArrowUpRight,
  Coffee,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
import { Badge } from "../components/ui/badge";

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

const COLORS = ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316"];

export default function Dashboard() {
  const { data, error, isLoading } = useSWR("/api/dashboard/stats", fetcher);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive">
        <h3 className="font-bold">Error loading stats</h3>
        <p className="text-sm mt-1">{error.message || "Please check your network and database connections."}</p>
      </div>
    );
  }

  const { summary, locationSales, recentCampaigns, recentOrders } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Autopilot CTA banner - Premium Glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl glass-card p-8 md:p-10 border-primary/20 shadow-2xl">
        <div className="absolute inset-0 premium-gradient opacity-100" />
        <div className="relative z-10 max-w-xl space-y-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-accent border border-accent/30">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            AI-Native Marketing Engine
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-balance text-foreground">
            Launch campaigns with plain English objectives
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            The CampaignOS multi-agent brain sizes target segments, suggests optimal channels and timing, and drafts personalized messages in seconds.
          </p>
          <Link href="/campaigns/new">
            <Button className="mt-3 font-bold text-base h-11 gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              Create Autopilot Campaign
              <ArrowUpRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <div className="absolute right-0 bottom-0 top-0 hidden w-80 items-center justify-center opacity-15 md:flex pointer-events-none">
          <Coffee className="h-48 w-48 text-primary blur-sm" />
        </div>
      </div>

      {/* Stats Cards grid - Premium styling */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="glass-card card-hover border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Total Revenue
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent backdrop-blur-sm border border-accent/30">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              ₹ from {summary.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="glass-card card-hover border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Target Shoppers
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary backdrop-blur-sm border border-primary/30">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {summary.totalCustomers.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              Active profiles in database
            </p>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="glass-card card-hover border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Campaigns
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 backdrop-blur-sm border border-emerald-500/30">
              <Send className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {summary.totalCampaigns}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              Draft & active campaigns
            </p>
          </CardContent>
        </Card>

        {/* Sales Conversions */}
        <Card className="glass-card card-hover border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Sales Orders
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 backdrop-blur-sm border border-purple-500/30">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {summary.totalOrders.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              Storewide purchases recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Highlights layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sales by Store location Bar Chart */}
        <Card className="glass-card md:col-span-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Sales by Cafe Location</CardTitle>
            <CardDescription className="text-muted-foreground">Revenue performance across store locations</CardDescription>
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
        <Card className="glass-card border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Autopilot Performance
            </CardTitle>
            <CardDescription>Key success metrics across channels</CardDescription>
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

      {/* Grid of Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Campaigns */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Recent Campaigns</CardTitle>
              <CardDescription>Latest executions and drafts</CardDescription>
            </div>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary hover:bg-primary/10">
                View All →
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
        <Card className="glass-card border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Recent Store Orders</CardTitle>
              <CardDescription>Latest transactions in database</CardDescription>
            </div>
            <Link href="/customers">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                View All →
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
                      <span className="text-[10px] text-muted-foreground mt-0.5">
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
