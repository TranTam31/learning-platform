import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function Index() {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      console.log("logged in user:", session.user.id);
    }
  }, [session]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleLogin = async () => {
    await authClient.signIn.email({
      email,
      password,
    });
  };

  return (
    <View>
      <Text>Welcome, {session?.user.name}</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        onPress={handleLogin}
        style={{ padding: 12, backgroundColor: "#007AFF" }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>Login</Text>
      </Pressable>
    </View>
  );
}
