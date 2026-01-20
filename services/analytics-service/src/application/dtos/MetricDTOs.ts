// src/application/dtos/MetricDTOs.ts

import type { MetricType, PeriodType } from "../../domain/entities/MetricSnapshot.js";

export interface GetMetricsRequest {
  gymId?: string | null;
  metricTypes?: MetricType[];
}

export interface GetMetricHistoryRequest {
  metricType: MetricType;
  gymId?: string | null;
  startDate: string;
  endDate: string;
  granularity?: "hour" | "day" | "week" | "month";
}

export interface CompareMetricsRequest {
  metricType: MetricType;
  gymId?: string | null;
  currentPeriod: "today" | "week" | "month" | "quarter" | "year";
  compareTo?: "previous"; // Previous period of same length
}

export interface MetricResponse {
  metricType: MetricType;
  value: number;
  previousValue: number | null;
  percentChange: number | null;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  metadata?: Record<string, unknown>;
}

export interface MetricHistoryResponse {
  metricType: MetricType;
  gymId: string | null;
  data: {
    timestamp: string;
    value: number;
  }[];
  summary: {
    min: number;
    max: number;
    avg: number;
    total: number;
  };
}

export interface MetricComparisonResponse {
  metricType: MetricType;
  current: MetricResponse | null;
  previous: MetricResponse | null;
  change: {
    absolute: number | null;
    percent: number | null;
    trend: "up" | "down" | "stable";
  };
}

export interface AvailableMetricsResponse {
  metrics: {
    type: MetricType;
    name: string;
    description: string;
    category: string;
  }[];
}

// Metric metadata for UI
export const METRIC_METADATA: Record<
  MetricType,
  { name: string; description: string; category: string }
> = {
  total_members: { name: "Total Members", description: "Total registered members", category: "Members" },
  active_members: { name: "Active Members", description: "Members with recent activity", category: "Members" },
  new_members: { name: "New Members", description: "New registrations in period", category: "Members" },
  churned_members: { name: "Churned Members", description: "Members who left", category: "Members" },
  member_retention_rate: { name: "Retention Rate", description: "Member retention percentage", category: "Members" },
  member_growth_rate: { name: "Growth Rate", description: "Member growth percentage", category: "Members" },
  total_checkins: { name: "Total Check-ins", description: "Total gym check-ins", category: "Attendance" },
  unique_visitors: { name: "Unique Visitors", description: "Unique visitors in period", category: "Attendance" },
  avg_visit_duration: { name: "Avg Visit Duration", description: "Average visit length in minutes", category: "Attendance" },
  peak_hour_occupancy: { name: "Peak Hour", description: "Busiest hour of the day", category: "Attendance" },
  capacity_utilization: { name: "Capacity Utilization", description: "Gym capacity usage percentage", category: "Attendance" },
  total_revenue: { name: "Total Revenue", description: "Total revenue collected", category: "Revenue" },
  mrr: { name: "MRR", description: "Monthly Recurring Revenue", category: "Revenue" },
  arr: { name: "ARR", description: "Annual Recurring Revenue", category: "Revenue" },
  avg_revenue_per_member: { name: "ARPM", description: "Average Revenue Per Member", category: "Revenue" },
  payment_success_rate: { name: "Payment Success", description: "Successful payment rate", category: "Revenue" },
  refund_rate: { name: "Refund Rate", description: "Percentage of refunded transactions", category: "Revenue" },
  total_workouts: { name: "Total Workouts", description: "Total workouts logged", category: "Workouts" },
  avg_workout_duration: { name: "Avg Workout Duration", description: "Average workout length", category: "Workouts" },
  popular_exercises: { name: "Popular Exercises", description: "Most performed exercises", category: "Workouts" },
  workout_completion_rate: { name: "Completion Rate", description: "Workout completion percentage", category: "Workouts" },
  trainer_utilization: { name: "Trainer Utilization", description: "Trainer availability usage", category: "Trainers" },
  session_bookings: { name: "Session Bookings", description: "Total session bookings", category: "Trainers" },
  trainer_ratings: { name: "Trainer Ratings", description: "Average trainer rating", category: "Trainers" },
  total_posts: { name: "Total Posts", description: "Social posts created", category: "Social" },
  engagement_rate: { name: "Engagement Rate", description: "Social engagement percentage", category: "Social" },
  new_connections: { name: "New Connections", description: "New social connections", category: "Social" },
};
