"use client";

import { AgentThought } from "../types";
import {
  Sparkles,
  Brain,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

interface AgentThoughtsTimelineProps {
  thoughts?: AgentThought[] | string | null; // Handle stringified Json or array
}

export default function AgentThoughtsTimeline({ thoughts }: AgentThoughtsTimelineProps) {
  // Parse thoughts safely
  let parsedThoughts: AgentThought[] = [];
  try {
    if (typeof thoughts === "string") {
      parsedThoughts = JSON.parse(thoughts);
    } else if (Array.isArray(thoughts)) {
      parsedThoughts = thoughts;
    }
  } catch (e) {
    console.error("Error parsing thoughts:", e);
  }

  if (!parsedThoughts || parsedThoughts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground bg-muted/20">
        No thinking logs recorded for this campaign.
      </div>
    );
  }

  // Map step/agent to appropriate icon and color classes
  const getStepConfig = (step: string, agent: string) => {
    const s = step.toLowerCase();
    const a = agent.toLowerCase();

    if (s.includes("correction") || s.includes("retry")) {
      return {
        icon: RefreshCw,
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        label: "Self-Correction Loop",
      };
    }
    if (s.includes("failed") || s.includes("exhausted")) {
      return {
        icon: AlertCircle,
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400",
        label: "Execution Terminated",
      };
    }
    if (a.includes("segment")) {
      return {
        icon: Brain,
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        label: "Segmentation Agent",
      };
    }
    if (a.includes("opportunity") || a.includes("sizing")) {
      return {
        icon: TrendingUp,
        colorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
        label: "Opportunity Agent",
      };
    }
    if (a.includes("adaptive")) {
      return {
        icon: Brain,
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        label: "Adaptive Recommendation Engine",
      };
    }
    if (a.includes("strategy")) {
      return {
        icon: Sparkles,
        colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        label: "Strategy Agent",
      };
    }
    if (a.includes("content") || a.includes("copy")) {
      return {
        icon: MessageSquare,
        colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        label: "Content Copywriter Agent",
      };
    }

    return {
      icon: Clock,
      colorClass: "bg-muted text-muted-foreground",
      label: agent || "Agent System",
    };
  };

  return (
    <div className="flex flex-col">
      {parsedThoughts.map((thought, index) => {
        const config = getStepConfig(thought.step, thought.agent);
        const Icon = config.icon;

        return (
          <div key={index} className="flex gap-4 py-4 border-b border-border last:border-0 last:pb-0 first:pt-0">
            {/* Avatar Icon */}
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config.colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-sans font-medium text-sm text-foreground uppercase tracking-wide">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 sm:text-right">
                  {thought.timestamp ? new Date(thought.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `Step ${index + 1}`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {thought.reasoning}
              </p>
              {thought.step && (
                <div className="pt-1.5">
                  <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide">
                    {thought.step}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
