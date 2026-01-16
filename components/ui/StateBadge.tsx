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

  /**
   * Optionnel: couleur HEX venant de Supabase (ex: listes_choix.couleur = "#28A745")
   * Si fourni, le badge prend cette couleur (cohérent avec les polygones).
   */
  color?: string | null;

  /**
   * Optionnel: override du libellé (si tu veux afficher exactement listes_choix.label)
   */
  label?: string | null;
}

const stateConfig: Record<
  BassinState,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  tres_bon: {
    label: "Très bon",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-600",
  },
  bon: {
    label: "Bon",
    bg: "bg-ct-stateGood/10",
    text: "text-ct-stateGood",
    border: "border-ct-stateGood/40",
    dot: "bg-ct-stateGood",
  },
  a_surveille: {
    label: "À surveiller",
    bg: "bg-ct-stateWatch/10",
    text: "text-ct-stateWatch",
    border: "border-ct-stateWatch/40",
    dot: "bg-ct-stateWatch",
  },
  planifier: {
    label: "Planifier",
    bg: "bg-ct-statePlan/10",
    text: "text-ct-statePlan",
    border: "border-ct-statePlan/40",
    dot: "bg-ct-statePlan",
  },
  urgent: {
    label: "Urgent",
    bg: "bg-ct-stateUrgent/10",
    text: "text-ct-stateUrgent",
    border: "border-ct-stateUrgent/40",
    dot: "bg-ct-stateUrgent",
  },
  non_evalue: {
    label: "Non évalué",
    bg: "bg-ct-stateUnknown/10",
    text: "text-ct-stateUnknown",
    border: "border-ct-stateUnknown/40",
    dot: "bg-ct-stateUnknown",
  },
};

function isHexColor(input: string) {
  const v = input.trim()
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v)
}

function hexToRgb(hex: string) {
  let h = hex.replace("#", "").trim()
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("")
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return { r, g, b }
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const StateBadge: React.FC<StateBadgeProps> = ({
  state,
  color,
  label,
  className,
  ...props
}) => {
  const cfg = stateConfig[state];

  const useDynamicColor = typeof color === "string" && isHexColor(color);

  const dynamicStyle: React.CSSProperties | undefined = useDynamicColor
    ? {
        backgroundColor: rgba(color!, 0.12),
        borderColor: rgba(color!, 0.35),
        color: color!, // texte du badge
      }
    : undefined;

  const dotStyle: React.CSSProperties | undefined = useDynamicColor
    ? { backgroundColor: color! }
    : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        !useDynamicColor && cfg.bg,
        !useDynamicColor && cfg.text,
        !useDynamicColor && cfg.border,
        className
      )}
      style={dynamicStyle}
      {...props}
    >
      <span
        className={cn("h-2 w-2 rounded-full", !useDynamicColor && cfg.dot)}
        style={dotStyle}
      />
      {label ?? cfg.label}
    </span>
  );
};
