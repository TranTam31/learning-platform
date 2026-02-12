"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectAssignStudentPanelProps {
  assignmentId: string;
  studentId: string;
  studentName: string;
  onAssigned?: () => void;
}

export default function DirectAssignStudentPanel({
  assignmentId,
  studentId,
  studentName,
  onAssigned,
}: DirectAssignStudentPanelProps) {
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/class/assignment/${assignmentId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể giao bài");
      }
      setAssigned(true);
      onAssigned?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">Giao bài tập</h3>
        <p className="text-xs text-slate-500 mt-1">
          Giao trực tiếp cho học sinh đang xem
        </p>
      </div>

      <div className="p-4 flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-orange-600">
              {studentName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="font-medium text-slate-700">{studentName}</div>
        </div>

        {assigned ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle size={20} />
            Đã giao bài thành công!
          </div>
        ) : (
          <Button
            onClick={handleAssign}
            disabled={assigning}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {assigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang giao...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Giao bài cho {studentName}
              </>
            )}
          </Button>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}
      </div>
    </div>
  );
}
