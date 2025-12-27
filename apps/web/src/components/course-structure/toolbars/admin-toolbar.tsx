import React from "react";
import { Plus, Loader2, BookOpen } from "lucide-react";
import { ToolbarProps } from "@/types/course-structure";
import { LessonNodeType } from "@/types/course";

const AdminToolbar: React.FC<ToolbarProps> = ({
  context,
  canAddToSelected,
  isPending,
}) => {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-purple-500" />
        <span className="font-medium text-gray-700">{context.course.name}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() =>
            context.onNodeAdd?.(LessonNodeType.module, context.selectedNode!.id)
          }
          disabled={!canAddToSelected || isPending}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          <Plus className="w-4 h-4" />
          Add Module
        </button>

        <button
          onClick={() =>
            context.onNodeAdd?.(LessonNodeType.lesson, context.selectedNode!.id)
          }
          disabled={!canAddToSelected || isPending}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:bg-gray-300"
        >
          <Plus className="w-4 h-4" />
          Add Lesson
        </button>
      </div>
    </>
  );
};

export default AdminToolbar;
