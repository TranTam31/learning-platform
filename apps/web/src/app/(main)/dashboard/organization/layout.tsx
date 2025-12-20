import { OrganizationSwitcher } from "@/components/organization/organization-switcher";
import { getOrganizations } from "@/server/organizations";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizations = await getOrganizations();
  return (
    <div className="mx-96 gap-4 py-4">
      {/* <OrganizationSwitcher organizations={organizations} /> */}
      {children}
    </div>
  );
}
