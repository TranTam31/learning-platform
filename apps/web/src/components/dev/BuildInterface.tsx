// components/BuildInterface.tsx

"use client";

import { useState, useEffect } from "react";

interface Widget {
  id: string;
  name: string;
  repoFullName: string;
  branch: string;
  buildStatus: string;
}

export default function BuildInterface({
  widget: initialWidget,
}: {
  widget: Widget;
}) {
  const [widget, setWidget] = useState(initialWidget);
  const [building, setBuilding] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Poll for status updates
  useEffect(() => {
    if (widget.buildStatus === "building") {
      const interval = setInterval(async () => {
        const response = await fetch(`/api/widgets/${widget.id}/status`);
        const data = await response.json();

        setWidget(data.widget);

        if (data.widget.buildStatus !== "building") {
          clearInterval(interval);
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [widget.buildStatus, widget.id]);

  async function startBuild() {
    setBuilding(true);
    setLogs(["Starting build..."]);

    try {
      const response = await fetch("/api/widgets/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId: widget.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Build failed to start");
      }

      setLogs((prev) => [...prev, "✅ Build triggered successfully"]);
      setLogs((prev) => [...prev, "⏳ Waiting for GitHub Actions..."]);

      setWidget({ ...widget, buildStatus: "building" });
    } catch (error: any) {
      setLogs((prev) => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Build Widget
            </h1>
            <a
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Widget Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {widget.name}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Repository:</span>
              <p className="font-medium text-gray-900">{widget.repoFullName}</p>
            </div>
            <div>
              <span className="text-gray-600">Branch:</span>
              <p className="font-medium text-gray-900">{widget.branch}</p>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <p className="font-medium">
                <StatusBadge status={widget.buildStatus} />
              </p>
            </div>
          </div>
        </div>

        {/* Build Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Build Controls
            </h3>
            <button
              onClick={startBuild}
              disabled={building || widget.buildStatus === "building"}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {widget.buildStatus === "building"
                ? "Building..."
                : "Start Build"}
            </button>
          </div>

          {widget.buildStatus === "building" && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Build in progress on GitHub Actions...</span>
            </div>
          )}
        </div>

        {/* Build Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Build Logs
          </h3>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">
                No logs yet. Click "Start Build" to begin.
              </p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: "bg-gray-100 text-gray-700",
    building: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${colors[status as keyof typeof colors] || colors.pending}`}
    >
      {status.toUpperCase()}
    </span>
  );
}
