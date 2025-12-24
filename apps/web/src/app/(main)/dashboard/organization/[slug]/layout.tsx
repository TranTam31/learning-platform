import { OrgNav } from "@/components/organization/organization-nav";
import { OrganizationProvider } from "@/components/providers/org-provider";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

type Params = Promise<{ slug: string }>;

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { slug } = await params;
  let organization;
  try {
    await auth.api.setActiveOrganization({
      body: { organizationSlug: slug },
      headers: await headers(),
    });
    organization = await auth.api.getFullOrganization({
      headers: await headers(),
    });
  } catch {
    redirect("/dashboard");
  }

  if (!organization) notFound();

  return (
    <OrganizationProvider organization={organization}>
      <div className="flex flex-col gap-4 py-6 px-4 max-w-4xl mx-auto w-full">
        <h1 className="font-bold text-2xl">{organization.name}</h1>
        <OrgNav slug={slug} />
        <div className="mt-2">{children}</div>
      </div>
    </OrganizationProvider>
  );
}
