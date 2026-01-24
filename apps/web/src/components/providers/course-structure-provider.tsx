// contexts/CourseStructureContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useTransition,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  addLessonNode,
  deleteLessonNode,
  loadNodeChildren,
  updateLessonNode,
} from "@/server/courses";
import {
  loadClassAddons,
  getClassAddonCounts,
  addClassAddon,
  deleteClassAddon,
} from "@/server/class-addons";
import {
  AddNodeInputType,
  CourseUI,
  LessonNodeContent,
  LessonNodeType,
  LessonNodeUI,
} from "@/types/course";
import {
  transformToUINode,
  findNodeById,
  updateNodeInTree,
  removeNodeFromTree,
  addChildToNode,
} from "@/components/course-structure/utils/course-structure-utiles";

// ===== TYPES =====
interface CourseStructureContextValue {
  // ===== READ-ONLY CONFIG =====
  classId?: string;
  isAdmin: boolean;
  isMember: boolean;
  isTeacher: boolean;
  isStudent: boolean;

  // ===== COURSE DATA =====
  course: CourseUI;
  selectedNodeId: string | null;
  selectedNode: LessonNodeUI | null; // derived

  // ===== TREE UI STATES =====
  expandedNodeIds: Set<string>;
  loadedNodeIds: Set<string>;
  loadingNodeIds: Set<string>;

  // ===== CLASS ADDON STATES =====
  classAddons: Map<string, any[]>;
  addonCounts: Map<string, { lesson_note: number; homework_imp: number }>;
  expandedAddons: Set<string>;

  // ===== LOADING STATES =====
  isPending: boolean;
  loadingAction: string | null;

  // ===== TREE ACTIONS =====
  setSelectedNodeId: (id: string | null) => void;
  toggleNodeExpanded: (node: LessonNodeUI) => Promise<void>;
  handleAddNode: (
    type: AddNodeInputType,
    options?: AddNodeOptions,
  ) => Promise<void>;
  handleDeleteNode: (nodeId: string) => Promise<void>;

  // ===== CLASS ADDON ACTIONS =====
  handleToggleAddons: (nodeId: string) => Promise<void>;
  handleAddClassAddon: (
    nodeId: string,
    type: "lesson_note" | "homework_imp",
    content?: Record<string, any>,
  ) => Promise<void>;
  handleDeleteClassAddon: (
    nodeId: string,
    addonId: string,
    type: "lesson_note" | "homework_imp",
  ) => Promise<void>;
  getAddonsByType: (
    nodeId: string,
    type: "lesson_note" | "homework_imp",
  ) => any[];

  // ===== UPDATE ACTIONS =====
  handleUpdateNode: (
    nodeId: string,
    updates: { title?: string; content?: any },
  ) => Promise<void>;
  isUpdatingNode: string | null; // Track which node is being updated
}

export interface AddNodeOptions {
  title?: string;
  content?: LessonNodeContent;
}

const CourseStructureContext = createContext<
  CourseStructureContextValue | undefined
>(undefined);

// ===== PROVIDER =====
interface CourseStructureProviderProps {
  children: React.ReactNode;
  initialCourse: CourseUI;
  classId?: string;
  userRole: "org_admin" | "org_member" | "class_teacher" | "class_student";
}

export const CourseStructureProvider: React.FC<
  CourseStructureProviderProps
