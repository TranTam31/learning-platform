import { LessonNodeUI, CourseUI } from "./course";

export enum UserRole {
  OrgAdmin = "org_admin",
  OrgMember = "org_member",
  ClassTeacher = "class_teacher",
  ClassStudent = "class_student",
}

export interface CourseStructureContext {
  course: CourseUI;
  selectedNode: LessonNodeUI | null;
  userRole: UserRole;
  classId?: string; // Nếu đang ở context của class

  // Handlers
  onNodeSelect: (node: LessonNodeUI) => void;
  onNodeAdd?: (type: string, parentId: string) => Promise<void>;
  onNodeDelete?: (nodeId: string) => Promise<void>;
}

export interface ToolbarProps {
  context: CourseStructureContext;
  canAddToSelected: boolean;
  isPending: boolean;
}

export interface EditorProps {
  context: CourseStructureContext;
}
