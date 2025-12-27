import React from "react";
import { BookOpen } from "lucide-react";
import { ToolbarProps } from "@/types/course-structure";

const TeacherToolbar: React.FC<ToolbarProps> = ({ context }) => {
  return (
    <div className="flex items-center gap-2">
      <BookOpen className="w-5 h-5 text-purple-500" />
      <div>
        <span className="font-medium text-gray-700 block">
          {context.course.name}
        </span>
        <span className="text-xs text-gray-500">Teacher View</span>
      </div>
    </div>
  );
};

export default TeacherToolbar;
