import { BadRequestException } from '@nestjs/common';
import { ErrorMessages } from '../constants/error-messages';

export function assertValidDateRange(
  startDate?: Date,
  endDate?: Date,
): void {
  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestException(ErrorMessages.INVALID_DATE_RANGE);
  }
}
