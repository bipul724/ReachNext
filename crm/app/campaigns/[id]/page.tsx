"use client";

import { use, useState, useEffect } from "react";
import { useCampaign } from "../../../hooks/use-campaigns";
import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Users,
  Loader2,
  AlertCircle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import AgentThoughtsTimeline from "../../../components/agent-thoughts-timeline";
import DeliveryActivityFeed from "../../../components/delivery-activity-feed";

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

  // Weighted average scoring out of 100
  const score = (delRate * 15 + openRate * 25 + clickRate * 30 + convRate * 30);
  return Math.min(100, Math.round(score * 1.3)); // scaled slightly for visual premium score
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CampaignDetails({ params }: PageProps) {
  const { id } = use(params);

  // 1. Fetch Campaign data (Poll every 2.5s if status is sending/active)
  const [isLive, setIsLive] = useState(true);
  const { campaign, isLoading, isError: error } = useCampaign(id, isLive);

  // 2. Fetch AI Performance Insights
  const { data: insightsData, isLoading: isInsightsLoading } = useSWR(
    campaign?.status === "sent" || campaign?.stats?.sent > 0
      ? `/api/campaigns/${id}/insights`
      : null,
    fetcher,
    {
      refreshInterval: isLive ? 2500 : 0,
    }
  );

  // 3. Fetch Live Delivery Events (poll only while campaign is actively sending/sent)
  const shouldPollEvents =
    campaign?.status === "sending" || campaign?.status === "sent";
  const { data: eventsData, isLoading: isEventsLoading } = useSWR(
    campaign?.status && campaign.status !== "draft"
      ? `/api/campaigns/${id}/events`
      : null,
    fetcher,
    {
      refreshInterval: shouldPollEvents ? 2500 : 0,
    }
  );

  // Stop polling if campaign status is draft, completed, or failed
  useEffect(() => {
    if (campaign) {
      if (campaign.status === "draft" || campaign.status === "completed" || campaign.status === "failed") {
        setIsLive(false);
      }
    }
  }, [campaign]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-bold">Error loading campaign</h3>
          <p className="text-sm mt-1">{error?.message || "Campaign record not found."}</p>
        </div>
      </div>
    );
  }

  const stats = campaign.stats || {};
  const sent = stats.sent || 0;
  const delivered = stats.delivered || 0;
  const opened = stats.opened || 0;
  const clicked = stats.clicked || 0;
  const converted = stats.convertedOrders || 0;
  const revenue = stats.conversionRevenue || 0;

  const successScore = calculateSuccessScore(stats);

  // Percentage calculations for progress bars
  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
  const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
  const conversionRate = clicked > 0 ? (converted / clicked) * 100 : 0;

  // Active status indicator styles
  const statusBadgeColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sending: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 animate-pulse",
    sent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400",
    completed: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400",
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns list
        </Link>
        <div className="flex items-center gap-2">
          <Badge className={statusBadgeColors[campaign.status]} variant="outline">
            {campaign.status === "sending" ? "Dispatching Webhooks..." : campaign.status}
          </Badge>
          {campaign.createdBy === "AI Autopilot" && (
            <Badge className="bg-primary/10 text-primary border-primary/10" variant="outline">
              AI Autopilot
            </Badge>
          )}
        </div>
      </div>

      {/* Campaign title & basic info */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{campaign.name}</h2>
        <p className="text-xs text-muted-foreground">
          Target Segment: <span className="font-semibold text-foreground">{campaign.segment.name}</span> • Created on {new Date(campaign.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Attributed Revenue */}
        <Card className="hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Attributed Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-extrabold text-foreground">
              ₹{revenue.toLocaleString()}
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Collected from {converted} sales orders
            </p>
          </CardContent>
        </Card>

        {/* Conversions */}
        <Card className="hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Sales Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-extrabold text-foreground">
              {converted} / {sent}
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Conversions out of dispatched messages
            </p>
          </CardContent>
        </Card>

        {/* Conversion rate */}
        <Card className="hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Funnel Conversion
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-extrabold text-foreground">
              {sent > 0 ? ((converted / sent) * 100).toFixed(1) : "0.0"}%
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Overall campaign conversion rate
            </p>
          </CardContent>
        </Card>

        {/* Success Score */}
        <Card className="hover:shadow-sm border-primary/10 bg-primary/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
            <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Success Score
            </CardTitle>
            <Sparkles className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-extrabold text-foreground">
              {successScore}/100
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Funnel conversion efficiency score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel chart and AI insights grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Live Delivery Funnel Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Conversion Funnel</span>
              {campaign.status === "sending" && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Callbacks flowing...
                </span>
              )}
            </CardTitle>
            <CardDescription>Visual performance stages of message outreach</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {sent === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No delivery logs captured.
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Sent */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">1. Messages Dispatched</span>
                    <span>{sent} ({sent > 0 ? "100%" : "0%"})</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-full rounded-full bg-primary" />
                  </div>
                </div>

                {/* 2. Delivered */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">2. Delivered</span>
                    <span>{delivered} ({deliveryRate.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${deliveryRate}%` }} />
                  </div>
                </div>

                {/* 3. Opened */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">{campaign.channel === "email" ? "3. Opened" : "3. Read"}</span>
                    <span>{opened} ({openRate.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${openRate}%` }} />
                  </div>
                </div>

                {/* 4. Clicked */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">4. Link Clicked</span>
                    <span>{clicked} ({clickRate.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-pink-500 transition-all duration-500" style={{ width: `${clickRate}%` }} />
                  </div>
                </div>

                {/* 5. Converted */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">5. Converted Orders</span>
                    <span>{converted} ({conversionRate.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${conversionRate}%` }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Performance Insights */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              AI Performance Insights
            </CardTitle>
            <CardDescription>Plain-English marketing results explainer</CardDescription>
          </CardHeader>
          <CardContent>
            {isInsightsLoading ? (
              <div className="flex py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : insightsData?.insights ? (
              <div className="text-xs leading-relaxed space-y-1 text-muted-foreground p-4 bg-primary/[0.03] border border-primary/5 rounded-lg whitespace-pre-wrap">
                {insightsData.insights}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Insights are preparing. Make sure the database has orders and campaign metrics logged to trigger explanation.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Delivery Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-primary" />
              Live Delivery Activity
            </span>
            <span className="flex items-center gap-2">
              {eventsData?.events?.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  {eventsData.events.length} Events
                </span>
              )}
              {shouldPollEvents && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Live
                </span>
              )}
            </span>
          </CardTitle>
          <CardDescription>
            Real-time webhook callbacks showing delivery lifecycle progression
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryActivityFeed
            events={eventsData?.events}
            isLoading={isEventsLoading}
            isLive={shouldPollEvents}
          />
        </CardContent>
      </Card>

      {/* Bottom specs details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Campaign specs detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Campaign Strategy Specs</CardTitle>
            <CardDescription>The decisions generated by AI strategy engine before launch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {stats.explainChannel && (
              <div className="space-y-1">
                <span className="font-bold text-foreground">Why this Channel ({campaign.channel.toUpperCase()})?</span>
                <p className="text-muted-foreground leading-relaxed">{stats.explainChannel}</p>
              </div>
            )}
            {stats.explainOffer && (
              <div className="space-y-1">
                <span className="font-bold text-foreground">Why this Offer ({stats.offer})?</span>
                <p className="text-muted-foreground leading-relaxed">{stats.explainOffer}</p>
              </div>
            )}
            {stats.explainTiming && (
              <div className="space-y-1">
                <span className="font-bold text-foreground">Why this Timing ({stats.timing})?</span>
                <p className="text-muted-foreground leading-relaxed">{stats.explainTiming}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Template specs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Message Promo Specs</CardTitle>
            <CardDescription>Personalized copy copywriting justifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-foreground">Copywriting Template Draft:</span>
              <div className="rounded-md border border-border bg-muted/20 p-3 leading-relaxed font-medium mt-1">
                {campaign.messageTemplate}
              </div>
            </div>
            {stats.explainContent && (
              <div className="space-y-1">
                <span className="font-bold text-foreground">AI Copywriter Explainer:</span>
                <p className="text-muted-foreground leading-relaxed">{stats.explainContent}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent thoughts timeline */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            Agent Execution & Thinking Timeline
          </CardTitle>
          <CardDescription>Chronological reasoning path of coordinating agents recorded during campaign generation</CardDescription>
        </CardHeader>
        <CardContent>
          <AgentThoughtsTimeline thoughts={campaign.agentThoughts} />
        </CardContent>
      </Card>
    </div>
  );
}
