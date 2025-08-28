import { Module, Global, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { TracingService } from './tracing.service';

@Global()
@Module({
  providers: [TracingService],
  exports: [TracingService],
})
export class TracingModule implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(private readonly tracingService: TracingService) {}

  onApplicationBootstrap() {
    this.tracingService.initialize();
  }

  async onApplicationShutdown() {
    await this.tracingService.shutdown();
  }
}