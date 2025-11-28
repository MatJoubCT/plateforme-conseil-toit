// components/ui/DataTable.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: number;
}

export const DataTable: React.FC<DataTableProps> = ({
  children,
  className,
  maxHeight,
  ...props
}) => {
  return (
    <div
      className={cn(
        "w-full overflow-auto rounded-xl border border-ct-grayLight bg-ct-white shadow-ct-card",
        className
      )}
      style={maxHeight ? { maxHeight } : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

export const DataTableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead className={cn("bg-ct-grayLight sticky top-0 z-10", className)} {...props}>
    {children}
  </thead>
);

export const DataTableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={cn("bg-ct-white", className)} {...props}>
    {children}
  </tbody>
);
