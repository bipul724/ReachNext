"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import {
  Plus,
  Trash2,
  Sparkles,
  Users,
  Save,
  Loader2,
  ArrowLeft,
  Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SegmentRule } from "../../../../types";

const FIELDS = [
  { value: "totalSpent", label: "Total Spent (₹)" },
  { value: "totalOrders", label: "Total Orders" },
  { value: "city", label: "City" },
  { value: "daysSinceLastOrder", label: "Days Since Last Purchase" },
];

const OPERATORS = [
  { value: "gt", label: "greater than (>)" },
  { value: "lt", label: "less than (<)" },
  { value: "gte", label: "greater than or equal (>=)" },
  { value: "lte", label: "less than or equal (<=)" },
  { value: "eq", label: "exactly equal (=)" },
  { value: "contains", label: "contains" },
];

export default function NewSegment() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [rules, setRules] = useState<SegmentRule[]>([]);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState<string | null>(null);

  // Live preview states
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewCustomers, setPreviewCustomers] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Action loaders
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Trigger live preview whenever rules change
  useEffect(() => {
    fetchPreview();
  }, [rules]);

  const fetchPreview = async () => {
    if (rules.length === 0) {
      setPreviewCount(0);
      setPreviewCustomers([]);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/segments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: { and: rules } }),
      });
      if (!res.ok) throw new Error("Preview fetch failed");

      const result = await res.json();
      setPreviewCount(result.count);
      setPreviewCustomers(result.customers);
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.warning("Please describe your target audience first.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/segments/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate rules.");

      setName(result.segmentName || "");
      setDescription(result.description || "");
      setRules(result.rules.and || []);
      setNaturalLanguageQuery(aiPrompt);

      toast.success("AI Segment generated!", {
        description: `Opportunity explainability: ${result.explainAudience}`,
        duration: 5000,
      });
    } catch (err: any) {
      toast.error("AI Generation failed", {
        description: err.message || "Please make sure GROQ_API_KEY is configured in crm/.env",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddRule = () => {
    setRules([...rules, { field: "totalSpent", op: "gt", value: "" }]);
    setNaturalLanguageQuery(null); // Cleared NL status since user is modifying manually
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
    setNaturalLanguageQuery(null);
  };

  const handleRuleChange = (index: number, key: keyof SegmentRule, value: any) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [key]: value };
    setRules(updated);
    setNaturalLanguageQuery(null);
  };

  const handleSaveSegment = async () => {
    if (!name.trim()) {
      toast.warning("Please enter a Segment Name.");
      return;
    }
    if (rules.length === 0) {
      toast.warning("Please add at least one filter rule.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          rules: { and: rules },
          naturalLanguageQuery,
          createdBy: naturalLanguageQuery ? "AI Autopilot" : "user",
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save segment.");

      toast.success("Segment saved successfully!");
      router.push("/segments");
    } catch (err: any) {
      toast.error("Save failed", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Link href="/segments" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to segments list
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sidebar details */}
        <div className="space-y-6 md:col-span-2">
          {/* Card 1: AI Prompt generator */}
          <Card className="border-primary/10 bg-radial-[circle_at_right] from-primary/5 via-transparent to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
                Describe your audience goal
              </CardTitle>
              <CardDescription>
                AI will compile filters, name the segment, and write a summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. shoppers in Pune who spent over 3000..."
                  value={aiPrompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiPrompt(e.target.value)}
                  disabled={isGenerating}
                />
                <Button onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()} className="gap-2 shrink-0">
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Compile Segment
                </Button>
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/30 p-2.5 rounded-lg">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Supported fields: totalSpent, totalOrders, city, daysSinceLastOrder.
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Rules builder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Segment Criteria</CardTitle>
              <CardDescription>
                Customize and edit filter constraints for customer targeting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Segment Name</label>
                  <Input
                    placeholder="e.g. Pune Premium Coffee Shoppers"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <Input
                    placeholder="Brief description of this segment"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Matching Rules</label>
                  <Button type="button" variant="outline" size="xs" onClick={handleAddRule} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Filter Rule
                  </Button>
                </div>

                {rules.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">No filter rules added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 items-center bg-muted/10 p-2.5 border border-border/30 rounded-lg">
                        {/* Field select */}
                        <select
                          className="w-full sm:w-44 rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-sm focus:outline-none"
                          value={rule.field}
                          onChange={(e) => handleRuleChange(index, "field", e.target.value)}
                        >
                          {FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>

                        {/* Operator select */}
                        <select
                          className="w-full sm:w-44 rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-sm focus:outline-none"
                          value={rule.op}
                          onChange={(e) => handleRuleChange(index, "op", e.target.value)}
                        >
                          {OPERATORS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>

                        {/* Value input */}
                        <Input
                          placeholder="value"
                          value={rule.value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRuleChange(index, "value", e.target.value)}
                          className="h-8.5 text-xs"
                        />

                        {/* Delete button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Delete rule"
                          onClick={() => handleRemoveRule(index)}
                          className="text-destructive hover:bg-destructive/10 h-8.5 w-8.5 p-0 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live preview section */}
        <div className="space-y-6">
          <Card className="h-fit sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Audience Preview</span>
                {isPreviewLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardTitle>
              <CardDescription>Real-time database query results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-4 border border-border/60 text-center">
                <div className="text-3xl font-bold text-foreground">
                  {previewCount !== null ? previewCount.toLocaleString() : "0"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1 flex items-center justify-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Matching Customers
                </div>
              </div>

              {previewCustomers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Sample Profiles:</span>
                  <div className="rounded-md border border-border overflow-x-auto text-xs">
                    <Table>
                      <TableHeader className="bg-muted/20">
                        <TableRow>
                          <TableHead className="py-2 text-[10px] font-semibold">Name</TableHead>
                          <TableHead className="py-2 text-[10px] font-semibold text-right">Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewCustomers.map((cust) => (
                          <TableRow key={cust.id}>
                            <TableCell className="py-2 font-medium truncate max-w-[120px]">{cust.name}</TableCell>
                            <TableCell className="py-2 text-right font-semibold">₹{cust.totalSpent.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSaveSegment}
                disabled={isSaving || rules.length === 0 || !name.trim()}
                className="w-full gap-2 font-semibold"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Segment Target
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
