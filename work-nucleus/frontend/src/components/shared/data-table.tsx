import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Headless table primitives — see design-system-v2/CLAUDE.md §5 (Data table
// pattern). Each piece is a thin wrapper that owns the v2 styling so callers
// compose normally:
//
//   <DataTable>
//     <DataTableHeader>
//       <DataTableHead>Name</DataTableHead>
//     </DataTableHeader>
//     <DataTableBody>
//       <DataTableRow onClick={...}>
//         <DataTableCell>Senior PM</DataTableCell>
//       </DataTableRow>
//     </DataTableBody>
//   </DataTable>
//
// Pair with <DataTablePagination /> for the standard footer.

export const DataTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm",
      className
    )}
    {...props}
  >
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  </div>
));
DataTable.displayName = "DataTable";

export const DataTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("border-b border-slate-200 bg-slate-50", className)}
    {...props}
  />
));
DataTableHeader.displayName = "DataTableHeader";

export const DataTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400",
      className
    )}
    {...props}
  />
));
DataTableHead.displayName = "DataTableHead";

export const DataTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-slate-50", className)}
    {...props}
  />
));
DataTableBody.displayName = "DataTableBody";

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export const DataTableRow = React.forwardRef<HTMLTableRowElement, DataTableRowProps>(
  ({ className, selected, onClick, ...props }, ref) => (
    <tr
      ref={ref}
      data-state={selected ? "selected" : undefined}
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer",
        selected ? "bg-indigo-50/60" : onClick ? "hover:bg-slate-50" : undefined,
        className
      )}
      {...props}
    />
  )
);
DataTableRow.displayName = "DataTableRow";

export const DataTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3 align-middle text-slate-700", className)}
    {...props}
  />
));
DataTableCell.displayName = "DataTableCell";

interface DataTablePaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  ...props
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-slate-200/70 px-4 py-3",
        className
      )}
      {...props}
    >
      <span className="text-sm text-slate-500">
        {total === 0
          ? "No results"
          : `Showing ${from}-${to} of ${total}`}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
