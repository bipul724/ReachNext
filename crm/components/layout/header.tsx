"use client";

import { usePathname } from "next/navigation";
import { Calendar } from "lucide-react";

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

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/65 px-8 backdrop-blur-md">
      <div className="flex flex-col">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Environment status indicator */}
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Simulator Linked
        </div>

        {/* Date tracker */}
        <div suppressHydrationWarning className="flex items-center gap-2 text-xs font-medium text-muted-foreground border-l border-border pl-6">
          <Calendar className="h-4 w-4" />
          <span suppressHydrationWarning>{currentDate}</span>
        </div>
      </div>
    </header>
  );
}
