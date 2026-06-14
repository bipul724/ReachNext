"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "../components/ui/button";
import { AlertOctagon, Home } from "lucide-react";

import { reportError } from "../lib/error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, "global-error");
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
          <div className="bg-destructive/10 p-5 rounded-full">
            <AlertOctagon className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Critical System Error</h2>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              The application encountered a fatal error and could not load. 
              Our engineering team has been notified.
            </p>
          </div>
          <div className="flex items-center gap-4 pt-4">
            <Button onClick={() => reset()} variant="default" size="lg">
              Try Again
            </Button>
            <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <Home className="h-5 w-5 mr-2" />
              Return Home
            </Link>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-8 opacity-60">
              Diagnostic ID: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
