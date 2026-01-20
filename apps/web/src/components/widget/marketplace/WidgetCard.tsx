"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import WidgetPreview from "@/components/widget/WidgetPreview";

export type WidgetCardProps = {
  widget: {
    id: string;
    name: string;
    updatedAt: Date;
    user: {
      id: string;
      name: string;
      image: string | null;
    };
    builds: Array<{
      id: string;
      buildRunId: string | null;
      status: string;
    }>;
    _count: {
      builds: number;
    };
  };
};

type UserWidget = {
  id: string;
  name: string;
  updatedAt: Date;
  builds: Array<{
    buildRunId: string | null;
  }>;
  _count: {
    builds: number;
  };
};

export function WidgetCard({ widget }: WidgetCardProps) {
  const [userWidgets, setUserWidgets] = useState<UserWidget[] | null>(null);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(false);
  const [widgetHtmlCache, setWidgetHtmlCache] = useState<
    Record<string, string>
  >({});
  const [loadingHtmlIds, setLoadingHtmlIds] = useState<Set<string>>(new Set());

  const latestBuild = widget.builds[0];

  const loadUserWidgets = async () => {
    if (userWidgets) return;

    setIsLoadingWidgets(true);
    try {
      const response = await fetch(`/api/widgets/users/${widget.user.id}`);
      const data = await response.json();
      setUserWidgets(data);
    } catch (error) {
      console.error("Failed to load user widgets:", error);
    } finally {
      setIsLoadingWidgets(false);
    }
  };

  const loadWidgetHtml = async (widgetId: string, buildRunId: string) => {
    if (widgetHtmlCache[widgetId]) return;

    setLoadingHtmlIds((prev) => new Set(prev).add(widgetId));
    try {
      const response = await fetch(
        `/api/widgets/${widgetId}/preview?buildRunId=${buildRunId}`,
      );
      const data = await response.json();
      setWidgetHtmlCache((prev) => ({ ...prev, [widgetId]: data.html }));
    } catch (error) {
      console.error("Failed to load widget HTML:", error);
    } finally {
      setLoadingHtmlIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });
    }
  };

  return (
    <div className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
          {widget.name}
        </h3>
      </div>

      <div className="space-y-3 mb-4">
        <Sheet>
          <SheetTrigger asChild>
            <button
              onClick={loadUserWidgets}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors w-full"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={widget.user.image || undefined} />
                <AvatarFallback>
                  {widget.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{widget.user.name}</span>
            </button>
          </SheetTrigger>

          <SheetContent className="w-[600px]! max-w-none! sm:w-[540px] overflow-y-auto rounded-l-xl!">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={widget.user.image || undefined} />
                  <AvatarFallback>
                    {widget.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{widget.user.name}</div>
                  <div className="text-sm text-gray-500 font-normal">
                    Widgets by this creator
                  </div>
                </div>
              </SheetTitle>
            </SheetHeader>

            {/* GRID 2 CỘT */}
            <div className="mx-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isLoadingWidgets ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Loading widgets...
                </div>
              ) : userWidgets && userWidgets.length > 0 ? (
                userWidgets.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {w.name}
                    </h4>

                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                        <span>{w._count.builds} builds</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Updated: {new Date(w.updatedAt).toLocaleString("vi-VN")}
                      </div>
                    </div>

                    {/* Đẩy nút Preview xuống đáy card */}
                    <div className="mt-auto">
                      {w.builds?.[0]?.buildRunId && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                loadWidgetHtml(w.id, w.builds[0].buildRunId!)
                              }
                            >
                              {loadingHtmlIds.has(w.id)
                                ? "Loading..."
                                : "Preview"}
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="w-[80vw]! h-[95vh]! max-w-none! p-1! flex! flex-col! min-h-0!">
                            <DialogHeader className="px-6 py-4 border-b shrink-0">
                              <DialogTitle>
                                Widget Preview - {w.name}
                              </DialogTitle>
                            </DialogHeader>

                            <div className="flex-1 overflow-auto min-h-0">
                              {widgetHtmlCache[w.id] ? (
                                <WidgetPreview html={widgetHtmlCache[w.id]} />
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                  {loadingHtmlIds.has(w.id)
                                    ? "Loading preview..."
                                    : "No preview available"}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No widgets found
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center text-sm text-gray-600">
          <svg
            className="w-4 h-4 mr-2 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span>{widget._count.builds} builds</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-3">
        <p className="text-xs text-gray-500">
          Updated: {new Date(widget.updatedAt).toLocaleString("vi-VN")}
        </p>

        {latestBuild?.buildRunId && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  loadWidgetHtml(widget.id, latestBuild.buildRunId!)
                }
              >
                {loadingHtmlIds.has(widget.id) ? "Loading..." : "Preview"}
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[80vw]! h-[95vh]! max-w-none! p-1! flex! flex-col! min-h-0!">
              <DialogHeader className="px-6 py-4 border-b shrink-0">
                <DialogTitle>Widget Preview</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-auto min-h-0">
                {widgetHtmlCache[widget.id] ? (
                  <WidgetPreview html={widgetHtmlCache[widget.id]} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    {loadingHtmlIds.has(widget.id)
                      ? "Loading preview..."
                      : "No preview available"}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
