import { HttpStatus, HttpException } from '@nestjs/common';
import {
  compareDesc,
  parse,
  isValid,
  sub,
  startOfDay,
  endOfDay,
} from 'date-fns';

export function isValidDate(date: string): boolean {
  const dateObj = parse(date, 'yyyy-MM-dd', new Date());
  return isValid(dateObj);
}

export function checkFromIsBeforeTo(from: string, to: string): boolean {
  const dateFrom = new Date(from);
  const dateTo = new Date(to);
  return compareDesc(dateFrom, dateTo) >= 0;
}

export function checkQueryDateFromTo(from: string, to: string) {
  if ((!from && to) || (!to && from)) {
    throw new HttpException(
      'Il manque une date from ou to',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (from && to) {
    if (!isValidDate(from) || !isValidDate(to)) {
      throw new HttpException(
        'Les dates ne sont pas valides',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!checkFromIsBeforeTo(from, to)) {
      throw new HttpException(
        'La date from est plus vielle que la date to',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

export function createDateObject(
  from: string,
  to: string,
): { from: Date; to: Date } {
  return {
    from: from ? startOfDay(new Date(from)) : sub(new Date(), { months: 1 }),
    to: to ? endOfDay(new Date(to)) : new Date(),
  };
}
