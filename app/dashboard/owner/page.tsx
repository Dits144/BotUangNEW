import type { Metadata } from "next";
import { OwnerDashboardPage } from "../../components/owner-dashboard-page";

export const metadata: Metadata = {
  title: "Owner SaaS",
};

export default function Page() {
  return <OwnerDashboardPage />;
}
