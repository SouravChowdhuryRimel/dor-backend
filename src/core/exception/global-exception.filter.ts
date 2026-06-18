import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const isDev = process.env.NODE_ENV === 'development';

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const errorDetails =
      exception instanceof Error && isDev
        ? { stack: exception.stack }
        : undefined;

    const responseBody = {
      success: false,
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: typeof message === 'object' ? (message as any).message : message,
      error:
        typeof message === 'object'
          ? (message as any).error
          : exception instanceof Error
            ? exception.name
            : 'Internal Server Error',
      ...(isDev && errorDetails ? { details: errorDetails } : {}),
    };

    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      const logMessage =
        exception instanceof Error
          ? exception.stack || exception.message
          : typeof exception === 'object'
            ? JSON.stringify(exception)
            : String(exception);

      this.logger.error(`Exception: ${logMessage}, Path: ${responseBody.path}`);
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
