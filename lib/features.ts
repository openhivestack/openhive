
// Base OSS features
const coreFeatures = {
  // Define always-verified OSS features here if any
  // e.g. basic_agent: { enabled: true, description: "Basic Agent Registry" }
};

export type FeatureConfig = {
  enabled: boolean;
  description: string;
  navigation?: {
    name: string;
    url: string;
    icon: string;
    className?: string;
    display: Display[];
    isPublic?: boolean;
    scopes?: string[];
  };
};

type Features = typeof coreFeatures & Record<string, FeatureConfig>;

let loadedFeatures: Features | null = null;

async function loadFeatures(): Promise<Features> {
  if (loadedFeatures) return loadedFeatures;

  let merged: any = { ...coreFeatures };

  try {
    // Dynamically import EE features if available
    // @ts-ignore
    const eeModule = await import("@/ee/lib/features");
    if (eeModule && eeModule.eeFeatures) {
      merged = { ...merged, ...eeModule.eeFeatures };
    }
  } catch (e) {
    // EE module not found, proceed with core features only
    // console.log("EE features not found, running in OSS mode.");
  }

  loadedFeatures = merged;
  return merged as Features;
}

export async function getFeatures() {
  return loadFeatures();
}

export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  const allFeatures = await loadFeatures();
  const feature = allFeatures[featureName];
  if (!feature) return false;
  return feature.enabled;
}

export enum Display {
  Home = "home",
  Sidebar = "sidebar",
}

export interface NavItem {
  name: string;
  url: string;
  icon: string;
  className?: string;
  display: Display[];
  isPublic?: boolean;
  scopes?: string[];
}


export const defaultNavItems: NavItem[] = [
    {
      name: "My Agents",
      url: "/agent/list",
      icon: "square-terminal",
      display: [Display.Sidebar],
    },
    {
      name: "Organization",
      url: "/organization",
      icon: "building-2",
      display: [Display.Sidebar],
    },
    {
      name: "Settings",
      url: "/settings",
      icon: "settings-2",
      display: [Display.Sidebar],
    },
];

export async function getComputedNavigation(baseItems: NavItem[] = defaultNavItems): Promise<NavItem[]> {

  const allFeatures = await loadFeatures();
  const featureItems: NavItem[] = [];

  for (const key in allFeatures) {
    const feature = allFeatures[key];
    if (feature.enabled && feature.navigation) {
      featureItems.push(feature.navigation);
    }
  }

  const finalItems = [...baseItems];
  if (finalItems.length > 0) {
      // Insert after first item (usually "My Agents")
      finalItems.splice(1, 0, ...featureItems);
  } else {
      finalItems.push(...featureItems);
  }

  return finalItems;
}
