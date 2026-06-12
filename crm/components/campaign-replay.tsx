"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  Eye,
  BookOpen,
  MousePointerClick,
  ShoppingBag,
  AlertCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ChevronsRight,
} from "lucide-react";
import { Button } from "./ui/button";

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

interface CampaignReplayProps {
  events?: DeliveryEvent[];
}

// ---------------------------------------------------------------------------
// Status config — same mapping as delivery-activity-feed.tsx
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, {
  icon: typeof Send;
  textColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
  preposition: string;
}> = {
  QUEUED: { icon: Clock, textColor: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-border", label: "QUEUED", preposition: "for" },
  SENT: { icon: Send, textColor: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/20", borderColor: "border-blue-200 dark:border-blue-900/30", label: "SENT", preposition: "to" },
  DELIVERED: { icon: CheckCircle2, textColor: "text-sky-700 dark:text-sky-400", bgColor: "bg-sky-50 dark:bg-sky-950/20", borderColor: "border-sky-200 dark:border-sky-900/30", label: "DELIVERED", preposition: "to" },
  OPENED: { icon: Eye, textColor: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/20", borderColor: "border-orange-200 dark:border-orange-900/30", label: "OPENED", preposition: "by" },
  READ: { icon: BookOpen, textColor: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/20", borderColor: "border-orange-200 dark:border-orange-900/30", label: "READ", preposition: "by" },
  CLICKED: { icon: MousePointerClick, textColor: "text-pink-700 dark:text-pink-400", bgColor: "bg-pink-50 dark:bg-pink-950/20", borderColor: "border-pink-200 dark:border-pink-900/30", label: "CLICKED", preposition: "by" },
  CONVERTED: { icon: ShoppingBag, textColor: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/20", borderColor: "border-emerald-200 dark:border-emerald-900/30", label: "CONVERTED", preposition: "by" },
  FAILED: { icon: AlertCircle, textColor: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/20", borderColor: "border-red-200 dark:border-red-900/30", label: "FAILED", preposition: "for" },
};

const DEFAULT_CONFIG = { icon: Clock, textColor: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-border", label: "UNKNOWN", preposition: "for" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatChannel(channel: string): string {
  const map: Record<string, string> = { EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp" };
  return map[channel] || channel;
}

const SPEED_OPTIONS = [
  { label: "1×", ms: 800 },
  { label: "2×", ms: 400 },
  { label: "4×", ms: 200 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CampaignReplay({ events }: CampaignReplayProps) {
  // Chronological (oldest first) for replay storytelling
  const chronologicalEvents = (events || []).slice().reverse();
  const total = chronologicalEvents.length;

  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs for latest state in recursive setTimeout
  const visibleCountRef = useRef(visibleCount);
  const speedIndexRef = useRef(speedIndex);
  visibleCountRef.current = visibleCount;
  speedIndexRef.current = speedIndex;

  // Clear any pending timer
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Schedule next event reveal (recursive setTimeout)
  const scheduleNext = useCallback(() => {
    clearTimer();
    const delay = SPEED_OPTIONS[speedIndexRef.current].ms;

    timerRef.current = setTimeout(() => {
      const nextCount = visibleCountRef.current + 1;

      if (nextCount >= total) {
        setVisibleCount(total);
        setIsPlaying(false);
        return;
      }

      setVisibleCount(nextCount);
      // Auto-scroll to bottom (latest event in chronological order)
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
      });
      scheduleNext();
    }, delay);
  }, [clearTimer, total]);

  // Play
  const play = useCallback(() => {
    if (visibleCountRef.current >= total) {
      // If at end, restart
      setVisibleCount(0);
      visibleCountRef.current = 0;
    }
    setIsPlaying(true);
    scheduleNext();
  }, [scheduleNext, total]);

  // Pause
  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
  }, [clearTimer]);

  // Restart
  const restart = useCallback(() => {
    clearTimer();
    setVisibleCount(0);
    visibleCountRef.current = 0;
    setIsPlaying(false);
  }, [clearTimer]);

  // Skip to End
  const skipToEnd = useCallback(() => {
    clearTimer();
    setVisibleCount(total);
    setIsPlaying(false);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    });
  }, [clearTimer, total]);

  // Speed change — if playing, restart the timer with new speed
  const cycleSpeed = useCallback(() => {
    const nextIdx = (speedIndexRef.current + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIdx);
    speedIndexRef.current = nextIdx;
    if (isPlaying) {
      clearTimer();
      scheduleNext();
    }
  }, [isPlaying, clearTimer, scheduleNext]);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  // Nothing to replay
  if (!events || events.length === 0) {
    return null;
  }

  const visibleEvents = chronologicalEvents.slice(0, visibleCount);
  const progress = total > 0 ? Math.round((visibleCount / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Play / Pause */}
        {isPlaying ? (
          <Button size="sm" variant="outline" onClick={pause} className="gap-1.5 h-7 text-xs">
            <Pause className="h-3 w-3" />
            Pause
          </Button>
        ) : (
          <Button size="sm" variant="default" onClick={play} className="gap-1.5 h-7 text-xs">
            <Play className="h-3 w-3" />
            {visibleCount > 0 && visibleCount < total ? "Resume" : "Play"}
          </Button>
        )}

        {/* Restart */}
        <Button size="sm" variant="outline" onClick={restart} className="gap-1.5 h-7 text-xs" disabled={visibleCount === 0}>
          <RotateCcw className="h-3 w-3" />
          Restart
        </Button>

        {/* Skip to End */}
        <Button size="sm" variant="outline" onClick={skipToEnd} className="gap-1.5 h-7 text-xs" disabled={visibleCount >= total}>
          <ChevronsRight className="h-3 w-3" />
          Skip to End
        </Button>

        {/* Speed */}
        <Button size="sm" variant="ghost" onClick={cycleSpeed} className="h-7 text-xs font-mono font-bold px-2">
          {SPEED_OPTIONS[speedIndex].label}
        </Button>

        {/* Progress */}
        <span className="text-[10px] text-muted-foreground ml-auto font-mono">
          {visibleCount} / {total} events ({progress}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Event timeline */}
      {visibleCount === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-card/45">
          Press <span className="font-semibold text-foreground">Play</span> to replay the campaign delivery lifecycle.
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="relative max-h-[350px] overflow-y-auto pl-5 pr-1"
        >
          <div className="relative pl-6 border-l border-border/80 space-y-0.5 py-1">
            {visibleEvents.map((event, index) => {
              const config = STATUS_CONFIG[event.status] || DEFAULT_CONFIG;
              const Icon = config.icon;

              return (
                <div
                  key={`${event.communicationId}-${event.status}-${index}`}
                  className="relative animate-in fade-in slide-in-from-left-2 duration-300"
                >
                  {/* Timeline dot */}
                  <span
                    className={`absolute -left-[33px] top-2 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm ${config.bgColor} ${config.borderColor} ${config.textColor}`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>

                  {/* Event row — two-line layout matching delivery feed */}
                  <div className="py-2 px-2.5 rounded-lg hover:bg-muted/40 transition-colors duration-150">
                    {/* Line 1 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {formatTime(event.timestamp)}
                      </span>
                      <span className={`text-[11px] font-bold tracking-wide ${config.textColor}`}>
                        ✓ {config.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {config.preposition}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground">
                        {event.customerName}
                      </span>

                      {/* Revenue badge */}
                      {event.status === "CONVERTED" && event.attributedRevenue != null && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 ml-0.5">
                          ₹{event.attributedRevenue.toLocaleString("en-IN")} Revenue
                        </span>
                      )}
                    </div>

                    {/* Line 2 */}
                    <div className="flex items-center gap-1 mt-0.5 pl-[60px]">
                      <span className="text-[10px] text-muted-foreground">
                        {formatChannel(event.channel)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
