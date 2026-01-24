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
import { AlertCircle } from "lucide-react";
import { WidgetDefinition } from "../core/types";
import { TweakpaneBuilder } from "../core/TweakpaneBuilder";
import { SchemaProcessor } from "../core/SchemaProcessor";
import {
  uploadBase64Image,
  isBase64Image,
  getImageSizeFromBase64,
} from "@/lib/supabase/image-upload";

export interface WidgetPreviewRef {
  getCurrentConfig: () => Record<string, any>;
  getCurrentConfigWithUploadedImages: () => Promise<Record<string, any>>;
  loadConfig: (config: Record<string, any>) => void;
}

interface WidgetPreviewProps {
  html: string;
  initialConfig?: Record<string, any> | null;
}

const WidgetPreview = forwardRef<WidgetPreviewRef, WidgetPreviewProps>(
  ({ html, initialConfig }, ref) => {
    const [widgetDef, setWidgetDef] = useState<WidgetDefinition | null>(null);
    const [config, setConfig] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [iframeReady, setIframeReady] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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
          // Upload base64 image and replace with URL
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
            // Keep original base64 as fallback
            processed[key] = value;
          }
        } else if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          // Recursively process nested objects
          processed[key] = await processConfigForSave(value, currentPath);
        } else if (Array.isArray(value)) {
          // Process arrays
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
        setUploadProgress("Preparing...");

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
      loadConfig: async (newConfig: Record<string, any>) => {
        if (!builderRef.current || !widgetDef) return;

        try {
          const defaults = SchemaProcessor.extractDefaultsFromSchema(
            widgetDef.schema,
          );
          const mergedConfig = { ...defaults, ...newConfig };

          setConfig(mergedConfig);
          builderRef.current.updateConfig(mergedConfig);

          sendMessage({
            type: "PARAMS_UPDATE",
            payload: mergedConfig,
          });
        } catch (err) {
          console.error("❌ Failed to load config:", err);
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

        const defaults = SchemaProcessor.extractDefaultsFromSchema(
          widgetDef.schema,
        );

        const startingConfig = initialConfig
          ? { ...defaults, ...initialConfig }
          : defaults;

        console.log("🎯 Starting config:", startingConfig);

        const handleConfigChange = (newConfig: Record<string, any>) => {
          console.log("Config changed:", newConfig);
          setConfig(newConfig);
          sendMessage({
            type: "PARAMS_UPDATE",
            payload: newConfig,
          });
        };

        const builder = new TweakpaneBuilder(
          pane,
          startingConfig,
          widgetDef.schema,
          handleConfigChange,
        );

        builder.build();
        builderRef.current = builder;

        setTimeout(async () => {
          const serializedConfig =
            await builder.serializeConfig(startingConfig);
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
    }, [widgetDef, iframeReady, initialConfig]);

    return (
      <div className="bg-white flex h-full min-h-0">
        <div className="flex-1 p-2 min-h-0">
          <div className="h-full max-w-2xl mx-auto bg-white rounded-4xl shadow-2xl overflow-hidden border border-gray-100">
            <iframe
              ref={iframeRef}
              className="w-full h-full min-h-[400px] min-w-[320px] border-0"
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

        <div className="w-80 bg-white border-l p-4 shadow-lg flex flex-col">
          <div className="flex-1 overflow-y-auto" ref={paneRef} />
        </div>
      </div>
    );
  },
);

WidgetPreview.displayName = "WidgetPreview";

export default WidgetPreview;
