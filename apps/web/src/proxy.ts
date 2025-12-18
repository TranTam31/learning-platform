// import { NextRequest, NextResponse } from "next/server";
// import { headers } from "next/headers";
// import { authClient } from "./lib/auth-client";

// // 1. Specify protected and public routes
// const protectedRoutes = ["/dashboard"];
// const publicRoutes = ["/login", "/signup", "/"];

// export default async function proxy(req: NextRequest) {
//   // 2. Check if the current route is protected or public
//   const path = req.nextUrl.pathname;
//   const isProtectedRoute = protectedRoutes.includes(path);
//   const isPublicRoute = publicRoutes.includes(path);

//   // 3. Decrypt the session from the cookie
//   const { data: session, error } = await authClient.getSession({
//     fetchOptions: {
//       headers: await headers(),
//     },
//   });

//   // 4. Redirect to /login if the user is not authenticated
//   if (isProtectedRoute && !session?.user) {
//     return NextResponse.redirect(new URL("/login", req.nextUrl));
//   }

//   // 5. Redirect to /dashboard if the user is authenticated
//   if (
//     isPublicRoute &&
//     session?.user &&
//     !req.nextUrl.pathname.startsWith("/dashboard")
//   ) {
//     return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
//   }

//   return NextResponse.next();
// }

// // Routes Proxy should not run on
// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
// };

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "./lib/auth-server";

// 1. Chỉ định các route công khai
// Các route KHÔNG nằm trong danh sách này sẽ mặc định được bảo vệ
const publicRoutes = ["/signin", "/signup", "/"];

export default async function proxy(req: NextRequest) {
  // 2. Kiểm tra xem route hiện tại có phải là route công khai không
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  // Route được bảo vệ là route KHÔNG phải là route công khai
  const isProtectedRoute = !isPublicRoute;

  // 3. Giải mã session từ cookie
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // 4. Chuyển hướng đến /signin nếu route được bảo vệ VÀ người dùng chưa xác thực
  if (isProtectedRoute && !session?.user) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl));
  }

  // 5. Chuyển hướng đến /dashboard nếu người dùng đã xác thực VÀ đang cố gắng truy cập route công khai
  if (
    isPublicRoute &&
    session?.user &&
    // Thêm điều kiện này để tránh vòng lặp chuyển hướng khi ở /dashboard
    !req.nextUrl.pathname.startsWith("/dashboard")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Proxy nên chạy trên
export const config = {
  // Config này giữ nguyên và rất quan trọng để loại trừ các API routes, assets, ...
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
