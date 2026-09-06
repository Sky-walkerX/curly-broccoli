import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsList = React.forwardRef(function TabsList({ className, ...props }, ref) {
  return <TabsPrimitive.List ref={ref}
    className={cn("inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1", className)} {...props} />;
});
export const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return <TabsPrimitive.Trigger ref={ref}
    className={cn("inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
});
export const TabsContent = TabsPrimitive.Content;
