import type { Metadata } from "next";
import EnTete from "@/app/_components/admin/EnTete";
import Porte from "@/app/_components/admin/Porte";

export const metadata: Metadata = { title: { default: "Administration", template: "%s, DataParl' Admin" } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Porte titre="Admin">
      <div className="page">
        <EnTete espace="admin" />
        <main><div className="wrap large">{children}</div></main>
      </div>
    </Porte>
  );
}
