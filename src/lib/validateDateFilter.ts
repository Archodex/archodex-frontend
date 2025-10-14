import { type DateFilter } from '@/lib/dateFilter';

const validateDateFilter = (filter: DateFilter): void => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!filter || typeof filter !== 'object') {
    throw new Error('DateFilter validation failed: DateFilter must be an object');
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!filter.startDate || !filter.endDate) {
    throw new Error('DateFilter validation failed: DateFilter must have both startDate and endDate');
  }

  if (!(filter.startDate instanceof Date) || !(filter.endDate instanceof Date)) {
    throw new Error('DateFilter validation failed: startDate and endDate must be Date objects');
  }

  if (isNaN(filter.startDate.getTime()) || isNaN(filter.endDate.getTime())) {
    throw new Error('DateFilter validation failed: dates must be valid Date objects');
  }

  if (filter.startDate > filter.endDate) {
    throw new Error('DateFilter validation failed: startDate must be before or equal to endDate');
  }
};

export default validateDateFilter;
