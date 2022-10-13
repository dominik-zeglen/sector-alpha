import React from "react";
import { nano } from "@ui/style";

export const Table = nano.jsx("table", {
  "tbody tr:not(.no-border), thead tr:not(.no-border)": {
    borderBottom: `1px ${"var(--palette-disabled)"} solid`,
  },
  "tbody td, thead th": {
    padding: `${"var(--spacing-0-75)"} ${"var(--spacing-1)"}`,
  },
  "tbody tr:not(.no-border):last-child": {
    borderBottom: "none",
  },
  "tbody input": {
    "&:focus": {
      background: "rgba(255,255,255,0.2)",
    },
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: "4px",
    color: "var(--palette-default)",
    fontSize: "var(--typography-default)",
    outline: 0,
    height: "32px",
    padding: "4px 8px",
    transition: "200ms",
    width: "100%",
  },
  borderCollapse: "collapse",
  tableLayout: "fixed",
  width: "100%",
});

export const TableCell: React.FC<
  React.DetailedHTMLProps<
    React.TdHTMLAttributes<HTMLTableCellElement>,
    HTMLTableCellElement
  >
> = nano.jsx("td", {
  padding: "4px 0",
}) as any;

export const TableHeader = nano.jsx("th", {
  fontSize: "var(--typography-label)",
  padding: "4px 0",
});
