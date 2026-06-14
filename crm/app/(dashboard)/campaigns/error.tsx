"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "../../../components/ui/button";
import { AlertTriangle, LayoutDashboard } from "lucide-react";

import { reportError } from "../../../lib/error-reporting";

export default function CampaignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, "campaigns-error");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-6 text-center space-y-5 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="bg-destructive/10 p-3 rounded-full">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Campaign Loading Failed</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          An unexpected error occurred in the campaigns section. 
        </p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={() => reset()} variant="default">
          Reload Campaigns
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground mt-2">
          Error ID: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
