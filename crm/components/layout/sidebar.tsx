"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  Send,
  BarChart3,
} from "lucide-react";
import AICRMLogo from "../icons/AICRMLogo";

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
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col bg-[#FFFFFF]" style={{ borderRight: "1px solid #E8E6FF" }}>
      <div className="flex h-20 items-center px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center">
            <AICRMLogo className="h-9 w-9" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold tracking-tight text-[#111827]">
              ReachNext
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4 pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href === pathname || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group relative ${
                isActive
                  ? "bg-[#E1F5EE] text-[#0F6E56] rounded-[12px] font-medium"
                  : "text-[#6B7280] hover:text-[#111827] rounded-[12px] hover:bg-[#F9FAFB] font-normal"
              }`}
            >
              <item.icon className="h-4.5 w-4.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mb-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-[#F1F1F3] bg-[#FAFAFB]">
          <div className="h-9 w-9 rounded-full bg-[#EDE9FF] flex items-center justify-center font-bold text-xs text-[#6C5CE7]">
            BC
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[13px] font-semibold text-[#111827] truncate">
              Bipul Chamoli
            </span>
            <span className="text-[11px] text-[#6B7280] truncate font-medium mt-0.5">
              Marketer Workspace
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
