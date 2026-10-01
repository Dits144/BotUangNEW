import type { Metadata } from "next";
import { LegacyDashboardRedirect } from "../../components/legacy-dashboard-redirect";

export const metadata: Metadata = {
  title: "Kas Anggota",
};

export default function Page() {
  return <LegacyDashboardRedirect section="participants" />;
}
