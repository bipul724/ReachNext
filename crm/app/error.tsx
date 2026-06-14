"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "../components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

import { reportError } from "../lib/error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, "root-error");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-5">
      <div className="bg-destructive/10 p-4 rounded-full">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We encountered an unexpected error while loading the application.
        </p>
      </div>
      <div className="flex items-center gap-3 pt-4">
        <Button onClick={() => reset()} variant="default">
          Try Again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground mt-4">
          Error ID: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
