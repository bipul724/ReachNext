"use client";

import { useState } from "react";
import { useCustomers } from "../../../hooks/use-customers";
import { useDebounce } from "../../../hooks/use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  Coffee,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export default function Customers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [csvType, setCsvType] = useState<"customers" | "orders">("customers");
  const [csvText, setCsvText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, mutate } = useCustomers(page, debouncedSearch);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on new search
  };

  const handleUploadCSV = async () => {
    if (!csvText.trim()) {
      toast.warning("Please paste some CSV text first.");
      return;
    }

    setIsUploading(true);
    const endpoint = csvType === "customers" ? "/api/customers/upload" : "/api/orders/upload";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to process CSV file.");
      }

      if (result.errors && result.errors.length > 0) {
        toast.warning(
          `Processed with some warnings: ${result.message}`,
          {
            description: `Skipped ${result.errors.length} rows. Example: ${result.errors[0]}`,
            duration: 5000,
          }
        );
      } else {
        toast.success(result.message || "CSV processed successfully!");
      }

      setCsvText("");
      setIsDialogOpen(false);
      mutate(); // Refresh the table list
    } catch (err: any) {
      toast.error("CSV Upload failed", {
        description: err.message || "Something went wrong.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper template headers for paste guidance
  const customersTemplate = "name,email,phone,city,tags\n\"Ravi Kumar\",\"ravi@gmail.com\",\"9876543210\",\"Delhi\",\"vip;coffee-lover\"\n\"Asha Patel\",\"asha@gmail.com\",\"\",\"Mumbai\",\"new-customer\"";
  const ordersTemplate = "email,totalAmount,storeLocation\n\"ravi@gmail.com\",1250,\"Delhi Cafe\"\n\"asha@gmail.com\",450,\"online\"";

  const totalPages = Math.ceil(data.total / 50);

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <Input
            placeholder="Search shopper name, email, or city..."
            value={search}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>

        {/* CSV Upload Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button variant="outline" className="gap-2">
              <Upload className="h-4.5 w-4.5" />
              Ingest CSV Data
            </Button>
          } />
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Ingest CSV Dataset
              </DialogTitle>
              <DialogDescription>
                Paste your spreadsheet contents below to dynamically populate your ReachNext database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {/* Type Select buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={csvType === "customers" ? "default" : "outline"}
                  onClick={() => {
                    setCsvType("customers");
                    setCsvText("");
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Shopper Profiles CSV
                </Button>
                <Button
                  type="button"
                  variant={csvType === "orders" ? "default" : "outline"}
                  onClick={() => {
                    setCsvType("orders");
                    setCsvText("");
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Order Transactions CSV
                </Button>
              </div>

              {/* Paste textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Paste raw CSV rows (including header):</span>
                  <button
                    type="button"
                    onClick={() => setCsvText(csvType === "customers" ? customersTemplate : ordersTemplate)}
                    className="text-primary hover:underline"
                  >
                    Insert Mock Template
                  </button>
                </div>
                <textarea
                  className="w-full h-44 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={csvType === "customers" ? "name,email,phone,city,tags..." : "email,totalAmount,storeLocation..."}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUploadCSV}
                disabled={isUploading || !csvText.trim()}
                className="gap-2"
              >
                {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Upload dataset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Database Table card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Shoppers Directory</span>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {data.items.length} of {data.total} profiles
            </span>
          </CardTitle>
          <CardDescription>
            Database of customer subscribers, total spends, and locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data.items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No customer records match your filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Customer</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Contact</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Location</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Tags</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">Orders</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((cust: any) => (
                      <TableRow key={cust.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium text-foreground py-3">
                          {cust.name}
                        </TableCell>
                        <TableCell className="text-xs font-mono py-3">
                          <div className="flex flex-col gap-0.5">
                            <span>{cust.email}</span>
                            {cust.phone && <span className="text-[10px] text-muted-foreground">{cust.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3">{cust.city || "—"}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {cust.tags.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              cust.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[9px] uppercase px-1 py-0 font-bold bg-muted text-muted-foreground">
                                  {tag}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold py-3">
                          {cust.totalOrders}
                        </TableCell>
                        <TableCell className="text-sm text-right font-bold text-foreground py-3">
                          ₹{cust.totalSpent.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Previous page"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Next page"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
