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
  targetId: string,
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
  updater: (node: LessonNodeUI) => LessonNodeUI,
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
      updateNodeInTree(child, targetId, updater),
    ),
  };
};

/**
 * Remove a node from the tree immutably
 */
export const removeNodeFromTree = (
  root: LessonNodeUI,
  targetId: string,
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
  newChild: LessonNodeUI,
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
      addChildToNode(child, parentId, newChild),
    ),
  };
};

/**
 * Check if a node is descendant of another node
 */
export const isDescendant = (
  root: LessonNodeUI,
  ancestorId: string,
  descendantId: string,
): boolean => {
  if (root.id === ancestorId) {
    return findNodeById(root, descendantId) !== null;
  }

  return root.children.some((child) =>
    isDescendant(child, ancestorId, descendantId),
  );
};

/**
 * Build tree từ flat list of nodes (dùng khi load full structure)
 */
export function buildTreeFromFlatList(
  nodes: LessonNodeWithCount[],
): LessonNodeUI | null {
  if (nodes.length === 0) return null;

  // Create a map for quick lookup
  const nodeMap = new Map<string, LessonNodeUI>();

  // Initialize all nodes với empty children
  nodes.forEach((node) => {
    nodeMap.set(node.id, {
      ...node,
      children: [],
      childrenLoaded: true, // Đánh dấu đã load (vì load full tree)
    });
  });

  // Build tree structure
  let root: LessonNodeUI | null = null;

  nodes.forEach((node) => {
    const uiNode = nodeMap.get(node.id)!;

    if (node.parentId === null) {
      // Root node
      root = uiNode;
    } else {
      // Add to parent's children
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(uiNode);
      }
    }
  });

  return root;
}

/**
 * Merge loaded children vào node trong tree
 * (Dùng khi lazy load content cho một node cụ thể)
 */
export function mergeLoadedChildren(
  root: LessonNodeUI,
  targetId: string,
  loadedChildren: LessonNodeUI[],
): LessonNodeUI {
  return updateNodeInTree(root, targetId, (node) => ({
    ...node,
    children: loadedChildren,
    childrenLoaded: true,
  }));
}
