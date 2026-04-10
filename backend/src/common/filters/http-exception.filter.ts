import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { message: exceptionResponse };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map Prisma error codes to HTTP responses
      switch (exception.code) {
        case 'P2002': // Unique constraint violation
          status = HttpStatus.CONFLICT;
          message = {
            message: 'A record with this value already exists',
            field: (exception.meta?.target as string[])?.join(', '),
          };
          break;
        case 'P2003': // Foreign key constraint failure
          status = HttpStatus.BAD_REQUEST;
          message = {
            message: 'Related record not found',
            field: exception.meta?.field_name,
          };
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = { message: 'Record not found' };
          break;
        case 'P2000': // Value too long
          status = HttpStatus.BAD_REQUEST;
          message = { message: 'Input value is too long' };
          break;
        default:
          this.logger.error(
            `Prisma error ${exception.code}`,
            exception.message,
          );
          message = { message: 'Database error' };
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = { message: 'Invalid data provided' };
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' ? message : { message }),
    });
  }
}
