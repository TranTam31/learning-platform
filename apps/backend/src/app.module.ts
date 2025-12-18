import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AuthModule as MyAuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { createAuth } from '@repo/auth/server';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    MyAuthModule,
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
  ],
})
export class AppModule {
  constructor() {
    console.log('DATABASE_URL in AppModule =', process.env.DATABASE_URL);
  }
}
