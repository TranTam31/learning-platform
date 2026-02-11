// components/course-structure/CourseStructureManager.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateClassForm } from "@/components/forms/create-class-form";
import { LessonNodeType, LessonNodeUI, CourseUI } from "@/types/course";
import {
  CourseStructureProvider,
  useCourseStructure,
} from "@/components/providers/course-structure-provider";
import WidgetMarketplaceDialog from "../widget/marketplace/WidgetMarketplaceDialog";
import TeacherAssignmentDialog from "../widget/homework/TeacherCreateAssignmentDialog";
import TeacherViewAssignmentDialog from "../widget/homework/TeacherViewAssignmentDialog";
import StudentViewAssignmentDialog from "../widget/homework/StudentViewAssignmentDialog";
import StudentDoAllHomeworkDialog from "./StudentDoAllHomeworkDialog";
import CourseStructureSettings from "./CourseStructureSettings";

// ===== PROPS =====
interface CourseStructureManagerProps {
  initialCourse: CourseUI;
  classId?: string;
  userRole:
    | "org_admin"
    | "org_member"
    | "class_teacher"
    | "class_student"
    | "class_owner";
}

interface EditableTitleProps {
  initialTitle: string;
  onSave: (newTitle: string) => void;
  isUpdating: boolean;
  className?: string;
}

const EditableTitle: React.FC<EditableTitleProps> = ({
  initialTitle,
  onSave,
  isUpdating,
  className = "block w-full",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🔑 Sync khi đổi node
  useEffect(() => {
    setTitle(initialTitle);
    setIsEditing(false);
  }, [initialTitle]);

  // Auto focus
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = title.trim();

    if (!trimmed) {
      setTitle(initialTitle);
      setIsEditing(false);
      return;
    }

    if (trimmed !== initialTitle) {
      onSave(trimmed); // optimistic
    }

    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setTitle(initialTitle);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        className={`bg-white border border-blue-500 rounded px-2 py-1 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${className}`}
      title="Click to edit"
    >
      {title}
    </span>
  );
};

