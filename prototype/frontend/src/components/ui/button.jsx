import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background,color,box-shadow,border-color] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-strong shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_1px_2px_rgba(0,0,0,0.4)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted border border-border",
        outline: "border border-border bg-transparent text-foreground hover:bg-accent hover:border-border-strong",
        ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive: "bg-destructive text-white hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        default: "h-9 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props }, ref
) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
export { buttonVariants };
