"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { removeMember } from "@/server/members";
import { Button } from "./ui/button";

export default function MembersTableAction({ memberId }: { memberId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRemoveMember = async () => {
    try {
      setIsLoading(true);
      await removeMember(memberId);
      setIsLoading(false);
      toast.success("Success");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Fail");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      disabled={isLoading}
      onClick={handleRemoveMember}
      size="sm"
      variant="destructive"
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
    </Button>
  );
}
