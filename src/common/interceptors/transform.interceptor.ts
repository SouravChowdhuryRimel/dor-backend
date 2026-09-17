import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

interface HttpResponse {
  statusCode: number;
}

interface HttpRequest {
  method: string;
  url: string;
}

function generateSuccessMessage(method: string, url: string): string {
  const cleanPath = url.split('?')[0].toLowerCase();

  // Handle specific Authentication routes
  if (cleanPath.includes('/auth/login') || cleanPath.includes('/auth/signin')) {
    return 'সফলভাবে লগইন সম্পন্ন হয়েছে';
  }
  if (cleanPath.includes('/auth/logout')) {
    return 'সফলভাবে লগআউট হয়েছে';
  }
  if (
    cleanPath.includes('/auth/register') ||
    cleanPath.includes('/auth/signup') ||
    cleanPath.includes('/companies/register') ||
    cleanPath.includes('/parties/register') ||
    cleanPath.includes('/drivers/register')
  ) {
    return 'সফলভাবে নিবন্ধন সম্পন্ন হয়েছে';
  }
  if (cleanPath.includes('/auth/refresh')) {
    return 'টোকেন সফলভাবে রিফ্রেশ হয়েছে';
  }
  if (cleanPath.includes('/auth/change-password')) {
    return 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে';
  }
  if (
    cleanPath.includes('/auth/password/reset') ||
    cleanPath.includes('/auth/reset-password')
  ) {
    return 'পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে';
  }
  if (cleanPath.includes('/auth/forgot-password')) {
    return 'পাসওয়ার্ড রিসেট ওটিপি সফলভাবে পাঠানো হয়েছে';
  }
  if (
    cleanPath.includes('/delete-account') ||
    cleanPath.includes('/delete-user')
  ) {
    return 'অ্যাকাউন্ট সফলভাবে নিষ্ক্রিয় করা হয়েছে';
  }

  // Extract the first segment after /api/v1/
  const segments = cleanPath
    .replace(/^\/api\/v\d+\//, '')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) {
    return 'Success';
  }

  let resource = segments[0];

  // Specific format overrides for known resources
  if (resource === 'auth') {
    resource = 'Authentication';
  } else if (resource === 'sub-category') {
    resource = 'Sub-Category';
  } else {
    // Format kebab-case or snake_case to capitalized words
    resource = resource
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  switch (method.toUpperCase()) {
    case 'POST':
      if (cleanPath.endsWith('/messages') || cleanPath.includes('/chat/')) {
        return 'Message sent successfully';
      }
      if (cleanPath.endsWith('/orders') || cleanPath.endsWith('/orders/')) {
        return 'Order created successfully';
      }
      if (
        cleanPath.endsWith('/complaints') ||
        cleanPath.endsWith('/complaints/')
      ) {
        return 'Complaint submitted successfully';
      }
      if (cleanPath.includes('/complaints/') && cleanPath.endsWith('/reply')) {
        return 'Reply posted successfully';
      }
      return `${resource} created successfully`;
    case 'PUT':
    case 'PATCH':
      if (cleanPath.endsWith('/accept')) {
        return 'Order accepted successfully';
      }
      if (cleanPath.endsWith('/location')) {
        return 'Location updated successfully';
      }
      if (cleanPath.includes('/complaints/') && cleanPath.endsWith('/status')) {
        return 'Complaint status updated successfully';
      }
      return `${resource} updated successfully`;
    case 'DELETE':
      return `${resource} deleted successfully`;
    case 'GET':
    default:
      return `${resource} retrieved successfully`;
  }
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const startTime = Date.now();
    return next.handle().pipe(
      map((data: unknown) => {
        const request = context.switchToHttp().getRequest<HttpRequest>();
        let message = generateSuccessMessage(request.method, request.url);
        let responseData: unknown = data;

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const record = data as Record<string, unknown>;
          if ('message' in record && typeof record.message === 'string') {
            message = record.message;
            if ('data' in record) {
              responseData = record.data;
            } else {
              const rest = { ...record };
              delete rest.message;
              responseData = rest;
            }
          }
        }

        const response = context.switchToHttp().getResponse<HttpResponse>();

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          responseTime: `${Date.now() - startTime}ms`,
          data: responseData as T,
        };
      }),
    );
  }
}
