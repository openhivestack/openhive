
import { Display, FeatureConfig } from "@/lib/features";

export const eeFeatures: Record<string, FeatureConfig> = {
  hub: {
    enabled: true,
    description: "Verified Agent Hub (Marketplace)",
    navigation: {
      name: "Agent Hub",
      url: "/hub",
      icon: "flame",
      className: "text-amber-500 hover:text-amber-500/80",
      display: [Display.Home, Display.Sidebar],
      isPublic: true,
    },
  },
  system: {
    enabled: true,
    description: "System Administration",
    navigation: {
      name: "System",
      url: "/system",
      icon: "layout-dashboard",
      display: [Display.Sidebar],
      scopes: ["root"],
    }
  },
  billing: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_BILLING === 'true',
    description: "Billing & Subscriptions",
    navigation: {
      name: "Billing",
      url: "/organization/billing",
      icon: "credit-card",
      display: [Display.SubHeader],
    }
  }
  // Add other EE-only features here
};
