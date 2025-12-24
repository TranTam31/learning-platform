"use client";

import MembersTable from "@/components/members-table";
import SearchUser from "@/components/organization/search-user";
import { useOrganization } from "@/components/providers/org-context";

export default function MembersPage() {
  const organization = useOrganization();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Members</h1>
      <MembersTable members={organization?.members || []} />
      <SearchUser organizationId={organization?.id || ""} />
    </div>
  );
}
