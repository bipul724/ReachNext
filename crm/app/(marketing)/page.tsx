"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, LayoutDashboard, Target, BarChart3, Send, Zap, LineChart, CheckCircle2, BarChart2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function MarketingLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/10">
      {/* HEADER / NAV */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/40 bg-background/80 px-6 md:px-12 backdrop-blur-md">
        <div className="flex items-center gap-2.5 font-bold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          CRM
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button size="sm" className="font-semibold shadow-sm">
              Open Dashboard
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="px-6 py-24 md:px-12 md:py-32 lg:py-40 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8">
          <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-border/50 text-muted-foreground bg-muted/20">
            Intelligent Customer Management
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            Turn customer data into <br className="hidden md:block" /> targeted campaigns in minutes.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Know exactly who to reach, what to say, and when to send. A minimal, outcome-driven CRM that helps growing businesses run highly personalized marketing without a dedicated team.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="font-semibold h-12 px-8 shadow-sm group">
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="font-semibold h-12 px-8">
                See How It Works
              </Button>
            </Link>
          </div>
        </section>

        {/* TRUST SECTION */}
        <section className="border-y border-border/40 bg-muted/20 py-8">
          <div className="max-w-5xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-16 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary/60" />
              <span>Built for growing businesses</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary/60" />
              <span>Designed around real workflows</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary/60" />
              <span>Focused on practical outcomes</span>
            </div>
          </div>
        </section>

        {/* PRODUCT SNAPSHOT */}
        <section className="px-6 py-24 md:px-12 max-w-6xl mx-auto">
          <div className="rounded-xl border border-border/50 bg-card shadow-2xl shadow-primary/5 overflow-hidden flex flex-col">
            {/* Browser Header */}
            <div className="h-12 border-b border-border/50 bg-muted/30 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-border/80" />
                <div className="w-3 h-3 rounded-full bg-border/80" />
                <div className="w-3 h-3 rounded-full bg-border/80" />
              </div>
              <div className="mx-auto h-6 w-64 rounded-md bg-background border border-border/50 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground font-medium">reachnext.yourbusiness.com/dashboard</span>
              </div>
            </div>
            
            {/* Dashboard UI Preview (Static Representation of existing UI) */}
            <div className="p-8 bg-muted/10 grid gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Dashboard Overview</h2>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>Live Environment</span>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: "Total Revenue", val: "₹12.5L", icon: LineChart },
                  { label: "Target Shoppers", val: "4,209", icon: Target },
                  { label: "Campaigns", val: "12", icon: Send },
                  { label: "Sales Conversions", val: "842", icon: BarChart2 }
                ].map((stat, i) => (
                  <Card key={i} className="shadow-none border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {stat.label}
                      </CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.val}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-3 mt-4">
                <Card className="md:col-span-2 shadow-none border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Revenue Opportunity Copilot</CardTitle>
                    <CardDescription>AI-Optimized Suggestions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-border/50 bg-background p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">HIGH CONFIDENCE</Badge>
                          <h4 className="font-bold text-sm mt-2">Win-back Churning Premium Customers</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">POTENTIAL RECOVERY</span>
                          <p className="font-bold text-sm text-indigo-600">₹1.2L</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">142 premium customers haven&apos;t purchased in 45 days. A personalized offer is highly likely to convert.</p>
                      <Button size="sm" className="w-full text-xs font-bold mt-2">
                        <Sparkles className="h-3 w-3 mr-2" /> Launch Autopilot
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-none border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Send className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">Weekend Promo Sent</span>
                          <span className="text-[10px] text-muted-foreground">2 hours ago</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="px-6 py-24 md:px-12 max-w-5xl mx-auto bg-background">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need. Nothing you don&apos;t.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Core capabilities designed specifically for generating reliable outcomes.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "AI Campaign Autopilot", desc: "Draft high-converting messages and recommend optimal channels automatically.", icon: Sparkles },
              { title: "Customer Segmentation", desc: "Group your audience based on real purchase behavior and interaction history.", icon: Target },
              { title: "Revenue Insights", desc: "Track exactly how much revenue each campaign and segment generates.", icon: LineChart },
              { title: "Multi-Channel Outreach", desc: "Reach customers seamlessly across Email, SMS, and WhatsApp.", icon: Send },
              { title: "Opportunity Detection", desc: "Let the system identify churn risks and upsell opportunities before you do.", icon: Zap },
              { title: "Performance Analytics", desc: "Monitor delivery rates, open rates, and conversion metrics in real-time.", icon: BarChart3 },
            ].map((feature, i) => (
              <Card key={i} className="bg-card hover:bg-muted/10 transition-colors border-border/40 shadow-sm">
                <CardHeader>
                  <feature.icon className="h-5 w-5 mb-2 text-primary" />
                  <CardTitle className="text-base font-bold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="px-6 py-24 md:px-12 bg-muted/30 border-y border-border/40">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-16">How it works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Connect customer data", desc: "Securely sync your existing point-of-sale or e-commerce transaction data." },
                { step: "02", title: "Identify opportunities", desc: "Our system analyzes purchase patterns to surface high-value segments." },
                { step: "03", title: "Launch campaigns", desc: "Review AI-drafted messaging and deploy across multiple channels instantly." },
              ].map((item, i) => (
                <div key={i} className="flex flex-col space-y-3 relative group">
                  <div className="text-4xl font-extrabold text-muted-foreground/20 group-hover:text-primary/20 transition-colors">{item.step}</div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-6 py-32 md:px-12 max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            See what opportunities already exist in your customer data.
          </h2>
          <p className="text-lg text-muted-foreground">
            Log in to your workspace and launch your first targeted campaign today.
          </p>
          <div className="pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="font-semibold h-14 px-10 text-lg shadow-sm">
                Open Dashboard
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/40 py-8 text-center">
        <p className="text-xs font-medium text-muted-foreground">
          © {new Date().getFullYear()} ReachNext. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
