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
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Widget Info */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {widget.name}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Repository:</span>
              <p className="font-medium text-foreground">
                {widget.repoFullName}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Branch:</span>
              <p className="font-medium text-foreground">{widget.branch}</p>
            </div>
          </div>
        </div>

        {/* Build Controls */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                New Build
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Next version:{" "}
                <span className="font-mono font-semibold">v{nextVersion}</span>
              </p>
            </div>
            <button
              onClick={startBuild}
              disabled={building}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors font-medium"
            >
              {building ? "Starting..." : "Start Build"}
            </button>
          </div>
        </div>

        {/* Build History */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Build History
          </h3>

          {builds.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No builds yet. Click "Start Build" to create your first build.
            </p>
          ) : (
            <div className="space-y-3">
              {builds.map((build) => (
                <div
                  key={build.id}
                  className="border border-border rounded-lg p-4 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-lg font-semibold text-foreground">
                        v{build.version}
                      </span>
                      <StatusBadge status={build.status} />
                      {build.duration && (
                        <span className="text-sm text-muted-foreground">
                          {build.duration}s
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm text-muted-foreground">
                        {build.completedAt ? (
                          <span>
                            {new Date(build.completedAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        ) : build.startedAt ? (
                          <span>
                            Started{" "}
                            {new Date(build.startedAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        ) : (
                          <span>Pending</span>
                        )}
                      </div>

                      {(build.status === "success" ||
                        build.status === "failed") && (
                        <a
                          href={`/dev/deploy/${widget.id}/details/${build.id}`}
                          className="px-3 py-1 text-sm bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
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
    pending: "bg-muted text-muted-foreground",
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
