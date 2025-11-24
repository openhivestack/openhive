import Lottie from "lottie-react";
import howItWorksAnimation from "./how-it-works.json";
import { cn } from "@/lib/utils";

interface HowItWorksProps {
  className?: string;
}

export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <div className={cn("size-8", className)}>
      <Lottie animationData={howItWorksAnimation} loop={true} />
    </div>
  );
}