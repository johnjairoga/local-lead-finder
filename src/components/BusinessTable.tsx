"use client";

import { useMemo, useState } from "react";
import {
  BUSINESS_STATUS_OPTIONS,
  formatBusinessStatusLabel,
} from "@/lib/business-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Business, BusinessStatus } from "@/types/business";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessTableProps {
  businesses: Business[];
  onStatusChange?: (businessId: string, status: BusinessStatus) => void;
}

type SortField = "name" | "rating" | "reviews" | "createdAt" | "lastSeenAt" | "status";
type SortDirection = "asc" | "desc";

function sortBusinesses(
  businesses: Business[],
  field: SortField,
  direction: SortDirection
): Business[] {
  return [...businesses].sort((a, b) => {
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
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "createdAt":
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case "lastSeenAt":
        comparison = a.lastSeenAt.getTime() - b.lastSeenAt.getTime();
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });
}

function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString();
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

export function BusinessTable({ businesses, onStatusChange }: BusinessTableProps) {
  const [sortField, setSortField] = useState<SortField>("lastSeenAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => sortBusinesses(businesses, sortField, sortDirection),
    [businesses, sortField, sortDirection]
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "name" ? "asc" : "desc");
  }

  async function handleStatusChange(businessId: string, status: BusinessStatus) {
    setUpdatingId(businessId);
    try {
      const response = await fetch(`/api/businesses/${businessId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      onStatusChange?.(businessId, status);
    } finally {
      setUpdatingId(null);
    }
  }

  if (businesses.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No businesses discovered yet. Run a search to grow your lead database.
      </p>
    );
  }

  const sortableHeaderClass =
    "cursor-pointer select-none whitespace-nowrap hover:text-foreground";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {businesses.length} business{businesses.length !== 1 ? "es" : ""} — click column headers to sort
      </p>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={sortableHeaderClass} onClick={() => toggleSort("name")}>
                <span className="inline-flex items-center">
                  Business Name
                  <SortIcon field="name" activeField={sortField} direction={sortDirection} />
                </span>
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
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
              <TableHead
                className={sortableHeaderClass}
                onClick={() => toggleSort("status")}
              >
                <span className="inline-flex items-center">
                  Contact Status
                  <SortIcon field="status" activeField={sortField} direction={sortDirection} />
                </span>
              </TableHead>
              <TableHead
                className={sortableHeaderClass}
                onClick={() => toggleSort("createdAt")}
              >
                <span className="inline-flex items-center">
                  Date Added
                  <SortIcon field="createdAt" activeField={sortField} direction={sortDirection} />
                </span>
              </TableHead>
              <TableHead
                className={sortableHeaderClass}
                onClick={() => toggleSort("lastSeenAt")}
              >
                <span className="inline-flex items-center">
                  Last Seen
                  <SortIcon field="lastSeenAt" activeField={sortField} direction={sortDirection} />
                </span>
              </TableHead>
              <TableHead>Maps</TableHead>
              <TableHead>Attributes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((business) => (
              <TableRow key={business.id}>
                <TableCell className="font-medium">{business.name}</TableCell>
                <TableCell>{business.phone ?? "—"}</TableCell>
                <TableCell>{business.email ?? "—"}</TableCell>
                <TableCell>{business.city ?? "—"}</TableCell>
                <TableCell>{business.country ?? "—"}</TableCell>
                <TableCell className="text-right">{business.rating.toFixed(1)}</TableCell>
                <TableCell className="text-right">{business.reviews}</TableCell>
                <TableCell className="min-w-[200px]">
                  <select
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    value={business.status}
                    disabled={updatingId === business.id}
                    title={formatBusinessStatusLabel(business.status)}
                    onChange={(e) =>
                      void handleStatusChange(business.id, e.target.value as BusinessStatus)
                    }
                  >
                    {BUSINESS_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.emoji} {option.label}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>{formatDate(business.createdAt)}</TableCell>
                <TableCell>{formatDate(business.lastSeenAt)}</TableCell>
                <TableCell>
                  <a
                    href={business.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                    {business.businessAttributes.slice(0, 2).map((attr) => (
                      <span
                        key={attr.label}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs"
                      >
                        {attr.label.length > 40 ? `${attr.label.slice(0, 40)}…` : attr.label}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
