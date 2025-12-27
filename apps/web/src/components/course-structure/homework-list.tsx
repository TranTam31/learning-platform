import React from "react";
import { File, Trash2 } from "lucide-react";
import { loadLessonHomeworks } from "@/server/courses";
import { LessonNodeUI } from "@/types/course";

interface HomeworkListProps {
  lessonNode: LessonNodeUI;
  onDelete: (id: string) => void;
}

const HomeworkList: React.FC<HomeworkListProps> = ({
  lessonNode,
  onDelete,
}) => {
  const [homeworks, setHomeworks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadHomeworks = async () => {
      setLoading(true);
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
          className="flex items-center gap-2 p-2 bg-orange-50 rounded group"
        >
          <File className="w-4 h-4 text-orange-500" />
          <span className="text-sm flex-1">{hw.title}</span>
          <button
            onClick={() => onDelete(hw.id)}
            className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default HomeworkList;
