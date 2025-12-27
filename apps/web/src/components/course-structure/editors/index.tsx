import { UserRole, EditorProps } from "@/types/course-structure";
import AdminEditor from "./admin-editor";
import ViewOnlyEditor from "./view-only-editor";
import TeacherEditor from "./teacher-editor";
import React from "react";

export function getEditorComponent(role: UserRole): React.FC<EditorProps> {
  switch (role) {
    case UserRole.OrgAdmin:
      return AdminEditor;
    case UserRole.OrgMember:
      return ViewOnlyEditor;
    case UserRole.ClassTeacher:
      return TeacherEditor;
    default:
      return ViewOnlyEditor;
  }
}
