// ─────────────────────────────────────────────────────────────────────────────
// Centralized AI Service — Configuration & Task-Based Provider Routing
// ─────────────────────────────────────────────────────────────────────────────

import type { AIProvider } from "./types";
import { GroqProvider } from "./providers/groq.provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { OpenRouterProvider } from "./providers/openrouter.provider";

// ── Provider factory ──

const providerCache = new Map<string, AIProvider>();

function getOrCreateProvider(name: string): AIProvider {
  const cached = providerCache.get(name);
  if (cached) return cached;

  let provider: AIProvider;
  switch (name) {
    case "groq":
      provider = new GroqProvider();
      break;
    case "gemini":
      provider = new GeminiProvider();
      break;
    case "openrouter":
      provider = new OpenRouterProvider();
      break;
    default:
      throw new Error(
        `Unknown AI provider: "${name}". Supported: groq, gemini, openrouter`
      );
  }

  providerCache.set(name, provider);
  return provider;
}

// ── Task-based routing ──
// Lookup order:
//   1. AI_PROVIDER_<TASK_UPPER> (e.g. AI_PROVIDER_CAMPAIGN_INSIGHT=gemini)
//   2. AI_PROVIDER (global default, default: "groq")

export function resolveProviderForTask(task: string): AIProvider {
  const taskEnvKey = `AI_PROVIDER_${task.toUpperCase()}`;
  const taskProvider = process.env[taskEnvKey];

  if (taskProvider) {
    return getOrCreateProvider(taskProvider.toLowerCase());
  }

  const globalProvider = process.env.AI_PROVIDER || "groq";
  return getOrCreateProvider(globalProvider.toLowerCase());
}

// ── Fallback provider ──

export function resolveFallbackProvider(): AIProvider | null {
  const fallback = process.env.AI_FALLBACK_PROVIDER;
  if (!fallback) return null;

  try {
    return getOrCreateProvider(fallback.toLowerCase());
  } catch {
    console.warn(`⚠️ AI_FALLBACK_PROVIDER="${fallback}" is not valid. Fallback disabled.`);
    return null;
  }
}
