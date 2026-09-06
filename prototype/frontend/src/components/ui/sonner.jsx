import { Toaster as Sonner } from "sonner";
export function Toaster(props) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "group border border-border bg-popover text-popover-foreground rounded-lg shadow-lg text-sm",
          description: "text-muted-foreground",
        },
      }}
      style={{ fontFamily: "var(--font-sans)" }}
      {...props}
    />
  );
}
