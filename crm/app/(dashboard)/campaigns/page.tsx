"use client";

import Link from "next/link";
import { useCampaigns } from "../../../hooks/use-campaigns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Send, Plus, Loader2, Sparkles, TrendingUp, BarChart3, AlertCircle } from "lucide-react";

export default function Campaigns() {
  const { campaigns, isLoading, isError } = useCampaigns();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Launch and track customer marketing campaigns
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2 font-semibold">
            <Plus className="h-4.5 w-4.5" />
            Launch AI Autopilot
          </Button>
        </Link>
      </div>

      {/* Main campaigns list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Campaigns Registry</span>
            <Badge variant="outline" className="font-semibold text-[10px] uppercase">
              {campaigns.length} campaigns
            </Badge>
          </CardTitle>
          <CardDescription>
            AI-native campaigns created from marketing goal objectives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex h-60 items-center justify-center">
              <div className="text-center space-y-2">
                <AlertCircle className="h-10 w-10 mx-auto text-destructive/60" />
                <p className="text-sm font-medium text-destructive">Failed to load campaigns</p>
                <p className="text-xs text-muted-foreground">Check your connection and refresh the page.</p>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Send className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No campaigns created yet. Start with AI Autopilot!</p>
              <Link href="/campaigns/new" className="inline-block">
                <Button size="sm">Launch Campaign Autopilot</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Campaign Name</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Target Segment</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Channel</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground text-right">Recipients</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground text-right">Conversions</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground text-right">Revenue Pool</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground text-center">Analytics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((camp: any) => {
                    const statusColors: Record<string, string> = {
                      draft: "bg-muted text-muted-foreground",
                      sending: "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200",
                      sent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200",
                      completed: "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200",
                    };

                    const stats = camp.stats || {};
                    const conversionRevenue = stats.conversionRevenue || 0;
                    const convertedOrders = stats.convertedOrders || 0;

                    return (
                      <TableRow key={camp.id} className="hover:bg-muted/20">
                        <TableCell className="font-semibold text-foreground py-4">
                          <div className="flex flex-col">
                            <span>{camp.name}</span>
                            {camp.createdBy === "AI Autopilot" && (
                              <span className="text-[9px] text-primary font-bold tracking-wider uppercase mt-0.5 flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5" />
                                AI Autopilot
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-4">
                          {camp.segment.name}
                        </TableCell>
                        <TableCell className="text-xs py-4 font-bold uppercase">
                          {camp.channel}
                        </TableCell>
                        <TableCell className="text-xs text-right py-4 font-semibold">
                          {camp.totalRecipients.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right py-4 font-bold text-emerald-600 dark:text-emerald-400">
                          {convertedOrders > 0 ? `${convertedOrders} sales` : "0"}
                        </TableCell>
                        <TableCell className="text-sm text-right py-4 font-bold text-foreground">
                          {conversionRevenue > 0 ? `₹${conversionRevenue.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={statusColors[camp.status] || "bg-muted"} variant="outline">
                            {camp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <Link href={`/campaigns/${camp.id}`}>
                            <Button size="xs" variant="outline" className="gap-1.5 h-8">
                              <BarChart3 className="h-3.5 w-3.5" />
                              View Funnel
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
