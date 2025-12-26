import React, { useState, useTransition } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  BookOpen,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  addLessonNode,
  deleteLessonNode,
  loadLessonHomeworks,
  loadNodeChildren,
} from "@/server/courses";
import {
  AddNodeInputType,
  CourseUI,
  CourseWithRootNode,
  LessonNodeType,
  LessonNodeUI,
  LessonNodeWithCount,
} from "@/types/course";

// Extended type cho UI state (thêm metadata cho lazy loading)

interface CourseStructureManagerProps {
  initialCourse: CourseUI;
}

// Đặt bên ngoài component chính
const HomeworkList: React.FC<{
  lessonNode: LessonNodeUI;
  onDelete: (id: string) => void;
}> = ({ lessonNode, onDelete }) => {
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

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (homeworks.length === 0)
    return <div className="text-sm text-gray-500">Chưa có homework</div>;

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

const CourseStructureManager: React.FC<CourseStructureManagerProps> = ({
  initialCourse,
}) => {
  console.log(initialCourse);
  const [course, setCourse] = useState<CourseUI>(initialCourse);
  const [selectedNode, setSelectedNode] = useState<LessonNodeUI | null>(
    initialCourse.rootLessonNode as LessonNodeUI | null
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(
      initialCourse.rootLessonNodeId ? [initialCourse.rootLessonNodeId] : []
    )
  );
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Helper: transform Prisma node to UI node
  const transformToUINode = (node: LessonNodeWithCount): LessonNodeUI => ({
    ...node,
    children: [],
    childrenLoaded: false,
  });

  // Toggle expand/collapse với lazy loading
  const toggleNode = async (node: LessonNodeUI) => {
    const nodeId = node.id;
    const isCurrentlyExpanded = expandedNodes.has(nodeId);

    // Nếu đang expanded thì collapse
    if (isCurrentlyExpanded) {
      setExpandedNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
      return;
    }

    // Nếu chưa load children và có children thì load
    const hasChildren = node._count.children > 0;
    if (!node.childrenLoaded && hasChildren) {
      setLoadingNodes((prev) => new Set([...prev, nodeId]));

      try {
        const result = await loadNodeChildren(nodeId);

        if (result.success && result.data) {
          const childrenUI: LessonNodeUI[] = result.data.map(transformToUINode);

          // Update node với children đã load
          setCourse((prev) => {
            const newCourse = { ...prev };
            if (!newCourse.rootLessonNode) return prev;

            const updateNodeWithChildren = (n: LessonNodeUI): LessonNodeUI => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  children: childrenUI,
                  childrenLoaded: true,
                };
              }
              return {
                ...n,
                children: n.children.map((child) =>
                  updateNodeWithChildren(child)
                ),
              };
            };

            const updatedRoot = updateNodeWithChildren(
              newCourse.rootLessonNode as LessonNodeUI
            );
            return {
              ...newCourse,
              rootLessonNode: updatedRoot,
            };
          });

          // Update selectedNode nếu đang select node này
          if (selectedNode?.id === nodeId) {
            setSelectedNode((prev) =>
              prev
                ? { ...prev, children: childrenUI, childrenLoaded: true }
                : null
            );
          }
        }
      } catch (error) {
        console.error("Error loading children:", error);
        alert("Có lỗi xảy ra khi load children");
      } finally {
        setLoadingNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      }
    }

    // Expand node
    setExpandedNodes((prev) => new Set([...prev, nodeId]));
  };

  // Add new node
  const handleAddNode = async (type: AddNodeInputType) => {
    if (!selectedNode) {
      alert("Vui lòng chọn một node trước");
      return;
    }

    // Validation theo type
    if (type === LessonNodeType.homework) {
      // HOMEWORK chỉ thêm vào LESSON
      if (selectedNode.type !== LessonNodeType.lesson) {
        alert("Chỉ có thể thêm Homework vào Lesson!");
        return;
      }
    } else {
      // MODULE/LESSON không thêm vào LESSON
      if (selectedNode.type === LessonNodeType.lesson) {
        alert("Không thể thêm Module/Lesson vào Lesson!");
        return;
      }
    }

    setLoadingAction(`add-${type}`);

    startTransition(async () => {
      const result = await addLessonNode({
        courseId: course.id,
        parentId: selectedNode.id,
        type: type,
        title:
          type === LessonNodeType.module
            ? "New Module"
            : type === LessonNodeType.lesson
              ? "New Lesson"
              : "New Homework",
      });

      if (result.success && result.data) {
        const newNode: LessonNodeUI = transformToUINode(result.data);

        // Chỉ update Course Structure tree nếu KHÔNG phải HOMEWORK
        if (type !== LessonNodeType.homework) {
          setCourse((prev) => {
            const newCourse = { ...prev };
            if (!newCourse.rootLessonNode) return prev;

            const updateNode = (node: LessonNodeUI): LessonNodeUI => {
              if (node.id === selectedNode.id) {
                return {
                  ...node,
                  children: [...node.children, newNode],
                  _count: {
                    children: node._count.children + 1,
                  },
                  childrenLoaded: true,
                };
              }
              return {
                ...node,
                children: node.children.map((child) => updateNode(child)),
              };
            };

            const updatedRoot = updateNode(
              newCourse.rootLessonNode as LessonNodeUI
            );
            return {
              ...newCourse,
              rootLessonNode: updatedRoot,
            };
          });

          // Update selectedNode
          if (selectedNode) {
            setSelectedNode((prev) =>
              prev
                ? {
                    ...prev,
                    children: [...prev.children, newNode],
                    _count: { children: prev._count.children + 1 },
                    childrenLoaded: true,
                  }
                : null
            );
          }

          setExpandedNodes((prev) => new Set([...prev, selectedNode.id]));
        } else {
          // HOMEWORK thêm thành công - refresh homework list bằng cách trigger re-render
          // HomeworkList component sẽ tự reload
          alert("Thêm homework thành công!");
        }
      } else {
        alert(result.error || "Có lỗi xảy ra khi thêm node");
      }

      setLoadingAction(null);
    });
  };

  // Delete node
  const handleDeleteNode = async (nodeId: string) => {
    if (nodeId === course.rootLessonNodeId) {
      alert("Không thể xóa root course!");
      return;
    }

    if (
      !confirm("Bạn có chắc muốn xóa node này? Tất cả children cũng sẽ bị xóa.")
    ) {
      return;
    }

    setLoadingAction(`delete-${nodeId}`);

    startTransition(async () => {
      const result = await deleteLessonNode({
        nodeId,
        courseId: course.id,
      });

      if (result.success) {
        setCourse((prev) => {
          const newCourse = { ...prev };
          if (!newCourse.rootLessonNode) return prev;

          const removeNode = (node: LessonNodeUI): LessonNodeUI => {
            const updatedChildren = node.children
              .filter((child) => child.id !== nodeId)
              .map((child) => removeNode(child));

            return {
              ...node,
              children: updatedChildren,
              _count: {
                children: updatedChildren.length,
              },
            };
          };

          const updatedRoot = removeNode(
            newCourse.rootLessonNode as LessonNodeUI
          );
          return {
            ...newCourse,
            rootLessonNode: updatedRoot,
          };
        });

        if (selectedNode?.id === nodeId) {
          setSelectedNode(course.rootLessonNode as LessonNodeUI | null);
        }
      } else {
        alert(result.error || "Có lỗi xảy ra khi xóa node");
      }

      setLoadingAction(null);
    });
  };

  // Get icon for node type
  const getNodeIcon = (node: LessonNodeUI, isExpanded: boolean) => {
    if (node.type === LessonNodeType.lesson) {
      return <File className="w-4 h-4 text-blue-500" />;
    }
    if (node.type === LessonNodeType.course) {
      return <BookOpen className="w-4 h-4 text-purple-500" />;
    }
    return isExpanded ? (
      <FolderOpen className="w-4 h-4 text-yellow-500" />
    ) : (
      <Folder className="w-4 h-4 text-yellow-500" />
    );
  };

  // Render tree node
  const renderNode = (node: LessonNodeUI, level: number = 0) => {
    console.log(node);
    if (node.type === LessonNodeType.homework) return null;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node._count.children > 0;
    const isDeleting = loadingAction === `delete-${node.id}`;
    const isLoadingChildren = loadingNodes.has(node.id);

    return (
      <div key={node.id} className="group">
        <div
          className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-100 cursor-pointer ${
            isSelected ? "bg-blue-100 border-l-2 border-blue-500" : ""
          } ${isDeleting ? "opacity-50" : ""}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => setSelectedNode(node)}
        >
          <div className="flex items-center gap-1 flex-1">
            {hasChildren && node.type !== LessonNodeType.lesson ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node);
                }}
                className="p-0.5 hover:bg-gray-200 rounded"
                disabled={isDeleting || isLoadingChildren}
              >
                {isLoadingChildren ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                ) : isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {getNodeIcon(node, isExpanded)}
            <span className="text-sm">{node.title}</span>
            {hasChildren && !node.childrenLoaded && (
              <span className="text-xs text-gray-400 ml-1">
                ({node._count.children})
              </span>
            )}
          </div>
          {node.type !== LessonNodeType.course && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.id);
              }}
              disabled={isDeleting || isPending}
              className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 text-red-500 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 text-red-500" />
              )}
            </button>
          )}
        </div>
        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const isAddingModule = loadingAction === "add-MODULE";
  const isAddingLesson = loadingAction === "add-LESSON";
  const canAddToSelected =
    selectedNode && selectedNode.type !== LessonNodeType.lesson;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Course Structure */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Course Structure
            </h2>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-700">{course.name}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAddNode(LessonNodeType.module)}
              disabled={!canAddToSelected || isPending}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isAddingModule ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Module
            </button>
            <button
              onClick={() => handleAddNode(LessonNodeType.lesson)}
              disabled={!canAddToSelected || isPending}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isAddingLesson ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Lesson
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {course.rootLessonNode &&
            renderNode(course.rootLessonNode as LessonNodeUI)}
        </div>
      </div>

      {/* Course Editor */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedNode ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full mb-2">
                  {selectedNode.type}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedNode.title}
                </h1>
                <p className="text-sm text-gray-500">ID: {selectedNode.id}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Description
                </h3>
                <p className="text-gray-600">
                  {(selectedNode.content as any)?.description ||
                    "Chưa có mô tả"}
                </p>
              </div>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Metadata
                </h3>
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

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Editor placeholder:</strong> Phần editor để chỉnh sửa
                  nội dung chi tiết sẽ được thêm vào sau.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Chọn một node để xem chi tiết</p>
          </div>
        )}
        {/* Homework Section */}
        {selectedNode?.type === LessonNodeType.lesson && (
          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Homework</h3>
              <button
                onClick={() => handleAddNode(LessonNodeType.homework)}
                disabled={isPending}
                className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:bg-gray-300"
              >
                + Add Homework
              </button>
            </div>
            <HomeworkList
              lessonNode={selectedNode}
              onDelete={handleDeleteNode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseStructureManager;
