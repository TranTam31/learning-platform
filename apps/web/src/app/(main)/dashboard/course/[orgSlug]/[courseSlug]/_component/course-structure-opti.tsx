import React, {
  useState,
  useTransition,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
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
  loadNodeChildren,
} from "@/server/courses";
import {
  AddNodeInputType,
  CourseUI,
  LessonNodeType,
  LessonNodeUI,
} from "@/types/course";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateClassForm } from "@/components/forms/create-class-form";
import {
  transformToUINode,
  findNodeById,
  updateNodeInTree,
  removeNodeFromTree,
  addChildToNode,
} from "@/components/course-structure/utils/course-structure-utiles";

interface CourseStructureManagerProps {
  initialCourse: CourseUI;
}

const CourseStructureManager: React.FC<CourseStructureManagerProps> = ({
  initialCourse,
}) => {
  const [course, setCourse] = useState<CourseUI>(initialCourse);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialCourse.rootLessonNodeId
  );

  // ✅ UI state: Tracks which nodes are visually expanded
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(
      initialCourse.rootLessonNodeId ? [initialCourse.rootLessonNodeId] : []
    )
  );

  // ✅ Data state: Tracks which nodes have loaded their children from server
  const [loadedNodeIds, setLoadedNodeIds] = useState<Set<string>>(
    new Set(
      initialCourse.rootLessonNodeId ? [initialCourse.rootLessonNodeId] : []
    )
  );

  // ✅ Loading state: Tracks which nodes are currently loading
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set());

  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Track pending requests to prevent duplicate fetches
  const pendingRequestsRef = useRef<Map<string, boolean>>(new Map());

  // Memoized selected node - derived from course tree
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !course.rootLessonNode) return null;
    return findNodeById(course.rootLessonNode, selectedNodeId);
  }, [selectedNodeId, course.rootLessonNode]);

  // Memoized root node for rendering
  const rootNode = useMemo(
    () => course.rootLessonNode,
    [course.rootLessonNode]
  );

  // ✅ Generic function to load children for ANY node (module, lesson, course)
  const fetchAndLoadChildren = useCallback(
    async (nodeId: string): Promise<{ success: boolean }> => {
      // Already loaded? Skip
      if (loadedNodeIds.has(nodeId)) {
        return { success: true };
      }

      // Already loading? Skip
      if (pendingRequestsRef.current.has(nodeId)) {
        return { success: false };
      }

      pendingRequestsRef.current.set(nodeId, true);
      setLoadingNodeIds((prev) => new Set([...prev, nodeId]));

      try {
        const result = await loadNodeChildren(nodeId);

        if (!pendingRequestsRef.current.has(nodeId)) {
          // Request was cancelled
          return { success: false };
        }

        if (result.success && result.data) {
          const childrenUI: LessonNodeUI[] = result.data.map(transformToUINode);

          setCourse((prev) => {
            if (!prev.rootLessonNode) return prev;

            const updatedRoot = updateNodeInTree(
              prev.rootLessonNode,
              nodeId,
              (node) => ({
                ...node,
                children: childrenUI,
                childrenLoaded: true,
              })
            );

            return {
              ...prev,
              rootLessonNode: updatedRoot,
            };
          });

          // Mark as loaded
          setLoadedNodeIds((prev) => new Set([...prev, nodeId]));
          return { success: true };
        }

        return { success: false };
      } catch (error) {
        console.error("Error loading children:", error);
        alert("Có lỗi xảy ra khi load children");
        return { success: false };
      } finally {
        pendingRequestsRef.current.delete(nodeId);
        setLoadingNodeIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      }
    },
    [loadedNodeIds]
  );

  // Toggle expand/collapse
  const toggleNodeExpanded = useCallback(
    async (node: LessonNodeUI) => {
      const nodeId = node.id;
      const isCurrentlyExpanded = expandedNodeIds.has(nodeId);

      if (isCurrentlyExpanded) {
        // Collapse - just update UI
        setExpandedNodeIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
        return;
      }

      // Expand - update UI first for instant feedback
      setExpandedNodeIds((prev) => new Set([...prev, nodeId]));

      // Load children if needed and has children
      const hasChildren = node._count.children > 0;
      if (hasChildren) {
        await fetchAndLoadChildren(nodeId);
      }
    },
    [expandedNodeIds, fetchAndLoadChildren]
  );

  // Auto-load children when lesson is selected (for homework display)
  useEffect(() => {
    if (
      selectedNode &&
      selectedNode.type === LessonNodeType.lesson &&
      !loadedNodeIds.has(selectedNode.id) &&
      selectedNode._count.children > 0
    ) {
      fetchAndLoadChildren(selectedNode.id);
    }
  }, [selectedNode, loadedNodeIds, fetchAndLoadChildren]);

  // Add new node
  const handleAddNode = useCallback(
    async (type: AddNodeInputType) => {
      if (!selectedNode) {
        alert("Vui lòng chọn một node trước");
        return;
      }

      // Validation
      if (type === LessonNodeType.homework) {
        if (selectedNode.type !== LessonNodeType.lesson) {
          alert("Chỉ có thể thêm Homework vào Lesson!");
          return;
        }
      } else {
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

          // Update course tree with new node
          setCourse((prev) => {
            if (!prev.rootLessonNode) return prev;

            const updatedRoot = addChildToNode(
              prev.rootLessonNode,
              selectedNode.id,
              newNode
            );

            return {
              ...prev,
              rootLessonNode: updatedRoot,
            };
          });

          // Expand parent if it's not homework (homework doesn't show in tree)
          if (type !== LessonNodeType.homework) {
            setExpandedNodeIds((prev) => new Set([...prev, selectedNode.id]));
          }

          // Mark parent as loaded since we just added a child
          setLoadedNodeIds((prev) => new Set([...prev, selectedNode.id]));
        } else {
          alert(result.error || "Có lỗi xảy ra khi thêm node");
        }

        setLoadingAction(null);
      });
    },
    [selectedNode, course.id]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      if (nodeId === course.rootLessonNodeId) {
        alert("Không thể xóa root course!");
        return;
      }

      if (
        !confirm(
          "Bạn có chắc muốn xóa node này? Tất cả children cũng sẽ bị xóa."
        )
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
          // Remove from tree
          setCourse((prev) => {
            if (!prev.rootLessonNode) return prev;

            const updatedRoot = removeNodeFromTree(prev.rootLessonNode, nodeId);

            return {
              ...prev,
              rootLessonNode: updatedRoot,
            };
          });

          // Update selected node if it was deleted
          if (selectedNodeId === nodeId) {
            setSelectedNodeId(course.rootLessonNodeId);
          }

          // Clean up states
          setExpandedNodeIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(nodeId);
            return newSet;
          });

          setLoadedNodeIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(nodeId);
            return newSet;
          });
        } else {
          alert(result.error || "Có lỗi xảy ra khi xóa node");
        }

        setLoadingAction(null);
      });
    },
    [course.id, course.rootLessonNodeId, selectedNodeId]
  );

  // Get icon for node type
  const getNodeIcon = useCallback((node: LessonNodeUI, isExpanded: boolean) => {
    switch (node.type) {
      case LessonNodeType.lesson:
        return <File className="w-4 h-4 text-blue-500" />;
      case LessonNodeType.course:
        return <BookOpen className="w-4 h-4 text-purple-500" />;
      case LessonNodeType.homework:
        return <File className="w-4 h-4 text-orange-500" />;
      default:
        return isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" />
        );
    }
  }, []);

  // Render tree node recursively
  const renderNode = useCallback(
    (node: LessonNodeUI, level: number = 0): React.ReactNode => {
      // Don't show homework in tree (they're shown in detail panel)
      if (node.type === LessonNodeType.homework) return null;

      const isExpanded = expandedNodeIds.has(node.id);
      const isSelected = selectedNodeId === node.id;
      const hasChildren = node._count.children > 0;
      const isDeleting = loadingAction === `delete-${node.id}`;
      const isLoading = loadingNodeIds.has(node.id);
      const isLoaded = loadedNodeIds.has(node.id);

      return (
        <div key={node.id} className="group">
          <div
            className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-100 cursor-pointer ${
              isSelected ? "bg-blue-100 border-l-2 border-blue-500" : ""
            } ${isDeleting ? "opacity-50" : ""}`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
            onClick={() => setSelectedNodeId(node.id)}
          >
            <div className="flex items-center gap-1 flex-1">
              {hasChildren && node.type !== LessonNodeType.lesson ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNodeExpanded(node);
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded"
                  disabled={isDeleting || isLoading}
                >
                  {isLoading ? (
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
              {hasChildren && !isLoaded && (
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
          {isExpanded && node.children && node.children.length > 0 && (
            <div>
              {node.children.map((child) => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    },
    [
      expandedNodeIds,
      selectedNodeId,
      loadingAction,
      loadingNodeIds,
      loadedNodeIds,
      isPending,
      toggleNodeExpanded,
      handleDeleteNode,
      getNodeIcon,
    ]
  );

  const isAddingModule = loadingAction === "add-MODULE";
  const isAddingLesson = loadingAction === "add-LESSON";
  const canAddToSelected =
    selectedNode && selectedNode.type !== LessonNodeType.lesson;

  // Get homework nodes for selected lesson
  const homeworkNodes = useMemo(() => {
    if (selectedNode && selectedNode.type === LessonNodeType.lesson) {
      return (selectedNode.children || []).filter(
        (child) => child.type === LessonNodeType.homework
      );
    }
    return [];
  }, [selectedNode]);

  const isLoadingHomework =
    selectedNode &&
    selectedNode.type === LessonNodeType.lesson &&
    loadingNodeIds.has(selectedNode.id);

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
          <div className="flex gap-2 w-full">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Class</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Class</DialogTitle>
                </DialogHeader>
                <CreateClassForm
                  courseId={course.id}
                  organizationId={course.organizationId}
                  onSuccess={() => {}}
                />
              </DialogContent>
            </Dialog>

            <div className="flex-1 flex gap-2">
              <button
                onClick={() => handleAddNode(LessonNodeType.module)}
                disabled={!canAddToSelected || isPending}
                className="flex-1 flex items-center justify-center p-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                title="Add Module"
              >
                {isAddingModule ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Module</span>
                  </div>
                )}
              </button>

              <button
                onClick={() => handleAddNode(LessonNodeType.lesson)}
                disabled={!canAddToSelected || isPending}
                className="flex-1 flex items-center justify-center p-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                title="Add Lesson"
              >
                {isAddingLesson ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Lesson</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rootNode && renderNode(rootNode)}
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
                      {loadedNodeIds.has(selectedNode.id)
                        ? selectedNode.children?.length || 0
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

              {/* Homework Section */}
              {selectedNode.type === LessonNodeType.lesson && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Homework
                    </h3>
                    <button
                      onClick={() => handleAddNode(LessonNodeType.homework)}
                      disabled={isPending}
                      className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:bg-gray-300"
                    >
                      + Add Homework
                    </button>
                  </div>

                  {isLoadingHomework ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : homeworkNodes.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Chưa có homework
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {homeworkNodes.map((hw) => (
                        <div
                          key={hw.id}
                          className="flex items-center gap-2 p-2 bg-orange-50 rounded group"
                        >
                          <File className="w-4 h-4 text-orange-500" />
                          <span className="text-sm flex-1">{hw.title}</span>
                          <button
                            onClick={() => handleDeleteNode(hw.id)}
                            className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Chọn một node để xem chi tiết</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseStructureManager;
