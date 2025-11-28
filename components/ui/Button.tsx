// components/ui/Button.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ct-primary text-white hover:bg-[#173857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ct-primaryLight",
  secondary:
    "bg-ct-grayLight text-ct-grayDark border border-ct-gray hover:bg-ct-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ct-primaryLight",
  ghost:
    "bg-transparent text-ct-grayDark hover:bg-ct-grayLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ct-primaryLight",
  danger:
    "bg-ct-stateUrgent text-white hover:bg-[#b32232] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ct-stateUrgent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium shadow-sm transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
