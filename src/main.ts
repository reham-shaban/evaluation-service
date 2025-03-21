import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set up the gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'eval',
      protoPath: join(__dirname, '..', 'protos', 'eval.proto'),
      url: 'localhost:50051',
    },
  });

  // Start all microservices
  await app.startAllMicroservices();

  // Start the HTTP server
  // await app.listen(3000);
}
bootstrap();
