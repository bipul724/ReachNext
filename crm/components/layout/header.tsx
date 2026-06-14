"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Plus } from "lucide-react";
import { Button } from "../ui/button";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/campaigns": "Marketing Campaigns",
  "/campaigns/new": "Campaign Autopilot Workspace",
  "/segments": "Audience Segments",
  "/customers": "Customers Database",
};

export function Header() {
  const pathname = usePathname();

  // Determine dynamic title for sub-routes
  let title = PAGE_TITLES[pathname] || "Workspace";
  if (pathname.startsWith("/campaigns/") && pathname !== "/campaigns/new") {
    title = "Campaign Delivery Analytics";
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isCampaignsPage = pathname === "/campaigns";
  const isCustomersPage = pathname === "/customers";

  return (
    <header 
      className="sticky top-0 z-10 flex items-center justify-between bg-[#FAFAFB] px-8 py-6"
      style={{ borderBottom: "1px solid #F1F1F3" }}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-bold tracking-tight text-[#111827] leading-tight">
          {title}
        </h1>
        {isCampaignsPage && (
          <p className="text-[14px] font-normal text-[#6B7280]">
            Launch and track customer marketing campaigns
          </p>
        )}
        {isCustomersPage && (
          <p className="text-[14px] font-normal text-[#6B7280]">
            Database of customer subscribers, total spends, and locations.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Environment status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-full text-[#047857] text-[13px] font-semibold shadow-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Simulator Linked
        </div>

        {/* Date tracker */}
        <div suppressHydrationWarning className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280]">
          <span suppressHydrationWarning>{currentDate}</span>
        </div>

        {isCampaignsPage && (
          <div className="pl-2 ml-2 border-l border-[#E5E7EB]">
            <Link href="/campaigns/new">
              <Button className="gap-2 bg-[#6C5CE7] hover:bg-[#5A4AC7] text-white rounded-[12px] h-10 px-5 shadow-none font-medium transition-colors">
                <Plus className="h-4.5 w-4.5" />
                Launch AI Autopilot
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
