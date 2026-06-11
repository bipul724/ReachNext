const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "⚠️ GROQ_API_KEY is not set. Campaign generation will fail until it is added to crm/.env."
  );
}

// --- Retry + Timeout wrapper ---

interface GenerateOptions {
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Max retry attempts for transient errors (default: 2, so 3 total tries) */
  maxRetries?: number;
}

/**
 * Calls Groq's chat completion endpoint with:
 * - Configurable timeout (default 15s) via AbortController
 * - Exponential backoff retry for transient errors (429, 500, 503)
 *
 * Returns the generated text string directly.
 * Throws on permanent failures or after all retries are exhausted.
 */
export async function safeGenerate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { timeoutMs = 15000, maxRetries = 2 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured in crm/.env");
      }

      // Call Groq chat completions using Llama-3.3-70b
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error (status ${response.status}): ${errText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      return text.trim();
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      lastError = error;

      // Check if retryable
      const statusCode = getErrorStatus(error);
      const isRetryable =
        statusCode === 429 || statusCode === 500 || statusCode === 503;
      const isTimeout =
        error instanceof Error &&
        (error.message === "GEMINI_TIMEOUT" || error.name === "AbortError");

      if ((isRetryable || isTimeout) && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(
          `⏳ Groq attempt ${attempt + 1} failed (${isTimeout ? "timeout" : "status " + statusCode}). Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        continue;
      }

      // Not retryable or out of retries — throw
      throw error;
    }
  }

  throw lastError;
}

// --- Helper utilities ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    if ("status" in error && typeof (error as any).status === "number") {
      return (error as any).status;
    }
    if ("message" in error && typeof (error as any).message === "string") {
      const msg = (error as any).message;
      if (msg.includes("429")) return 429;
      if (msg.includes("500")) return 500;
      if (msg.includes("503")) return 503;
      if (msg.includes("status 429")) return 429;
      if (msg.includes("status 500")) return 500;
      if (msg.includes("status 503")) return 503;
    }
  }
  return null;
}
