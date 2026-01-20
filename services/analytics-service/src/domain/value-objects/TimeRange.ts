// src/domain/value-objects/TimeRange.ts

export type Granularity = "hour" | "day" | "week" | "month";

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: Granularity;
}

export function createTimeRange(
  start: Date,
  end: Date,
  granularity: Granularity = "day"
): TimeRange {
  return { start, end, granularity };
}

export function getTimeRangeForPeriod(period: string): TimeRange {
  const now = new Date();
  let start: Date;
  let granularity: Granularity;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      granularity = "hour";
      break;
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      granularity = "day";
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      granularity = "day";
      break;
    case "quarter":
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      granularity = "week";
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      granularity = "month";
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      granularity = "day";
  }

  return { start, end: now, granularity };
}

export function formatDateForPeriod(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "hour":
      return date.toISOString().slice(0, 13) + ":00:00Z";
    case "day":
      return date.toISOString().slice(0, 10);
    case "week":
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().slice(0, 10);
    case "month":
      return date.toISOString().slice(0, 7);
    default:
      return date.toISOString();
  }
}
