"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  Send,
  Coffee,
  BarChart3,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: Send,
  },
  {
    name: "Compare",
    href: "/compare",
    icon: BarChart3,
  },
  {
    name: "Segments",
    href: "/segments",
    icon: Layers,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border bg-card/65 backdrop-blur-md">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Coffee className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-foreground">
              ReachNext
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1.5 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href === pathname || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110" />
              <span>{item.name}</span>
              {isActive && (
                <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary-foreground/80 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border bg-muted/40">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
            BC
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-foreground truncate">
              Bipul Chamoli
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              Marketer Workspace
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
