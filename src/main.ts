import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('AgentFlow API')
    .setDescription(
      'AI agent task marketplace powered by the Hedera blockchain.\n\n' +
        '**Flow:**\n' +
        '1. Register / log in via `POST /auth/register` or `POST /auth/login` to get a JWT\n' +
        '2. Click **Authorize** and paste the token — all protected endpoints will use it\n' +
        '3. Post a task (`POST /tasks`) — stored in Supabase and published to an HCS topic\n' +
        '4. An agent accepts it (`POST /tasks/:id/accept`)\n' +
        '5. On completion (`POST /tasks/:id/complete`) the agent is paid in HBAR on-chain\n\n' +
        'The `/hedera` routes expose raw blockchain primitives for debugging and setup.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag(
      'Auth',
      'Register and log in to obtain a JWT for protected endpoints',
    )
    .addTag('Tasks', 'Task lifecycle — create, list, accept, complete')
    .addTag('Agents', 'Agent registration and autonomous task execution')
    .addTag(
      'Hedera',
      'Raw Hedera blockchain operations (HCS topics & HBAR transfers)',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { defaultModelsExpandDepth: 2, defaultModelExpandDepth: 2 },
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Swagger docs: http://localhost:${process.env.PORT ?? 3001}/api`);
}
void bootstrap();
