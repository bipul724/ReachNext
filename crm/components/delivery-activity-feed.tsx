"use client";

import { useRef, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  Eye,
  BookOpen,
  MousePointerClick,
  ShoppingBag,
  AlertCircle,
  Clock,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeliveryEvent {
  communicationId: string;
  customerName: string;
  status: string;
  channel: string;
  timestamp: string;
  attributedRevenue: number | null;
}

interface DeliveryActivityFeedProps {
  events?: DeliveryEvent[];
  isLoading?: boolean;
  isLive?: boolean;
}

// ---------------------------------------------------------------------------
// Status → visual config mapping
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, {
  icon: typeof Send;
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
  preposition: string;
}> = {
  QUEUED: {
    icon: Clock,
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-border",
    label: "QUEUED",
    preposition: "for",
  },
  SENT: {
    icon: Send,
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-900/30",
    label: "SENT",
    preposition: "to",
  },
  DELIVERED: {
    icon: CheckCircle2,
    bgColor: "bg-sky-50 dark:bg-sky-950/20",
    textColor: "text-sky-700 dark:text-sky-400",
    borderColor: "border-sky-200 dark:border-sky-900/30",
    label: "DELIVERED",
    preposition: "to",
  },
  OPENED: {
    icon: Eye,
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-900/30",
    label: "OPENED",
    preposition: "by",
  },
  READ: {
    icon: BookOpen,
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-900/30",
    label: "READ",
    preposition: "by",
  },
  CLICKED: {
    icon: MousePointerClick,
    bgColor: "bg-pink-50 dark:bg-pink-950/20",
    textColor: "text-pink-700 dark:text-pink-400",
    borderColor: "border-pink-200 dark:border-pink-900/30",
    label: "CLICKED",
    preposition: "by",
  },
  CONVERTED: {
    icon: ShoppingBag,
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-900/30",
    label: "CONVERTED",
    preposition: "by",
  },
  FAILED: {
    icon: AlertCircle,
    bgColor: "bg-red-50 dark:bg-red-950/20",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-900/30",
    label: "FAILED",
    preposition: "for",
  },
};

const DEFAULT_CONFIG = {
  icon: Clock,
  bgColor: "bg-muted",
  textColor: "text-muted-foreground",
  borderColor: "border-border",
  label: "UNKNOWN",
  preposition: "for",
};

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Channel display helper
// ---------------------------------------------------------------------------

function formatChannel(channel: string): string {
  const map: Record<string, string> = {
    EMAIL: "Email",
    SMS: "SMS",
    WHATSAPP: "WhatsApp",
  };
  return map[channel] || channel;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeliveryActivityFeed({ events, isLoading, isLive }: DeliveryActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the top (newest event) when live and events update
  useEffect(() => {
    if (isLive && scrollRef.current && events && events.length > 0) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isLive, events?.length]);

  // Empty state
  if (!events || events.length === 0) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
          <Activity className="h-4 w-4 animate-pulse" />
          Waiting for delivery callbacks...
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-card/45 space-y-1">
        <p className="font-medium">Waiting for delivery events...</p>
        <p>Launch a campaign to observe webhook-driven updates.</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[400px] overflow-y-auto pl-5 pr-1"
    >
      <div className="relative pl-6 border-l border-border/80 space-y-0.5 py-1">
        {events.map((event, index) => {
          const config = STATUS_CONFIG[event.status] || DEFAULT_CONFIG;
          const Icon = config.icon;

          return (
            <div
              key={`${event.communicationId}-${event.status}-${index}`}
              className="relative group animate-in fade-in duration-300"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              {/* Timeline dot */}
              <span
                className={`absolute -left-[33px] top-2 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm ${config.bgColor} ${config.borderColor} ${config.textColor}`}
              >
                <Icon className="h-3 w-3" />
              </span>

              {/* Event card — two-line layout */}
              <div className="py-2 px-2.5 rounded-lg transition-colors duration-150 hover:bg-muted/40">
                {/* Line 1: Status + preposition + customer name */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-bold tracking-wide ${config.textColor}`}>
                    ✓ {config.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {config.preposition}
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {event.customerName}
                  </span>

                  {/* Revenue badge for conversions — inline on line 1 */}
                  {event.status === "CONVERTED" && event.attributedRevenue != null && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 ml-0.5">
                      ₹{event.attributedRevenue.toLocaleString("en-IN")} Revenue
                    </span>
                  )}
                </div>

                {/* Line 2: Channel + timestamp */}
                <div className="flex items-center gap-1 mt-0.5 pl-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {formatChannel(event.channel)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">•</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

