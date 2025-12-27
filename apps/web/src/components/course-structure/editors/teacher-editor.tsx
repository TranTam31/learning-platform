import React from "react";
import { EditorProps } from "@/types/course-structure";
import { LessonNodeType } from "@/types/course";
import ClassLessonAddons from "../class-lesson-addons";

const TeacherEditor: React.FC<EditorProps> = ({ context }) => {
  const { selectedNode, classId } = context;

  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Chọn một node để xem chi tiết</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Basic Info */}
        <div className="mb-4">
          <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full mb-2">
            {selectedNode.type}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedNode.title}
          </h1>
        </div>

        {/* Description */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Description
          </h3>
          <p className="text-gray-600">
            {(selectedNode.content as any)?.description || "Chưa có mô tả"}
          </p>
        </div>

        {/* Class Addons - chỉ hiển thị cho LESSON */}
        {selectedNode.type === LessonNodeType.lesson && classId && (
          <ClassLessonAddons lessonNode={selectedNode} classId={classId} />
        )}
      </div>
    </div>
  );
};

export default TeacherEditor;
