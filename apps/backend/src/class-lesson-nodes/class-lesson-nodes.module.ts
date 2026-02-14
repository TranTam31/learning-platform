import { Module } from '@nestjs/common';
import { ClassLessonNodesController } from './class-lesson-nodes.controller';
import { ClassLessonNodesService } from './class-lesson-nodes.service';

@Module({
  controllers: [ClassLessonNodesController],
  providers: [ClassLessonNodesService],
  exports: [ClassLessonNodesService],
})
export class ClassLessonNodesModule {}
