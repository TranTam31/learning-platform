import { authClient } from "@/lib/auth-client";
import { LogInIcon, AlertCircle } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    // Validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });
    setLoading(false);

    if (authError) {
      setError(
        authError.message ||
          "Login failed. Please check your credentials and try again.",
      );
    }
  };

  return (
    <View className="flex-1 bg-linear-to-b from-blue-50 to-white">
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="mb-10">
          <Text className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back
          </Text>
          <Text className="text-base text-gray-600">Sign in to continue</Text>
        </View>

        {/* Error Message */}
        {error ? (
          <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <AlertCircle className="size-5 text-red-500 mr-3" />
            <Text className="flex-1 text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Email Input */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
          <TextInput
            placeholder="example@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </View>

        {/* Password Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Password
          </Text>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError("");
            }}
            secureTextEntry
            autoComplete="password"
            className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </View>

        {/* Login Button */}
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="flex-row items-center justify-center gap-3 bg-gray-400 rounded-xl py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <LogInIcon className="size-5 text-white mr-2" />
              <Text className="text-white font-semibold text-base">
                Sign in
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
