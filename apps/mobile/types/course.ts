// Pure TypeScript types without Prisma

export enum LessonNodeType {
  course = "course",
  module = "module",
  lesson = "lesson",
  homework = "homework",
}

export type LessonContent = {
  content?: string;
};

export type HomeworkContent = {
  widgetId?: string;
  widgetBuildId?: string | null;
};

export type LessonNodeContent = LessonContent | HomeworkContent;

export interface LessonNodeWithCount {
  id: string;
  title: string;
  type: LessonNodeType | string;
  content: any;
  order: number;
  parentId: string | null;
  courseId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    children: number;
  };
}

export interface LessonNodeUI extends LessonNodeWithCount {
  children: LessonNodeUI[];
  childrenLoaded?: boolean;
}

export interface CourseData {
  id: string;
  name: string;
  rootLessonNodeId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseUI {
  id: string;
  name: string;
  organizationId: string;
  rootLessonNodeId: string;
  rootLessonNode: LessonNodeUI | null;
  course?: CourseData;
}

export interface ClassMember {
  id: string;
  userId: string;
  classId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export interface ClassData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members: ClassMember[];
  course: CourseData;
}

export interface HomeworkCountResult {
  totalAssigned: number;
  pending: number;
}
