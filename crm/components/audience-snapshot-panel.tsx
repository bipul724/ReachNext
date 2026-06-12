"use client";

import { Users, MapPin, ShoppingBag, Clock, Quote } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AudienceCustomer {
  name: string;
  city: string | null;
  totalSpent: number;
  daysSinceLastOrder: number | null;
}

interface AudienceSnapshotPanelProps {
  totalAudience?: number;
  segmentName?: string | null;
  targetingRationale?: string | null;
  customers?: AudienceCustomer[];
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AudienceSnapshotPanel({
  totalAudience,
  segmentName,
  targetingRationale,
  customers,
  isLoading,
}: AudienceSnapshotPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
        <Users className="h-4 w-4 animate-pulse" />
        Loading audience snapshot...
      </div>
    );
  }

  // Empty state — campaign not yet launched
  if (!customers || customers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-card/45 space-y-1">
        <p className="font-medium">No audience data yet.</p>
        <p>Launch the campaign to see which customers were reached.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Targeting rationale */}
      {targetingRationale && (
        <div className="flex items-start gap-2.5 rounded-lg bg-primary/[0.03] border border-primary/5 p-3.5">
          <Quote className="h-4 w-4 text-primary/40 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Targeting Rationale
            </span>
            <p className="text-xs font-medium leading-relaxed text-foreground">
              &ldquo;{targetingRationale}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Customer cards */}
      <div className="space-y-1.5">
        {customers.map((customer, index) => (
          <div
            key={`${customer.name}-${index}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-muted/40 group"
          >
            {/* Avatar circle */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/5 text-xs font-bold text-primary border border-primary/10">
              {customer.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {/* Name */}
              <p className="text-[12px] font-semibold text-foreground truncate">
                {customer.name}
              </p>

              {/* Metadata row */}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {/* Spend */}
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <ShoppingBag className="h-3 w-3" />
                  ₹{customer.totalSpent.toLocaleString("en-IN")} spend
                </span>

                {/* Days inactive */}
                {customer.daysSinceLastOrder != null && (
                  <>
                    <span className="text-[10px] text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {customer.daysSinceLastOrder}d inactive
                    </span>
                  </>
                )}

                {/* City */}
                {customer.city && (
                  <>
                    <span className="text-[10px] text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {customer.city}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer count */}
      {totalAudience != null && totalAudience > 0 && (
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Showing {customers.length} of{" "}
          <span className="font-semibold text-foreground">{totalAudience}</span>{" "}
          recipients
        </p>
      )}
    </div>
  );
}
