import WidgetMarketplace from "@/components/widget/marketplace/WidgetMarketplace";
import { getAllWidgets } from "@/server/widgets";

export default async function MarketplacePage() {
  const widgets = await getAllWidgets();
  return <WidgetMarketplace initialWidgets={widgets} />;
}
