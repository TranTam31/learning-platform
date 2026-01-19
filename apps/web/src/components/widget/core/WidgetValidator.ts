export async function validateWidget(url: string): Promise<{
  valid: boolean;
  error?: string;
  errorType?: "cors" | "network" | "timeout" | "invalid";
}> {
  try {
    // Step 1: Fetch HTML content
    console.log(`🔍 Validating widget: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      return {
        valid: false,
        error: `Không thể tải widget: ${response.status} ${response.statusText}`,
        errorType: "network",
      };
    }

    const htmlContent = await response.text();

    // Step 2: Load in hidden iframe and wait for WIDGET_READY
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.sandbox.add("allow-scripts");
      iframe.sandbox.add("allow-same-origin");

      let timeout: NodeJS.Timeout;
      let messageListener: (event: MessageEvent) => void;

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", messageListener);
        document.body.removeChild(iframe);
      };

      messageListener = (event: MessageEvent) => {
        if (event.data.type === "WIDGET_READY") {
          console.log("✅ Widget validation successful");
          cleanup();
          resolve({ valid: true });
        }
      };

      timeout = setTimeout(() => {
        console.log("❌ Widget validation timeout");
        cleanup();
        resolve({
          valid: false,
          error: "Widget không hợp lệ!",
          errorType: "timeout",
        });
      }, 2000);

      window.addEventListener("message", messageListener);
      document.body.appendChild(iframe);
      iframe.srcdoc = htmlContent;
    });
  } catch (err) {
    console.error("❌ Widget validation error:", err);

    // Check if it's a CORS error
    if (err instanceof TypeError && err.message.includes("fetch")) {
      return {
        valid: false,
        error:
          "Lỗi CORS: Server không cho phép truy cập từ domain này. Kiểm tra cấu hình CORS hoặc sử dụng URL khác",
        errorType: "cors",
      };
    }

    return {
      valid: false,
      error: err instanceof Error ? err.message : "Lỗi không xác định",
      errorType: "network",
    };
  }
}