// ===== MAIN COMPONENT (UI Only - Logic từ Context) =====
const CourseStructureContent: React.FC = () => {
  const {
    // Config
    isAdmin,
    isMember,
    isTeacher,
    isStudent,

    // Data
    course,
    selectedNodeId,
    selectedNode,

    // Tree UI states
    expandedNodeIds,
    isInitialLoading,
    loadingClassLessonNodeIds,

    // Class lesson node states
    classLessonNodeCounts: classLessonNodeCounts,
    expandedClassLessonNodes: expandedClassLessonNodes,

    // Loading
    isPending,
    loadingAction,
    handleUpdateNode,
    isUpdatingNode,

    // Actions
    setSelectedNodeId,
    toggleNodeExpanded,
    handleAddNode,
    handleDeleteNode,
    handleToggleClassLessonNodes: handleToggleClassLessonNodes,
    handleAddClassLessonNode: handleAddClassLessonNode,
    handleDeleteClassLessonNode: handleDeleteClassLessonNode,
    getClassLessonNodesByType: getClassLessonNodesByType,
    getHomeworkCounts,
    studentSubmissionStatus,
  } = useCourseStructure();

  // Stats mode toggle (student only)
  const [showStats, setShowStats] = useState(false);

  // Helper: get stats badge color based on correct ratio
  const getStatsBadge = (correct: number, total: number) => {
    if (total === 0) return null;
    const ratio = correct / total;
    let colorClass: string;
    if (ratio >= 0.7) {
      colorClass = "bg-green-100 text-green-700";
    } else if (ratio >= 0.4) {
      colorClass = "bg-yellow-100 text-yellow-700";
    } else {
      colorClass = "bg-red-100 text-red-700";
    }
    return { label: `${correct}/${total}`, colorClass, ratio };
  };

  // ===== HELPER: Get icon for node type =====
  const getNodeIcon = (node: LessonNodeUI, isExpanded: boolean) => {
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
  };

  // ===== RENDER: Tree node (recursive) =====
  const renderNode = (
    node: LessonNodeUI,
    level: number = 0,
  ): React.ReactNode => {
    if (node.type === LessonNodeType.homework) return null;

    const isExpanded = expandedNodeIds.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node._count.children > 0;
    const isDeleting = loadingAction === `delete-${node.id}`;

    // Get homework counts (student only)
    const homeworkCounts = isStudent ? getHomeworkCounts(node.id) : null;
    const hasPendingHomework = homeworkCounts && homeworkCounts.pending > 0;

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
            {/* Expand/collapse button (ĐƠN GIẢN - không loading) */}
            {hasChildren && node.type !== LessonNodeType.lesson ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpanded(node); // Không async
                }}
                className="p-0.5 hover:bg-gray-200 rounded"
                disabled={isDeleting}
              >
                {isExpanded ? (
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

            {/* Badge homework counts (student only) */}
            {isStudent &&
              homeworkCounts &&
              homeworkCounts.totalAssigned > 0 &&
              (showStats ? (
                // Stats mode: show correct/total with color
                (() => {
                  const stats = getStatsBadge(
                    homeworkCounts.correct,
                    homeworkCounts.totalAssigned,
                  );
                  return stats ? (
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${stats.colorClass}`}
                      title={`${homeworkCounts.correct} đúng / ${homeworkCounts.totalAssigned} tổng (${Math.round(stats.ratio * 100)}%)`}
                    >
                      {stats.label}
                    </span>
                  ) : null;
                })()
              ) : (
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                    hasPendingHomework
                      ? "bg-red-500 text-white"
                      : "bg-green-100 text-green-700"
                  }`}
                  title={`${homeworkCounts.pending} chưa làm / ${homeworkCounts.totalAssigned} tổng`}
                >
                  {hasPendingHomework ? `${homeworkCounts.pending}` : "✓"}
                </span>
              ))}
          </div>

          {/* Delete button */}
          {node.type !== LessonNodeType.course && isAdmin && (
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

        {/* Render children - ĐƠN GIẢN */}
        {isExpanded && node.children && node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // ===== DERIVED: Homework nodes =====
  const homeworkNodes = useMemo(() => {
    if (selectedNode && selectedNode.type === LessonNodeType.lesson) {
      return (selectedNode.children || []).filter(
        (child) => child.type === LessonNodeType.homework,
      );
    }
    return [];
  }, [selectedNode]);

  const canAddToSelected =
    selectedNode && selectedNode.type !== LessonNodeType.lesson;
  const isAddingModule = loadingAction === "add-MODULE";
  const isAddingLesson = loadingAction === "add-LESSON";

  // ===== JSX =====
  return (
    <div className="flex h-screen bg-gray-50">
      {/* ===== TREE SIDEBAR ===== */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Course Structure
            </h2>
            <CourseStructureSettings />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-700">{course.name}</span>
          </div>
          {(isAdmin || isMember) && (
            <div className="flex gap-2 w-full flex-col">
              <div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Class</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                    </DialogHeader>
                    <CreateClassForm
                      courseId={course.id}
                      organizationId={course.organizationId}
                      onSuccess={() => {}}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
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
              )}
            </div>
          )}

          {/* Student: Do homework button + Stats toggle */}
          {isStudent && (
            <div className="flex flex-col gap-2 mt-2">
              <StudentDoAllHomeworkDialog />
              <button
                onClick={() => setShowStats((prev) => !prev)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  showStats
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                {showStats ? "Ẩn thống kê" : "Xem thống kê"}
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isInitialLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Đang tải course...
              </span>
            </div>
          ) : course.rootLessonNode ? (
            renderNode(course.rootLessonNode)
          ) : (
            <div className="p-4 text-sm text-gray-500">Không có dữ liệu</div>
          )}
        </div>
      </div>

      {/* ===== DETAIL PANEL ===== */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedNode ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Node Header */}
              <div className="mb-4">
                <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full mb-2">
                  {selectedNode.type}
                </div>
                {isAdmin ? (
                  <EditableTitle
                    initialTitle={selectedNode.title}
                    onSave={(newTitle) =>
                      handleUpdateNode(selectedNode.id, { title: newTitle })
                    }
                    isUpdating={isUpdatingNode === selectedNode.id}
                    className="text-2xl font-bold text-gray-900 block"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedNode.title}
                  </h1>
                )}
              </div>

              {/* Description */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Description
                </h3>
                <p className="text-gray-600">
                  {(selectedNode.content as any)?.description ||
                    "No Description available."}
                </p>
              </div>

              {/* Homework Section (Lesson only) */}
              {selectedNode.type === LessonNodeType.lesson && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Homework
                    </h3>
                    {isAdmin && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">
                            <Plus className="w-2 h-2" />
                            <span className="hidden sm:inline">
                              Add Homework
                            </span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[90vw]! h-[95vh]! max-w-none! p-1! flex! flex-col! min-h-0!">
                          <DialogHeader className="px-6 py-4 border-b shrink-0">
                            <DialogTitle>Widget Marketplace</DialogTitle>
                          </DialogHeader>
                          <WidgetMarketplaceDialog />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {homeworkNodes.length === 0 ? (
                    <div className="text-sm text-gray-500">Chưa có bài tập</div>
                  ) : (
                    <div className="space-y-2">
                      {homeworkNodes.map((hw) => {
                        const hwImplCount =
                          classLessonNodeCounts.get(hw.id)?.homework_imp || 0;
                        const hwClassLessonNodes = getClassLessonNodesByType(
                          hw.id,
                          "homework_imp",
                        );
                        const isHwExpanded = expandedClassLessonNodes.has(
                          hw.id,
                        );

                        // Get homework counts (student only)
                        const homeworkCounts = isStudent
                          ? getHomeworkCounts(hw.id)
                          : null;
                        const hasPendingHomework =
                          homeworkCounts && homeworkCounts.pending > 0;

                        return (
                          <div key={hw.id}>
                            {/* Homework header */}
                            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded group">
                              <File className="w-4 h-4 text-orange-500" />

                              {/* Title */}
                              {isAdmin ? (
                                <div
                                  className="flex-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <EditableTitle
                                    initialTitle={hw.title}
                                    onSave={(newTitle) =>
                                      handleUpdateNode(hw.id, {
                                        title: newTitle,
                                      })
                                    }
                                    isUpdating={isUpdatingNode === hw.id}
                                    className="text-sm"
                                  />
                                </div>
                              ) : (
                                <span className="text-sm flex-1">
                                  {hw.title}
                                </span>
                              )}

                              {/* Count badges */}
                              <div className="flex items-center gap-1">
                                {/* Total assignments count */}
                                {(isTeacher || isStudent) &&
                                  hwImplCount > 0 && (
                                    <span className="text-xs text-gray-600 bg-orange-100 px-2 py-0.5 rounded">
                                      {hwImplCount} bài
                                    </span>
                                  )}

                                {/* Pending count (student only) */}
                                {/* {isStudent && hasPendingHomework > 0 && (
                                  <span className="text-xs text-white bg-red-500 px-2 py-0.5 rounded font-semibold">
                                    {hasPendingHomework} chưa làm
                                  </span>
                                )} */}
                                {isStudent &&
                                  homeworkCounts &&
                                  homeworkCounts.totalAssigned > 0 &&
                                  (showStats ? (
                                    (() => {
                                      const stats = getStatsBadge(
                                        homeworkCounts.correct,
                                        homeworkCounts.totalAssigned,
                                      );
                                      return stats ? (
                                        <span
                                          className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${stats.colorClass}`}
                                          title={`${homeworkCounts.correct} đúng / ${homeworkCounts.totalAssigned} tổng (${Math.round(stats.ratio * 100)}%)`}
                                        >
                                          {stats.label}
                                        </span>
                                      ) : null;
                                    })()
                                  ) : (
                                    <span
                                      className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                                        hasPendingHomework
                                          ? "bg-red-500 text-white"
                                          : "bg-green-100 text-green-700"
                                      }`}
                                      title={`${homeworkCounts.pending} chưa làm / ${homeworkCounts.totalAssigned} tổng`}
                                    >
                                      {hasPendingHomework
                                        ? `${homeworkCounts.pending}`
                                        : "✓"}
                                    </span>
                                  ))}
                              </div>

                              {/* Expand button */}
                              {(isTeacher || isStudent) && (
                                <button
                                  onClick={() =>
                                    handleToggleClassLessonNodes(hw.id)
                                  }
                                  className="p-1 hover:bg-orange-200 rounded"
                                >
                                  {loadingClassLessonNodeIds.has(hw.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : isHwExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>
                              )}

                              {/* Delete button */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteNode(hw.id)}
                                  className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              )}
                            </div>

                            {/* Expanded: Show assignments */}
                            {(isTeacher || isStudent) && isHwExpanded && (
                              <div className="ml-6 mt-2 space-y-1">
                                {/* Add button for teacher */}
                                {isTeacher && (
                                  <div className="mb-2">
                                    <TeacherAssignmentDialog hwId={hw.id} />
                                  </div>
                                )}

                                {/* List assignments */}
                                {hwClassLessonNodes.length === 0 ? (
                                  <div className="text-xs text-gray-400 italic py-2">
                                    Chưa có bài tập nào
                                  </div>
                                ) : (
                                  hwClassLessonNodes.map(
                                    (classLessonNode, index) => {
                                      // Check submission status
                                      const submissionStatus =
                                        studentSubmissionStatus.get(
                                          classLessonNode.id,
                                        );
                                      const isPending =
                                        isStudent &&
                                        (!submissionStatus ||
                                          !submissionStatus.hasSubmitted);

                                      return (
                                        <div
                                          key={classLessonNode.id}
                                          className={`flex items-center gap-2 p-2 rounded text-xs group transition-colors ${
                                            isPending
                                              ? "bg-yellow-50 border border-yellow-200"
                                              : "bg-green-50 border border-green-200"
                                          }`}
                                        >
                                          {/* Assignment number */}
                                          <span className="font-semibold text-orange-700 min-w-fit">
                                            Bài {index + 1}
                                          </span>

                                          {/* Status & Evaluation */}
                                          {isStudent && (
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                  isPending
                                                    ? "bg-yellow-500 text-white"
                                                    : "bg-green-500 text-white"
                                                }`}
                                              >
                                                {isPending
                                                  ? "Chưa làm"
                                                  : "Đã làm"}
                                              </span>

                                              {/* Evaluation result (if submitted) */}
                                              {!isPending &&
                                                submissionStatus?.evaluation && (
                                                  <div className="flex items-center gap-1">
                                                    {submissionStatus.evaluation
                                                      .isCorrect ? (
                                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                      <XCircle className="w-4 h-4 text-red-600" />
                                                    )}
                                                    <span className="font-semibold text-gray-700">
                                                      {
                                                        submissionStatus
                                                          .evaluation.score
                                                      }
                                                      /
                                                      {
                                                        submissionStatus
                                                          .evaluation.maxScore
                                                      }
                                                    </span>
                                                  </div>
                                                )}
                                            </div>
                                          )}

                                          {/* Spacer */}
                                          <div className="flex-1" />

                                          {/* View/Do button (on the right) */}
                                          {isTeacher && (
                                            <TeacherViewAssignmentDialog
                                              assignmentId={classLessonNode.id}
                                            />
                                          )}
                                          {isStudent && (
                                            <StudentViewAssignmentDialog
                                              assignmentId={classLessonNode.id}
                                            />
                                          )}

                                          {/* Delete button (teacher only) */}
                                          {isTeacher && (
                                            <button
                                              onClick={() =>
                                                handleDeleteClassLessonNode(
                                                  hw.id,
                                                  classLessonNode.id,
                                                  "homework_imp",
                                                )
                                              }
                                              className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                                            >
                                              <Trash2 className="w-3 h-3 text-red-500" />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    },
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Lesson Notes (Class view only) */}
                  {(isTeacher || isStudent) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">
                          Notes
                          {(classLessonNodeCounts.get(selectedNode.id)
                            ?.lesson_note || 0) > 0 && (
                            <span className="ml-2 text-xs text-gray-500 bg-blue-100 px-2 py-0.5 rounded">
                              {
                                classLessonNodeCounts.get(selectedNode.id)
                                  ?.lesson_note
                              }
                            </span>
                          )}
                        </h3>
                        <div className="flex gap-2">
                          {isTeacher && (
                            <button
                              onClick={() =>
                                handleAddClassLessonNode(
                                  selectedNode.id,
                                  "lesson_note",
                                )
                              }
                              disabled={isPending}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-gray-300"
                            >
                              + Add Note
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleToggleClassLessonNodes(selectedNode.id)
                            }
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {loadingClassLessonNodeIds.has(selectedNode.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : expandedClassLessonNodes.has(
                                selectedNode.id,
                              ) ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedClassLessonNodes.has(selectedNode.id) && (
                        <div className="space-y-2">
                          {getClassLessonNodesByType(
                            selectedNode.id,
                            "lesson_note",
                          ).map((note) => (
                            <div
                              key={note.id}
                              className="flex items-center gap-2 p-2 bg-blue-50 rounded group"
                            >
                              <span className="text-sm flex-1">
                                📝 {note.content?.text || "Note"}
                              </span>
                              {isTeacher && (
                                <button
                                  onClick={() =>
                                    handleDeleteClassLessonNode(
                                      selectedNode.id,
                                      note.id,
                                      "lesson_note",
                                    )
                                  }
                                  className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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

// ===== WRAPPER WITH PROVIDER =====
const CourseStructureManager: React.FC<CourseStructureManagerProps> = ({
  initialCourse,
  classId,
  userRole,
}) => {
  return (
    <CourseStructureProvider
      initialCourse={initialCourse}
      classId={classId}
      userRole={userRole}
    >
      <CourseStructureContent />
    </CourseStructureProvider>
  );
};

export default CourseStructureManager;
