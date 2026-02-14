import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ConfigModule } from '@nestjs/config';
import { createAuth } from '@repo/auth/server';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ClassesModule } from './classes/classes.module';
import { CoursesModule } from './courses/courses.module';
import { ClassLessonNodesModule } from './class-lesson-nodes/class-lesson-nodes.module';
import { ClassGroupsModule } from './class-groups/class-groups.module';
import { MembersModule } from './members/members.module';
import { UsersModule } from './users/users.module';
import { WidgetsModule } from './widgets/widgets.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    AuthModule.forRootAsync({
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        auth: createAuth(prisma, {
          trustedOrigins: [process.env.FRONTEND_URL!],
        }),
        middleware: (req, _res, next) => {
          req.url = req.originalUrl;
          req.baseUrl = '';
          next();
        },
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    HealthModule,
    ClassesModule,
    CoursesModule,
    ClassLessonNodesModule,
    ClassGroupsModule,
    MembersModule,
    UsersModule,
    WidgetsModule,
    PermissionsModule,
  ],
})
export class AppModule {}
