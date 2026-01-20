"use client";

import { useState, useEffect, useRef } from "react";
import { Pane } from "tweakpane";
import * as TweakpaneImagePlugin from "@kitschpatrol/tweakpane-plugin-image";
import { ArrowLeft, AlertCircle, Link } from "lucide-react";
import { SchemaProcessor } from "@/components/widget/core/SchemaProcessor";
import { TweakpaneBuilder } from "@/components/widget/core/TweakpaneBuilder";
import { WidgetDefinition } from "@/components/widget/core/types";

// ============================================================
// WIDGET VALIDATOR - CHỈ SỬA HÀM NÀY
// ============================================================
async function validateWidget(url: string): Promise<{
  valid: boolean;
  error?: string;
  errorType?: "cors" | "network" | "timeout" | "invalid";
}> {
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
        error:
          "Widget không phản hồi trong 2 giây. Đây không phải widget hợp lệ của Widget Studio (thiếu event WIDGET_READY)",
        errorType: "timeout",
      });
    }, 2000);

    // Listen for load errors
    iframe.onerror = () => {
      cleanup();
      resolve({
        valid: false,
        error: "Không thể tải widget từ URL này",
        errorType: "network",
      });
    };

    window.addEventListener("message", messageListener);
    document.body.appendChild(iframe);

    // SỬA: Load URL trực tiếp thay vì fetch HTML
    iframe.src = url;
  });
}

