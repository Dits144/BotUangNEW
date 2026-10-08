import { notFound } from "next/navigation";
import { FernlyDashboard } from "../components/fernly-dashboard";

export default function PreviewDashboardPage() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.DASHBOARD_VISUAL_PREVIEW !== "true"
  ) {
    notFound();
  }
  return <FernlyDashboard preview />;
}
