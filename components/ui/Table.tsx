import React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={cn("w-full border-collapse", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn("bg-[rgb(var(--bg))] border-b border-border", className)}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody ref={ref} className={cn("", className)} {...props}>
        {children}
      </tbody>
    );
  }
);

TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          "border-b border-border transition-colors hover:bg-[rgb(var(--bg))]",
          className
        )}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);

TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn("px-4 py-3 text-sm text-text-primary", className)}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
