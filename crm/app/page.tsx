'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, TrendingUp, Users, Zap, Mail, BarChart3, Coffee, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-border bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Coffee className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Xeno</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">How It Works</a>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition">Benefits</a>
          </div>
          <Link href="/login">
            <Button className="font-semibold">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <div className="space-y-6 text-center max-w-3xl mx-auto">
            <div className="inline-block">
              <div className="glass-card px-4 py-2 rounded-full border-primary/20">
                <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Native Marketing
                </span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight text-balance">
              Your AI-Powered Coffee Marketing Brain
            </h1>
            
            <p className="text-lg text-muted-foreground text-balance leading-relaxed max-w-2xl mx-auto">
              Launch targeted campaigns, nurture customer relationships, and scale your D2C coffee business—all with plain English objectives and AI-powered automation.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link href="/campaigns/new">
                <Button size="lg" className="font-bold text-base gap-2 shadow-lg hover:shadow-xl transition-all">
                  Launch Demo Campaign
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="font-semibold border-primary/20 hover:bg-primary/5">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Card */}
          <div className="mt-16 md:mt-20">
            <div className="glass-card p-1 rounded-2xl border-primary/20 shadow-2xl">
              <div className="bg-muted/40 rounded-xl p-8 md:p-12 aspect-video flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Coffee className="h-16 w-16 mx-auto text-primary/30" />
                  <p className="text-sm text-muted-foreground font-medium">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Powerful Features Built for Scale
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to run sophisticated marketing campaigns with zero complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="glass-card border-primary/20 card-hover">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30 mb-3">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Campaign Autopilot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Describe your marketing goal in plain English. AI handles segment sizing, channel selection, and copywriting.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="glass-card border-primary/20 card-hover">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Segmentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Build dynamic audience segments with flexible filtering. Real-time preview shows exactly who you&apos;re reaching.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="glass-card border-primary/20 card-hover">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-3">
                  <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle>Live Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Track campaign performance in real-time. Conversion funnels, revenue attribution, and AI-powered insights included.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="glass-card border-primary/20 card-hover">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mb-3">
                  <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Multi-Channel Dispatch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Send personalized messages across email, SMS, and more. Strategy engine recommends optimal timing and channels.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="glass-card border-primary/20 card-hover">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30 mb-3">
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Instant Personalization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  AI generates tailored messages for each customer segment. Every message feels personal and relevant.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="glass-card border-primary/20 card-hover">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30 mb-3">
                  <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>ROI Optimization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Automatic order attribution. Know exactly which campaigns drove sales and customer lifetime value.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              How CampaignOS Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to launch sophisticated campaigns in minutes, not weeks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-foreground">Describe Your Goal</h3>
              <p className="text-muted-foreground">
                Tell the AI your marketing objective in plain English. "Reach espresso lovers who bought within 30 days" is enough.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-foreground">AI Composes Strategy</h3>
              <p className="text-muted-foreground">
                The multi-agent orchestrator sizes your audience, picks channels, and writes personalized copy in seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-foreground">Launch & Optimize</h3>
              <p className="text-muted-foreground">
                Deploy with one click. Watch real-time analytics and AI insights guide performance optimization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Why Coffee Brands Love Xeno
            </h2>
            <p className="text-lg text-muted-foreground">
              Built specifically for premium D2C roasters and retailers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card border-primary/20 p-8 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="text-accent">→</span>
                90% Faster Campaign Creation
              </h3>
              <p className="text-muted-foreground">
                From idea to launch in minutes. No more juggling spreadsheets, email platforms, and manual targeting.
              </p>
            </div>

            <div className="glass-card border-primary/20 p-8 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="text-accent">→</span>
                10x Better Personalization
              </h3>
              <p className="text-muted-foreground">
                Every customer gets a tailored message. AI learns what resonates with each segment of your audience.
              </p>
            </div>

            <div className="glass-card border-primary/20 p-8 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="text-accent">→</span>
                Complete ROI Visibility
              </h3>
              <p className="text-muted-foreground">
                Know exactly which campaigns drive sales. Automatic order attribution for every campaign.
              </p>
            </div>

            <div className="glass-card border-primary/20 p-8 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="text-accent">→</span>
                Built for Coffee Retail
              </h3>
              <p className="text-muted-foreground">
                Templates, strategies, and insights tailored to coffee sellers. Every feature designed for your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card border-primary/20 p-8 md:p-16 text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight text-balance">
              Ready to Transform Your Marketing?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join premium coffee brands scaling with AI-powered campaigns. Start free, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/campaigns/new">
                <Button size="lg" className="font-bold text-base gap-2 shadow-lg hover:shadow-xl">
                  Launch Your Campaign
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                No setup required. 100% free for 14 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
                  <Coffee className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">Xeno</span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI-native marketing for premium D2C coffee brands.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition">Features</a></li>
                <li><a href="#how-it-works" className="text-xs text-muted-foreground hover:text-foreground transition">How It Works</a></li>
                <li><a href="#benefits" className="text-xs text-muted-foreground hover:text-foreground transition">Benefits</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">About</a></li>
                <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">Blog</a></li>
                <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">Privacy</a></li>
                <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">Terms</a></li>
                <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8">
            <p className="text-xs text-muted-foreground text-center">
              © 2025 Xeno. All rights reserved. Built with ☕ for coffee brands.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
