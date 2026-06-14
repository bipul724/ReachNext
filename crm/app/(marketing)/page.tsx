"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AICRMLogo from "../../components/icons/AICRMLogo";
import { Playfair_Display } from "next/font/google";
import {
  Target,
  Brain,
  ArrowLeftRight,
  Telescope,
  Play,
  GitCompare,
  SlidersHorizontal,
  Check,
  Loader2,
} from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export default function MarketingLandingPage() {
  const [activeStep, setActiveStep] = useState(4);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setActiveStep(5), 3500);
    const t2 = setTimeout(() => setActiveStep(6), 6500);
    const t3 = setTimeout(() => setActiveStep(7), 9000);

    const progressTimer = setTimeout(() => setProgressWidth(87), 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(progressTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .animate-pulse-dot {
          animation: pulse-dot 2s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.5s infinite;
        }
      `}} />

      {/* SECTION 1 — NAV */}
      <header className="border-b border-gray-200 bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <AICRMLogo className="h-8 w-8" />
            <span className={`${playfair.className} text-xl font-bold tracking-tight text-gray-900`}>ReachNext</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <Link href="#features" className="hover:text-gray-900 transition-colors">Features</Link>
            <Link href="/docs/architecture" className="hover:text-gray-900 transition-colors">Architecture</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-gray-900 transition-colors">GitHub</a>
          </nav>

          <div>
            <Link href="/dashboard" className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors">
              Open dashboard &rarr;
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* SECTION 2 — HERO */}
        <section className="grid md:grid-cols-2 gap-12 items-start px-6 pt-16 pb-14 max-w-7xl mx-auto">
          {/* LEFT COLUMN */}
          <div>
            <div className="inline-flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider text-gray-500 mb-6">
              <div className="w-[5px] h-[5px] rounded-full bg-emerald-500 animate-pulse-dot" />
              AI-native marketing CRM
            </div>

            <h1 className={`${playfair.className} text-5xl lg:text-6xl font-black leading-tight tracking-tight text-gray-900 mb-4`}>
              Describe a goal.<br />
              <span className="italic text-emerald-700">The AI agent builds the campaign.</span>
            </h1>

            <p className="text-base text-gray-500 leading-relaxed mb-5 max-w-lg">
              One orchestrated flow: parse intent &rarr; segment audience &rarr; personalize every message &rarr; dispatch across WhatsApp, SMS & Email &rarr; track async delivery from queued to converted.
            </p>

            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-md hover:bg-gray-800 transition-colors">
                Open dashboard &rarr;
              </Link>
              <Link href="/docs/architecture" className="border border-gray-300 text-gray-900 bg-transparent text-sm font-medium px-6 py-3 rounded-md hover:bg-gray-50 transition-colors">
                View architecture
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
              <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-1">YOUR GOAL</div>
              <div className="text-xs font-medium italic text-gray-900">
                &quot;Win back premium customers who haven&apos;t ordered in 45 days&quot;
              </div>
            </div>

            <div className="space-y-5 px-1">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3} />
                </div>
                <div>
                  <div className="text-sm text-gray-900 font-medium">Intent parsed</div>
                  <div className="text-xs text-gray-500">Win-back · premium segment · 45-day recency</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3} />
                </div>
                <div>
                  <div className="text-sm text-gray-900 font-medium">Segment rules generated</div>
                  <div className="text-xs text-gray-500">totalSpent &gt; ₹5,000 · lastOrderAt &gt; 45d ago</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3} />
                </div>
                <div>
                  <div className="text-sm text-gray-900 font-medium">Audience preview: 142 customers</div>
                  <div className="text-xs text-gray-500">Avg LTV ₹8,640 · High confidence</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3">
                {activeStep === 4 ? (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 opacity-80 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 text-emerald-700 animate-spin" strokeWidth={3} />
                  </div>
                ) : activeStep > 4 ? (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-white border border-gray-200 shrink-0" />
                )}
                <div>
                  <div className={`text-sm font-medium ${activeStep >= 4 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {activeStep === 4 ? (
                      <>Drafting WhatsApp message<span className="animate-blink">_</span></>
                    ) : activeStep > 4 ? (
                      'WhatsApp message drafted'
                    ) : (
                      'Drafting WhatsApp message'
                    )}
                  </div>
                  {activeStep <= 4 && activeStep >= 4 && (
                    <div className="text-xs text-gray-500">Personalizing tone for premium tier</div>
                  )}
                  {activeStep > 4 && (
                    <div className="text-xs text-gray-500">Personalized offer with ₹200 discount hook</div>
                  )}
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3">
                {activeStep === 5 ? (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 opacity-80 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 text-emerald-700 animate-spin" strokeWidth={3} />
                  </div>
                ) : activeStep > 5 ? (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-white border border-gray-200 shrink-0" />
                )}
                <div>
                  <div className={`text-sm font-medium ${activeStep >= 5 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {activeStep === 5 ? (
                      <>Personalizing 142 messages<span className="animate-blink">_</span></>
                    ) : (
                      '142 messages personalized'
                    )}
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex items-start gap-3">
                {activeStep === 6 ? (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 opacity-80 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 text-emerald-700 animate-spin" strokeWidth={3} />
                  </div>
                ) : activeStep > 6 ? (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-[15px] h-[15px] mt-0.5 rounded-full bg-white border border-gray-200 shrink-0" />
                )}
                <div>
                  <div className={`text-sm font-medium ${activeStep >= 6 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {activeStep === 6 ? (
                      <>Dispatching to channel service<span className="animate-blink">_</span></>
                    ) : activeStep > 6 ? (
                      'Campaign live — tracking 142 deliveries'
                    ) : (
                      'Dispatching to channel service'
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 3 — DELIVERY LIFECYCLE STRIP */}
        <section className="w-full bg-gray-50 border-t border-b border-gray-200 py-6 px-6 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[700px]">
            {[
              { label: "Queued", val: "4,209" },
              { label: "Sent", val: "4,189", badge: "99.5%" },
              { label: "Delivered", val: "3,982", badge: "95.1%" },
              { label: "Opened", val: "1,831", badge: "46.0%" },
              { label: "Read", val: "1,642", badge: "89.7%" },
              { label: "Clicked", val: "384", badge: "23.4%" },
              { label: "Converted", val: "127", badge: "33.1%" },
            ].map((state, i, arr) => (
              <React.Fragment key={state.label}>
                <div className="flex flex-col">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{state.label}</div>
                  <div className="flex items-end gap-2">
                    <div className={`${playfair.className} text-2xl font-medium text-gray-900`}>{state.val}</div>
                    {state.badge && (
                      <div className="bg-emerald-50 text-emerald-700 text-[9px] font-medium px-1.5 py-0.5 rounded mb-1">
                        {state.badge}
                      </div>
                    )}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="text-gray-300 text-xs px-2">&rarr;</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* SECTION 4 — FEATURE GRID */}
        <section id="features" className="px-6 py-12 max-w-7xl mx-auto">
          <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-4">
            WHAT&apos;S ACTUALLY BUILT
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="p-6 flex flex-col gap-4">
              <Brain className="w-5 h-5 text-gray-900" />
              <div>
                <div className="text-base font-semibold text-gray-900 mb-2">AI campaign agent</div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  Natural language &rarr; segment rules &rarr; personalized copy &rarr; launch. One flow via agent-orchestrator.
                </div>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <ArrowLeftRight className="w-5 h-5 text-gray-900" />
              <div>
                <div className="text-base font-semibold text-gray-900 mb-2">Async delivery loop</div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  CRM dispatches to channel simulator; webhooks call back and update each message through 7 states.
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <Telescope className="w-5 h-5 text-gray-900" />
              <div>
                <div className="text-base font-semibold text-gray-900 mb-2">Opportunity copilot</div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  Scans customer base for dormant high-value segments. Surfaces recovery potential with confidence scores.
                </div>
              </div>
            </div>
            
            {/* Break for desktop grid, but divide-y handles rows. We need border-t on the second row. */}
            <div className="p-6 flex flex-col gap-4 border-t border-gray-200 md:col-start-1">
              <Play className="w-5 h-5 text-gray-900" />
              <div>
                <div className="text-base font-semibold text-gray-900 mb-2">Campaign replay</div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  Scrub back through a campaign&apos;s delivery timeline. Watch every message state transition in sequence.
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4 border-t border-gray-200">
              <GitCompare className="w-5 h-5 text-gray-900" />
              <div>
                <div className="text-base font-semibold text-gray-900 mb-2">AI campaign compare</div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  Select two campaigns for AI-powered diff — which segment, channel, and copy combination won.
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4 border-t border-gray-200">
              <SlidersHorizontal className="w-5 h-5 text-gray-900" />
              <div>
                <div className="text-base font-semibold text-gray-900 mb-2">Segment engine</div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  Rule-based or natural language. Filter by spend, recency, city, tags — or just describe who you want.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — REVENUE OPPORTUNITY COPILOT */}
        <section className="border-t border-gray-200 px-6 py-20">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* LEFT */}
            <div>
              <div className="inline-block bg-emerald-50 text-emerald-700 text-[11px] uppercase font-bold tracking-wider px-3 py-1.5 rounded mb-6">
                Revenue Opportunity Copilot
              </div>
              <h2 className={`${playfair.className} text-5xl lg:text-6xl font-black leading-tight text-gray-900 mb-6`}>
                It finds the money<br />
                <span className="italic text-emerald-700">already in your data.</span>
              </h2>
              <p className="text-base text-gray-500 leading-relaxed max-w-md">
                The adaptive recommendation engine scans your customer base for high-confidence recovery opportunities — dormant premium buyers, lapsing segments, untouched high-spenders — before you think to look.
              </p>
            </div>

            {/* RIGHT */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-emerald-50 text-emerald-700 text-[11px] uppercase font-bold tracking-wider px-2 py-1 rounded">
                  High Confidence
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Potential recovery</div>
                  <div className={`${playfair.className} text-3xl font-bold text-gray-900`}>₹12.5L</div>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">Win back churning premium customers</h3>
              <p className="text-base text-gray-500 leading-relaxed mb-8">
                142 premium customers haven&apos;t ordered in 45+ days. A personalized offer is highly likely to convert.
              </p>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-[1500ms] ease-out" 
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Confidence score</span>
                <span className="text-emerald-700 font-bold">87%</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 — CTA */}
        <section className="bg-gray-50 border-t border-gray-200 px-6 py-16 text-center">
          <div className="max-w-7xl mx-auto">
            <h2 className={`${playfair.className} text-4xl lg:text-5xl font-black leading-tight text-gray-900 mb-4`}>
              Intent &rarr; segment &rarr; deliver &rarr; convert.<br />
              <span className="italic text-emerald-700">The full loop. Live.</span>
            </h2>
            <p className="text-base text-gray-500 mb-6">
              Open the dashboard or read the architecture doc.
            </p>
            <div className="flex justify-center items-center gap-3">
              <Link href="/dashboard" className="bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-md hover:bg-gray-800 transition-colors">
                Open dashboard &rarr;
              </Link>
              <Link href="/docs/architecture" className="border border-gray-300 text-gray-900 bg-transparent text-sm font-medium px-6 py-3 rounded-md hover:bg-gray-50 transition-colors">
                View architecture
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
