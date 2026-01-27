"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TeacherViewAssignment from "./TeacherViewAssignment";

interface TeacherViewAssignmentViewProps {
  assignmentId: string; // ClassLessonNode.id
}

export default function TeacherViewAssignmentDialog({
  assignmentId,
}: TeacherViewAssignmentViewProps) {
  const [widgetHtml, setWidgetHtml] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState<Record<string, any> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load assignment data
  useEffect(() => {
    const loadAssignment = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("📚 Loading assignment:", assignmentId);

        // 1️⃣ Load assignment info (ClassLessonNode) + widget info (LessonNode)
        const assignmentRes = await fetch(
          `/api/class/assignment/${assignmentId}`,
        );

        if (!assignmentRes.ok) {
          const errorData = await assignmentRes.json();
          throw new Error(errorData.error || "Không thể tải bài tập");
        }

        const assignmentData: {
          assignmentId: string;
          classId: string;
          lessonNodeId: string;
          savedConfig: Record<string, any> | null;
          widgetId: string;
          buildRunId: string;
        } = await assignmentRes.json();

        console.log("📦 Assignment data:", assignmentData);

        // Kiểm tra có config chưa
        if (!assignmentData.savedConfig) {
          throw new Error("Bài tập chưa được cấu hình bởi giáo viên");
        }

        setSavedConfig(assignmentData.savedConfig);

        // 2️⃣ Load widget HTML
        const widgetRes = await fetch(
          `/api/widgets/${assignmentData.widgetId}/preview?buildRunId=${assignmentData.buildRunId}`,
        );

        if (!widgetRes.ok) {
          throw new Error("Không thể tải widget");
        }

        const widgetData: { html: string } = await widgetRes.json();

        console.log("✅ Widget HTML loaded");
        setWidgetHtml(widgetData.html);
      } catch (err) {
        console.error("❌ Load assignment error:", err);
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="text-lg text-muted-foreground">
          Đang tải bài tập...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-red-500 text-lg font-semibold">⚠️ {error}</div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Vui lòng liên hệ giáo viên hoặc thử lại sau
        </p>
      </div>
    );
  }

  if (!widgetHtml || !savedConfig) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Không có dữ liệu bài tập
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="px-2! py-1! bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200">
          <span className="hidden sm:inline">Show Assignment</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[90vw]! h-[95vh]! max-w-none! p-1! flex! flex-col! min-h-0!">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle>Review Assignment</DialogTitle>
        </DialogHeader>

        {/* BODY */}
        {loading ? (
          <div className="flex justify-center pt-15 w-full h-full gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="text-lg">Loading...</span>
          </div>
        ) : widgetHtml ? (
          <div className="flex-1 overflow-auto min-h-0">
            <TeacherViewAssignment
              html={widgetHtml}
              initialConfig={savedConfig}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No preview available
          </div>
        )}
      </DialogContent>
    </Dialog>

    // <div className="h-full w-full">
    //   <WidgetPreview
    //     ref={widgetPreviewRef}
    //     html={widgetHtml}
    //     initialConfig={savedConfig}
    //     mode="student"
    //   />
    // </div>
  );
}
