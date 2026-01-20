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

// ===== PROPS =====
interface CourseStructureManagerProps {
  initialCourse: CourseUI;
  classId?: string;
  userRole: "org_admin" | "org_member" | "class_teacher" | "class_student";
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
    loadedNodeIds,
    loadingNodeIds,

    // Class addon states
    addonCounts,
    expandedAddons,

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
    handleToggleAddons,
    handleAddClassAddon,
    handleDeleteClassAddon,
    getAddonsByType,
  } = useCourseStructure();

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

  const isLoadingHomework =
    selectedNode &&
    selectedNode.type === LessonNodeType.lesson &&
    loadingNodeIds.has(selectedNode.id);

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
          </div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-700">{course.name}</span>
          </div>
          {(isAdmin || isMember) && (
            <div className="flex gap-2 w-full">
              <div className="flex-1">
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
              )}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {course.rootLessonNode && renderNode(course.rootLessonNode)}
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
                      <button
                        onClick={() => handleAddNode(LessonNodeType.homework)}
                        disabled={isPending}
                        className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:bg-gray-300"
                      >
                        + Add Homework
                      </button>
                    )}
                  </div>

                  {isLoadingHomework ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : homeworkNodes.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Chưa có homework
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {homeworkNodes.map((hw) => {
                        const hwImplCount =
                          addonCounts.get(hw.id)?.homework_imp || 0;
                        const hwAddons = getAddonsByType(hw.id, "homework_imp");
                        const isHwExpanded = expandedAddons.has(hw.id);

                        return (
                          <div key={hw.id}>
                            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded group">
                              <File className="w-4 h-4 text-orange-500" />
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

                              {(isTeacher || isStudent) && hwImplCount > 0 && (
                                <span className="text-xs text-gray-500 bg-orange-100 px-2 py-0.5 rounded">
                                  {hwImplCount}
                                </span>
                              )}

                              {(isTeacher || isStudent) && (
                                <button
                                  onClick={() => handleToggleAddons(hw.id)}
                                  className="p-1 hover:bg-orange-200 rounded"
                                >
                                  {loadingNodeIds.has(`${hw.id}-addons`) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : isHwExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>
                              )}

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteNode(hw.id)}
                                  className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              )}
                            </div>

                            {(isTeacher || isStudent) && isHwExpanded && (
                              <div className="ml-6 mt-2 space-y-1">
                                {isTeacher && (
                                  <button
                                    onClick={() =>
                                      handleAddClassAddon(hw.id, "homework_imp")
                                    }
                                    className="w-full px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200"
                                  >
                                    + Add Assignment
                                  </button>
                                )}
                                {hwAddons.map((addon) => (
                                  <div
                                    key={addon.id}
                                    className="flex items-center gap-2 p-2 bg-orange-100 rounded text-xs group"
                                  >
                                    <span className="flex-1">
                                      📋 {addon.content?.text || "Assignment"}
                                    </span>
                                    {isTeacher && (
                                      <button
                                        onClick={() =>
                                          handleDeleteClassAddon(
                                            hw.id,
                                            addon.id,
                                            "homework_imp",
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
                          {(addonCounts.get(selectedNode.id)?.lesson_note ||
                            0) > 0 && (
                            <span className="ml-2 text-xs text-gray-500 bg-blue-100 px-2 py-0.5 rounded">
                              {addonCounts.get(selectedNode.id)?.lesson_note}
                            </span>
                          )}
                        </h3>
                        <div className="flex gap-2">
                          {isTeacher && (
                            <button
                              onClick={() =>
                                handleAddClassAddon(
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
                            onClick={() => handleToggleAddons(selectedNode.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {loadingNodeIds.has(`${selectedNode.id}-addons`) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : expandedAddons.has(selectedNode.id) ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedAddons.has(selectedNode.id) && (
                        <div className="space-y-2">
                          {getAddonsByType(selectedNode.id, "lesson_note").map(
                            (note) => (
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
                                      handleDeleteClassAddon(
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
                            ),
                          )}
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
