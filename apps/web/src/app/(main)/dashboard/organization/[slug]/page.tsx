import { getOrganizationBySlug } from "@/server/organizations";
import { getUsers } from "@/server/users";

type Params = Promise<{ slug: string }>;

export default async function OrganizationPage({ params }: { params: Params }) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);
  const users = await getUsers(organization?.id || "");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Courses</h1>
    </div>
  );
}
