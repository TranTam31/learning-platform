import React, { useState, useTransition } from "react";
import { EditorProps } from "@/types/course-structure";
import { LessonNodeType } from "@/types/course";
import { Plus, Loader2 } from "lucide-react";
import HomeworkList from "../homework-list";

const AdminEditor: React.FC<EditorProps> = ({ context }) => {
  const { selectedNode, onNodeAdd, onNodeDelete } = context;
  const [isPending, startTransition] = useTransition();
  const [isAddingHomework, setIsAddingHomework] = useState(false);

  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Chọn một node để xem chi tiết</p>
      </div>
    );
  }

  const handleAddHomework = () => {
    if (!onNodeAdd) return;
    setIsAddingHomework(true);
    startTransition(async () => {
      await onNodeAdd(LessonNodeType.homework, selectedNode.id);
      setIsAddingHomework(false);
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Basic Info */}
        <div className="mb-4">
          <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full mb-2">
            {selectedNode.type}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedNode.title}
          </h1>
          <p className="text-sm text-gray-500">ID: {selectedNode.id}</p>
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

        {/* Metadata */}
        <div className="border-t border-gray-200 mt-4 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Parent ID:</span>
              <span className="text-gray-900">
                {selectedNode.parentId || "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Children:</span>
              <span className="text-gray-900">
                {selectedNode.childrenLoaded
                  ? selectedNode.children.length
                  : `${selectedNode._count.children} (not loaded)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order:</span>
              <span className="text-gray-900">
                {selectedNode.order ?? "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Homework Section - CHỈ cho LESSON */}
        {selectedNode.type === LessonNodeType.lesson && (
          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Course Homework
              </h3>
              <button
                onClick={handleAddHomework}
                disabled={isAddingHomework || isPending}
                className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:bg-gray-300 flex items-center gap-1"
              >
                {isAddingHomework ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Add Homework
              </button>
            </div>
            <HomeworkList
              lessonNode={selectedNode}
              onDelete={(nodeId) => onNodeDelete?.(nodeId)}
            />
          </div>
        )}

        {/* Editor Placeholder */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Admin Mode:</strong> Bạn có thể chỉnh sửa toàn bộ course
            structure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminEditor;
