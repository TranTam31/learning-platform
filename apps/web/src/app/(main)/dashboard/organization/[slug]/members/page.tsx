import MembersTable from "@/components/members-table";
import SearchUser from "@/components/organization/search-user";
import { getOrganizationBySlug } from "@/server/organizations";
import { getUsers } from "@/server/users";

type Params = Promise<{ slug: string }>;

export default async function MembersPage({ params }: { params: Params }) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);
  const users = await getUsers(organization?.id || "");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Members</h1>
      <MembersTable members={organization?.members || []} />
      <SearchUser organizationId={organization?.id || ""} />
    </div>
  );
}
