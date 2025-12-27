"use client";

import React, { useState, useTransition } from "react";
import { CourseUI, LessonNodeUI, LessonNodeWithCount } from "@/types/course";
import { CourseStructureContext, UserRole } from "@/types/course-structure";
import CourseStructureTree from "./tree";
import { getToolbarComponent } from "./toolbars";
import { getEditorComponent } from "./editors";
import {
  addLessonNode,
  deleteLessonNode,
  loadNodeChildren,
} from "@/server/courses";

interface CourseStructureManagerProps {
  initialCourse: CourseUI;
  userRole: UserRole;
  classId?: string;
}

const CourseStructureManager: React.FC<CourseStructureManagerProps> = ({
  initialCourse,
  userRole,
  classId,
}) => {
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

  // Transform helper
  const transformToUINode = (node: LessonNodeWithCount): LessonNodeUI => ({
    ...node,
    children: [],
    childrenLoaded: false,
  });

  // Toggle node expansion (lazy load)
  const handleToggleNode = async (node: LessonNodeUI) => {
    const nodeId = node.id;
    const isExpanded = expandedNodes.has(nodeId);

    if (isExpanded) {
      setExpandedNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
      return;
    }

    const hasChildren = node._count.children > 0;
    if (!node.childrenLoaded && hasChildren) {
      setLoadingNodes((prev) => new Set([...prev, nodeId]));

      try {
        const result = await loadNodeChildren(nodeId);

        if (result.success && result.data) {
          const childrenUI: LessonNodeUI[] = result.data.map(transformToUINode);

          setCourse((prev) => {
            const newCourse = { ...prev };
            if (!newCourse.rootLessonNode) return prev;

            const updateNodeWithChildren = (n: LessonNodeUI): LessonNodeUI => {
              if (n.id === nodeId) {
                return { ...n, children: childrenUI, childrenLoaded: true };
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
            return { ...newCourse, rootLessonNode: updatedRoot };
          });

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

    setExpandedNodes((prev) => new Set([...prev, nodeId]));
  };

  // Add node handler
  const handleNodeAdd = async (type: string, parentId: string) => {
    // Logic add node...
    // Tương tự code cũ nhưng đơn giản hóa
  };

  // Delete node handler
  const handleNodeDelete = async (nodeId: string) => {
    // Logic delete node...
    // Tương tự code cũ
  };

  // Context object
  const context: CourseStructureContext = {
    course,
    selectedNode,
    userRole,
    classId,
    onNodeSelect: setSelectedNode,
    onNodeAdd: handleNodeAdd,
    onNodeDelete: handleNodeDelete,
  };

  // Get dynamic components based on role
  const ToolbarComponent = getToolbarComponent(userRole);
  const EditorComponent = getEditorComponent(userRole);

  const canAddToSelected = selectedNode?.type !== "lesson";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Tree */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Course Structure
          </h2>

          {/* Dynamic Toolbar */}
          <ToolbarComponent
            context={context}
            canAddToSelected={canAddToSelected}
            isPending={isPending}
          />
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto">
          {course.rootLessonNode && (
            <CourseStructureTree
              rootNode={course.rootLessonNode as LessonNodeUI}
              selectedNodeId={selectedNode?.id}
              expandedNodes={expandedNodes}
              loadingNodes={loadingNodes}
              onNodeSelect={setSelectedNode}
              onNodeToggle={handleToggleNode}
              onNodeDelete={
                userRole === UserRole.OrgAdmin ? handleNodeDelete : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 p-6 overflow-y-auto">
        <EditorComponent context={context} />
      </div>
    </div>
  );
};

export default CourseStructureManager;
