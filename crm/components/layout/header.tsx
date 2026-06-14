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

  return (
    <header 
      className="sticky top-0 z-10 flex items-center justify-between bg-[#FAFAFB] px-8 py-6"
      style={{ borderBottom: "1px solid #F1F1F3" }}
    >
      <div className="flex flex-col gap-1">
        <h1 className={`${isCampaignsPage ? 'text-[32px]' : 'text-2xl'} font-semibold tracking-tight text-[#111827] leading-tight`}>
          {title}
        </h1>
        {isCampaignsPage && (
          <p className="text-[14px] font-normal text-[#6B7280]">
            Launch and track customer marketing campaigns
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Environment status indicator */}
        <div className="flex items-center gap-2 rounded-full bg-[#E1F5EE] px-3.5 py-1.5 text-[13px] font-medium text-[#0F6E56]">
          <span className="h-2 w-2 rounded-full bg-[#0F6E56]" />
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
