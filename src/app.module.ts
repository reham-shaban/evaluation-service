import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvalModule } from './eval/eval.module';

@Module({
  imports: [ConfigModule.forRoot(), EvalModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
