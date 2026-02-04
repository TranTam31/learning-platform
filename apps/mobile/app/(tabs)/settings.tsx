import { authClient } from "@/lib/auth-client";
import {
  Image,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  LogOutIcon,
  AlertCircle,
  User,
  Mail,
  CheckCircle,
} from "lucide-react-native";
import { useState } from "react";

export default function SettingsTab() {
  const { data: session } = authClient.useSession();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setError("");
    setSuccess("");
    setLoading(true);

    const { error: signOutError } = await authClient.signOut();
    setLoading(false);

    if (signOutError) {
      setError(signOutError.message || "Sign out failed. Please try again.");
    } else {
      setSuccess("Signed out successfully!");
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="pt-12 px-6 pb-8">
        {/* Header */}
        <Text className="text-3xl font-bold text-gray-900 mb-2">Settings</Text>
        <Text className="text-base text-gray-600 mb-8">
          Manage your account information
        </Text>

        {/* Error Message */}
        {error ? (
          <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <AlertCircle className="size-5 text-red-500 mr-3" />
            <Text className="flex-1 text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Success Message */}
        {success ? (
          <View className="flex-row items-center bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <CheckCircle className="size-5 text-green-500 mr-3" />
            <Text className="flex-1 text-green-700 text-sm">{success}</Text>
          </View>
        ) : null}

        {/* Profile Card */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          {/* Avatar */}
          <View className="items-center mb-6">
            {session?.user.image ? (
              <Image
                source={{ uri: session.user.image }}
                className="w-24 h-24 rounded-full border-4 border-blue-100"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 items-center justify-center border-4 border-blue-100">
                <User className="size-12 text-white" />
              </View>
            )}
          </View>

          {/* User Info */}
          <View className="space-y-4">
            {/* Name */}
            {session?.user.name && (
              <View className="flex-row items-center bg-gray-50 rounded-xl p-4">
                <User className="size-5 text-gray-500 mr-3" />
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Name</Text>
                  <Text className="text-base font-medium text-gray-900">
                    {session.user.name}
                  </Text>
                </View>
              </View>
            )}

            {/* Email */}
            <View className="flex-row items-center bg-gray-50 rounded-xl p-4">
              <Mail className="size-5 text-gray-500 mr-3" />
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Email</Text>
                <Text className="text-base font-medium text-gray-900">
                  {session?.user.email || "No email available"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          disabled={loading}
          className="flex-row items-center justify-center gap-3 bg-gray-400 rounded-xl py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <LogOutIcon className="size-5 text-white mr-2" />
              <Text className="text-white font-semibold text-base">
                Sign out
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
