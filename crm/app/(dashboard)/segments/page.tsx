"use client";

import Link from "next/link";
import { useSegments } from "../../../hooks/use-segments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Layers, Plus, Calendar, Users, Sparkles, Loader2, AlertCircle } from "lucide-react";

export default function Segments() {
  const { segments, isLoading, error } = useSegments();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage target groups and filter rules
          </p>
        </div>
        <Link href="/segments/new">
          <Button className="gap-2">
            <Plus className="h-4.5 w-4.5" />
            Create Segment
          </Button>
        </Link>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="text-slate-900">Saved Segments Directory</span>
            <Badge variant="outline" className="font-semibold text-[10px] uppercase text-slate-600">
              {segments?.length || 0} saved segments
            </Badge>
          </CardTitle>
          <CardDescription className="text-slate-500">
            Segments defined by rules or generated from AI goal objectives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex h-60 items-center justify-center">
              <div className="text-center space-y-2">
                <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
                <p className="text-sm font-medium text-red-600">Failed to load segments</p>
                <p className="text-xs text-slate-500">Check your connection and refresh the page.</p>
              </div>
            </div>
          ) : segments.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Layers className="h-10 w-10 mx-auto text-slate-400" />
              <p className="text-sm text-slate-500">No segments found. Create your first segment!</p>
              <Link href="/segments/new" className="inline-block">
                <Button size="sm">Create Segment Now</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-xs text-slate-600">Segment Name</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Description</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Query Source</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-right">Matches</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((seg: any) => (
                    <TableRow key={seg.id} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-900 py-4">
                        <Link href={`/segments/${seg.id}`} className="hover:text-blue-600 hover:underline underline-offset-2 transition-colors">
                          {seg.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate py-4 text-slate-500">
                        {seg.description || "No description provided."}
                      </TableCell>
                      <TableCell className="py-4">
                        {seg.naturalLanguageQuery ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-100 py-0 px-1.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            AI Natural Language
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit text-[9px] font-bold bg-slate-100 text-slate-600 py-0 px-1.5 border-slate-200">
                            Manual Rule Builder
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-slate-900 text-right py-4">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {seg.customerCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 py-4 font-mono">
                        {new Date(seg.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
