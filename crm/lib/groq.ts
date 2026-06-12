const apiKey = process.env.GROQ_API_KEY;

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

/** Error from the Groq API with the HTTP status attached. */
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * Calls Groq's chat completion endpoint with:
 * - Configurable timeout (default 15s) via AbortController
 * - Exponential backoff retry for transient errors (429, 500, 502, 503, 504),
 *   request timeouts, and network-level failures (DNS, connection reset)
 *
 * Returns the generated text string directly.
 * Throws on permanent failures or after all retries are exhausted.
 */
export async function safeGenerate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { timeoutMs = 15000, maxRetries = 2 } = options;

  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error(`maxRetries must be a non-negative integer, got ${maxRetries}`);
  }

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
        throw new ApiError(response.status, `Groq API error (status ${response.status}): ${errText}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      if (typeof text !== "string") {
        throw new Error("Groq returned an unexpected response format (missing choices[0].message.content).");
      }

      return text.trim();
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      lastError = error;

      // Check if retryable
      const isRetryableStatus =
        error instanceof ApiError && RETRYABLE_STATUS_CODES.has(error.status);
      const isTimeout =
        error instanceof Error && error.name === "AbortError";
      const isNetworkError =
        error instanceof TypeError && error.message.includes("fetch");

      if ((isRetryableStatus || isTimeout || isNetworkError) && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        const reason = isTimeout
          ? "timeout"
          : isNetworkError
            ? "network error"
            : `status ${(error as ApiError).status}`;
        console.warn(
          `⏳ Groq attempt ${attempt + 1} failed (${reason}). Retrying in ${delayMs}ms...`
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
