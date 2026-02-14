import WidgetMarketplace from "@/components/widget/marketplace/WidgetMarketplace";
import { apiServer } from "@/lib/api-server-client";

export default async function MarketplacePage() {
  const widgetsRes = await apiServer.widgets.getAllWidgets();
  const widgets = widgetsRes.status === 200 ? widgetsRes.body : [];
  return <WidgetMarketplace initialWidgets={widgets} />;
}
