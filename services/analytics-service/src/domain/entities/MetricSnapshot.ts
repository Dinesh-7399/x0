// src/domain/entities/MetricSnapshot.ts

export type PeriodType = "hourly" | "daily" | "weekly" | "monthly";

export type MetricType =
  // Member metrics
  | "total_members"
  | "active_members"
  | "new_members"
  | "churned_members"
  | "member_retention_rate"
  | "member_growth_rate"
  // Attendance metrics
  | "total_checkins"
  | "unique_visitors"
  | "avg_visit_duration"
  | "peak_hour_occupancy"
  | "capacity_utilization"
  // Revenue metrics
  | "total_revenue"
  | "mrr"
  | "arr"
  | "avg_revenue_per_member"
  | "payment_success_rate"
  | "refund_rate"
  // Workout metrics
  | "total_workouts"
  | "avg_workout_duration"
  | "popular_exercises"
  | "workout_completion_rate"
  // Trainer metrics
  | "trainer_utilization"
  | "session_bookings"
  | "trainer_ratings"
  // Social metrics
  | "total_posts"
  | "engagement_rate"
  | "new_connections";

export interface MetricSnapshot {
  id: string;
  metricType: MetricType;
  gymId: string | null;
  value: number;
  previousValue: number | null;
  percentChange: number | null;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateMetricSnapshotInput {
  metricType: MetricType;
  gymId: string | null;
  value: number;
  previousValue?: number;
  percentChange?: number;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, unknown>;
}

// Helper to calculate percent change
export function calculatePercentChange(
  current: number,
  previous: number | null
): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
