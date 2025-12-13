
import { ReactNode } from "react";
import { SubHeader, Tab } from "@/components/sub-header";
import { Header } from "@/components/header";

interface Props {
  children: ReactNode;
}

export default function SettingsLayout({ children }: Props) {
  const tabs: Tab[] = [
    {
      label: "General",
      href: `/settings`,
      key: "general",
      icon: "home",
    },
    {
      label: "API Keys",
      href: `/settings/api-keys`,
      key: "api-keys",
      icon: "terminal",
    },
  ];

  return (
    <div>
      <Header />
      <SubHeader tabs={tabs} />

      <div>
        {children}
      </div>
    </div>
  );
}
