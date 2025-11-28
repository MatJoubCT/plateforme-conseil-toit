// components/ui/Card.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn("rounded-xl bg-ct-white shadow-ct-card border border-ct-grayLight", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children, ...props }) => (
  <div
    className={cn(
      "px-4 py-3 border-b border-ct-grayLight flex items-center justify-between gap-3",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children, ...props }) => (
  <h3 className={cn("text-base md:text-lg font-semibold text-ct-grayDark", className)} {...props}>
    {children}
  </h3>
);

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn("text-xs md:text-sm text-ct-gray", className)} {...props}>
    {children}
  </p>
);

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent: React.FC<CardContentProps> = ({ className, children, ...props }) => (
  <div className={cn("px-4 py-4 md:px-5 md:py-5", className)} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({ className, children, ...props }) => (
  <div
    className={cn("px-4 py-3 border-t border-ct-grayLight flex items-center justify-end gap-3", className)}
    {...props}
  >
    {children}
  </div>
);
