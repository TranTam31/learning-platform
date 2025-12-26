import { Prisma } from "@repo/db";

export type LessonNodeWithCount = Prisma.LessonNodeGetPayload<{
  select: {
    id: true;
    title: true;
    type: true;
    content: true;
    order: true;
    parentId: true;
    courseId: true;
    createdAt: true;
    updatedAt: true;
    _count: {
      select: { children: true };
    };
  };
}>;

export type LessonNodeWithChildren = Prisma.LessonNodeGetPayload<{
  include: {
    children: {
      select: {
        id: true;
        title: true;
        type: true;
        content: true;
        order: true;
        parentId: true;
        courseId: true;
        createdAt: true;
        updatedAt: true;
        _count: {
          select: { children: true };
        };
      };
    };
  };
}>;

export type CourseWithRootNode = Prisma.CourseGetPayload<{
  include: {
    rootLessonNode: {
      include: {
        children: {
          orderBy: { order: "asc" };
          select: {
            id: true;
            title: true;
            type: true;
            content: true;
            order: true;
            parentId: true;
            courseId: true;
            createdAt: true;
            updatedAt: true;
            _count: {
              select: { children: true };
            };
          };
        };
        _count: {
          select: { children: true };
        };
      };
    };
  };
}>;

export interface AddNodeInput {
  courseId: string;
  parentId: string;
  type: "MODULE" | "LESSON";
  title: string;
}

export interface DeleteNodeInput {
  nodeId: string;
  courseId: string;
}

export type LessonNodeUI = LessonNodeWithCount & {
  children: LessonNodeUI[];
  childrenLoaded?: boolean;
};

export type CourseUI = Omit<CourseWithRootNode, "rootLessonNode"> & {
  rootLessonNode:
    | (Omit<NonNullable<CourseWithRootNode["rootLessonNode"]>, "children"> & {
        children: LessonNodeUI[];
      })
    | null;
};
