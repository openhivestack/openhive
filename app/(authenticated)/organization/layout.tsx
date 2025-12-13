import { getFeatureNavigation, Display } from "@/lib/features";
import { ReactNode } from "react";
import { Header } from "@/components/header";
import { SubHeader, Tab } from "@/components/sub-header";

export default async function OrganizationLayout({ children }: { children: ReactNode }) {
  const featureTabs = await getFeatureNavigation(Display.SubHeader);

  const tabs: Tab[] = [
    {
      label: "Overview",
      href: "/organization",
      key: "overview",
      icon: "building-2",
    },
    {
      label: "Members",
      href: "/organization/members",
      key: "members",
      icon: "users",
    },
    {
      label: "Teams",
      href: "/organization/team",
      key: "team",
      icon: "briefcase",
    },
  ];

  // Map feature tabs
  featureTabs.forEach(feature => {
    tabs.push({
      label: feature.name,
      href: feature.url,
      key: feature.name.toLowerCase(),
      icon: feature.icon
    });
  });

  tabs.push({
    label: "Settings",
    href: "/organization/settings",
    key: "settings",
    icon: "settings",
  });

  return (
    <div>
      <Header />
      <SubHeader tabs={tabs} />
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
}