export default function WidgetPreviewPage() {
  const [widgetUrl, setWidgetUrl] = useState<string>("");
  const [inputUrl, setInputUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [validating, setValidating] = useState(false);

  const handleLoadWidget = async () => {
    setError("");

    // Validate URL format
    if (!inputUrl.trim()) {
      setError("Vui lòng nhập URL của widget");
      return;
    }

    try {
      new URL(inputUrl);
    } catch (err) {
      setError("URL không hợp lệ.");
      return;
    }

    // Validate widget
    setValidating(true);
    const result = await validateWidget(inputUrl);
    setValidating(false);

    if (!result.valid) {
      setError(result.error || "Widget không hợp lệ");
      return;
    }

    // All good, load widget
    setWidgetUrl(inputUrl);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !validating) {
      handleLoadWidget();
    }
  };

  if (widgetUrl) {
    return <WidgetHost widgetUrl={widgetUrl} onExit={() => setWidgetUrl("")} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex justify-center p-6">
      <div className="max-w-2xl w-full">
        <header className="text-center mb-10 mt-20">
          <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Widget Studio
          </h1>
        </header>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Link className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Nhập URL Widget
              </h2>
              <p className="text-sm text-gray-500">
                Dán link widget để bắt đầu
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="http://localhost:5173"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-gray-700"
              disabled={validating}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle
                  className="text-red-500 shrink-0 mt-0.5"
                  size={18}
                />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleLoadWidget}
              disabled={validating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {validating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Đang kiểm tra widget...
                </>
              ) : (
                "Tải Widget"
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="font-semibold">Lưu ý:</span> Widget phải là file
              HTML tự chứa (self-contained) và tuân theo Widget Protocol của
              Widget Studio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WIDGET HOST - CHỈ SỬA COMPONENT NÀY
// ============================================================
function WidgetHost({
  widgetUrl,
  onExit,
}: {
  widgetUrl: string;
  onExit: () => void;
}) {
  const [widgetDef, setWidgetDef] = useState<WidgetDefinition | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeReady, setIframeReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const paneInstanceRef = useRef<any>(null);
  const messageQueueRef = useRef<any[]>([]);

  // SỬA: Load widget bằng src thay vì fetch + srcdoc
  useEffect(() => {
    if (!iframeRef.current) return;

    console.log(`📥 Loading widget from: ${widgetUrl}`);
    setLoading(true);
    setError(null);
    setIframeReady(false);

    // Load URL trực tiếp - cho phép hot reload
    iframeRef.current.src = widgetUrl;
  }, [widgetUrl]);

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log("🎬 Iframe loaded successfully");

      setTimeout(() => {
        setIframeReady(true);

        // Flush message queue
        if (messageQueueRef.current.length > 0) {
          console.log(
            `📨 Flushing ${messageQueueRef.current.length} queued messages`,
          );
          messageQueueRef.current.forEach((msg) => {
            iframe.contentWindow?.postMessage(msg, "*");
          });
          messageQueueRef.current = [];
        }
      }, 300);
    };

    const handleError = () => {
      console.error("❌ Iframe failed to load");
      setError("Không thể tải widget từ URL này");
      setLoading(false);
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };
  }, []);

  // Listen to widget messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "WIDGET_READY") {
        const def = event.data.payload;
        console.log("📦 Widget definition received:", def);
        setWidgetDef(def);
        setLoading(false);
        setError(null);
      }

      if (event.data.type === "EVENT") {
        console.log("📣 Widget event:", event.data.event, event.data.payload);
      }

      if (event.data.type === "ERROR") {
        console.error("❌ Widget error:", event.data.payload);
        setError(event.data.payload?.message || "Widget error");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Helper to send messages
  const sendMessage = (message: any) => {
    if (iframeRef.current?.contentWindow && iframeReady) {
      console.log("📤 Sending to widget:", message.type);
      iframeRef.current.contentWindow.postMessage(message, "*");
    } else {
      console.log("⏳ Queuing message (iframe not ready):", message.type);
      messageQueueRef.current.push(message);
    }
  };

  // Setup Tweakpane when widget definition is ready
  useEffect(() => {
    if (!widgetDef || !paneRef.current) return;

    if (paneInstanceRef.current) {
      paneInstanceRef.current.dispose();
    }

    try {
      const pane = new Pane({
        container: paneRef.current,
        title: "Widget Parameters",
      });

      pane.registerPlugin(TweakpaneImagePlugin);
      paneInstanceRef.current = pane;

      const initialConfig = SchemaProcessor.extractDefaultsFromSchema(
        widgetDef.schema,
      );

      console.log("🎯 Initial config extracted:", initialConfig);

      const handleConfigChange = (newConfig: Record<string, any>) => {
        console.log("🔄 Config changed, sending to widget");
        setConfig(newConfig);
        console.log(config);
        sendMessage({
          type: "PARAMS_UPDATE",
          payload: newConfig,
        });
      };

      const builder = new TweakpaneBuilder(
        pane,
        initialConfig,
        widgetDef.schema,
        handleConfigChange,
      );

      builder.build();

      setTimeout(async () => {
        const serializedConfig = await builder.serializeConfig(initialConfig);
        handleConfigChange(serializedConfig);
      }, 100);
    } catch (err) {
      console.error("❌ Tweakpane setup error:", err);
      setError(err instanceof Error ? err.message : "Setup failed");
    }

    return () => {
      if (paneInstanceRef.current) {
        paneInstanceRef.current.dispose();
        paneInstanceRef.current = null;
      }
    };
  }, [widgetDef, iframeReady]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex">
      {/* MAIN CONTENT */}
      <div className="flex-1 px-12 py-2">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 mb-3 px-4 py-2 rounded-full 
                 text-sm font-medium text-slate-600 
                 bg-white shadow hover:text-slate-900 hover:shadow-md transition"
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>

          {/* Widget Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="h-[620px]">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="Widget"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && !error && (
          <div className="mt-6 flex items-center justify-center gap-3 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <span className="text-sm">Đang tải widget...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <div className="font-semibold text-red-700">Có lỗi xảy ra</div>
              <div className="text-sm text-red-600 mt-1">{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">
            Thông tin / Cấu hình
          </h3>
        </div>

        {/* Sidebar content */}
        <div
          ref={paneRef}
          className="flex-1 overflow-y-auto p-4 text-sm text-slate-600"
        />
      </div>
    </div>
  );
}
