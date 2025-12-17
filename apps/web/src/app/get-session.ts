import { authClient } from "@/lib/auth-client";
import { headers } from "next/headers";

const { data: session } = await authClient.getSession({
  fetchOptions: {
    headers: await headers(),
  },
});

export default session;
