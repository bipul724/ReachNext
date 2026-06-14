"use client";

import type { AdaptiveRecommendation } from "../../../../ai/adaptive-recommendation";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import AgentThoughtsTimeline from "../../../../components/agent-thoughts-timeline";
import { Badge } from "../../../../components/ui/badge";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Users,
  TrendingUp,
  Mail,
  MessageSquare,
  MessageCircle,
  Clock,
  Gift,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Brain,
  BarChart3,
  Zap,
  Activity,
  AlertTriangle,
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
    <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
      {/* LEFT PANEL: CAMPAIGN COPILOT */}
      <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
        <Card className="flex-1 flex flex-col h-[calc(100vh-140px)] min-h-[600px] border-primary/20 shadow-md">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse mt-2" />
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-4">
            <div className="flex justify-end"><div className="h-10 w-3/4 bg-muted rounded-lg animate-pulse" /></div>
            <div className="flex justify-start"><div className="h-16 w-3/4 bg-muted rounded-lg animate-pulse" /></div>
            <div className="flex justify-end"><div className="h-12 w-3/4 bg-muted rounded-lg animate-pulse" /></div>
          </CardContent>
          <div className="p-4 border-t border-border/40 bg-muted/10">
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </Card>
      </div>

      {/* RIGHT PANEL: LIVE WORKSPACE PREVIEW */}
      <div className="lg:col-span-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column in Right Panel */}
          <div className="space-y-6">
            <Card><CardContent className="h-32 bg-muted animate-pulse rounded-lg mt-6" /></Card>
            <Card><CardContent className="h-40 bg-muted animate-pulse rounded-lg mt-6" /></Card>
            <Card><CardContent className="h-48 bg-muted animate-pulse rounded-lg mt-6" /></Card>
          </div>
          {/* Right Column in Right Panel */}
          <div className="space-y-6">
            <Card><CardContent className="h-48 bg-muted animate-pulse rounded-lg mt-6" /></Card>
            <Card><CardContent className="h-64 bg-muted animate-pulse rounded-lg mt-6" /></Card>
            <Card><CardContent className="h-24 bg-muted animate-pulse rounded-lg mt-6" /></Card>
          </div>
        </div>
      </div>
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns list
        </Link>
      </div>

      {isRestoring && <CampaignWorkspaceSkeleton />}

      {!isRestoring && !isGenerating && !workspace && !clarificationState && !confirmationState && (
        <Card className="border-primary/15 bg-radial-[circle_at_right] from-primary/5 via-transparent to-transparent max-w-4xl mx-auto">
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

      {!isRestoring && isGenerating && (
        <Card className="p-8 text-center space-y-6 animate-pulse max-w-4xl mx-auto">
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

      {!isRestoring && clarificationState && (
        <Card className="border-destructive/20 bg-destructive/5 animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-4xl mx-auto">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-xl font-bold text-destructive flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Goal Unclear
            </CardTitle>
            <CardDescription className="text-base text-foreground mt-2">{clarificationState.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 max-w-lg mx-auto">
              <span className="text-sm font-semibold text-muted-foreground block text-center">Try a prompt like:</span>
              <div className="grid gap-2">
                {clarificationState.suggestions.map((s: string) => (
                  <button
                    key={s}
                    onClick={() => {
                      setGoal(s);
                      setClarificationState(null);
                    }}
                    className="text-left text-sm bg-background hover:bg-muted/50 p-3 rounded-lg border border-border/60 text-foreground transition-all duration-200"
                  >
                    • {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4 flex justify-center border-t border-border/40">
              <Button
                variant="outline"
                onClick={() => {
                  setClarificationState(null);
                  setGoal("");
                }}
              >
                Clear & Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isRestoring && confirmationState && (
        <Card className="border-amber-500/30 bg-amber-50/10 dark:bg-amber-950/10 animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-4xl mx-auto">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              Did you mean:
            </CardTitle>
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-xl mx-auto">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400">"{confirmationState.inferredObjective}"</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center max-w-2xl mx-auto">
            <div className="space-y-2 text-sm text-muted-foreground bg-muted/20 p-4 rounded-lg">
              <p><strong className="text-foreground">Why we asked:</strong> {confirmationState.explanation}</p>
              <p className="text-amber-600 dark:text-amber-400 font-semibold">{confirmationState.warning}</p>
            </div>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmationState(null);
                }}
              >
                Cancel & Edit Prompt
              </Button>
              <Button
                onClick={() => {
                  setGoal(confirmationState.inferredObjective);
                  handleGenerateAutopilot(confirmationState.inferredObjective, true); 
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Generate Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isRestoring && workspace && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
          
          {/* LEFT PANEL: CAMPAIGN COPILOT */}
          <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
            <Card className="flex-1 flex flex-col h-[calc(100vh-140px)] min-h-[600px] border-primary/20 shadow-md sticky top-6">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                  Campaign Copilot
                </CardTitle>
                <CardDescription className="text-xs">
                  Iteratively refine your draft campaign using natural language before launching.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs max-w-[200px]">
                      Chat with your AI marketing teammate to switch channels, adjust offers, or rewrite the copy.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 border border-border/50 text-foreground"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                
                {isRefining && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 border border-border/50 rounded-lg p-3 flex gap-2 items-center text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Applying changes...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </CardContent>
              
              <div className="p-4 border-t border-border/40 bg-muted/10">
                <form onSubmit={(e) => { e.preventDefault(); handleRefine(); }} className="flex gap-2">
                  <Input 
                    value={refinementInput}
                    onChange={e => setRefinementInput(e.target.value)}
                    disabled={isRefining}
                    placeholder="e.g. Switch to SMS, make it more urgent..."
                    className="text-xs h-10"
                  />
                  <Button type="submit" disabled={isRefining || !refinementInput.trim()} size="icon" className="shrink-0 h-10 w-10">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* RIGHT PANEL: LIVE WORKSPACE PREVIEW */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column in Right Panel */}
              <div className="space-y-6">
                
                {/* Opportunity sizing */}
                <Card className="border-primary/10">
                  <CardHeader className="bg-primary/5 pb-3">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Opportunity Sizing</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="bg-muted/20 p-3 rounded-lg border border-border/40 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Shoppers</span>
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
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">potential</span>
                        <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                          ₹{workspace.potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-4 text-xs leading-relaxed space-y-1">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Explainer:</span>
                      <p className="text-emerald-700 dark:text-emerald-400">{workspace.opportunityReasoning}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Target Audience details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Target Audience</span>
                      <Badge variant="outline" className="max-w-[150px] truncate" title={workspace.segmentName}>{workspace.segmentName}</Badge>
                    </CardTitle>
                    <CardDescription>{workspace.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border/80 bg-muted/10 p-4 text-xs space-y-2">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider">Segment Logic:</span>
                      <p className="font-mono bg-muted/60 p-2.5 rounded text-[11px] overflow-x-auto">
                        {JSON.stringify(workspace.explainAudience, null, 2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Adaptive Recommendation Engine */}
                {workspace.adaptiveInsights && (
                  <Card className="border-violet-500/20 bg-gradient-to-br from-violet-50/50 via-transparent to-purple-50/30 dark:from-violet-950/20 dark:to-purple-950/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Brain className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                        Adaptive Intelligence
                      </CardTitle>
                      <CardDescription>Learning from past campaigns</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-violet-100 p-2 dark:bg-violet-900/50 mt-0.5">
                          <Activity className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium leading-relaxed text-violet-900 dark:text-violet-100">
                            {workspace.adaptiveInsights.learning}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded-lg border border-violet-200/50 bg-white/50 p-3 dark:border-violet-800/30 dark:bg-black/20">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confidence</span>
                          <div className="mt-1 flex items-center gap-1.5 font-bold text-violet-700 dark:text-violet-400">
                            <TrendingUp className="h-4 w-4" />
                            {workspace.adaptiveInsights.confidenceScore}%
                          </div>
                        </div>
                        <div className="rounded-lg border border-violet-200/50 bg-white/50 p-3 dark:border-violet-800/30 dark:bg-black/20">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Match Basis</span>
                          <div className="mt-1 font-bold text-foreground">
                            {workspace.adaptiveInsights.similarCampaignsAnalyzed} campaigns
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Strategy recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Marketing Strategy</CardTitle>
                    <CardDescription>Decisions generated by AI strategy engine</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="flex items-start gap-3 border-b border-border/40 pb-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        workspace.channel === "whatsapp"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                      }`}>
                        {workspace.channel === "email" ? (
                          <Mail className="h-4.5 w-4.5" />
                        ) : workspace.channel === "whatsapp" ? (
                          <MessageCircle className="h-4.5 w-4.5" />
                        ) : (
                          <MessageSquare className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Channel Selected</span>
                        <span className="font-bold text-foreground text-sm uppercase">{workspace.channel}</span>
                        <p className="text-muted-foreground mt-1 leading-relaxed text-[11px]">{workspace.explainChannel}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 border-b border-border/40 pb-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400">
                        <Gift className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Offer</span>
                        <span className="font-bold text-foreground text-sm">{workspace.offer}</span>
                        <p className="text-muted-foreground mt-1 leading-relaxed text-[11px]">{workspace.explainOffer}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400">
                        <Clock className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Timing</span>
                        <span className="font-bold text-foreground text-sm">{workspace.timing}</span>
                        <p className="text-muted-foreground mt-1 leading-relaxed text-[11px]">{workspace.explainTiming}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* Right Column in Right Panel */}
              <div className="space-y-6">
                
                {/* Content preview */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Message Draft</span>
                      <Badge variant="secondary" className="uppercase font-bold text-[9px]">
                        {workspace.channel}
                      </Badge>
                    </CardTitle>
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
                      <span className="text-xs font-semibold text-muted-foreground">Body:</span>
                      <div className="rounded-md border border-border/80 p-4 text-sm font-medium bg-muted/20 leading-relaxed font-sans whitespace-pre-wrap">
                        {workspace.body}
                      </div>
                    </div>

                    <div className="rounded-lg bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 p-4 text-xs leading-relaxed space-y-1">
                      <span className="font-bold text-orange-800 dark:text-orange-300 block">Copy Explainer:</span>
                      <p className="text-orange-700 dark:text-orange-400">{workspace.explainContent}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Agent thoughts timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-primary" />
                      Agent Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AgentThoughtsTimeline thoughts={workspace.agentThoughts} />
                  </CardContent>
                </Card>

                {/* Launch Controller */}
                {workspace.status === "failed" ? (
                  <Card className="border-destructive/20 bg-destructive/10 dark:bg-destructive/950/10">
                    <CardHeader className="pb-3 text-center">
                      <CardTitle className="text-base font-bold text-destructive flex items-center justify-center gap-1.5">
                        <AlertCircle className="h-5 w-5" />
                        Launch Blocked
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        Sizing failed to find matching customers. You cannot launch a campaign to 0 recipients.
                      </p>
                      <Button
                        disabled
                        className="w-full bg-muted text-muted-foreground font-bold h-11 gap-2 cursor-not-allowed border border-border/60"
                      >
                        Launch Campaign
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/5 shadow-md sticky bottom-6">
                    <CardContent className="pt-6 space-y-4">
                      <Button
                        onClick={handleLaunchCampaign}
                        disabled={isLaunching}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 gap-2 shadow-md text-base"
                      >
                        {isLaunching ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Play className="h-5 w-5 fill-white" />
                        )}
                        Launch Campaign
                      </Button>
                      
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setWorkspace(null);
                          setAdaptiveInsights(null);
                          setGoal("");
                          setMessages([]);
                        }}
                        className="w-full text-xs text-muted-foreground hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                        disabled={isLaunching}
                      >
                        Draft Another Campaign
                      </Button>
                    </CardContent>
                  </Card>
                )}

              </div>
            </div>
          </div>
        </div>
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
