import { auth } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Custom handler that avoids the `#state` private-field crash on Vercel.
 *
 * `toNextJsHandler` passes the original Next.js `Request`/`Headers` objects
 * (backed by undici) straight into better-auth.  When the `expo()` plugin
 * clones or wraps them it hits a different copy of the `Headers` class ⇒
 * "Cannot read private member #state".
 *
 * By rebuilding a plain `Request` with a simple `Headers` we guarantee a
 * single class identity that better-auth can manipulate safely.
 */
async function handler(req: NextRequest) {
  // Rebuild headers as a plain object so better-auth never touches
  // Node/undici's internal #state field.
  const plainHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    plainHeaders[key] = value;
  });

  const url = req.nextUrl.toString();
  const body =
    req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : undefined;

  const freshRequest = new Request(url, {
    method: req.method,
    headers: plainHeaders,
    body,
    // @ts-expect-error — Next.js supports duplex but types lag behind
    duplex: body ? "half" : undefined,
  });

  const response = await auth.handler(freshRequest);

  return response;
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}
