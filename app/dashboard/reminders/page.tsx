import type { Metadata } from "next";
import { LegacyDashboardRedirect } from "../../components/legacy-dashboard-redirect";

export const metadata: Metadata = {
  title: "Reminders",
};

export default function Page() {
  return <LegacyDashboardRedirect section="reminders" />;
}
