"use client";

import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Pane } from "tweakpane";
import * as TweakpaneImagePlugin from "@kitschpatrol/tweakpane-plugin-image";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Submission, WidgetDefinition } from "../core/types";
import { TweakpaneBuilder } from "../core/TweakpaneBuilder";
import { SchemaProcessor } from "../core/SchemaProcessor";
import {
  uploadBase64Image,
  isBase64Image,
  getImageSizeFromBase64,
} from "@/lib/supabase/image-upload";
import AssignmentStudentsPanel from "./AssignmentStudentsPanel";
import DirectAssignStudentPanel from "./DirectAssignStudentPanel";
import { Button } from "@/components/ui/button";

export interface TeacherCreateAssignmentRef {
  getCurrentConfig: () => Record<string, any>;
  getCurrentConfigWithUploadedImages: () => Promise<Record<string, any>>;
}

interface TeacherCreateAssignmentProps {
  html: string;
  assignmentId?: string | null;
  targetStudentId?: string | null;
  targetStudentName?: string;
}

const TeacherCreateAssignment = forwardRef<
  TeacherCreateAssignmentRef,
  TeacherCreateAssignmentProps
>(({ html, assignmentId, targetStudentId, targetStudentName }, ref) => {
  const [widgetDef, setWidgetDef] = useState<WidgetDefinition | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeReady, setIframeReady] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [viewingAnswer, setViewingAnswer] = useState<any>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const paneInstanceRef = useRef<any>(null);
  const builderRef = useRef<TweakpaneBuilder | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Helper function to recursively find and upload base64 images
  const processConfigForSave = async (
    config: Record<string, any>,
    path: string = "root",
  ): Promise<Record<string, any>> => {
    const processed: Record<string, any> = {};
    let imageCount = 0;

    for (const [key, value] of Object.entries(config)) {
      const currentPath = `${path}.${key}`;

      if (typeof value === "string" && isBase64Image(value)) {
        imageCount++;
        const sizeKB = (getImageSizeFromBase64(value) / 1024).toFixed(2);

        setUploadProgress(`Đang upload ảnh ${imageCount} (${sizeKB} KB)...`);
        console.log(`📤 Uploading image for key: ${key} at ${currentPath}`);

        try {
          processed[key] = await uploadBase64Image(
            value,
            `${key}-${Date.now()}`,
          );
          console.log(`✅ Image uploaded: ${processed[key]}`);
        } catch (error) {
          console.error(`❌ Failed to upload image for ${key}:`, error);
          setUploadProgress(`⚠️ Lỗi upload ảnh ${key}, giữ nguyên base64`);
          processed[key] = value;
        }
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        processed[key] = await processConfigForSave(value, currentPath);
      } else if (Array.isArray(value)) {
        processed[key] = await Promise.all(
          value.map(async (item, index) => {
            if (typeof item === "string" && isBase64Image(item)) {
              imageCount++;
              const sizeKB = (getImageSizeFromBase64(item) / 1024).toFixed(2);
              setUploadProgress(
                `Đang upload ảnh ${imageCount} (${sizeKB} KB)...`,
              );

              try {
                return await uploadBase64Image(
                  item,
                  `${key}-${index}-${Date.now()}`,
                );
              } catch (error) {
                console.error(
                  `❌ Failed to upload array item ${index}:`,
                  error,
                );
                return item;
              }
            } else if (typeof item === "object" && item !== null) {
              return await processConfigForSave(
                item,
                `${currentPath}[${index}]`,
              );
            }
            return item;
          }),
        );
      } else {
        processed[key] = value;
      }
    }

    return processed;
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getCurrentConfig: () => {
      return config;
    },
    getCurrentConfigWithUploadedImages: async () => {
      console.log(
        "🔄 Processing config for save (uploading images to Supabase)...",
      );
      setUploadProgress("Đang chuẩn bị upload...");

      try {
        const processed = await processConfigForSave(config);
        setUploadProgress(null);
        console.log("✅ Config processed with uploaded images:", processed);
        return processed;
      } catch (error) {
        setUploadProgress(null);
        throw error;
      }
    },
  }));

  // Load widget HTML and communicate with iframe
  useEffect(() => {
    const loadWidget = async () => {
      setLoading(true);
      setError(null);
      setIframeReady(false);

      try {
        if (iframeRef.current) {
          iframeRef.current.srcdoc = html;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setLoading(false);
        console.error(err);
      }
    };

    loadWidget();
  }, [html]);

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log("🎬 Iframe loaded successfully");

      setTimeout(() => {
        setIframeReady(true);

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

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
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

      // Handle submission (for testing)
      if (event.data.type === "SUBMIT") {
        const submissionData: Submission = event.data.payload;
        console.log("✅ Submission received:", submissionData);
        setSubmission(submissionData);
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

  // Enter review mode (for testing)
  const enterReviewMode = () => {
    if (!submission || !config) return;

    console.log("🔍 Entering review mode with:", { config, submission });

    setIsReviewMode(true);

    // Gửi config + answer (không gửi evaluation!)
    sendMessage({
      type: "PARAMS_UPDATE",
      payload: {
        ...config,
        __answer: submission.answer,
      },
    });
  };

  // Exit review mode (for testing)
  const exitReviewMode = () => {
    console.log("🔙 Exiting review mode");
    setIsReviewMode(false);

    // Gửi lại config gốc KHÔNG CÓ __answer
    sendMessage({
      type: "PARAMS_UPDATE",
      payload: config,
    });

    // Clear submission để có thể submit lại
    setSubmission(null);
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

      // Lấy defaults từ schema
      const defaults = SchemaProcessor.extractDefaultsFromSchema(
        widgetDef.schema,
      );

      console.log("🎯 Starting config (defaults):", defaults);

      const handleConfigChange = (newConfig: Record<string, any>) => {
        console.log("🔄 Config changed:", newConfig);
        setConfig(newConfig);
        sendMessage({
          type: "PARAMS_UPDATE",
          payload: newConfig,
        });
      };

      const builder = new TweakpaneBuilder(
        pane,
        defaults,
        widgetDef.schema,
        handleConfigChange,
      );

      builder.build();
      builderRef.current = builder;

      setTimeout(async () => {
        const serializedConfig = await builder.serializeConfig(defaults);
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
      builderRef.current = null;
    };
  }, [widgetDef, iframeReady]);

  // Handle view answer from AssignmentStudentsPanel
  const handleViewAnswer = (answer: any) => {
    setViewingAnswer(answer);
    sendMessage({
      type: "PARAMS_UPDATE",
      payload: { ...config, __answer: answer },
    });
  };

  // Reset view to default config
  const handleResetView = () => {
    setViewingAnswer(null);
    sendMessage({ type: "PARAMS_UPDATE", payload: config });
  };

  return (
    <div className="bg-white flex h-full min-h-0">
      <div className="flex-1 p-2 min-h-0">
        {viewingAnswer && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between mx-auto max-w-2xl">
            <div className="text-sm text-blue-700">
              <strong>Đang xem bài làm của học sinh</strong>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetView}
              className="text-xs"
            >
              ← Quay lại
            </Button>
          </div>
        )}

        <div className="h-full max-w-2xl mx-auto bg-white rounded-4xl shadow-2xl overflow-hidden border border-gray-100">
          <iframe
            ref={iframeRef}
            className="w-full h-full min-h-100 min-w-[320px] border-0"
            title="Widget"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {loading && !error && (
          <div className="text-center mt-8 text-gray-400 flex items-center justify-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
            Đang tải widget...
          </div>
        )}

        {uploadProgress && (
          <div className="text-center mt-8 text-blue-600 flex items-center justify-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-300 border-t-blue-600 rounded-full" />
            {uploadProgress}
          </div>
        )}

        {error && (
          <div className="mt-8 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="font-bold text-red-800">Lỗi</div>
              <div className="text-sm text-red-600 mt-1">{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Tweakpane config OR AssignmentStudentsPanel */}
      {assignmentId ? (
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
          {targetStudentId && targetStudentName ? (
            <DirectAssignStudentPanel
              assignmentId={assignmentId}
              studentId={targetStudentId}
              studentName={targetStudentName}
            />
          ) : (
            <AssignmentStudentsPanel
              assignmentId={assignmentId}
              onViewAnswer={handleViewAnswer}
            />
          )}
        </div>
      ) : (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">
              Cấu hình & Kết quả
            </h3>
          </div>

          <div
            ref={paneRef}
            className="flex-1 overflow-y-auto p-4 text-sm text-slate-600"
          />

          {/* Submission Info (for testing) */}
          {submission && (
            <div className="border-t border-slate-200 p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                📊 Kết quả test
              </div>

              <div
                className={`p-3 rounded-lg ${
                  submission.evaluation.isCorrect
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {submission.evaluation.isCorrect ? (
                    <CheckCircle className="text-green-600" size={18} />
                  ) : (
                    <XCircle className="text-red-600" size={18} />
                  )}
                  <span
                    className={`font-semibold ${
                      submission.evaluation.isCorrect
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {submission.evaluation.isCorrect ? "Đúng" : "Sai"}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <div className="text-slate-700">
                    Điểm:{" "}
                    <strong>
                      {submission.evaluation.score}/
                      {submission.evaluation.maxScore}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Review Mode Toggle */}
              {!isReviewMode ? (
                <button
                  onClick={enterReviewMode}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
                >
                  🔍 Xem lại bài làm
                </button>
              ) : (
                <button
                  onClick={exitReviewMode}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
                >
                  ← Quay lại chế độ làm bài
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TeacherCreateAssignment.displayName = "TeacherCreateAssignment";

export default TeacherCreateAssignment;