> = ({ children, initialCourse, classId, userRole }) => {
  // ===== READ-ONLY CONFIG (không bao giờ thay đổi) =====
  const config = {
    classId,
    isAdmin: userRole === "org_admin",
    isMember: userRole === "org_member",
    isTeacher: userRole === "class_teacher",
    isStudent: userRole === "class_student",
  };

  // ===== COURSE DATA =====
  const [course, setCourse] = useState<CourseUI>(initialCourse);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialCourse.rootLessonNodeId,
  );

  // ===== TREE UI STATES =====
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(
      initialCourse.rootLessonNodeId ? [initialCourse.rootLessonNodeId] : [],
    ),
  );
  const [loadedNodeIds, setLoadedNodeIds] = useState<Set<string>>(
    new Set(
      initialCourse.rootLessonNodeId ? [initialCourse.rootLessonNodeId] : [],
    ),
  );
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set());
  const [isUpdatingNode, setIsUpdatingNode] = useState<string | null>(null);

  // ===== CLASS ADDON STATES =====
  const [classAddons, setClassAddons] = useState<Map<string, any[]>>(new Map());
  const [addonCounts, setAddonCounts] = useState<
    Map<string, { lesson_note: number; homework_imp: number }>
  >(new Map());
  const [expandedAddons, setExpandedAddons] = useState<Set<string>>(new Set());

  // ===== LOADING STATES =====
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // ===== REFS (để tránh race conditions) =====
  const pendingRequestsRef = useRef<Map<string, boolean>>(new Map());

  // ===== DERIVED VALUES =====
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !course.rootLessonNode) return null;
    return findNodeById(course.rootLessonNode, selectedNodeId);
  }, [selectedNodeId, course.rootLessonNode]);

  // ===== HELPER: Load children với addon counts =====
  const fetchAndLoadChildren = useCallback(
    async (nodeId: string): Promise<{ success: boolean }> => {
      if (loadedNodeIds.has(nodeId)) {
        return { success: true };
      }

      if (pendingRequestsRef.current.has(nodeId)) {
        return { success: false };
      }

      pendingRequestsRef.current.set(nodeId, true);
      setLoadingNodeIds((prev) => new Set([...prev, nodeId]));

      try {
        const result = await loadNodeChildren(nodeId);

        if (!pendingRequestsRef.current.has(nodeId)) {
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
              }),
            );

            return {
              ...prev,
              rootLessonNode: updatedRoot,
            };
          });

          // Auto-load addon counts nếu là Class view
          if (config.classId && childrenUI.length > 0) {
            const childIds = childrenUI.map((c) => c.id);
            const countsResult = await getClassAddonCounts(
              childIds,
              config.classId,
            );

            if (countsResult.success && countsResult.data) {
              setAddonCounts((prev) => {
                const newMap = new Map(prev);
                Object.entries(countsResult.data).forEach(([id, counts]) => {
                  newMap.set(id, counts as any);
                });
                return newMap;
              });
            }
          }

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
    [loadedNodeIds, config.classId],
  );

  // ===== ACTION: Toggle expand/collapse =====
  const toggleNodeExpanded = useCallback(
    async (node: LessonNodeUI) => {
      const nodeId = node.id;
      const isCurrentlyExpanded = expandedNodeIds.has(nodeId);

      if (isCurrentlyExpanded) {
        setExpandedNodeIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
        return;
      }

      setExpandedNodeIds((prev) => new Set([...prev, nodeId]));

      const hasChildren = node._count.children > 0;
      if (hasChildren) {
        await fetchAndLoadChildren(nodeId);
      }
    },
    [expandedNodeIds, fetchAndLoadChildren],
  );

  // ===== ACTION: Add LessonNode =====
  const handleAddNode = useCallback(
    async (type: AddNodeInputType, options?: AddNodeOptions): Promise<void> => {
      if (!selectedNode) {
        alert("Vui lòng chọn một node trước");
        return;
      }

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
        const defaultTitle =
          type === LessonNodeType.module
            ? "New Module"
            : type === LessonNodeType.lesson
              ? "New Lesson"
              : "New Homework";

        const result = await addLessonNode({
          courseId: course.id,
          parentId: selectedNode.id,
          type: type,
          title: options?.title ?? defaultTitle,
          content: options?.content,
        });

        if (result.success && result.data) {
          const newNode: LessonNodeUI = transformToUINode(result.data);

          setCourse((prev) => {
            if (!prev.rootLessonNode) return prev;

            const updatedRoot = addChildToNode(
              prev.rootLessonNode,
              selectedNode.id,
              newNode,
            );

            return {
              ...prev,
              rootLessonNode: updatedRoot,
            };
          });

          if (type !== LessonNodeType.homework) {
            setExpandedNodeIds((prev) => new Set([...prev, selectedNode.id]));
          }

          setLoadedNodeIds((prev) => new Set([...prev, selectedNode.id]));
        } else {
          alert(result.error || "Có lỗi xảy ra khi thêm node");
        }

        setLoadingAction(null);
      });
    },
    [selectedNode, course.id],
  );

  // ===== ACTION: Delete LessonNode =====
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      if (nodeId === course.rootLessonNodeId) {
        alert("Không thể xóa root course!");
        return;
      }

      if (
        !confirm(
          "Bạn có chắc muốn xóa node này? Tất cả children cũng sẽ bị xóa.",
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
          setCourse((prev) => {
            if (!prev.rootLessonNode) return prev;

            const updatedRoot = removeNodeFromTree(prev.rootLessonNode, nodeId);

            return {
              ...prev,
              rootLessonNode: updatedRoot,
            };
          });

          if (selectedNodeId === nodeId) {
            setSelectedNodeId(course.rootLessonNodeId);
          }

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
    [course.id, course.rootLessonNodeId, selectedNodeId],
  );

  const handleUpdateNode = useCallback(
    async (nodeId: string, updates: { title?: string; content?: any }) => {
      setIsUpdatingNode(nodeId);

      try {
        const result = await updateLessonNode({
          nodeId,
          courseId: course.id,
          ...updates,
        });

        if (result.success && result.data) {
          // Update node trong tree
          setCourse((prev) => {
            if (!prev.rootLessonNode) return prev;

            const updatedRoot = updateNodeInTree(
              prev.rootLessonNode,
              nodeId,
              (node) => ({
                ...node,
                title: result.data.title,
                content: result.data.content,
                updatedAt: result.data.updatedAt,
              }),
            );

            return {
              ...prev,
              rootLessonNode: updatedRoot,
            };
          });
        } else {
          alert(result.error || "Có lỗi xảy ra khi cập nhật");
        }
      } catch (error) {
        console.error("Error updating node:", error);
        alert("Có lỗi xảy ra");
      } finally {
        setIsUpdatingNode(null);
      }
    },
    [course.id],
  );

  // ===== ACTION: Toggle addons =====
  const handleToggleAddons = useCallback(
    async (nodeId: string) => {
      if (!config.classId) return;

      const isExpanded = expandedAddons.has(nodeId);
      if (isExpanded) {
        setExpandedAddons((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
        return;
      }

      setLoadingNodeIds((prev) => new Set([...prev, `${nodeId}-addons`]));

      const result = await loadClassAddons(nodeId, config.classId);

      setLoadingNodeIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(`${nodeId}-addons`);
        return newSet;
      });

      if (result.success && result.data) {
        setClassAddons((prev) => new Map(prev).set(nodeId, result.data));
        setExpandedAddons((prev) => new Set([...prev, nodeId]));
      }
    },
    [config.classId, expandedAddons],
  );

  // ===== ACTION: Add class addon =====
  const handleAddClassAddon = useCallback(
    async (
      nodeId: string,
      type: "lesson_note" | "homework_imp",
      content?: Record<string, any>,
    ) => {
      if (!config.classId) return;

      setLoadingAction(`add-addon-${nodeId}`);

      startTransition(async () => {
        const result = await addClassAddon({
          lessonNodeId: nodeId,
          classId: config.classId!,
          type,
          content: content,
        });

        if (result.success && result.data) {
          setClassAddons((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(nodeId) || [];
            newMap.set(nodeId, [...existing, result.data]);
            return newMap;
          });

          setAddonCounts((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(nodeId) || {
              lesson_note: 0,
              homework_imp: 0,
            };
            newMap.set(nodeId, {
              ...current,
              [type]: current[type] + 1,
            });
            return newMap;
          });

          setExpandedAddons((prev) => new Set([...prev, nodeId]));
        } else {
          alert(result.error || "Có lỗi xảy ra");
        }

        setLoadingAction(null);
      });
    },
    [config.classId],
  );

  // ===== ACTION: Delete class addon =====
  const handleDeleteClassAddon = useCallback(
    async (
      nodeId: string,
      addonId: string,
      type: "lesson_note" | "homework_imp",
    ) => {
      if (!config.classId) return;

      if (!confirm("Bạn có chắc muốn xóa?")) return;

      setLoadingAction(`delete-addon-${addonId}`);

      startTransition(async () => {
        const result = await deleteClassAddon({
          addonId,
          classId: config.classId!,
        });

        if (result.success) {
          setClassAddons((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(nodeId) || [];
            newMap.set(
              nodeId,
              existing.filter((a) => a.id !== addonId),
            );
            return newMap;
          });

          setAddonCounts((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(nodeId) || {
              lesson_note: 0,
              homework_imp: 0,
            };
            newMap.set(nodeId, {
              ...current,
              [type]: Math.max(0, current[type] - 1),
            });
            return newMap;
          });
        } else {
          alert(result.error || "Có lỗi xảy ra");
        }

        setLoadingAction(null);
      });
    },
    [config.classId],
  );

  // ===== HELPER: Get addons by type =====
  const getAddonsByType = useCallback(
    (nodeId: string, type: "lesson_note" | "homework_imp") => {
      const allAddons = classAddons.get(nodeId) || [];
      return allAddons.filter((a) => a.type === type);
    },
    [classAddons],
  );

  // ===== AUTO-LOAD homework khi select lesson =====
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

  // ===== CONTEXT VALUE =====
  const value: CourseStructureContextValue = {
    // Config
    ...config,

    // Data
    course,
    selectedNodeId,
    selectedNode,

    // Tree UI states
    expandedNodeIds,
    loadedNodeIds,
    loadingNodeIds,

    // Class addon states
    classAddons,
    addonCounts,
    expandedAddons,

    // Loading states
    isPending,
    loadingAction,
    handleUpdateNode,
    isUpdatingNode,

    // Actions
    setSelectedNodeId,
    toggleNodeExpanded,
    handleAddNode,
    handleDeleteNode,
    handleToggleAddons,
    handleAddClassAddon,
    handleDeleteClassAddon,
    getAddonsByType,
  };

  return (
    <CourseStructureContext.Provider value={value}>
      {children}
    </CourseStructureContext.Provider>
  );
};

// ===== HOOK =====
export const useCourseStructure = () => {
  const context = useContext(CourseStructureContext);
  if (!context) {
    throw new Error(
      "useCourseStructure must be used within CourseStructureProvider",
    );
  }
  return context;
};

export const useOptionalCourseStructure = () => {
  return useContext(CourseStructureContext);
};
