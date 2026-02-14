"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import các component Select của Shadcn
import { api } from "@/lib/api-client";
import { type ClassRole } from "@repo/db";
import { useRouter } from "next/navigation";
import { useClass } from "../providers/class-context";

const emailSchema = z.string().email("Email không đúng định dạng");

export default function ClassSearchUser() {
  const { classCourse } = useClass();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClassRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<any | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setFoundUser(null);

    if (value === "") {
      setError(null);
      return;
    }

    const result = emailSchema.safeParse(value);
    if (!result.success) {
      setError(result.error.errors[0].message);
    } else {
      setError(null);
    }
  };

  const handleSearch = () => {
    if (error || !email) return;

    startTransition(async () => {
      try {
        const res = await api.users.findByEmail({ query: { email } });
        const user = res.status === 200 ? res.body : null;
        setFoundUser(user);

        if (!user) {
          toast.error("Not found any user with this email");
        }
      } catch (err) {
        toast.error("Something went wrong");
      }
    });
  };

  const handleAddUser = async (
    userId: string,
    role: ClassRole,
    classId: string,
  ) => {
    try {
      setIsLoading(true);
      const res = await api.classes.addClassMember({
        params: { classId },
        body: { userId, role },
      });
      setIsLoading(false);
      if (res.status !== 201) {
        throw new Error((res.body as any).error || "Failed to add member");
      }
      router.refresh();
      toast.success(`Đã thêm thành công với quyền ${role}`);
    } catch (error: any) {
      setIsLoading(false);
      toast.error(error.message || "Đã có lỗi xảy ra khi thêm thành viên");
    }
  };

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle>Add member to your class</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field data-invalid={!!error}>
          <FieldLabel>Email search</FieldLabel>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={handleChange}
              placeholder="your@gmail.com"
            />
            <Button
              type="button"
              onClick={handleSearch}
              disabled={!!error || !email || isPending}
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </Field>

        {foundUser && (
          <div className="p-4 border rounded bg-muted animate-in fade-in slide-in-from-bottom-2">
            <p className="font-bold">{foundUser.name}</p>
            <p className="text-sm text-muted-foreground">{foundUser.email}</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {foundUser && (
          <div className="flex w-full gap-2">
            {/* Phần chọn Role */}
            <Select
              value={role}
              onValueChange={(value) => setRole(value as ClassRole)}
            >
              <SelectTrigger className="w-32.5">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>

            {/* Nút thêm User */}
            <Button
              className="flex-1"
              onClick={() => handleAddUser(foundUser?.id, role, classCourse.id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" /> Add user
                </>
              )}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
