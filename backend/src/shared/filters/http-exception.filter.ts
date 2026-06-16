import { normalizeExceptionMessage } from '../utils/normalize-exception-message';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorMessages } from '../constants/error-messages';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : ErrorMessages.INTERNAL_SERVER_ERROR;

    const normalized = normalizeExceptionMessage(
      typeof rawMessage === 'string'
        ? rawMessage
        : (rawMessage as { message?: string | string[] }),
    );

    response.status(status).json({
      statusCode: status,
      message: normalized,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
