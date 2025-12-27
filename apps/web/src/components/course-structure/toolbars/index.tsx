import { UserRole, ToolbarProps } from "@/types/course-structure";
import AdminToolbar from "./admin-toolbar";
import MemberToolbar from "./member-toolbar";
import TeacherToolbar from "./teacher-toolbar";
import React from "react";

export function getToolbarComponent(role: UserRole): React.FC<ToolbarProps> {
  switch (role) {
    case UserRole.OrgAdmin:
      return AdminToolbar;
    case UserRole.OrgMember:
      return MemberToolbar;
    case UserRole.ClassTeacher:
      return TeacherToolbar;
    default:
      return () => null;
  }
}
