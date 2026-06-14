"use client";

import Link from "next/link";
import { useCampaigns } from "../../../hooks/use-campaigns";
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
import { Loader2, Sparkles, BarChart3, AlertCircle, Filter, Mail, MessageSquare, Phone } from "lucide-react";

export default function Campaigns() {
  const { campaigns, isLoading, isError } = useCampaigns();

  // Compute KPI Metrics
  const totalCampaigns = campaigns?.length || 0;
  const totalRecipients = campaigns?.reduce((sum: number, camp: any) => sum + (camp.totalRecipients || 0), 0) || 0;
  const confirmedSales = campaigns?.reduce((sum: number, camp: any) => sum + (camp.stats?.convertedOrders || 0), 0) || 0;
  const revenuePool = campaigns?.reduce((sum: number, camp: any) => sum + (camp.stats?.conversionRevenue || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Campaigns */}
        <div className="bg-white border border-[#E8E6FF] rounded-[14px] p-4 flex flex-col">
          <span className="text-[13px] font-medium text-[#6B7280]">Total Campaigns</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold text-[#6C5CE7]">{totalCampaigns}</span>
          </div>
          <span className="text-[12px] text-[#6B7280] mt-1">AI Autopilot generated</span>
        </div>

        {/* Total Recipients */}
        <div className="bg-white border border-[#E8E6FF] rounded-[14px] p-4 flex flex-col">
          <span className="text-[13px] font-medium text-[#6B7280]">Total Recipients</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold text-[#185FA5]">{totalRecipients.toLocaleString()}</span>
          </div>
          <span className="text-[12px] text-[#6B7280] mt-1">Across all channels</span>
        </div>

        {/* Confirmed Sales */}
        <div className="bg-white border border-[#E8E6FF] rounded-[14px] p-4 flex flex-col">
          <span className="text-[13px] font-medium text-[#6B7280]">Confirmed Sales</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold text-[#0F6E56]">{confirmedSales.toLocaleString()}</span>
          </div>
          <span className="text-[12px] text-[#6B7280] mt-1">From tracked campaigns</span>
        </div>

        {/* Revenue Pool */}
        <div className="bg-white border border-[#E8E6FF] rounded-[14px] p-4 flex flex-col">
          <span className="text-[13px] font-medium text-[#6B7280]">Revenue Pool</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold text-[#D85A30]">₹{revenuePool.toLocaleString()}</span>
          </div>
          <span className="text-[12px] text-[#6B7280] mt-1">Across converting campaigns</span>
        </div>
      </div>

      {/* Main campaigns list */}
      <div className="bg-white border border-[#E8E6FF] rounded-[16px] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#F1F1F3] flex items-center justify-between bg-white">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[16px] font-semibold text-[#111827]">Campaigns Registry</h2>
            <p className="text-[13px] text-[#6B7280]">AI-native campaigns created from marketing goal objectives</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#FAFAFB] text-[#111827] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[#E8E6FF]">
              {totalCampaigns} Campaigns
            </div>
            <Button variant="outline" className="h-9 gap-2 text-[13px] font-medium border-[#E8E6FF] text-[#111827] hover:bg-[#FAFAFB]">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
            </div>
          ) : isError ? (
            <div className="flex h-60 items-center justify-center">
              <div className="text-center space-y-2">
                <AlertCircle className="h-10 w-10 mx-auto text-red-500/60" />
                <p className="text-sm font-medium text-red-600">Failed to load campaigns</p>
                <p className="text-xs text-[#6B7280]">Check your connection and refresh the page.</p>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="h-10 w-10 mx-auto text-[#6B7280]/50" />
              <p className="text-sm text-[#6B7280]">No campaigns created yet. Start with AI Autopilot!</p>
              <Link href="/campaigns/new" className="inline-block">
                <Button size="sm" className="bg-[#6C5CE7] hover:bg-[#5A4AC7] text-white">Launch Campaign Autopilot</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full" style={{ tableLayout: "fixed" }}>
                <TableHeader className="bg-[#FAFAFE] sticky top-0 z-10">
                  <TableRow className="border-b border-[#F1F1F3] hover:bg-transparent">
                    <TableHead className="font-medium text-[12px] uppercase text-[#6B7280] tracking-[0.04em] h-11 w-[320px]">Campaign</TableHead>
                    <TableHead className="font-medium text-[12px] uppercase text-[#6B7280] tracking-[0.04em] h-11 w-[220px]">Segment</TableHead>
                    <TableHead className="font-medium text-[12px] uppercase text-[#6B7280] tracking-[0.04em] h-11 w-[140px]">Channel</TableHead>
                    <TableHead className="font-medium text-[12px] uppercase text-[#6B7280] tracking-[0.04em] h-11 w-[120px] text-right">Recipients</TableHead>
                    <TableHead className="font-medium text-[12px] uppercase text-[#6B7280] tracking-[0.04em] h-11 w-[120px] text-center">Status</TableHead>
                    <TableHead className="font-medium text-[12px] uppercase text-[#6B7280] tracking-[0.04em] h-11 w-[140px] text-center">Analytics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((camp: any) => {
                    const statusColors: Record<string, string> = {
                      draft: "bg-[#F3F4F6] text-[#6B7280]",
                      sending: "bg-[#FAEEDA] text-[#633806]",
                      sent: "bg-[#E1F5EE] text-[#085041]",
                      completed: "bg-[#E1F5EE] text-[#085041]", // treat completed as sent styling
                    };

                    const channelConfig: Record<string, { bg: string, text: string, icon: any }> = {
                      email: { bg: "bg-[#EDE9FF]", text: "text-[#534AB7]", icon: Mail },
                      sms: { bg: "bg-[#E1F5EE]", text: "text-[#0F6E56]", icon: MessageSquare },
                      whatsapp: { bg: "bg-[#EAF3DE]", text: "text-[#3B6D11]", icon: Phone },
                    };
                    const channelKey = camp.channel.toLowerCase();
                    const conf = channelConfig[channelKey] || channelConfig.email;
                    const ChannelIcon = conf.icon;

                    const stats = camp.stats || {};
                    const conversionRevenue = stats.conversionRevenue || 0;
                    const convertedOrders = stats.convertedOrders || 0;

                    return (
                      <TableRow key={camp.id} className="hover:bg-[#FAFAFE] border-b border-[#F1F1F3] transition-colors duration-150">
                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-[14px] text-[#111827]">{camp.name}</span>
                            {camp.createdBy === "AI Autopilot" && (
                              <span className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI Autopilot
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[14px] text-[#111827] py-3.5 px-4 font-normal">
                          {camp.segment?.name || "—"}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium uppercase tracking-wider ${conf.bg} ${conf.text}`}>
                            <ChannelIcon className="h-3 w-3" />
                            {camp.channel}
                          </div>
                        </TableCell>
                        <TableCell className="text-[14px] text-right py-3.5 px-4 font-normal text-[#111827]">
                          {camp.totalRecipients.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-medium capitalize ${statusColors[camp.status.toLowerCase()] || "bg-[#F3F4F6] text-[#6B7280]"}`}>
                            {camp.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3.5 px-4">
                          <Link href={`/campaigns/${camp.id}`} className="inline-block">
                            <Button 
                              size="sm" 
                              className="h-8 gap-1.5 bg-white border border-[#E5E7EB] text-[#111827] rounded-[10px] hover:bg-[#FAF8FF] hover:border-[#6C5CE7] hover:text-[#6C5CE7] transition-all duration-150 shadow-none font-medium px-3"
                            >
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
        </div>
      </div>
    </div>
  );
}
