import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn("rounded-xl border border-border bg-card text-card-foreground", className)} {...props} />;
});
export const CardHeader = React.forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn("flex flex-col gap-1 p-4", className)} {...props} />;
});
export const CardTitle = React.forwardRef(function CardTitle({ className, ...props }, ref) {
  return <div ref={ref} className={cn("font-semibold leading-tight tracking-tight", className)} {...props} />;
});
export const CardContent = React.forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />;
});
