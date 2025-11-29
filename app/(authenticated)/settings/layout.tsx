import { Header } from "@/components/header";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}
