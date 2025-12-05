import { NavConfig } from "@/lib/navigation";

export function extendNavConfig(config: NavConfig): NavConfig {
  return {
    ...config,
    navMain: [
      ...config.navMain,
      {
        name: "Audit Logs (EE)",
        url: "/audit",
        icon: "shield-alert",
      },
    ],
  };
}
