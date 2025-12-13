"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";
import Image from "next/image";
import { AnimatedGradientText } from "./ui/animated-gradient-text";

interface Props {
  hideText?: boolean;
  size?: string;
  className?: string;
  animated?: boolean;
}

export function Logo({ hideText, size = "size-12", className, animated = false }: Props) {
  const router = useRouter();

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-center gap-2 cursor-pointer",
          className
        )}
        onClick={() => router.push("/")}
      >
        <Image
          src="/logo.png"
          alt="OpenHive"
          width={24}
          height={24}
          className={cn("text-primary", size)}
        />
        {!hideText && (
          animated ? (
            <AnimatedGradientText className="text-lg font-extrabold">
              {config.appName}
            </AnimatedGradientText>
          ) : (
            <span className="text-lg font-extrabold">
              {config.appName}
            </span>
          )
        )}
      </div>
    </>
  );
}
