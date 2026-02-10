import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "@/lib/config/api";
import {
  ClassData,
  CourseUI,
  LessonNodeUI,
  LessonNodeType,
} from "@/types/course";
import { buildTreeFromFlatList } from "@/lib/utils/course-structure";
import {
  CourseStructureProvider,
  useCourseStructure,
} from "@/components/providers/course-structure-provider";
import { authClient } from "@/lib/auth-client";
import { AssignmentModal } from "@/components/AssignmentModal";

// Tree Node Component
interface TreeNodeProps {
  node: LessonNodeUI;
  level: number;
  isExpanded: boolean;
  onToggleExpand: (node: LessonNodeUI) => void;
  onSelectNode: (nodeId: string) => void;
  isSelected: boolean;
  homeworkCounts?: { totalAssigned: number; pending: number };
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isExpanded,
  onToggleExpand,
  onSelectNode,
  isSelected,
  homeworkCounts,
}) => {
  // Don't show homework nodes in tree
  if (node.type === LessonNodeType.homework) return null;

  const hasChildren = node._count.children > 0;
  const hasPendingHomework = homeworkCounts && homeworkCounts.pending > 0;

  return (
    <View>
      <Pressable
        style={[
          styles.treeNode,
          {
            paddingLeft: level * 16 + 12,
            backgroundColor: isSelected ? "#dbeafe" : "white",
            borderLeftColor: isSelected ? "#3b82f6" : "transparent",
          },
        ]}
        onPress={() => onSelectNode(node.id)}
      >
        <View style={styles.treeNodeContent}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleExpand(node);
            }}
            style={styles.expandButton}
          >
            {hasChildren && node.type !== LessonNodeType.lesson ? (
              <Text>{isExpanded ? "▼" : "▶"}</Text>
            ) : (
              <View style={{ width: 16 }} />
            )}
          </Pressable>

          <Text style={styles.nodeIcon}>
            {node.type === LessonNodeType.lesson && "📄"}
            {node.type === LessonNodeType.course && "📚"}
            {node.type === LessonNodeType.module && "📁"}
          </Text>

          <Text
            style={[
              styles.nodeTitle,
              {
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {node.title}
          </Text>

          {homeworkCounts && homeworkCounts.totalAssigned > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: hasPendingHomework ? "#ef4444" : "#dcfce7",
                },
              ]}
            >
              <Text
                style={{
                  color: hasPendingHomework ? "white" : "#166534",
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {hasPendingHomework ? `${homeworkCounts.pending}` : "✓"}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {isExpanded && node.children && node.children.length > 0 && (
        <View>
          {node.children.map((child) => (
            <TreeNodeRenderer key={child.id} node={child} level={level + 1} />
          ))}
        </View>
      )}
    </View>
  );
};

// Renderer component that connects to context
const TreeNodeRenderer: React.FC<{
  node: LessonNodeUI;
  level: number;
}> = ({ node, level }) => {
  const {
    selectedNodeId,
    expandedNodeIds,
    setSelectedNodeId,
    toggleNodeExpanded,
    getHomeworkCounts,
  } = useCourseStructure();

  return (
    <TreeNode
      node={node}
      level={level}
      isExpanded={expandedNodeIds.has(node.id)}
      onToggleExpand={toggleNodeExpanded}
      onSelectNode={setSelectedNodeId}
      isSelected={selectedNodeId === node.id}
      homeworkCounts={getHomeworkCounts(node.id)}
    />
  );
};

// Detail Panel
const DetailPanel: React.FC<{ classId: string }> = ({ classId }) => {
  const { selectedNode } = useCourseStructure();
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(
    null,
  );

  if (!selectedNode) {
    return (
      <View style={styles.detailPlaceholder}>
        <Text style={styles.detailPlaceholderText}>
          Select a lesson to view details
        </Text>
      </View>
    );
  }

  // Get homework nodes if this is a lesson
  const homeworkNodes =
    selectedNode.type === LessonNodeType.lesson
      ? (selectedNode.children || []).filter(
          (child) => child.type === LessonNodeType.homework,
        )
      : [];

  const handleHomeworkPress = (homeworkId: string) => {
    setSelectedHomeworkId(homeworkId);
    setShowAssignmentModal(true);
  };

  return (
    <>
      <ScrollView style={styles.detailPanel}>
        <View style={styles.detailContent}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{selectedNode.type}</Text>
          </View>

          <Text style={styles.detailTitle}>{selectedNode.title}</Text>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionText}>
              {(selectedNode.content as any)?.description ||
                "No description available."}
            </Text>
          </View>

          {selectedNode.type === LessonNodeType.lesson && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Homework ({homeworkNodes.length})
              </Text>
              {homeworkNodes.length === 0 ? (
                <Text style={styles.emptyText}>
                  No homework for this lesson
                </Text>
              ) : (
                <View style={styles.homeworkList}>
                  {homeworkNodes.map((hw) => (
                    <Pressable
                      key={hw.id}
                      style={styles.homeworkItem}
                      onPress={() => handleHomeworkPress(hw.id)}
                    >
                      <Text style={styles.homeworkTitle}>📋 {hw.title}</Text>
                      <Text style={styles.homeworkSubtitle}>
                        Tap to view assignments
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {selectedHomeworkId && (
        <AssignmentModal
          visible={showAssignmentModal}
          onClose={() => setShowAssignmentModal(false)}
          homeworkNodeId={selectedHomeworkId}
          classId={classId}
        />
      )}
    </>
  );
};

// Do All Homework Button Component
const DoAllHomeworkButton: React.FC<{ classId: string }> = ({ classId }) => {
  const router = useRouter();
  const { homeworkCountsMap, course } = useCourseStructure();

  // Calculate total pending from root node
  const rootCounts = course.rootLessonNodeId
    ? homeworkCountsMap.get(course.rootLessonNodeId)
    : null;
  const totalPending = rootCounts?.pending || 0;

  if (totalPending === 0) {
    return (
      <View style={styles.doAllButtonDisabled}>
        <Text style={styles.doAllButtonIcon}>✓</Text>
        <Text style={styles.doAllButtonTextDisabled}>All Done!</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={styles.doAllButton}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/do-all-homework",
          params: { classId },
        })
      }
    >
      <Text style={styles.doAllButtonIcon}>▶</Text>
      <Text style={styles.doAllButtonText}>Do Homework ({totalPending})</Text>
    </Pressable>
  );
};

// Main Content Component
const ClassDetailContent: React.FC<{
  classData: ClassData;
  courseUI: CourseUI;
}> = ({ classData, courseUI }) => {
  const { isLoading, course } = useCourseStructure();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading course structure...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Tree Sidebar */}
      <View style={{ flex: 3 }}>
        <ScrollView style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Course Structure</Text>
            <Text style={styles.courseName}>{course.name}</Text>
            <DoAllHomeworkButton classId={classData.id} />
          </View>

          {course.rootLessonNode ? (
            <TreeNodeRenderer node={course.rootLessonNode} level={0} />
          ) : (
            <Text style={styles.emptyText}>No course structure</Text>
          )}
        </ScrollView>
      </View>
      {/* Detail Panel */}
      <View style={{ flex: 7 }}>
        <DetailPanel classId={classData.id} />
      </View>
    </View>
  );
};

// Main Screen Component
export default function ClassDetailScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [courseUI, setCourseUI] = useState<CourseUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassData = async () => {
      try {
        const { data: session } = await authClient.getSession();

        if (!session?.session.token) {
          throw new Error("No session token available");
        }
        if (!classId) {
          setError("No class ID provided");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/mobile/class?classId=${classId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.session.token}`, // Gửi token
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch class");
        }

        const result = await response.json();
        if (result.success && result.data) {
          const { classData, nodes } = result.data;

          // Build tree from nodes
          const rootNode = buildTreeFromFlatList(nodes);

          const courseUI: CourseUI = {
            id: classData.course.id,
            name: classData.course.name,
            organizationId: "", // Not available in mobile context
            rootLessonNodeId: classData.course.rootLessonNodeId,
            rootLessonNode: rootNode,
            course: classData.course,
          };

          setClassData(classData);
          setCourseUI(courseUI);
        } else {
          setError(result.error || "Failed to load class");
        }
      } catch (err) {
        console.error("Error fetching class:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [classId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading class...</Text>
      </View>
    );
  }

  if (error || !classData || !courseUI) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || "Failed to load class"}</Text>
      </View>
    );
  }

  return (
    <CourseStructureProvider initialCourse={courseUI} classId={classId}>
      <ClassDetailContent classData={classData} courseUI={courseUI} />
    </CourseStructureProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f9fafb",
  },
  sidebar: {
    backgroundColor: "white",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  treeNode: {
    paddingVertical: 8,
    paddingRight: 12,
    flexDirection: "row",
    borderLeftWidth: 2,
  },
  treeNodeContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expandButton: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  nodeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  nodeTitle: {
    fontSize: 12,
    color: "#1f2937",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  detailPanel: {
    backgroundColor: "#ffffff",
  },
  detailContent: {
    padding: 16,
  },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    marginBottom: 12,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#374151",
    textTransform: "capitalize",
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  homeworkList: {
    gap: 8,
  },
  homeworkItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
  },
  homeworkTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  homeworkSubtitle: {
    fontSize: 11,
    color: "#b45309",
  },
  placeholderText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fef2f2",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  detailPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  detailPlaceholderText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  doAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  doAllButtonDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  doAllButtonIcon: {
    fontSize: 12,
    color: "white",
  },
  doAllButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  doAllButtonTextDisabled: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
});
