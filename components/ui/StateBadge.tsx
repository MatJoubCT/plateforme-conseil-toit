// components/ui/StateBadge.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BassinState =
  | "tres_bon"
  | "bon"
  | "a_surveille"
  | "planifier"
  | "urgent"
  | "non_evalue";

interface StateBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: BassinState;
}

const stateConfig: Record<
  BassinState,
  { label: string; bg: string; text: string; border: string }
> = {
  tres_bon: {
    label: "Très bon",
    // Vert différent de "Bon" (sans toucher à ta charte existante)
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  bon: {
    label: "Bon",
    bg: "bg-ct-stateGood/10",
    text: "text-ct-stateGood",
    border: "border-ct-stateGood/40",
  },
  a_surveille: {
    label: "À surveiller",
    bg: "bg-ct-stateWatch/10",
    text: "text-ct-stateWatch",
    border: "border-ct-stateWatch/40",
  },
  planifier: {
    label: "Planifier",
    bg: "bg-ct-statePlan/10",
    text: "text-ct-statePlan",
    border: "border-ct-statePlan/40",
  },
  urgent: {
    label: "Urgent",
    bg: "bg-ct-stateUrgent/10",
    text: "text-ct-stateUrgent",
    border: "border-ct-stateUrgent/40",
  },
  non_evalue: {
    label: "Non évalué",
    bg: "bg-ct-stateUnknown/10",
    text: "text-ct-stateUnknown",
    border: "border-ct-stateUnknown/40",
  },
};

export const StateBadge: React.FC<StateBadgeProps> = ({
  state,
  className,
  ...props
}) => {
  const cfg = stateConfig[state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        cfg.bg,
        cfg.text,
        cfg.border,
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          state === "tres_bon" && "bg-emerald-600",
          state === "bon" && "bg-ct-stateGood",
          state === "a_surveille" && "bg-ct-stateWatch",
          state === "planifier" && "bg-ct-statePlan",
          state === "urgent" && "bg-ct-stateUrgent",
          state === "non_evalue" && "bg-ct-stateUnknown"
        )}
      />
      {cfg.label}
    </span>
  );
};
