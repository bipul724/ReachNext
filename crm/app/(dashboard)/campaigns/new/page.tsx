"use client";

import type { AdaptiveRecommendation } from "../../../../ai/adaptive-recommendation";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import AgentThoughtsTimeline from "../../../../components/agent-thoughts-timeline";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Users,
  TrendingUp,
  MessageSquare,
  MessageCircle,
  Clock,
  Gift,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Brain,
  Activity,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CampaignWorkspacePayload } from "../../../../services/agent-orchestrator";
import { IntentClarificationPayload, IntentConfirmationPayload } from "../../../../ai/schemas";

const EXAMPLE_GOALS = [
  "Re-engage high-value Delhi customers who have not ordered in 45 days.",
  "Reward loyal cafe shoppers in Pune who have made more than 5 purchases.",
  "SMS outreach to inactive VIP customers to revive coffee subscription orders.",
];

function CampaignWorkspaceSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
        <div className="h-8 w-[250px] bg-muted rounded animate-pulse" />
        <div className="h-10 w-full bg-muted rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4"><div className="h-40 bg-muted animate-pulse rounded-lg" /></div>
        <div className="bg-card border border-border rounded-xl p-4"><div className="h-40 bg-muted animate-pulse rounded-lg" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4"><div className="h-48 bg-muted animate-pulse rounded-lg" /></div>
        <div className="bg-card border border-border rounded-xl p-4"><div className="h-48 bg-muted animate-pulse rounded-lg" /></div>
      </div>
      
      <div className="bg-card border border-border rounded-xl p-4"><div className="h-64 bg-muted animate-pulse rounded-lg" /></div>
      <div className="bg-card border border-border rounded-xl p-4"><div className="h-12 bg-muted animate-pulse rounded-lg" /></div>
    </div>
  );
}

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");
  const urlGoal = searchParams.get("goal");
  const autoplay = searchParams.get("autoplay");

  const [goal, setGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [workspace, setWorkspace] = useState<CampaignWorkspacePayload | null>(null);
  const [clarificationState, setClarificationState] = useState<IntentClarificationPayload | null>(null);
  const [confirmationState, setConfirmationState] = useState<IntentConfirmationPayload | null>(null);
  const [adaptiveInsights, setAdaptiveInsights] = useState<AdaptiveRecommendation | null>(null);

  const [isRestoring, setIsRestoring] = useState(Boolean(campaignId));

  // Copilot Chat State
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [refinementInput, setRefinementInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isRefining]);

  useEffect(() => {
    if (!campaignId) {
      setIsRestoring(false);
      if (urlGoal) {
        setGoal(urlGoal);
        if (autoplay === "true") {
          handleGenerateAutopilot(urlGoal);
          router.replace("/campaigns/new");
        }
      }
      return;
    }

    const restore = async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/workspace`);

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          setGoal(data.workspace.goal);
        }
      } catch (error) {
        console.error("Failed to restore workspace", error);
      } finally {
        setIsRestoring(false);
      }
    };

    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = [
    "Adaptive Engine: Analyzing historical campaign outcomes for similar objectives...",
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

  const handleGenerateAutopilot = async (objectiveGoal: string, skipValidation: boolean = false) => {
    setIsGenerating(true);
    setWorkspace(null);
    setClarificationState(null);
    setConfirmationState(null);
    setAdaptiveInsights(null);
    setMessages([]);

    fetch("/api/campaigns/adaptive-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: objectiveGoal }),
    })
      .then((r) => r.json())
      .then((data) => setAdaptiveInsights(data))
      .catch(() => setAdaptiveInsights(null));

    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: objectiveGoal }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Autopilot generation failed.");

      if (result.status === "needs_clarification") {
        setClarificationState(result);
        toast.error("Objective Unclear", { description: "Please provide a more specific marketing goal." });
      } else if (result.status === "needs_confirmation") {
        setConfirmationState(result);
      } else {
        setWorkspace(result);
        window.history.replaceState(null, '', `?id=${result.campaignId}`);
        toast.success("Autopilot campaign draft generated successfully!");
      }
    } catch (err: any) {
      toast.error("Generation failed", {
        description: err.message || "Please make sure GROQ_API_KEY is configured in crm/.env",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementInput.trim() || !workspace) return;
    
    const instruction = refinementInput.trim();
    setMessages(prev => [...prev, { role: "user", text: instruction }]);
    setRefinementInput("");
    setIsRefining(true);

    try {
      const res = await fetch(`/api/campaigns/${workspace.campaignId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refinement failed");
      
      setWorkspace(data.workspace);
      setMessages(prev => [...prev, { role: "assistant", text: data.assistantMessage }]);
      
    } catch (err: any) {
      toast.error("Refinement error", { description: err.message });
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I encountered an error applying that refinement." }]);
    } finally {
      setIsRefining(false);
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

      router.push(`/campaigns/${workspace.campaignId}`);
    } catch (err: any) {
      toast.error("Launch Failed", { description: err.message });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns list
        </Link>
      </div>

      {isRestoring && <CampaignWorkspaceSkeleton />}

      {!isRestoring && !isGenerating && !workspace && !clarificationState && !confirmationState && (
        <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="font-sans font-medium text-sm">Campaign Autopilot Workspace</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Input your marketing goal in plain English. The CRM agent pipeline will construct the segment filters, sizing, channel strategy, and promos automatically.
          </p>
          <div className="flex flex-col gap-3">
            <textarea
              className="w-full h-32 rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="What is your business objective? e.g., Increase repeat purchases among footwear buyers who have not purchased in the last 45 days..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <Button
              onClick={() => handleGenerateAutopilot(goal)}
              disabled={!goal.trim()}
              className="w-full rounded-lg gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate Autopilot Campaign Plan
            </Button>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Example goals to test</span>
            <div className="grid gap-2">
              {EXAMPLE_GOALS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setGoal(ex);
                    handleGenerateAutopilot(ex);
                  }}
                  className="text-left text-sm bg-muted/50 hover:bg-muted p-3 rounded-lg border text-foreground transition-all flex items-center justify-between group"
                >
                  <span>{ex}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isRestoring && isGenerating && (
        <div className="bg-card text-card-foreground border border-border rounded-xl p-8 text-center flex flex-col gap-6 animate-pulse max-w-4xl mx-auto">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-sans font-medium text-sm">Coordinating AI Agents</span>
            <span className="text-sm text-muted-foreground">The CRM orchestrator is building your campaign draft.</span>
          </div>
          <div className="flex flex-col gap-3 text-left bg-muted/30 border border-border rounded-lg p-4 max-w-lg mx-auto w-full">
            {loadingSteps.map((step, idx) => {
              const isDone = idx < loadingStep;
              const isCurrent = idx === loadingStep;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 transition-all text-sm ${
                    isDone ? "text-green-600 dark:text-green-400" : isCurrent ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-current shrink-0 mt-0.5" />
                  )}
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isRestoring && clarificationState && (
        <div className="bg-card text-card-foreground border border-red-500/20 rounded-xl p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-2 text-center pt-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="font-sans font-medium text-sm text-red-600 dark:text-red-400">Goal Unclear</span>
            <span className="text-sm text-foreground">{clarificationState.message}</span>
          </div>
          <div className="flex flex-col gap-3 max-w-lg mx-auto w-full pt-4">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground text-center">Try a prompt like</span>
            <div className="grid gap-2">
              {clarificationState.suggestions.map((s: string) => (
                <button
                  key={s}
                  onClick={() => {
                    setGoal(s);
                    setClarificationState(null);
                  }}
                  className="text-left text-sm bg-muted/50 hover:bg-muted p-3 rounded-lg border transition-all"
                >
                  • {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center pt-4 border-t border-border">
            <Button variant="outline" className="rounded-lg" onClick={() => { setClarificationState(null); setGoal(""); }}>
              Clear & Start Over
            </Button>
          </div>
        </div>
      )}

      {!isRestoring && confirmationState && (
        <div className="bg-card text-card-foreground border border-amber-500/20 rounded-xl p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-2 text-center pt-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="font-sans font-medium text-sm text-amber-600 dark:text-amber-400">Did you mean:</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center max-w-xl mx-auto w-full">
            <span className="font-sans font-medium text-sm text-amber-700 dark:text-amber-400">"{confirmationState.inferredObjective}"</span>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border text-sm max-w-2xl mx-auto w-full flex flex-col gap-2">
            <p><span className="text-[11px] uppercase tracking-wide text-muted-foreground">Why we asked:</span> {confirmationState.explanation}</p>
            <p className="text-amber-700 dark:text-amber-400">{confirmationState.warning}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button variant="outline" className="w-full sm:w-auto rounded-lg" onClick={() => setConfirmationState(null)}>
              Cancel & Edit Prompt
            </Button>
            <Button
              onClick={() => {
                setGoal(confirmationState.inferredObjective);
                handleGenerateAutopilot(confirmationState.inferredObjective, true); 
              }}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 rounded-lg gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Generate Campaign
            </Button>
          </div>
        </div>
      )}

      {!isRestoring && workspace && (
        <>
          {/* Campaign Copilot */}
          <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-green-500/10 text-green-600 dark:text-green-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-medium text-sm">Campaign Copilot</span>
                <span className="text-xs text-muted-foreground">Refine your draft campaign using natural language before launching</span>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleRefine(); }} className="flex gap-3">
              <Input 
                value={refinementInput}
                onChange={e => setRefinementInput(e.target.value)}
                disabled={isRefining}
                placeholder="e.g. Switch to SMS, make it more urgent..."
                className="flex-1 min-w-0 bg-background"
              />
              <Button type="submit" variant="outline" disabled={isRefining || !refinementInput.trim()} className="shrink-0 gap-2">
                {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Refine
              </Button>
            </form>

            {messages.length > 0 && (
              <div className="max-h-[160px] overflow-y-auto space-y-3 pr-2 scrollbar-thin mt-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl p-3 text-sm leading-relaxed border ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-muted/30 border-border text-foreground"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isRefining && (
                  <div className="flex justify-start">
                    <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      Applying changes...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Row 1: Sizing + Message */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            
            {/* Opportunity Sizing */}
            <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-sans font-medium text-sm">Opportunity Sizing</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg border border-border p-3 flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Shoppers</span>
                  <span className="font-sans font-medium text-base">{workspace.customerCount}</span>
                </div>
                <div className="bg-muted rounded-lg border border-border p-3 flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Shopper AOV</span>
                  <span className="font-sans font-medium text-base">₹{workspace.aov.toFixed(0)}</span>
                </div>
                <div className="bg-muted rounded-lg border border-border p-3 flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Potential</span>
                  <span className="font-sans font-medium text-base text-green-600 dark:text-green-400">₹{workspace.potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-lg p-3 text-sm mt-auto">
                <span className="text-[11px] uppercase tracking-wide block mb-1">Explainer</span>
                {workspace.opportunityReasoning}
              </div>
            </div>

            {/* Message Draft */}
            <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-sans font-medium text-sm">Message Draft</span>
                </div>
                <span className="inline-flex items-center rounded-md bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-500/20 uppercase tracking-wide">
                  {workspace.channel}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Body</span>
                <div className="bg-muted rounded-lg border border-border p-4 text-sm whitespace-pre-wrap flex-1 text-foreground leading-relaxed">
                  {workspace.subject ? <><span className="font-semibold block mb-2">{workspace.subject}</span>{workspace.body}</> : workspace.body}
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg p-3 text-sm mt-1">
                <span className="text-[11px] uppercase tracking-wide block mb-1">Copy Explainer</span>
                {workspace.explainContent}
              </div>
            </div>

          </div>

          {/* Row 2: Audience + Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            
            {/* Target Audience + Adaptive Intelligence */}
            <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col gap-6">
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-sans font-medium text-sm">Target Audience</span>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20 truncate" title={workspace.segmentName}>
                    {workspace.segmentName}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Segment Logic</span>
                  <div className="bg-muted rounded-lg border border-border p-3 text-sm text-foreground italic leading-relaxed">
                    "{typeof workspace.explainAudience === 'object' ? JSON.stringify(workspace.explainAudience) : workspace.explainAudience}"
                  </div>
                </div>
              </div>

              {workspace.adaptiveInsights && (
                <div className="flex flex-col gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Brain className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-sans font-medium text-sm">Adaptive Intelligence <span className="text-muted-foreground font-normal whitespace-nowrap">— Learning from past campaigns</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg border border-border p-3 flex flex-col gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Confidence</span>
                      <div className="flex items-center gap-1.5 font-sans font-medium text-sm text-green-600 dark:text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0"></span>
                        {workspace.adaptiveInsights.confidenceScore}%
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg border border-border p-3 flex flex-col gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Match Basis</span>
                      <div className="flex items-center gap-1.5 font-sans font-medium text-sm text-foreground">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {workspace.adaptiveInsights.similarCampaignsAnalyzed} Campaigns
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Marketing Strategy */}
            <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="font-sans font-medium text-sm">Marketing Strategy</span>
                </div>
                <span className="text-[11px] text-muted-foreground">By AI strategy engine</span>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 bg-muted rounded-lg p-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-green-500/10 text-green-600 dark:text-green-400">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Channel</span>
                    <span className="font-sans font-medium text-sm text-foreground capitalize">{workspace.channel}</span>
                    <span className="text-sm text-muted-foreground leading-relaxed">{workspace.explainChannel}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-muted rounded-lg p-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Offer</span>
                    <span className="font-sans font-medium text-sm text-foreground">{workspace.offer}</span>
                    <span className="text-sm text-muted-foreground leading-relaxed">{workspace.explainOffer}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-muted rounded-lg p-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Timing</span>
                    <span className="font-sans font-medium text-sm text-foreground">{workspace.timing}</span>
                    <span className="text-sm text-muted-foreground leading-relaxed">{workspace.explainTiming}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Row 3: Agent Timeline */}
          <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="font-sans font-medium text-sm">Agent Timeline</span>
            </div>
            <AgentThoughtsTimeline thoughts={workspace.agentThoughts} />
          </div>

          {/* Row 4: Actions */}
          {workspace.status === "failed" ? (
            <div className="bg-card text-card-foreground border border-red-500/20 rounded-xl p-4 flex flex-col items-center gap-3">
               <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                 <AlertCircle className="h-4 w-4" />
                 <span className="font-sans font-medium text-sm">Launch Blocked</span>
               </div>
               <span className="text-sm text-muted-foreground">Sizing failed to find matching customers. You cannot launch a campaign to 0 recipients.</span>
               <Button disabled variant="outline" className="w-full sm:w-auto px-6 rounded-lg">Launch Campaign</Button>
            </div>
          ) : (
            <div className="bg-card text-card-foreground border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleLaunchCampaign}
                disabled={isLaunching}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-10 gap-2 font-medium"
              >
                {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                Launch campaign
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setWorkspace(null);
                  setAdaptiveInsights(null);
                  setGoal("");
                  setMessages([]);
                }}
                className="w-full sm:w-auto px-6 rounded-lg h-10 font-medium"
                disabled={isLaunching}
              >
                Draft another campaign
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function NewCampaign() {
  return (
    <Suspense fallback={<CampaignWorkspaceSkeleton />}>
      <NewCampaignContent />
    </Suspense>
  );
}
