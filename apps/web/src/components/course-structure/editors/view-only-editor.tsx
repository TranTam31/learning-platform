import React from "react";
import { EditorProps } from "@/types/course-structure";
import { LessonNodeType } from "@/types/course";

const ViewOnlyEditor: React.FC<EditorProps> = ({ context }) => {
  const { selectedNode } = context;

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
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

        {/* Metadata - Đơn giản hơn cho view-only */}
        <div className="border-t border-gray-200 mt-4 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Course Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="text-gray-900 capitalize">
                {selectedNode.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sub-items:</span>
              <span className="text-gray-900">
                {selectedNode._count.children}
              </span>
            </div>
          </div>
        </div>

        {/* Homework List - Chỉ xem, không có nút xóa */}
        {selectedNode.type === LessonNodeType.lesson && (
          <div className="border-t border-gray-200 mt-4 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Course Homework
            </h3>
            <ViewOnlyHomeworkList lessonNode={selectedNode} />
          </div>
        )}

        {/* View-Only Notice */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>View-Only Mode:</strong> Bạn đang xem course structure. Liên
            hệ admin để chỉnh sửa nội dung.
          </p>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị homework (read-only)
const ViewOnlyHomeworkList: React.FC<{ lessonNode: any }> = ({
  lessonNode,
}) => {
  const [homeworks, setHomeworks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadHomeworks = async () => {
      setLoading(true);
      // Import dynamic để tránh circular dependency
      const { loadLessonHomeworks } = await import("@/server/courses");
      const result = await loadLessonHomeworks(lessonNode.id);
      if (result.success && result.data) {
        setHomeworks(result.data);
      }
      setLoading(false);
    };
    loadHomeworks();
  }, [lessonNode.id]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (homeworks.length === 0) {
    return <div className="text-sm text-gray-500">Chưa có homework</div>;
  }

  return (
    <div className="space-y-2">
      {homeworks.map((hw) => (
        <div
          key={hw.id}
          className="flex items-center gap-2 p-2 bg-orange-50 rounded"
        >
          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
          <span className="text-sm flex-1">{hw.title}</span>
        </div>
      ))}
    </div>
  );
};

export default ViewOnlyEditor;
