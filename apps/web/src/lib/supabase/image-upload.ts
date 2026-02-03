// lib/image-upload.ts
export async function uploadBase64Image(
  base64Data: string,
  fileName?: string,
): Promise<string> {
  try {
    console.log("📤 Uploading image to Supabase...");

    const uploadRes = await fetch("/api/upload-widget-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Data, fileName }),
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json();
      throw new Error(errorData.error || "Upload failed");
    }

    const data = await uploadRes.json();
    console.log("✅ Image uploaded successfully:", data.url);
    return data.url;
  } catch (error) {
    console.error("❌ Image upload error:", error);
    throw error;
  }
}

export function isBase64Image(str: string): boolean {
  return typeof str === "string" && str.startsWith("data:image/");
}

export function getImageSizeFromBase64(base64: string): number {
  // Calculate approximate size in bytes
  const base64String = base64.split(",")[1];
  return Math.ceil((base64String.length * 3) / 4);
}
