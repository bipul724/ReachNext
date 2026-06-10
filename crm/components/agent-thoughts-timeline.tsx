"use client";

import { AgentThought } from "../types";
import {
  Sparkles,
  Brain,
  TrendingUp,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
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
      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-card/45">
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
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
        textColor: "text-amber-700 dark:text-amber-400",
        borderColor: "border-amber-200 dark:border-amber-900/30",
        label: "Self-Correction Loop",
      };
    }
    if (s.includes("failed") || s.includes("exhausted")) {
      return {
        icon: AlertCircle,
        bgColor: "bg-red-50 dark:bg-red-950/20",
        textColor: "text-red-700 dark:text-red-400",
        borderColor: "border-red-200 dark:border-red-900/30",
        label: "Execution Terminated",
      };
    }
    if (a.includes("segment")) {
      return {
        icon: Brain,
        bgColor: "bg-blue-50 dark:bg-blue-950/20",
        textColor: "text-blue-700 dark:text-blue-400",
        borderColor: "border-blue-200 dark:border-blue-900/30",
        label: "Segmentation Agent",
      };
    }
    if (a.includes("opportunity") || a.includes("sizing")) {
      return {
        icon: TrendingUp,
        bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
        textColor: "text-emerald-700 dark:text-emerald-400",
        borderColor: "border-emerald-200 dark:border-emerald-900/30",
        label: "Opportunity Agent",
      };
    }
    if (a.includes("strategy")) {
      return {
        icon: Sparkles,
        bgColor: "bg-purple-50 dark:bg-purple-950/20",
        textColor: "text-purple-700 dark:text-purple-400",
        borderColor: "border-purple-200 dark:border-purple-900/30",
        label: "Strategy Agent",
      };
    }
    if (a.includes("content") || a.includes("copy")) {
      return {
        icon: MessageSquare,
        bgColor: "bg-orange-50 dark:bg-orange-950/20",
        textColor: "text-orange-700 dark:text-orange-400",
        borderColor: "border-orange-200 dark:border-orange-900/30",
        label: "Content Copywriter Agent",
      };
    }

    return {
      icon: Clock,
      bgColor: "bg-muted",
      textColor: "text-muted-foreground",
      borderColor: "border-border",
      label: agent || "Agent System",
    };
  };

  return (
    <div className="relative pl-6 border-l border-border/80 space-y-8 py-2">
      {parsedThoughts.map((thought, index) => {
        const config = getStepConfig(thought.step, thought.agent);
        const Icon = config.icon;

        return (
          <div key={index} className="relative group animate-in fade-in duration-300">
            {/* Dot/Icon indicator on the left line */}
            <span className={`absolute -left-[38px] top-1 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm ${config.bgColor} ${config.borderColor} ${config.textColor}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>

            {/* Content card */}
            <div className={`rounded-xl border p-4 bg-card/65 shadow-sm transition-all duration-200 hover:shadow-md ${config.borderColor}`}>
              <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2 mb-2.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${config.textColor}`}>
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {thought.timestamp ? new Date(thought.timestamp).toLocaleTimeString() : `Step ${index + 1}`}
                </span>
              </div>
              <p className="text-xs font-medium leading-relaxed text-foreground whitespace-pre-line">
                {thought.reasoning}
              </p>
              {thought.step && (
                <div className="mt-2 text-[10px] font-mono text-muted-foreground uppercase">
                  Action: {thought.step}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
