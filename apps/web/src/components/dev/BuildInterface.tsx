// components/BuildInterface.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Widget {
  id: string;
  name: string;
  repoFullName: string;
  branch: string;
}

interface Build {
  id: string;
  version: number;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number | null;
}

interface Props {
  widget: Widget;
  builds: Build[];
}

export default function BuildInterface({ widget, builds }: Props) {
  const [building, setBuilding] = useState(false);
  const router = useRouter();

  const latestBuild = builds[0];
  const nextVersion = latestBuild ? latestBuild.version + 1 : 1;

  async function startBuild() {
    setBuilding(true);

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

      // Refresh to show new build
      router.refresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          </div>
        </div>

        {/* Build Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">New Build</h3>
              <p className="text-sm text-gray-600 mt-1">
                Next version:{" "}
                <span className="font-mono font-semibold">v{nextVersion}</span>
              </p>
            </div>
            <button
              onClick={startBuild}
              disabled={building}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {building ? "Starting..." : "Start Build"}
            </button>
          </div>
        </div>

        {/* Build History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Build History
          </h3>

          {builds.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No builds yet. Click "Start Build" to create your first build.
            </p>
          ) : (
            <div className="space-y-3">
              {builds.map((build) => (
                <div
                  key={build.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-lg font-semibold text-gray-900">
                        v{build.version}
                      </span>
                      <StatusBadge status={build.status} />
                      {build.duration && (
                        <span className="text-sm text-gray-500">
                          {build.duration}s
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm text-gray-500">
                        {build.completedAt ? (
                          <span>
                            {new Date(build.completedAt).toLocaleString()}
                          </span>
                        ) : build.startedAt ? (
                          <span>
                            Started {new Date(build.startedAt).toLocaleString()}
                          </span>
                        ) : (
                          <span>Pending</span>
                        )}
                      </div>

                      {(build.status === "success" ||
                        build.status === "failed") && (
                        <a
                          href={`/build/${widget.id}/details/${build.id}`}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: "bg-gray-100 text-gray-700",
    building: "bg-blue-100 text-blue-700 animate-pulse",
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  const icons = {
    pending: "⏳",
    building: "🔄",
    success: "✅",
    failed: "❌",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 ${colors[status as keyof typeof colors] || colors.pending}`}
    >
      <span>{icons[status as keyof typeof icons] || "⏳"}</span>
      {status.toUpperCase()}
    </span>
  );
}
