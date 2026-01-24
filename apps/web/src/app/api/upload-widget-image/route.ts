// app/api/upload-widget-image/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Dùng service role để có full permissions
);

export async function POST(request: Request) {
  try {
    const { base64Data, fileName } = await request.json();

    if (!base64Data) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 },
      );
    }

    // Convert base64 to buffer
    const base64String = base64Data.split(",")[1]; // Remove "data:image/png;base64," prefix
    const buffer = Buffer.from(base64String, "base64");

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension =
      base64Data.match(/data:image\/([a-zA-Z]*);/)?.[1] || "png";
    const uniqueFileName = fileName
      ? `${timestamp}-${randomString}-${fileName}`
      : `${timestamp}-${randomString}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("widget-images")
      .upload(uniqueFileName, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("widget-images")
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
      size: buffer.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
