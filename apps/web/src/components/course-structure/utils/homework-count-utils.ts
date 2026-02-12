// lib/homework-count-utils.ts - SỬA LẠI HOÀN TOÀN

import { LessonNodeUI } from "@/types/course";

export interface HomeworkCountResult {
  totalAssigned: number; // Tổng số homework được giao
  pending: number; // Số homework chưa làm
  correct: number; // Số homework làm đúng
}

/**
 * Đếm homework trong một node và tất cả children
 * @param node - Node cần đếm
 * @param assignedByLessonNode - Map: lessonNodeId → số lượng được giao
 * @param submittedByLessonNode - Map: lessonNodeId → số lượng đã làm
 * @param correctByLessonNode - Map: lessonNodeId → số lượng làm đúng
 */
export function countHomeworksRecursive(
  node: LessonNodeUI,
  assignedByLessonNode: Record<string, number>,
  submittedByLessonNode: Record<string, number>,
  correctByLessonNode: Record<string, number> = {},
): HomeworkCountResult {
  let totalAssigned = 0;
  let pending = 0;
  let correct = 0;

  function traverse(currentNode: LessonNodeUI) {
    // Nếu là homework node
    if (currentNode.type === "homework") {
      const lessonNodeId = currentNode.id;

      // Số lượng được giao (có thể > 1 nếu có nhiều assignments)
      const assigned = assignedByLessonNode[lessonNodeId] || 0;
      const submitted = submittedByLessonNode[lessonNodeId] || 0;
      const correctCount = correctByLessonNode[lessonNodeId] || 0;

      totalAssigned += assigned;
      pending += assigned - submitted; // Pending = assigned - submitted
      correct += correctCount;
    }

    // Recursive vào children
    if (currentNode.children && currentNode.children.length > 0) {
      currentNode.children.forEach(traverse);
    }
  }

  traverse(node);

  return {
    totalAssigned,
    pending,
    correct,
  };
}

/**
 * Build Map cho toàn bộ tree
 */
export function buildHomeworkCountsMap(
  rootNode: LessonNodeUI,
  assignedByLessonNode: Record<string, number>,
  submittedByLessonNode: Record<string, number>,
  correctByLessonNode: Record<string, number> = {},
): Map<string, HomeworkCountResult> {
  const countsMap = new Map<string, HomeworkCountResult>();

  function traverse(node: LessonNodeUI) {
    // Tính counts cho node này (bao gồm cả children)
    const counts = countHomeworksRecursive(
      node,
      assignedByLessonNode,
      submittedByLessonNode,
      correctByLessonNode,
    );

    countsMap.set(node.id, counts);

    // Recursive vào children
    if (node.children && node.children.length > 0) {
      node.children.forEach(traverse);
    }
  }

  traverse(rootNode);

  return countsMap;
}
