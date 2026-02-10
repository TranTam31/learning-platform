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
  rootNode: LessonNodeUI,
  assignedByLessonNode: Record<string, number>,
  submittedByLessonNode: Record<string, number>,
): Map<string, { totalAssigned: number; pending: number }> {
  const countsMap = new Map<
    string,
    { totalAssigned: number; pending: number }
  >();

  // Count homeworks recursively for a node (includes all children)
  function countHomeworksRecursive(node: LessonNodeUI): {
    totalAssigned: number;
    pending: number;
  } {
    let totalAssigned = 0;
    let pending = 0;

    function traverse(currentNode: LessonNodeUI) {
      // Count assignments for this node
      const assigned = assignedByLessonNode[currentNode.id] || 0;
      const submitted = submittedByLessonNode[currentNode.id] || 0;

      if (assigned > 0) {
        totalAssigned += assigned;
        pending += assigned - submitted;
      }

      // Traverse children
      if (currentNode.children && currentNode.children.length > 0) {
        currentNode.children.forEach(traverse);
      }
    }

    traverse(node);

    return {
      totalAssigned,
      pending,
    };
  }

  // Build map for all nodes
  function traverse(node: LessonNodeUI) {
    // Calculate counts for this node (includes all children)
    const counts = countHomeworksRecursive(node);
    countsMap.set(node.id, counts);

    // Recursive into children
    if (node.children && node.children.length > 0) {
      node.children.forEach(traverse);
    }
  }

  traverse(rootNode);

  return countsMap;
}
