import { getAllWidgets } from "@/server/widgets";

export async function GET() {
  const widgets = await getAllWidgets();
  return Response.json(widgets);
}
