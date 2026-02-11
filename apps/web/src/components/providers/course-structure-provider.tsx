import React, {
  createContext,
  useContext,
  useState,
  useTransition,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  addLessonNode,
  deleteLessonNode,
  getStudentHomeworkStatusByClass,
  updateLessonNode,
} from "@/server/courses";
import {
  loadClassLessonNode,
  getClassLessonNodeCounts,
  addClassLessonNode,
  deleteClassLessonNode,
} from "@/server/class-lesson-node";
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
import {
  buildHomeworkCountsMap,
  HomeworkCountResult,
} from "../course-structure/utils/homework-count-utils";

// ===== TYPES =====
interface CourseStructureContextValue {
  // Config
  classId?: string;
  isAdmin: boolean;
  isMember: boolean;
  isTeacher: boolean;
  isStudent: boolean;

  // Course data
  course: CourseUI;
  selectedNodeId: string | null;
  selectedNode: LessonNodeUI | null;

  // Tree UI states (ĐƠN GIẢN HƠN - không cần loadedNodeIds, loadingNodeIds)
  expandedNodeIds: Set<string>;

  // Class lesson node states
  classLessonNodes: Map<string, any[]>;
  classLessonNodeCounts: Map<
    string,
    { lesson_note: number; homework_imp: number }
  >;
  expandedClassLessonNodes: Set<string>;

  // Homework counts (student only)
  homeworkCountsMap: Map<string, HomeworkCountResult>;
  getHomeworkCounts: (nodeId: string) => HomeworkCountResult;

  // Loading states
  isPending: boolean;
  loadingAction: string | null;
  isInitialLoading: boolean; // NEW: Track initial tree load
  loadingClassLessonNodeIds: Set<string>; // NEW: Separate loading state

  // Actions
  setSelectedNodeId: (id: string | null) => void;
  toggleNodeExpanded: (node: LessonNodeUI) => void; // Đơn giản hơn - không async
  handleAddNode: (
    type: AddNodeInputType,
    options?: AddNodeOptions,
  ) => Promise<void>;
  handleDeleteNode: (nodeId: string) => Promise<void>;
  handleUpdateNode: (
    nodeId: string,
    updates: { title?: string; content?: any },
  ) => Promise<void>;
  isUpdatingNode: string | null;

  // Class lesson node actions
  handleToggleClassLessonNodes: (nodeId: string) => Promise<void>;
  handleAddClassLessonNode: (
    nodeId: string,
    type: "lesson_note" | "homework_imp",
    content?: Record<string, any>,
  ) => Promise<void>;
  handleDeleteClassLessonNode: (
    nodeId: string,
    classLessonNodeId: string,
    type: "lesson_note" | "homework_imp",
  ) => Promise<void>;
  getClassLessonNodesByType: (
    nodeId: string,
    type: "lesson_note" | "homework_imp",
  ) => any[];
  studentSubmissionStatus: Map<
    string,
    {
      hasSubmitted: boolean;
      submittedAt: string | null;
      evaluation?: {
        isCorrect: boolean;
        score: number;
        maxScore: number;
      };
    }
  >;
  updateAssignmentStatus: (assignmentId: string) => Promise<void>;
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
  userRole:
    | "org_admin"
    | "org_member"
    | "class_teacher"
    | "class_student"
    | "class_owner";
}

export const CourseStructureProvider: React.FC<
  CourseStructureProviderProps
