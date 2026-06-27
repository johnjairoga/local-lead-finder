"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lead } from "@/types/lead";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadTableProps {
  leads: Lead[];
}

type SortField = "name" | "rating" | "reviews";
type SortDirection = "asc" | "desc";

function sortLeads(leads: Lead[], field: SortField, direction: SortDirection): Lead[] {
  return [...leads].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "name":
        comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        break;
      case "rating":
        comparison = a.rating - b.rating;
        break;
      case "reviews":
        comparison = a.reviews - b.reviews;
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });
}

function SortIcon({
  field,
  activeField,
  direction,
}: {
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
}) {
  if (field !== activeField) {
    return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
  }

  return direction === "asc" ? (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
  );
}

export function LeadTable({ leads }: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedLeads = useMemo(
    () => sortLeads(leads, sortField, sortDirection),
    [leads, sortField, sortDirection]
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "name" ? "asc" : "desc");
  }

  if (leads.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No qualified leads found matching the filters.
      </p>
    );
  }

  const sortableHeaderClass =
    "cursor-pointer select-none whitespace-nowrap hover:text-foreground";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {leads.length} lead{leads.length !== 1 ? "s" : ""} — click column headers to sort
      </p>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className={sortableHeaderClass}
                onClick={() => toggleSort("name")}
              >
                <span className="inline-flex items-center">
                  Business Name
                  <SortIcon field="name" activeField={sortField} direction={sortDirection} />
                </span>
              </TableHead>
              <TableHead
                className={cn(sortableHeaderClass, "text-right")}
                onClick={() => toggleSort("rating")}
              >
                <span className="inline-flex items-center justify-end w-full">
                  Rating
                  <SortIcon field="rating" activeField={sortField} direction={sortDirection} />
                </span>
              </TableHead>
              <TableHead
                className={cn(sortableHeaderClass, "text-right")}
                onClick={() => toggleSort("reviews")}
              >
                <span className="inline-flex items-center justify-end w-full">
                  Reviews
                  <SortIcon field="reviews" activeField={sortField} direction={sortDirection} />
                </span>
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead>Maps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.map((lead) => (
              <TableRow key={lead.id ?? lead.mapsUrl}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell className="text-right">{lead.rating.toFixed(1)}</TableCell>
                <TableCell className="text-right">{lead.reviews}</TableCell>
                <TableCell>{lead.phone ?? "—"}</TableCell>
                <TableCell>
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Visit
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{lead.address ?? "—"}</TableCell>
                <TableCell>{lead.category ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {lead.attributes.slice(0, 3).map((attr) => (
                      <Badge key={attr.label} variant="secondary">
                        {attr.label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <a
                    href={lead.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
