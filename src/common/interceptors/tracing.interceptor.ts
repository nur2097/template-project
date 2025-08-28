import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TracingService } from '../tracing/tracing.service';
import * as api from '@opentelemetry/api';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    const spanName = `${controllerName}.${methodName}`;

    const span = this.tracingService.startSpan(spanName, {
      kind: api.SpanKind.SERVER,
      attributes: {
        'http.method': request.method,
        'http.url': request.url,
        'http.route': request.route?.path,
        'http.user_agent': request.get('User-Agent'),
        'user.id': request.user?.sub || request.user?.id,
        'controller.name': controllerName,
        'handler.name': methodName,
      },
    });

    return this.tracingService.withSpan(span, () =>
      next.handle().pipe(
        tap((data) => {
          span.setAttributes({
            'http.status_code': response.statusCode,
            'response.size': JSON.stringify(data || {}).length,
          });
          span.setStatus({ code: api.SpanStatusCode.OK });
          span.end();
        }),
        catchError((error) => {
          span.recordException(error);
          span.setAttributes({
            'http.status_code': error.status || 500,
            'error.name': error.name,
            'error.message': error.message,
          });
          span.setStatus({
            code: api.SpanStatusCode.ERROR,
            message: error.message,
          });
          span.end();
          return throwError(() => error);
        })
      )
    );
  }
}