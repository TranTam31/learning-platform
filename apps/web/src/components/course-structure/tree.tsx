import React from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  BookOpen,
  Trash2,
  Loader2,
} from "lucide-react";
import { LessonNodeUI, LessonNodeType } from "@/types/course";

interface CourseStructureTreeProps {
  rootNode: LessonNodeUI;
  selectedNodeId?: string | null;
  expandedNodes: Set<string>;
  loadingNodes: Set<string>;
  onNodeSelect: (node: LessonNodeUI) => void;
  onNodeToggle: (node: LessonNodeUI) => void;
  onNodeDelete?: (nodeId: string) => void; // Optional - chỉ admin mới có
}

const CourseStructureTree: React.FC<CourseStructureTreeProps> = ({
  rootNode,
  selectedNodeId,
  expandedNodes,
  loadingNodes,
  onNodeSelect,
  onNodeToggle,
  onNodeDelete,
}) => {
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

  // Render single node
  const renderNode = (node: LessonNodeUI, level: number = 0) => {
    // Skip homework nodes trong tree
    if (node.type === LessonNodeType.homework) return null;

    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node._count.children > 0;
    const isLoadingChildren = loadingNodes.has(node.id);

    // Chỉ hiển thị chevron nếu KHÔNG phải lesson và có children
    const showChevron = hasChildren && node.type !== LessonNodeType.lesson;

    return (
      <div key={node.id} className="group">
        <div
          className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-100 cursor-pointer transition-colors ${
            isSelected ? "bg-blue-100 border-l-2 border-blue-500" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => onNodeSelect(node)}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {showChevron ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeToggle(node);
                }}
                className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
                disabled={isLoadingChildren}
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
              <span className="w-4 flex-shrink-0" />
            )}

            <span className="flex-shrink-0">
              {getNodeIcon(node, isExpanded)}
            </span>

            <span className="text-sm truncate">{node.title}</span>

            {hasChildren && !node.childrenLoaded && (
              <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                ({node._count.children})
              </span>
            )}
          </div>

          {/* Delete button - chỉ hiển thị nếu có handler và không phải root */}
          {onNodeDelete && node.type !== LessonNodeType.course && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNodeDelete(node.id);
              }}
              className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          )}
        </div>

        {/* Render children */}
        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return <>{renderNode(rootNode)}</>;
};

export default CourseStructureTree;
