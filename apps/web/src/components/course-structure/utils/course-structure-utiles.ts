// course-structure-utils.ts
import { LessonNodeUI, LessonNodeWithCount } from "@/types/course";

/**
 * Transform Prisma node to UI node
 */
export const transformToUINode = (node: LessonNodeWithCount): LessonNodeUI => ({
  ...node,
  children: [],
  childrenLoaded: false,
});

/**
 * Find a node by ID in the tree (memoization-friendly)
 */
export const findNodeById = (
  root: LessonNodeUI | null,
  targetId: string
): LessonNodeUI | null => {
  if (!root) return null;
  if (root.id === targetId) return root;

  // Guard against undefined/null children
  if (!root.children || root.children.length === 0) {
    return null;
  }

  for (const child of root.children) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }

  return null;
};

/**
 * Update a specific node in the tree immutably
 */
export const updateNodeInTree = (
  root: LessonNodeUI,
  targetId: string,
  updater: (node: LessonNodeUI) => LessonNodeUI
): LessonNodeUI => {
  if (root.id === targetId) {
    return updater(root);
  }

  // Guard against undefined/null children
  if (!root.children || root.children.length === 0) {
    return root;
  }

  return {
    ...root,
    children: root.children.map((child) =>
      updateNodeInTree(child, targetId, updater)
    ),
  };
};

/**
 * Remove a node from the tree immutably
 */
export const removeNodeFromTree = (
  root: LessonNodeUI,
  targetId: string
): LessonNodeUI => {
  // Guard against undefined/null children
  if (!root.children || root.children.length === 0) {
    return root;
  }

  const updatedChildren = root.children
    .filter((child) => child.id !== targetId)
    .map((child) => removeNodeFromTree(child, targetId));

  return {
    ...root,
    children: updatedChildren,
    _count: {
      children: updatedChildren.length,
    },
  };
};

/**
 * Add a child node to a parent in the tree
 */
export const addChildToNode = (
  root: LessonNodeUI,
  parentId: string,
  newChild: LessonNodeUI
): LessonNodeUI => {
  if (root.id === parentId) {
    return {
      ...root,
      children: [...(root.children || []), newChild],
      _count: {
        children: root._count.children + 1,
      },
      childrenLoaded: true,
    };
  }

  // Guard against undefined/null children
  if (!root.children || root.children.length === 0) {
    return root;
  }

  return {
    ...root,
    children: root.children.map((child) =>
      addChildToNode(child, parentId, newChild)
    ),
  };
};

/**
 * Check if a node is descendant of another node
 */
export const isDescendant = (
  root: LessonNodeUI,
  ancestorId: string,
  descendantId: string
): boolean => {
  if (root.id === ancestorId) {
    return findNodeById(root, descendantId) !== null;
  }

  return root.children.some((child) =>
    isDescendant(child, ancestorId, descendantId)
  );
};
