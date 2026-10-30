import type { Metadata } from "next";
import EnTete from "@/app/_components/admin/EnTete";
import Porte from "@/app/_components/admin/Porte";

export const metadata: Metadata = { title: "Webmail, DataParl'" };

export default function WebmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <Porte titre="Webmail">
      <div className="page">
        <EnTete espace="webmail" />
        <main className="webmail-main"><div className="wrap large">{children}</div></main>
      </div>
    </Porte>
  );
}
