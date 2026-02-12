import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "@/lib/config/api";
import { authClient } from "@/lib/auth-client";
import AssignmentWidget from "@/components/AssignmentWidget";

interface PendingAssignment {
  assignmentId: string;
  studentAssignmentId: string;
  title: string;
  homeworkTitle: string;
}

interface DisplayedAssignment extends PendingAssignment {
  index: number;
  isCompleted: boolean;
  isCorrect?: boolean; // NEW: Track if the submission is correct
}

export default function DoAllHomeworkScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Original pending assignments when screen opened
  const [pendingWhenOpened, setPendingWhenOpened] = useState<
    PendingAssignment[]
  >([]);
  // Track completed assignments
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // Track evaluation (isCorrect) for each assignment
  const [evaluationMap, setEvaluationMap] = useState<
    Map<string, { isCorrect: boolean }>
  >(new Map());
  // Current assignment being worked on
  const [currentAssignmentId, setCurrentAssignmentId] = useState<
    string | undefined
  >();

  // Load pending assignments
  useEffect(() => {
    const loadPendingAssignments = async () => {
      if (!classId) {
        setError("No class ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: session } = await authClient.getSession();
        if (!session?.session.token) {
          throw new Error("No session token");
        }

        const response = await fetch(
          `${API_BASE_URL}/api/mobile/class/pending-assignments?classId=${classId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session.token}`,
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load assignments");
        }

        const result = await response.json();

        if (result.success && result.data) {
          const assignments: PendingAssignment[] = result.data;
          setPendingWhenOpened(assignments);

          if (assignments.length > 0) {
            setCurrentAssignmentId(assignments[0].assignmentId);
          }
        } else {
          throw new Error(result.error || "Failed to load assignments");
        }
      } catch (err) {
        console.error("❌ Load pending assignments error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadPendingAssignments();
  }, [classId]);

  // Handle assignment completed
  const handleAssignmentCompleted = (assignmentId: string) => {
    // Mark as completed
    setCompletedIds((prev) => new Set([...prev, assignmentId]));

    // Find current index and move to next
    const currentIdx = pendingWhenOpened.findIndex(
      (a) => a.assignmentId === assignmentId,
    );

    if (currentIdx < pendingWhenOpened.length - 1) {
      // Move to next assignment after a short delay
      setTimeout(() => {
        setCurrentAssignmentId(pendingWhenOpened[currentIdx + 1].assignmentId);
      }, 500);
    }
  };

  // Handle evaluation update from AssignmentWidget
  const handleEvaluationUpdate = (assignmentId: string, isCorrect: boolean) => {
    setEvaluationMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(assignmentId, { isCorrect });
      return newMap;
    });
  };

  // Check if all assignments are completed
  const allCompleted =
    pendingWhenOpened.length > 0 &&
    pendingWhenOpened.every((a) => completedIds.has(a.assignmentId));

  // Build displayed assignments list
  const displayedAssignments: DisplayedAssignment[] = pendingWhenOpened.map(
    (assignment, idx) => ({
      ...assignment,
      index: idx + 1,
      isCompleted: completedIds.has(assignment.assignmentId),
    }),
  );

  const currentAssignment = displayedAssignments.find(
    (a) => a.assignmentId === currentAssignmentId,
  );

  // LOADING STATE
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading assignments...</Text>
      </View>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // NO PENDING ASSIGNMENTS
  if (pendingWhenOpened.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>All Done!</Text>
        <Text style={styles.successText}>
          You have no pending assignments in this class.
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ALL COMPLETED
  if (allCompleted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Completed!</Text>
        <Text style={styles.successText}>
          You have completed all {displayedAssignments.length} assignments.
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main content */}
      <View style={styles.mainContent}>
        {/* LEFT: Assignment list */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>📋 Assignments</Text>
            <Text style={styles.sidebarSubtitle}>
              {displayedAssignments.length} items
            </Text>
          </View>

          <ScrollView style={styles.assignmentList}>
            {displayedAssignments.map((assignment) => {
              const isCurrent = assignment.assignmentId === currentAssignmentId;
              const evaluation = evaluationMap.get(assignment.assignmentId);
              const isCorrect = evaluation?.isCorrect;
              const isLoadingEvaluation =
                assignment.isCompleted && isCorrect === undefined;

              return (
                <Pressable
                  key={assignment.assignmentId}
                  onPress={() =>
                    setCurrentAssignmentId(assignment.assignmentId)
                  }
                  style={[
                    styles.assignmentItem,
                    isCurrent && styles.assignmentItemActive,
                    assignment.isCompleted &&
                      (isCorrect === false
                        ? styles.assignmentItemIncorrect
                        : isCorrect === true
                          ? styles.assignmentItemCompleted
                          : styles.assignmentItemLoading),
                  ]}
                >
                  <View style={styles.assignmentIcon}>
                    {assignment.isCompleted ? (
                      isCorrect === undefined ? (
                        <ActivityIndicator
                          size="small"
                          color="#6b7280"
                          style={styles.loadingIcon}
                        />
                      ) : isCorrect === false ? (
                        <Text style={styles.incorrectIcon}>✗</Text>
                      ) : (
                        <Text style={styles.checkIcon}>✓</Text>
                      )
                    ) : (
                      <Text style={styles.circleIcon}>○</Text>
                    )}
                  </View>
                  <View style={styles.assignmentInfo}>
                    <Text
                      style={[
                        styles.assignmentTitle,
                        isCurrent && styles.assignmentTitleActive,
                        assignment.isCompleted &&
                          (isCorrect === false
                            ? styles.assignmentTitleIncorrect
                            : isCorrect === true
                              ? styles.assignmentTitleCompleted
                              : styles.assignmentTitleLoading),
                      ]}
                      numberOfLines={1}
                    >
                      Assignment {assignment.index}
                    </Text>
                    <Text style={styles.assignmentSubtitle} numberOfLines={1}>
                      {assignment.homeworkTitle}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* RIGHT: Assignment widget */}
        <View style={styles.widgetContainer}>
          {currentAssignment && (
            <AssignmentWidget
              key={currentAssignmentId}
              assignmentId={currentAssignmentId!}
              onCompleted={() =>
                handleAssignmentCompleted(currentAssignmentId!)
              }
              onEvaluationUpdate={handleEvaluationUpdate}
              onError={(error) => console.error("Widget error:", error)}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#374151",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 12,
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#dbeafe",
    borderRadius: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
    padding: 8,
    gap: 8,
  },
  sidebar: {
    width: 200,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sidebarHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  sidebarSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  assignmentList: {
    flex: 1,
    padding: 8,
  },
  assignmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
  },
  assignmentItemActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  assignmentItemCompleted: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  assignmentItemIncorrect: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  assignmentItemLoading: {
    borderColor: "#e5e7eb",
    backgroundColor: "white",
  },
  assignmentIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkIcon: {
    fontSize: 18,
    color: "#22c55e",
    fontWeight: "bold",
  },
  incorrectIcon: {
    fontSize: 18,
    color: "#dc2626",
    fontWeight: "bold",
  },
  circleIcon: {
    fontSize: 18,
    color: "#d1d5db",
  },
  loadingIcon: {
    width: 16,
    height: 16,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  assignmentTitleActive: {
    color: "#2563eb",
  },
  assignmentTitleCompleted: {
    color: "#16a34a",
    textDecorationLine: "line-through",
  },
  assignmentTitleIncorrect: {
    color: "#dc2626",
    textDecorationLine: "line-through",
  },
  assignmentTitleLoading: {
    color: "#374151",
  },
  assignmentSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  widgetContainer: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});
