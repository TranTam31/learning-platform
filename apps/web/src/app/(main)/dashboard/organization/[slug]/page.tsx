import MembersTable from "@/components/members-table";
import SearchUser from "@/components/organization/search-user";
import { getOrganizationBySlug } from "@/server/organizations";
import { getUsers } from "@/server/users";

type Params = Promise<{ slug: string }>;

export default async function OrganizationPage({ params }: { params: Params }) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);
  const users = await getUsers(organization?.id || "");
  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="font-bold text-2xl">{organization?.name}</h1>
      <MembersTable members={organization?.members || []} />
      <SearchUser organizationId={organization?.id || ""} />
    </div>
  );
}

// lúc sửa file này, mình chết lặng??
// vì không hiểu sao lúc đầu nó y hệt, không sai 1 chữ, nhưng nó lại bị lỗi???
// thật sự, không thể hiểu nổi
