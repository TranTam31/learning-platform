import { OrgNav } from "@/components/organization/organization-nav";
import { getOrganizationBySlug } from "@/server/organizations";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 py-6 px-4 max-w-4xl mx-auto w-full">
      <h1 className="font-bold text-2xl">{organization.name}</h1>

      <OrgNav slug={slug} />

      <div className="mt-2">{children}</div>
    </div>
  );
}
