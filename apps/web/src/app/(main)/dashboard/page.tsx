import Link from "next/link";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";

export default async function Dashboard() {
  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });

  return (
    <div className="flex flex-col gap-4 py-14 px-4 max-w-4xl mx-auto w-full">
      {/* Header Section: Tiêu đề và Nút Create nằm cùng hàng */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl text-gray-800">Your Organizations</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to get started.
              </DialogDescription>
            </DialogHeader>
            <CreateOrganizationForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Organizations List: Xếp hàng ngang, có shadow và hiệu ứng hover */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/dashboard/organization/${organization.slug}`}
            className="group flex items-center justify-between px-4 py-3 bg-white border rounded-md shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/50 hover:-translate-y-1"
          >
            <span className="font-medium text-sm text-gray-700">
              {organization.name}
            </span>

            {/* Icon mũi tên phía bên phải */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 group-hover:translate-x-1 transition-all"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
