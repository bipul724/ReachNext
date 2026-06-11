"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import AgentThoughtsTimeline from "../../../components/agent-thoughts-timeline";
import { Badge } from "../../../components/ui/badge";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Users,
  TrendingUp,
  Mail,
  MessageSquare,
  Clock,
  Gift,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CampaignWorkspacePayload } from "../../../services/agent-orchestrator";

const EXAMPLE_GOALS = [
  "Re-engage high-value Delhi customers who have not ordered in 45 days.",
  "Reward loyal cafe shoppers in Pune who have made more than 5 purchases.",
  "SMS outreach to inactive VIP customers to revive coffee subscription orders.",
];

export default function NewCampaign() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [workspace, setWorkspace] = useState<CampaignWorkspacePayload | null>(null);

  // Dynamic loading steps for visual wow factor
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = [
    "Segmentation Agent: Translating campaign goal into database query filters...",
    "Opportunity Sizing: Aggregating shopper metrics and matching audience size...",
    "Strategy Agent: Selecting optimal communication channel, offer, and timing...",
    "Content Agent: Personalizing copywriting templates and message hooks...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < loadingSteps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerateAutopilot = async (objectiveGoal: string) => {
    setIsGenerating(true);
    setWorkspace(null);
    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: objectiveGoal }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Autopilot generation failed.");

      setWorkspace(result);
      toast.success("Autopilot campaign draft generated successfully!");
    } catch (err: any) {
      toast.error("Generation failed", {
        description: err.message || "Please make sure GEMINI_API_KEY is configured in crm/.env",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!workspace) return;
    setIsLaunching(true);

    try {
      const res = await fetch(`/api/campaigns/${workspace.campaignId}/launch`, {
        method: "POST",
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Launch failed.");

      toast.success("Campaign launched!", {
        description: result.message,
      });

      // Redirect to analytics funnel
      router.push(`/campaigns/${workspace.campaignId}`);
    } catch (err: any) {
      toast.error("Launch Failed", { description: err.message });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns list
        </Link>
      </div>

      {/* 1. INITIAL GOAL INPUT VIEW */}
      {!isGenerating && !workspace && (
        <Card className="border-primary/15 bg-radial-[circle_at_right] from-primary/5 via-transparent to-transparent">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5.5 w-5.5 text-primary" />
              Campaign Autopilot Workspace
            </CardTitle>
            <CardDescription>
              Input your marketing goal in plain English. The CRM agent pipeline will construct the segment filters, sizing, channel strategy, and promos automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2.5">
              <textarea
                className="w-full h-32 rounded-lg border border-input bg-transparent px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                placeholder="What is your business objective? e.g., Increase repeat purchases among footwear buyers who have not purchased in the last 45 days..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
              <Button
                onClick={() => handleGenerateAutopilot(goal)}
                disabled={!goal.trim()}
                className="w-full font-bold h-10 gap-2 shadow-md"
              >
                <Sparkles className="h-4.5 w-4.5" />
                Generate Autopilot Campaign Plan
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/60">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Example goals to test:</span>
              <div className="grid gap-2">
                {EXAMPLE_GOALS.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setGoal(ex);
                      handleGenerateAutopilot(ex);
                    }}
                    className="text-left text-xs bg-muted/30 hover:bg-muted/70 p-3 rounded-lg border border-border/40 text-foreground transition-all duration-200 flex items-center justify-between group"
                  >
                    <span>{ex}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. LOADING STATE CONTAINER WITH SEQUENCE STEPS */}
      {isGenerating && (
        <Card className="p-8 text-center space-y-6 animate-pulse">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-bold text-lg text-foreground">Coordinating AI Agents</h3>
            <p className="text-xs text-muted-foreground">The CRM orchestrator is building your campaign draft.</p>
          </div>
          <div className="max-w-lg mx-auto text-left border border-border rounded-lg p-4 bg-muted/20 text-xs space-y-3">
            {loadingSteps.map((step, idx) => {
              const isDone = idx < loadingStep;
              const isCurrent = idx === loadingStep;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 transition-all duration-300 ${
                    isDone ? "text-emerald-600 dark:text-emerald-400 font-semibold" : isCurrent ? "text-foreground font-bold" : "text-muted-foreground/50"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5 text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border/50 shrink-0 mt-0.5" />
                  )}
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 3. CAMPAIGN WORKSPACE PREVIEW (AFTER AI FINISHES) */}
      {workspace && (
        <div className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="space-y-6 md:col-span-2">
            {/* Opportunity sizing */}
            <Card className="border-primary/10">
              <CardHeader className="bg-primary/5 pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Discovered Marketing Opportunity</span>
                  <Badge className="bg-primary text-primary-foreground">Opportunity sizing</Badge>
                </CardTitle>
                <CardDescription>Estimated potential business value resolved against DB</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/40 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Shoppers Target</span>
                    <div className="text-2xl font-bold mt-1 text-foreground flex items-center justify-center gap-1">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      {workspace.customerCount}
                    </div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/40 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">shopper AOV</span>
                    <div className="text-2xl font-bold mt-1 text-foreground">
                      ₹{workspace.aov.toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/40 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">potential revenue</span>
                    <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                      ₹{workspace.potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
                
                {/* Explainability reasoning */}
                <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-4 text-xs leading-relaxed space-y-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Opportunity Explainer:</span>
                  <p className="text-emerald-700 dark:text-emerald-400">{workspace.opportunityReasoning}</p>
                </div>
              </CardContent>
            </Card>

            {/* Target Audience details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Target Audience Segment</span>
                  <Badge variant="outline">{workspace.segmentName}</Badge>
                </CardTitle>
                <CardDescription>{workspace.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/80 bg-muted/10 p-4 text-xs space-y-2">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider">AI Segment Logic:</span>
                  <p className="font-mono bg-muted/60 p-2.5 rounded text-[11px] overflow-x-auto">
                    {JSON.stringify(workspace.explainAudience, null, 2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Content preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Draft Message template</span>
                  <Badge variant="outline" className="uppercase font-bold text-[9px]">
                    {workspace.channel}
                  </Badge>
                </CardTitle>
                <CardDescription>Personalized content copy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workspace.subject && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Subject Line:</span>
                    <div className="rounded-md border border-border/80 p-2.5 text-xs font-medium bg-muted/20">
                      {workspace.subject}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Message Body:</span>
                  <div className="rounded-md border border-border/80 p-4 text-sm font-medium bg-muted/20 leading-relaxed font-sans whitespace-pre-wrap">
                    {workspace.body}
                  </div>
                </div>

                <div className="rounded-lg bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 p-4 text-xs leading-relaxed space-y-1">
                  <span className="font-bold text-orange-800 dark:text-orange-300 block">Copywriting Explainer:</span>
                  <p className="text-orange-700 dark:text-orange-400">{workspace.explainContent}</p>
                </div>
              </CardContent>
            </Card>

            {/* Agent thoughts timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                  Agent Execution & Thinking Timeline
                </CardTitle>
                <CardDescription>Chronological reasoning path of coordinating agents</CardDescription>
              </CardHeader>
              <CardContent>
                <AgentThoughtsTimeline thoughts={workspace.agentThoughts} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Strategy recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Marketing Strategy</CardTitle>
                <CardDescription>Decisions generated by AI strategy engine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Channel choice */}
                <div className="flex items-start gap-3 border-b border-border/40 pb-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                    {workspace.channel === "email" ? <Mail className="h-4.5 w-4.5" /> : <MessageSquare className="h-4.5 w-4.5" />}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Channel Selected</span>
                    <span className="font-bold text-foreground text-sm uppercase">{workspace.channel}</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed text-[11px]">{workspace.explainChannel}</p>
                  </div>
                </div>

                {/* Offer choice */}
                <div className="flex items-start gap-3 border-b border-border/40 pb-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400">
                    <Gift className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Offer Recommendation</span>
                    <span className="font-bold text-foreground text-sm">{workspace.offer}</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed text-[11px]">{workspace.explainOffer}</p>
                  </div>
                </div>

                {/* Timing choice */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Dispatch Timing</span>
                    <span className="font-bold text-foreground text-sm">{workspace.timing}</span>
                    <p className="text-muted-foreground mt-1 leading-relaxed text-[11px]">{workspace.explainTiming}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Launch Controller card */}
            <Card className="border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/5">
              <CardHeader className="pb-3 text-center">
                <CardTitle className="text-base font-bold text-foreground flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  One-Click Launch
                </CardTitle>
                <CardDescription>Launches draft to simulator immediately</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleLaunchCampaign}
                  disabled={isLaunching}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 gap-2 shadow-md"
                >
                  {isLaunching ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Play className="h-4.5 w-4.5 fill-white" />
                  )}
                  Launch Campaign
                </Button>
                
                {/* Reset button */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setWorkspace(null);
                    setGoal("");
                  }}
                  className="w-full text-xs text-muted-foreground"
                  disabled={isLaunching}
                >
                  Draft Another Campaign
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
