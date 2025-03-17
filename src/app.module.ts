import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvalModule } from './eval/eval.module';

@Module({
  imports: [ConfigModule.forRoot(), EvalModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
