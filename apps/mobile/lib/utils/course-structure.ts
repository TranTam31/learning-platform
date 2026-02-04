import {
  LessonNodeWithCount,
  LessonNodeUI,
  LessonNodeType,
} from "@/types/course";

// Build tree from flat list
export function buildTreeFromFlatList(
  nodes: LessonNodeWithCount[],
): LessonNodeUI | null {
  if (!nodes.length) return null;

  // Create a map for quick lookup
  const nodeMap = new Map<string, LessonNodeUI>();

  // Initialize all nodes
  nodes.forEach((node) => {
    nodeMap.set(node.id, {
      ...node,
      children: [],
      childrenLoaded: true,
    });
  });

  // Build parent-child relationships
  let root: LessonNodeUI | null = null;
  nodes.forEach((node) => {
    const currentNode = nodeMap.get(node.id)!;
    if (!node.parentId) {
      root = currentNode;
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(currentNode);
      }
    }
  });

  // Sort children by order
  function sortChildren(node: LessonNodeUI) {
    node.children.sort((a, b) => a.order - b.order);
    node.children.forEach(sortChildren);
  }

  if (root) {
    sortChildren(root);
  }

  return root;
}

// Find node by ID in tree
export function findNodeById(
  node: LessonNodeUI,
  id: string,
): LessonNodeUI | null {
  if (node.id === id) return node;

  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

// Build homework counts map
export function buildHomeworkCountsMap(
  node: LessonNodeUI,
  assignedByLessonNode: Record<string, number>,
  submittedByLessonNode: Record<string, number>,
): Map<string, { totalAssigned: number; pending: number }> {
  const map = new Map<string, { totalAssigned: number; pending: number }>();

  function traverse(n: LessonNodeUI) {
    const totalAssigned = assignedByLessonNode[n.id] || 0;
    const submitted = submittedByLessonNode[n.id] || 0;
    const pending = totalAssigned - submitted;

    if (totalAssigned > 0) {
      map.set(n.id, {
        totalAssigned,
        pending,
      });
    }

    n.children.forEach(traverse);
  }

  traverse(node);
  return map;
}
