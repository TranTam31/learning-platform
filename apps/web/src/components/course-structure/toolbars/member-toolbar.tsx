import React from "react";
import { Plus, BookOpen } from "lucide-react";
import { ToolbarProps } from "@/types/course-structure";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateClassForm } from "@/components/forms/create-class-form";

const MemberToolbar: React.FC<ToolbarProps> = ({ context }) => {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-purple-500" />
        <span className="font-medium text-gray-700">{context.course.name}</span>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create Class
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Create Class</DialogTitle>
          <CreateClassForm
            courseId={context.course.id}
            organizationId={context.course.organizationId}
            onSuccess={() => {}}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MemberToolbar;
