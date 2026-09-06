import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    try { localStorage.setItem("auditor-theme", dark ? "dark" : "light"); } catch { /* private mode */ }
  }, [dark]);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setDark((d) => !d)}>
          {dark ? <Moon /> : <Sun />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{dark ? "Switch to light (bright rooms)" : "Switch to dark"}</TooltipContent>
    </Tooltip>
  );
}
