export function normalizeExceptionMessage(
  response: string | { message?: string | string[] },
): string | string[] {
  if (typeof response === 'string') {
    return response;
  }

  const { message } = response;

  if (Array.isArray(message)) {
    return message;
  }

  return message ?? 'An unexpected error occurred';
}
