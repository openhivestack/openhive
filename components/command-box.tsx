"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AnimatedShinyText } from "./ui/animated-shiny-text";

export function CommandBox({ command }: { command: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="relative rounded-lg bg-secondary pl-4 pr-2 py-1 border">
      <div className="flex items-center justify-between">
        <code className="text-xs text-muted-foreground font-bold">
          <AnimatedShinyText>{command}</AnimatedShinyText>
        </code>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="rounded-full hover:text-brand-primary size-6"
        >
          {isCopied ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="size-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
