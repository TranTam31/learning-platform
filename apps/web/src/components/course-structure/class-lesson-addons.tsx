import React from "react";
import { File, Trash2 } from "lucide-react";
import {
  createClassLessonNode,
  loadClassLessonNodes,
  deleteClassLessonNode,
  getLessonHomeworkTemplate,
} from "@/server/classes";
import { ClassAddonType } from "@/types/class";
import { LessonNodeUI } from "@/types/course";

interface ClassLessonAddonsProps {
  lessonNode: LessonNodeUI;
  classId: string;
}

const ClassLessonAddons: React.FC<ClassLessonAddonsProps> = ({
  lessonNode,
  classId,
}) => {
  const [addons, setAddons] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [homeworkTemplate, setHomeworkTemplate] = React.useState<any>(null);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load class lesson nodes
      const result = await loadClassLessonNodes(classId, lessonNode.id);
      if (result.success && result.data) {
        setAddons(result.data);
      }

      // Load homework template từ course
      const templateResult = await getLessonHomeworkTemplate(lessonNode.id);
      if (templateResult.success && templateResult.data) {
        setHomeworkTemplate(templateResult.data);
      }

      setLoading(false);
    };
    loadData();
  }, [lessonNode.id, classId]);

  const handleAddNode = async (type: ClassAddonType) => {
    const result = await createClassLessonNode({
      classId,
      lessonNodeId: lessonNode.id,
      type,
      content: {},
    });

    if (result.success && result.data) {
      setAddons((prev) => [...prev, result.data]);
      alert(`Thêm ${type} thành công!`);
    } else {
      alert(result.error || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (nodeId: string) => {
    if (!confirm("Bạn có chắc muốn xóa?")) return;

    const result = await deleteClassLessonNode({ nodeId, classId });
    if (result.success) {
      setAddons((prev) => prev.filter((a) => a.id !== nodeId));
    } else {
      alert(result.error || "Có lỗi xảy ra");
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;

  const lessonNotes = addons.filter(
    (a) => a.type === ClassAddonType.lesson_note
  );
  const homeworks = addons.filter((a) => a.type === ClassAddonType.homework);

  return (
    <div className="space-y-4">
      {/* Lesson Notes Section */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Lesson Notes</h3>
          <button
            onClick={() => handleAddNode(ClassAddonType.lesson_note)}
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            + Add Note
          </button>
        </div>
        {lessonNotes.length === 0 ? (
          <div className="text-sm text-gray-500">Chưa có lesson note</div>
        ) : (
          <div className="space-y-2">
            {lessonNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center gap-2 p-2 bg-blue-50 rounded group"
              >
                <File className="w-4 h-4 text-blue-500" />
                <span className="text-sm flex-1">Lesson Note</span>
                <span className="text-xs text-gray-500">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Homework Section */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Class Homework
            {homeworkTemplate && (
              <span className="ml-2 text-xs text-gray-500">
                (Template: {homeworkTemplate.title})
              </span>
            )}
          </h3>
          {homeworkTemplate && (
            <button
              onClick={() => handleAddNode(ClassAddonType.homework)}
              className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
            >
              + Assign Homework
            </button>
          )}
        </div>
        {!homeworkTemplate ? (
          <div className="text-sm text-gray-500">
            Lesson này chưa có homework template từ course
          </div>
        ) : homeworks.length === 0 ? (
          <div className="text-sm text-gray-500">Chưa giao homework</div>
        ) : (
          <div className="space-y-2">
            {homeworks.map((hw) => (
              <div
                key={hw.id}
                className="flex items-center gap-2 p-2 bg-orange-50 rounded group"
              >
                <File className="w-4 h-4 text-orange-500" />
                <span className="text-sm flex-1">Homework Assignment</span>
                <span className="text-xs text-gray-500">
                  {new Date(hw.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(hw.id)}
                  className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassLessonAddons;
