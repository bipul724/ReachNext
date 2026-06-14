/**
 * Centralized error reporting utility for the application.
 * 
 * This abstraction isolates error boundaries from specific tracking implementations.
 * It is safe to use in both Server and Client components, although error boundaries
 * themselves are exclusively Client Components.
 */

export function reportError(
  error: Error & { digest?: string },
  context: string
) {
  try {
    // Standard console logging for local development and base observability
    console.error(`[Error: ${context}]`, error);
    if (error.digest) {
      console.error(`[Error Digest: ${context}]`, error.digest);
    }

    // Future integration points for external observability services:
    // e.g., Sentry.captureException(error, { tags: { context } })
    // e.g., LogRocket.captureException(error, { extra: { context } })
    // e.g., Datadog.addError(error, { context })
    
  } catch (reportingError) {
    // Failsafe: Ensure that a failure in the reporting logic itself
    // NEVER crashes the error boundary UI.
    console.error("Failed to report error:", reportingError);
  }
}
