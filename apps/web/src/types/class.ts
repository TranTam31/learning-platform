import { Prisma } from "@repo/db";

export enum ClassAddonType {
  lesson_note = "lesson_note",
  homework = "homework",
}

export type ClassLessonNodeWithData = Prisma.ClassLessonNodeGetPayload<{
  select: {
    id: true;
    type: true;
    content: true;
    lessonNodeId: true;
    classId: true;
    createdAt: true;
  };
}>;

export interface CreateClassLessonNodeInput {
  classId: string;
  lessonNodeId: string;
  type: ClassAddonType;
  content?: any;
}

export interface DeleteClassLessonNodeInput {
  nodeId: string;
  classId: string;
}
