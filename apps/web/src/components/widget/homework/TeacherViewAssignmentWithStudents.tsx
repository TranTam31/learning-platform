"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
  User,
  XCircle,
} from "lucide-react";
import { Submission, WidgetDefinition } from "../core/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudentWithStatus {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  isAssigned: boolean; // NEW: Đã được giao bài chưa
  hasSubmitted: boolean; // Đã làm bài chưa
  submission: {
    id: string;
    submittedAt: string | null;
    evaluation: {
      isCorrect: boolean;
      score: number;
      maxScore: number;
    };
    answer: any;
  } | null;
}

interface TeacherViewAssignmentWithStudentsProps {
  assignmentId: string;
  html: string;
  initialConfig: Record<string, any>;
}

export default function TeacherViewAssignmentWithStudents({
  assignmentId,
  html,
  initialConfig,
}: TeacherViewAssignmentWithStudentsProps) {
  const [widgetDef, setWidgetDef] = useState<WidgetDefinition | null>(null);
  const [config] = useState<Record<string, any>>(initialConfig);
  const [error, setError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Students data
  const [students, setStudents] = useState<StudentWithStatus[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    pending: 0,
    assigned: 0,
  });
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [viewingAnswer, setViewingAnswer] = useState<any>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Helper to send messages
  const sendMessage = (message: any) => {
    const iframe = iframeRef.current;

    if (iframe?.contentWindow) {
      try {
        // console.log("📤 Sending to widget:", message.type);
        iframe.contentWindow.postMessage(message, "*");
      } catch (err) {
        console.error("❌ Failed to send message:", err);
      }
    } else {
      console.log("⏳ Queuing message (iframe not ready):", message.type);
      messageQueueRef.current.push(message);
    }
  };

  // Load students list
  const loadStudents = async () => {
    try {
      setLoadingStudents(true);

      const res = await fetch(`/api/class/assignment/${assignmentId}/students`);

      if (!res.ok) {
        throw new Error("Không thể tải danh sách học sinh");
      }

      const data = await res.json();
      setStudents(data.students);
      //   console.log("student", data.students);
      setStats(data.stats);
    } catch (err) {
      console.error("Load students error:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, [assignmentId]);

  // Assign to student
  const handleAssignToStudent = async (studentId: string) => {
    setAssigningTo(studentId);

    try {
      const res = await fetch(`/api/class/assignment/${assignmentId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Không thể giao bài");
      }

      // Reload students list
      await loadStudents();
    } catch (err) {
      console.error("Assign error:", err);
      alert(
        "❌ " + (err instanceof Error ? err.message : "Không thể giao bài"),
      );
    } finally {
      setAssigningTo(null);
    }
  };

  // View student answer
  const handleViewAnswer = (answer: any) => {
    setViewingAnswer(answer);

    // Send config + answer to iframe
    sendMessage({
      type: "PARAMS_UPDATE",
      payload: {
        ...config,
        __answer: answer,
      },
    });
  };

  // Reset to default view
  const handleResetView = () => {
    setViewingAnswer(null);
    sendMessage({
      type: "PARAMS_UPDATE",
      payload: config,
    });
  };

  // Load widget HTML into iframe
  useEffect(() => {
    if (!html) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    setIframeReady(false);

    const handleLoad = () => {
      //   console.log("🎬 Iframe loaded successfully");

      setTimeout(() => {
        setIframeReady(true);

        if (messageQueueRef.current.length > 0) {
          console.log(
            `📨 Flushing ${messageQueueRef.current.length} queued messages`,
          );
          messageQueueRef.current.forEach((msg) => {
            sendMessage(msg);
          });
          messageQueueRef.current = [];
        }
      }, 300);
    };

    iframe.addEventListener("load", handleLoad);
    iframe.srcdoc = html;

    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [html]);

  // Listen to widget messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "WIDGET_READY") {
        const def = event.data.payload;
        // console.log("📦 Widget definition received:", def);
        setWidgetDef(def);
      }

      if (event.data.type === "EVENT") {
        // console.log("📣 Widget event:", event.data.event, event.data.payload);
      }

      if (event.data.type === "ERROR") {
        console.error("❌ Widget error:", event.data.payload);
        setError(event.data.payload?.message || "Widget error");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Send initial config when iframe ready
  useEffect(() => {
    if (!iframeReady || !widgetDef) return;

    // console.log("📤 Sending initial config to widget");

    sendMessage({
      type: "PARAMS_UPDATE",
      payload: config,
    });
  }, [iframeReady, widgetDef, config]);

  return (
    <div className="flex h-full min-h-0">
      {/* LEFT: Widget iframe */}
      <div className="flex-1 p-4 min-h-0 bg-slate-50">
        {viewingAnswer && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
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

        <div className="h-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Widget"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="font-bold text-red-800">Lỗi</div>
              <div className="text-sm text-red-600 mt-1">{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Students list */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">
            Danh sách học sinh
          </h3>
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            <div>
              Đã giao: {stats.assigned}/{stats.total}
            </div>
            <div>
              Đã nộp: {stats.submitted}/{stats.assigned || stats.total}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingStudents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              Chưa có học sinh trong lớp
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`p-3 rounded-lg border ${
                    student.hasSubmitted
                      ? "bg-green-50 border-green-200"
                      : student.isAssigned
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={student.imageUrl || undefined} />
                      <AvatarFallback>
                        <User size={18} />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-700 truncate">
                        {student.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {student.email}
                      </div>

                      {/* CASE 1: Đã làm bài */}
                      {student.hasSubmitted && student.submission ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            {student.submission.evaluation?.isCorrect ? (
                              <CheckCircle
                                className="text-green-600"
                                size={16}
                              />
                            ) : (
                              <XCircle className="text-red-600" size={16} />
                            )}
                            <span className="text-xs font-semibold">
                              {student.submission.evaluation?.score || 0}/
                              {student.submission.evaluation?.maxScore || 100}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() =>
                              handleViewAnswer(student.submission!.answer)
                            }
                          >
                            👁️ Xem bài làm
                          </Button>

                          <div className="text-xs text-slate-500">
                            {student.submission.submittedAt &&
                              new Date(
                                student.submission.submittedAt,
                              ).toLocaleString("vi-VN")}
                          </div>
                        </div>
                      ) : student.isAssigned ? (
                        /* CASE 2: Đã giao bài nhưng chưa làm */
                        <div className="mt-2">
                          <div className="text-xs text-amber-600 font-medium mb-1">
                            ⏳ Đã giao - Chưa làm
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-xs"
                            disabled
                          >
                            Chờ học sinh làm bài...
                          </Button>
                        </div>
                      ) : (
                        /* CASE 3: Chưa giao bài */
                        <Button
                          size="sm"
                          className="w-full mt-2 text-xs bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleAssignToStudent(student.id)}
                          disabled={assigningTo === student.id}
                        >
                          {assigningTo === student.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Đang giao...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3 mr-1" />
                              Giao bài
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
