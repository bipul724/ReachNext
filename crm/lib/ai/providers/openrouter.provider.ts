// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter Provider Adapter
// ─────────────────────────────────────────────────────────────────────────────

import type { AIProvider, AIRequest, AIResponse } from '../types';
import {
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIValidationError,
} from '../errors';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';

export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter';

  async generate(request: AIRequest): Promise<AIResponse> {
    const maxRetries = request.maxRetries ?? 2;
    const timeoutMs = request.timeoutMs ?? 15000;
    const key = process.env.OPENROUTER_API_KEY;

    if (!key) {
      throw new AIProviderError(
        'openrouter',
        null,
        'OPENROUTER_API_KEY is not configured in crm/.env'
      );
    }

    const rawModel = request.model || DEFAULT_MODEL;
    const modelArray = rawModel.split(',').map((m) => m.trim());

    const payload: any = {
      messages: [] as Array<{ role: string; content: string }>,
      temperature: request.temperature ?? 0.1,
      ...(request.maxTokens && { max_tokens: request.maxTokens }),
    };

    if (modelArray.length > 1) {
      payload.models = modelArray;
    } else {
      payload.model = modelArray[0];
    }

    if (request.systemPrompt) {
      payload.messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    payload.messages.push({
      role: 'user',
      content: request.userPrompt,
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Xeno Mini CRM',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          if (response.status === 429) {
            throw new AIRateLimitError('openrouter', `OpenRouter rate limited: ${errorText}`);
          }
          if (response.status === 400 || response.status === 422) {
            throw new AIValidationError('openrouter', `Validation failed: ${errorText}`);
          }
          throw new AIProviderError(
            'openrouter',
            response.status,
            `OpenRouter API error (status ${response.status}): ${errorText}`
          );
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (typeof text !== 'string' || !text.trim()) {
          throw new AIProviderError(
            'openrouter',
            response.status,
            'OpenRouter returned empty or non-string response'
          );
        }

        return {
          text: text.trim(),
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
          provider: 'openrouter',
          model: data.model || payload.model,
        };
      } catch (error: any) {
        clearTimeout(timeout);

        if (error instanceof AIRateLimitError || error instanceof AIProviderError || error instanceof AIValidationError) {
          if (attempt === maxRetries) throw error;
        } else if (error instanceof Error && error.name === 'AbortError') {
          if (attempt === maxRetries) {
            throw new AITimeoutError('openrouter', timeoutMs);
          }
        } else {
          throw new AIProviderError(
            'openrouter',
            null,
            error instanceof Error ? error.message : String(error)
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw new AIProviderError('openrouter', null, 'Max retries exceeded');
  }
}