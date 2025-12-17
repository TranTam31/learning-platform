// "use client";

import { authClient } from "@/lib/auth-client";
import { headers } from "next/headers";

export default async function Home() {
  const { data: session, error } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });
  console.log(session);

  // if (isLoading) {
  //   return (
  //     <div className="flex justify-center items-center min-h-screen">
  //       Loading...
  //     </div>
  //   );
  // }

  if (session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome!</h1>
          <p className="mb-4">You are signed in as: {session.user?.email}</p>
          <button
            // onClick={() => authClient.signOut()}
            className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>Hahaha</>;
}
