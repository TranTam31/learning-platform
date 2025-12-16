import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
// import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      middleware: (req, _res, next) => {
        req.url = req.originalUrl;
        req.baseUrl = '';
        next();
      },
    }),
  ],
  // imports: [AuthModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
