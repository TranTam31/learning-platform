"use client";

import { useState, useMemo, useTransition } from "react";
import { useClass } from "@/components/providers/class-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Users,
  Search,
  UserPlus,
  UserMinus,
  Pencil,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

type GroupMember = {
  id: string;
  userId: string;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  classGroupMembers: GroupMember[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClassGroupsPage() {
  const { classCourse, role } = useClass();
  const classId = classCourse.id;
  const isTeacherOrOwner = role === "class_teacher" || role === "class_owner";

  const [groups, setGroups] = useState<Group[]>(classCourse.groups || []);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const [isPending, startTransition] = useTransition();

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  // Students in the class (only role=student)
  const students = useMemo(() => {
    return (classCourse.members || []).filter((m: any) => m.role === "student");
  }, [classCourse.members]);

  // Students NOT yet in the selected group, filtered by search
  const availableStudents = useMemo(() => {
    if (!selectedGroup) return [];
    const memberIds = new Set(
      selectedGroup.classGroupMembers.map((m) => m.userId),
    );
    return students.filter((s: any) => {
      const notInGroup = !memberIds.has(s.user.id);
      if (!searchQuery) return notInGroup;
      const q = searchQuery.toLowerCase();
      return (
        notInGroup &&
        (s.user.name.toLowerCase().includes(q) ||
          s.user.email.toLowerCase().includes(q))
      );
    });
  }, [selectedGroup, students, searchQuery]);

  // ---- Handlers ----
  function handleCreateGroup() {
    if (!groupName.trim()) return;
    startTransition(async () => {
      try {
        const res = await api.classGroups.createClassGroup({
          body: {
            classId,
            name: groupName.trim(),
            description: groupDescription.trim() || undefined,
          },
        });
        if (res.status !== 201) throw new Error((res.body as any).error);
        const newGroup = res.body;
        setGroups((prev) => [...prev, newGroup as Group]);
        setSelectedGroupId(newGroup.id);
        setShowCreateDialog(false);
        setGroupName("");
        setGroupDescription("");
        toast.success("Tạo nhóm thành công");
      } catch {
        toast.error("Không thể tạo nhóm");
      }
    });
  }

  function handleEditGroup() {
    if (!selectedGroup || !groupName.trim()) return;
    startTransition(async () => {
      try {
        const res = await api.classGroups.updateClassGroup({
          params: { groupId: selectedGroup.id },
          body: {
            classId,
            name: groupName.trim(),
            description: groupDescription.trim() || undefined,
          },
        });
        if (res.status !== 200) throw new Error((res.body as any).error);
        const updated = res.body;
        setGroups((prev) =>
          prev.map((g) => (g.id === updated.id ? (updated as Group) : g)),
        );
        setShowEditDialog(false);
        setGroupName("");
        setGroupDescription("");
        toast.success("Cập nhật nhóm thành công");
      } catch {
        toast.error("Không thể cập nhật nhóm");
      }
    });
  }

  function handleDeleteGroup() {
    if (!selectedGroup) return;
    startTransition(async () => {
      try {
        const res = await api.classGroups.deleteClassGroup({
          params: { groupId: selectedGroup.id },
          query: { classId },
          body: undefined,
        });
        if (res.status !== 200) throw new Error((res.body as any).error);
        setGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
        setSelectedGroupId(null);
        setShowDeleteDialog(false);
        toast.success("Xoá nhóm thành công");
      } catch {
        toast.error("Không thể xoá nhóm");
      }
    });
  }

  function handleAddMember(userId: string) {
    if (!selectedGroup) return;
    startTransition(async () => {
      try {
        const res = await api.classGroups.addMemberToGroup({
          params: { groupId: selectedGroup.id },
          body: { classId, userId },
        });
        if (res.status !== 201) throw new Error((res.body as any).error);
        const newMember = res.body;
        setGroups((prev) =>
          prev.map((g) =>
            g.id === selectedGroup.id
              ? {
                  ...g,
                  classGroupMembers: [
                    ...g.classGroupMembers,
                    newMember as GroupMember,
                  ],
                }
              : g,
          ),
        );
        toast.success("Thêm thành viên thành công");
      } catch {
        toast.error("Không thể thêm thành viên");
      }
    });
  }

  function handleRemoveMember(userId: string) {
    if (!selectedGroup) return;
    startTransition(async () => {
      try {
        const res = await api.classGroups.removeMemberFromGroup({
          params: { groupId: selectedGroup.id, userId },
          query: { classId },
          body: undefined,
        });
        if (res.status !== 200) throw new Error((res.body as any).error);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === selectedGroup.id
              ? {
                  ...g,
                  classGroupMembers: g.classGroupMembers.filter(
                    (m) => m.userId !== userId,
                  ),
                }
              : g,
          ),
        );
        toast.success("Xoá thành viên khỏi nhóm thành công");
      } catch {
        toast.error("Không thể xoá thành viên");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">Nhóm</h1>
        {isTeacherOrOwner && (
          <Button
            size="sm"
            onClick={() => {
              setGroupName("");
              setGroupDescription("");
              setShowCreateDialog(true);
            }}
          >
            <Plus className="size-4" />
            Tạo nhóm
          </Button>
        )}
      </div>

      <div className="flex gap-4 rounded-lg border min-h-125">
        {/* Left panel - Group list */}
        <div className="w-72 shrink-0 border-r">
          <div className="p-3 border-b">
            <p className="text-sm font-medium text-muted-foreground">
              {groups.length} nhóm
            </p>
          </div>
          <ScrollArea className="h-114">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <Users className="size-8 mb-2 opacity-50" />
                <p>Chưa có nhóm nào</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-3 px-3 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0 ${
                      selectedGroupId === group.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-sm">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.classGroupMembers.length} thành viên
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel - Group details */}
        <div className="flex-1 flex flex-col">
          {!selectedGroup ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="size-12 mb-3 opacity-30" />
              <p className="text-sm">Chọn một nhóm để xem chi tiết</p>
            </div>
          ) : (
            <>
              {/* Group header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="font-semibold text-lg">
                    {selectedGroup.name}
                  </h2>
                  {selectedGroup.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGroup.description}
                    </p>
                  )}
                </div>
                {isTeacherOrOwner && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setGroupName(selectedGroup.name);
                        setGroupDescription(selectedGroup.description || "");
                        setShowEditDialog(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Search to add student */}
              {isTeacherOrOwner && (
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm học sinh để thêm vào nhóm..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchQuery && availableStudents.length > 0 && (
                    <ScrollArea className="mt-2 max-h-40 rounded-md border">
                      <div className="p-1">
                        {availableStudents.map((s: any) => (
                          <button
                            key={s.user.id}
                            disabled={isPending}
                            onClick={() => handleAddMember(s.user.id)}
                            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                          >
                            <Avatar className="size-6">
                              <AvatarImage src={s.user.image || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(s.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-left truncate">
                              {s.user.name}
                            </span>
                            <UserPlus className="size-3.5 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {searchQuery && availableStudents.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Không tìm thấy học sinh nào
                    </p>
                  )}
                </div>
              )}

              {/* Members list */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Thành viên ({selectedGroup.classGroupMembers.length})
                  </p>
                  {selectedGroup.classGroupMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                      <Users className="size-8 mb-2 opacity-50" />
                      <p>Chưa có thành viên nào</p>
                      {isTeacherOrOwner && (
                        <p className="text-xs mt-1">
                          Sử dụng ô tìm kiếm phía trên để thêm học sinh
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {selectedGroup.classGroupMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50 transition-colors"
                        >
                          <Avatar className="size-8">
                            <AvatarImage src={member.user.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.user.email}
                            </p>
                          </div>
                          {isTeacherOrOwner && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={isPending}
                              onClick={() => handleRemoveMember(member.userId)}
                            >
                              <UserMinus className="size-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo nhóm mới</DialogTitle>
            <DialogDescription>
              Tạo một nhóm mới trong lớp học để quản lý học sinh.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Tên nhóm</label>
              <Input
                placeholder="Nhập tên nhóm..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Mô tả (tuỳ chọn)
              </label>
              <Input
                placeholder="Nhập mô tả..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Huỷ
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Tạo nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhóm</DialogTitle>
            <DialogDescription>
              Thay đổi tên hoặc mô tả của nhóm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Tên nhóm</label>
              <Input
                placeholder="Nhập tên nhóm..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditGroup()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Mô tả (tuỳ chọn)
              </label>
              <Input
                placeholder="Nhập mô tả..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Huỷ
            </Button>
            <Button
              onClick={handleEditGroup}
              disabled={!groupName.trim() || isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá nhóm</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá nhóm &quot;{selectedGroup?.name}
              &quot;? Tất cả thành viên sẽ bị xoá khỏi nhóm. Hành động này không
              thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Xoá nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
