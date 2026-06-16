import type { AxiosError } from 'axios';

interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
}

export function parseApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export function parseAxiosApiError(error: AxiosError<ApiErrorBody>): string {
  const statusCode = error.response?.status;
  const message = error.response?.data?.message;

  const detail = Array.isArray(message)
    ? message.join(', ')
    : message ?? error.message;

  switch (statusCode) {
    case 409:
      return detail || 'This action conflicts with existing data.';
    case 404:
      return detail || 'The requested resource was not found.';
    case 400:
      return detail || 'The request contains invalid data.';
    default:
      return detail || 'An unexpected error occurred';
  }
}
