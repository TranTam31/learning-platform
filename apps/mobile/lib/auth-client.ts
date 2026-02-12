import { createAppAuthClient } from "@repo/auth/client";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAppAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BETTER_AUTH_URL!,
  plugins: [
    expoClient({
      scheme: "mobile",
      storagePrefix: "mobile",
      storage: SecureStore,
    }),
  ],
});
