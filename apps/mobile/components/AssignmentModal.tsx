import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/lib/config/api";
import { authClient } from "@/lib/auth-client";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  hasSubmitted: boolean;
  submittedAt: string | null;
  evaluation?: {
    isCorrect: boolean;
    score: number;
    maxScore: number;
  } | null;
  content: any;
}

interface AssignmentModalProps {
  visible: boolean;
  homeworkNodeId: string;
  classId: string;
  onClose: () => void;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  visible,
  homeworkNodeId,
  classId,
  onClose,
}) => {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchAssignments();
    }
  }, [visible, homeworkNodeId, classId]);

  const fetchAssignments = async () => {
    try {
      const { data: session } = await authClient.getSession();

      if (!session?.session.token) {
        throw new Error("No session token available");
      }
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/mobile/homework/assignments?classId=${classId}&homeworkNodeId=${homeworkNodeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session.token}`, // Gửi token
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch assignments");
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setAssignments(result.data);
      } else {
        setError(result.error || "Failed to load assignments");
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentPress = (assignmentId: string) => {
    onClose();
    router.push({
      pathname: "/(tabs)/assignment-detail",
      params: { assignmentId },
    });
  };

  const renderAssignmentItem = ({ item }: { item: Assignment }) => {
    const isPending = !item.hasSubmitted;
    const statusColor = isPending ? "#fef3c7" : "#dcfce7";
    const borderColor = isPending ? "#fcd34d" : "#86efac";
    const statusText = isPending ? "Pending" : "Completed";
    const statusBgColor = isPending ? "#fbbf24" : "#22c55e";

    return (
      <Pressable
        style={[
          styles.assignmentItem,
          {
            borderLeftColor: borderColor,
            backgroundColor: statusColor,
          },
        ]}
        onPress={() => handleAssignmentPress(item.id)}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentTitleContainer}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusBgColor,
                },
              ]}
            >
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>
        </View>

        {item.description && (
          <Text style={styles.assignmentDescription}>{item.description}</Text>
        )}

        {/* Evaluation display */}
        {item.hasSubmitted && item.evaluation && (
          <View style={styles.evaluationContainer}>
            <View style={styles.evaluationRow}>
              <Text style={styles.evaluationLabel}>Evaluation:</Text>
              <Text
                style={[
                  styles.evaluationValue,
                  {
                    color: item.evaluation.isCorrect ? "#22c55e" : "#ef4444",
                  },
                ]}
              >
                {item.evaluation.isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </Text>
            </View>
            <View style={styles.evaluationRow}>
              <Text style={styles.evaluationLabel}>Score:</Text>
              <Text style={styles.evaluationValue}>
                {item.evaluation.score}/{item.evaluation.maxScore}
              </Text>
            </View>
          </View>
        )}

        {/* Submitted date */}
        {item.hasSubmitted && item.submittedAt && (
          <Text style={styles.submittedDate}>
            Submitted: {new Date(item.submittedAt).toLocaleDateString()}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assignments</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading assignments...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={fetchAssignments}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : assignments.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No assignments yet</Text>
            </View>
          ) : (
            <FlatList
              data={assignments}
              renderItem={renderAssignmentItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              scrollEnabled={true}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: "80%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#6b7280",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  listContent: {
    padding: 12,
  },
  assignmentItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
  },
  assignmentHeader: {
    marginBottom: 8,
  },
  assignmentTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "white",
  },
  assignmentDescription: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 8,
    lineHeight: 18,
  },
  evaluationContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  evaluationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  evaluationLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  evaluationValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  submittedDate: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});