> = ({ children, initialCourse, classId, userRole }) => {
  // ===== CONFIG =====
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
  const [isInitialLoading, setIsInitialLoading] = useState(
    // Chỉ loading nếu là student (cần load homework counts)
    config.isStudent && !!classId,
  );

  // ===== TREE UI STATES (ĐƠN GIẢN HƠN) =====
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(
      initialCourse.rootLessonNodeId ? [initialCourse.rootLessonNodeId] : [],
    ),
  );

  const [isUpdatingNode, setIsUpdatingNode] = useState<string | null>(null);

  // ===== CLASS LESSON NODE STATES =====
  const [classLessonNodes, setClassLessonNodes] = useState<Map<string, any[]>>(
    new Map(),
  );
  const [classLessonNodeCounts, setClassLessonNodeCounts] = useState<
    Map<string, { lesson_note: number; homework_imp: number }>
  >(new Map());
  const [expandedClassLessonNodes, setExpandedClassLessonNodes] = useState<
    Set<string>
  >(new Set());
  const [loadingClassLessonNodeIds, setLoadingClassLessonNodeIds] = useState<
    Set<string>
  >(new Set());

  // ===== HOMEWORK COUNTS (STUDENT) =====
  const [homeworkCountsMap, setHomeworkCountsMap] = useState<
    Map<string, HomeworkCountResult>
  >(new Map());

  const [studentSubmissionStatus, setStudentSubmissionStatus] = useState<
    Map<
      string,
      {
        hasSubmitted: boolean;
        submittedAt: string | null;
        evaluation?: {
          isCorrect: boolean;
          score: number;
          maxScore: number;
        };
      }
    >
  >(new Map());

  // ===== LOADING STATES =====
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // ===== DERIVED VALUES =====
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !course.rootLessonNode) return null;
    return findNodeById(course.rootLessonNode, selectedNodeId);
  }, [selectedNodeId, course.rootLessonNode]);

  // ===== INITIAL LOAD: Load full tree =====
  useEffect(() => {
    // Nếu KHÔNG phải student → Skip
    if (!config.isStudent || !classId) {
      setIsInitialLoading(false);
      return;
    }

    // KIỂM TRA: Nếu initialCourse chưa có rootLessonNode → Có vấn đề
    if (!initialCourse.rootLessonNode) {
      console.error("❌ initialCourse.rootLessonNode is null!");
      setIsInitialLoading(false);
      return;
    }

    // Nếu là student → Load homework counts
    const loadHomeworkCounts = async () => {
      try {
        const statusResult = await getStudentHomeworkStatusByClass(
          initialCourse.id,
          classId,
        );
        console.log("statusResult", statusResult);

        if (statusResult.success && statusResult.data) {
          const {
            assignedByLessonNode,
            submittedByLessonNode,
            correctByLessonNode,
            submissionsByAssignmentId,
          } = statusResult.data;

          const countsMap = buildHomeworkCountsMap(
            initialCourse.rootLessonNode!,
            assignedByLessonNode,
            submittedByLessonNode,
            correctByLessonNode,
          );
          console.log("countsMap: ", countsMap);

          setHomeworkCountsMap(countsMap);

          // 🎯 Lưu submission status luôn (thay vì gọi getStudentSubmissionStatus sau)
          if (submissionsByAssignmentId) {
            const submissionStatusMap = new Map<
              string,
              {
                hasSubmitted: boolean;
                submittedAt: string | null;
                evaluation?: {
                  isCorrect: boolean;
                  score: number;
                  maxScore: number;
                };
              }
            >();

            Object.entries(submissionsByAssignmentId).forEach(
              ([assignmentId, status]) => {
                submissionStatusMap.set(assignmentId, status);
              },
            );

            setStudentSubmissionStatus(submissionStatusMap);
          }

          console.log(`✅ Homework counts loaded for ${countsMap.size} nodes`);

          // Debug: Log một số counts
          let totalPending = 0;
          countsMap.forEach((counts) => {
            totalPending += counts.pending;
          });
          console.log(`Total pending homeworks: ${totalPending}`);
        }
      } catch (error) {
        console.error("❌ Error loading homework counts:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadHomeworkCounts();
  }, [initialCourse.id, classId, config.isStudent]);

  useEffect(() => {
    // Chỉ load khi có classId (teacher hoặc student)
    if (!classId || (!config.isTeacher && !config.isStudent)) {
      return;
    }

    const loadClassLessonNodeCounts = async () => {
      if (!initialCourse.rootLessonNode) return;

      try {
        // Lấy tất cả homework node IDs từ tree
        const homeworkNodeIds: string[] = [];

        function collectHomeworkIds(node: LessonNodeUI) {
          if (node.type === "homework") {
            homeworkNodeIds.push(node.id);
          }
          if (node.children && node.children.length > 0) {
            node.children.forEach(collectHomeworkIds);
          }
        }

        collectHomeworkIds(initialCourse.rootLessonNode);

        if (homeworkNodeIds.length === 0) {
          console.log("No homework nodes found");
          return;
        }

        console.log(
          `📊 Loading class lesson node counts for ${homeworkNodeIds.length} homework nodes...`,
        );

        // Load counts
        const countsResult = await getClassLessonNodeCounts(
          homeworkNodeIds,
          classId,
        );

        if (countsResult.success && countsResult.data) {
          const newMap = new Map<
            string,
            { lesson_note: number; homework_imp: number }
          >();
          Object.entries(countsResult.data).forEach(([id, counts]) => {
            newMap.set(id, counts as any);
          });
          setClassLessonNodeCounts(newMap);

          console.log(
            `✅ Loaded class lesson node counts for ${newMap.size} nodes`,
          );
        }
      } catch (error) {
        console.error("Error loading class lesson node counts:", error);
      }
    };

    loadClassLessonNodeCounts();
  }, [
    classId,
    config.isTeacher,
    config.isStudent,
    initialCourse.rootLessonNode,
  ]);

  // ===== ACTION: Toggle expand/collapse (ĐƠN GIẢN) =====
  const toggleNodeExpanded = useCallback((node: LessonNodeUI) => {
    const nodeId = node.id;

    setExpandedNodeIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // ===== ACTION: Add node =====
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
          const newNode: LessonNodeUI = {
            ...transformToUINode(result.data),
            children: [],
            childrenLoaded: true,
          };

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

          // Auto expand parent
          setExpandedNodeIds((prev) => new Set([...prev, selectedNode.id]));
        } else {
          alert(result.error || "Có lỗi xảy ra khi thêm node");
        }

        setLoadingAction(null);
      });
    },
    [selectedNode, course.id],
  );

  // ===== ACTION: Delete node =====
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
        } else {
          alert(result.error || "Có lỗi xảy ra khi xóa node");
        }

        setLoadingAction(null);
      });
    },
    [course.id, course.rootLessonNodeId, selectedNodeId],
  );

  // ===== ACTION: Update node =====
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

  // ===== CLASS LESSON NODE ACTIONS (GIỮ NGUYÊN) =====
  const handleToggleClassLessonNodes = useCallback(
    async (nodeId: string) => {
      if (!classId) return;

      const isExpanded = expandedClassLessonNodes.has(nodeId);
      if (isExpanded) {
        setExpandedClassLessonNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
        return;
      }

      setLoadingClassLessonNodeIds((prev) => new Set([...prev, nodeId]));

      try {
        // 1. Load class lesson nodes
        const result = await loadClassLessonNode(nodeId, classId);

        if (!result.success || !result.data) {
          throw new Error("Failed to load class lesson nodes");
        }

        setClassLessonNodes((prev) => new Map(prev).set(nodeId, result.data));
        setExpandedClassLessonNodes((prev) => new Set([...prev, nodeId]));

        // 🎯 Submission status đã được load từ getStudentHomeworkStatusByClass
        // Không cần gọi API thêm nữa!
      } catch (error) {
        console.error("Error toggling class lesson nodes:", error);
      } finally {
        setLoadingClassLessonNodeIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      }
    },
    [classId, expandedClassLessonNodes, config.isStudent],
  );

  const handleAddClassLessonNode = useCallback(
    async (
      nodeId: string,
      type: "lesson_note" | "homework_imp",
      content?: Record<string, any>,
    ) => {
      if (!classId) return;

      setLoadingAction(`add-classlessonnode-${nodeId}`);

      startTransition(async () => {
        const result = await addClassLessonNode({
          lessonNodeId: nodeId,
          classId: classId,
          type,
          content: content,
        });

        if (result.success && result.data) {
          setClassLessonNodes((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(nodeId) || [];
            newMap.set(nodeId, [...existing, result.data]);
            return newMap;
          });

          setClassLessonNodeCounts((prev) => {
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

          setExpandedClassLessonNodes((prev) => new Set([...prev, nodeId]));
        } else {
          alert(result.error || "Có lỗi xảy ra");
        }

        setLoadingAction(null);
      });
    },
    [classId],
  );

  const handleDeleteClassLessonNode = useCallback(
    async (
      nodeId: string,
      classLessonNodeId: string,
      type: "lesson_note" | "homework_imp",
    ) => {
      if (!classId) return;

      if (!confirm("Bạn có chắc muốn xóa?")) return;

      setLoadingAction(`delete-classlessonnode-${classLessonNodeId}`);

      startTransition(async () => {
        const result = await deleteClassLessonNode({
          classLessonNodeId: classLessonNodeId,
          classId: classId,
        });

        if (result.success) {
          setClassLessonNodes((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(nodeId) || [];
            newMap.set(
              nodeId,
              existing.filter((a) => a.id !== classLessonNodeId),
            );
            return newMap;
          });

          setClassLessonNodeCounts((prev) => {
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
    [classId],
  );

  const getClassLessonNodesByType = useCallback(
    (nodeId: string, type: "lesson_note" | "homework_imp") => {
      const allClassLessonNodes = classLessonNodes.get(nodeId) || [];
      return allClassLessonNodes.filter((a) => a.type === type);
    },
    [classLessonNodes],
  );

  // ===== HELPER: Get homework counts =====
  const getHomeworkCounts = useCallback(
    (nodeId: string): HomeworkCountResult => {
      return (
        homeworkCountsMap.get(nodeId) || {
          totalAssigned: 0,
          pending: 0,
          correct: 0,
        }
      );
    },
    [homeworkCountsMap],
  );

  // ===== ACTION: Update assignment status when completed =====
  const updateAssignmentStatus = useCallback(
    async (assignmentId: string): Promise<void> => {
      // Update studentSubmissionStatus
      setStudentSubmissionStatus((prev) => {
        const newMap = new Map(prev);
        const currentStatus = newMap.get(assignmentId);
        if (currentStatus) {
          newMap.set(assignmentId, {
            ...currentStatus,
            hasSubmitted: true,
            submittedAt: new Date().toISOString(),
          });
        }
        return newMap;
      });

      // Reload homework counts để đảm bảo chính xác
      if (config.isStudent && classId && initialCourse.rootLessonNode) {
        try {
          const statusResult = await getStudentHomeworkStatusByClass(
            initialCourse.id,
            classId,
          );

          if (statusResult.success && statusResult.data) {
            const {
              assignedByLessonNode,
              submittedByLessonNode,
              correctByLessonNode,
              submissionsByAssignmentId,
            } = statusResult.data;

            const countsMap = buildHomeworkCountsMap(
              initialCourse.rootLessonNode,
              assignedByLessonNode,
              submittedByLessonNode,
              correctByLessonNode,
            );

            setHomeworkCountsMap(countsMap);

            // Cập nhật submission status từ dữ liệu mới
            if (submissionsByAssignmentId) {
              const submissionStatusMap = new Map<
                string,
                {
                  hasSubmitted: boolean;
                  submittedAt: string | null;
                  evaluation?: {
                    isCorrect: boolean;
                    score: number;
                    maxScore: number;
                  };
                }
              >();

              Object.entries(submissionsByAssignmentId).forEach(
                ([id, status]) => {
                  submissionStatusMap.set(id, status);
                },
              );

              setStudentSubmissionStatus(submissionStatusMap);
            }
          }
        } catch (error) {
          console.error("Error reloading homework counts:", error);
        }
      }
    },
    [config.isStudent, classId, initialCourse.id, initialCourse.rootLessonNode],
  );

  // ===== CONTEXT VALUE =====
  const value: CourseStructureContextValue = {
    // Config
    ...config,

    // Data
    course,
    selectedNodeId,
    selectedNode,

    // Tree UI
    expandedNodeIds,

    // Class lesson nodes
    classLessonNodes,
    classLessonNodeCounts,
    expandedClassLessonNodes,

    // Homework counts
    homeworkCountsMap,
    getHomeworkCounts,

    // Loading
    isPending,
    loadingAction,
    isInitialLoading,
    loadingClassLessonNodeIds,
    handleUpdateNode,
    isUpdatingNode,

    // Actions
    setSelectedNodeId,
    toggleNodeExpanded,
    handleAddNode,
    handleDeleteNode,
    handleToggleClassLessonNodes,
    handleAddClassLessonNode,
    handleDeleteClassLessonNode,
    getClassLessonNodesByType,
    studentSubmissionStatus,
    updateAssignmentStatus,
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
