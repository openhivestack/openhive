export interface NavItem {
  name: string;
  url: string;
  icon: string;
  isActive?: boolean; // Calculated at runtime usually, but can be static
}

export interface NavConfig {
  navMain: NavItem[];
}

// Default CE Navigation
const defaultNav: NavConfig = {
  navMain: [
    {
      name: "My Agents",
      url: "/agent/list",
      icon: "square-terminal",
    },
    {
      name: "Settings",
      url: "/settings",
      icon: "settings-2",
    },
  ],
};

export async function getNavConfig(): Promise<NavConfig> {
  let config = { ...defaultNav };

  try {
    // Attempt to load EE navigation
    // We use a dynamic import with a relative path that points to the ee folder
    // The @/ alias is preferred if configured, but relative is safer for "optional" checks sometimes
    // However, Webpack static analysis might still catch this.
    // We'll try to import from the alias.
    // @ts-ignore - EE module might not exist in CE build
    const eeModule = await import("@/ee/lib/navigation");
    
    if (eeModule && eeModule.extendNavConfig) {
      config = eeModule.extendNavConfig(config);
    }
  } catch (error) {
    // EE module not found or failed to load - ignore and use CE defaults
    // In development, this might log an error if the file is missing, which is expected for CE.
  }

  return config;
}
