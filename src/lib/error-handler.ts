import { NextResponse } from "next/server";

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

export class AppError extends Error implements ApiError {
  public readonly code?: string;
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Backend service unavailable', code: 'BACKEND_UNAVAILABLE' },
        { status: 503 }
      );
    }

    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (error.message.includes('Forbidden') || error.message.includes('403')) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (error.message.includes('Not found') || error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  // Unknown error type
  return NextResponse.json(
    { error: 'Unknown error occurred', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  );
}

export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createErrorResponse(message: string, status: number = 400, code?: string): NextResponse {
  return NextResponse.json(
    { error: message, code },
    { status }
  );
}