import { authClient } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/config/api";
import { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Settings } from "lucide-react-native";

interface ClassData {
  id: string;
  name: string;
  createdAt: string;
  course?: {
    id: string;
    name: string;
  };
  _count?: {
    members: number;
  };
}

export default function IndexTab() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClasses = async () => {
    try {
      // Lấy session token từ better-auth
      const { data: session } = await authClient.getSession();

      if (!session?.session.token) {
        throw new Error("No session token available");
      }

      const response = await fetch(`${API_BASE_URL}/api/mobile/classes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.session.token}`, // Gửi token
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isPending && session?.user) {
      fetchClasses();
    }
  }, [session, isPending]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClasses();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const renderClassItem = ({ item }: { item: ClassData }) => (
    <Pressable
      style={styles.classCard}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/class-detail",
          params: { classId: item.id },
        })
      }
    >
      <Text style={styles.className}>{item.name}</Text>
      {item.course && <Text style={styles.courseName}>{item.course.name}</Text>}
      <Text style={styles.memberCount}>
        {item._count?.members || 0} members
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.centerText}>No classes enrolled yet</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.fabText}>
          <Settings className="size-5 text-white mr-2" />
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  classCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  className: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  courseName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 12,
    color: "#999",
  },
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center",
    right: 20,
    bottom: 30,
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 30,
  },
});
