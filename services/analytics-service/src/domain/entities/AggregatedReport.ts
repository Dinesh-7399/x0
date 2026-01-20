// src/domain/entities/AggregatedReport.ts

export type ReportType =
  | "gym_overview"
  | "member_analytics"
  | "revenue_report"
  | "attendance_patterns"
  | "trainer_performance"
  | "workout_trends";

export interface GymOverviewData {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  totalRevenue: number;
  avgDailyCheckIns: number;
  peakHour: string;
  memberRetentionRate: number;
}

export interface MemberAnalyticsData {
  totalMembers: number;
  membersByPlan: Record<string, number>;
  growthRate: number;
  churnRate: number;
  avgMemberAge: number;
  genderDistribution: Record<string, number>;
  acquisitionChannels: Record<string, number>;
}

export interface RevenueReportData {
  totalRevenue: number;
  mrr: number;
  arr: number;
  revenueByPlan: Record<string, number>;
  transactions: number;
  avgTransactionValue: number;
  refunds: number;
  refundRate: number;
}

export interface AttendancePatternsData {
  totalCheckIns: number;
  uniqueVisitors: number;
  avgVisitDuration: number;
  peakHours: { hour: number; count: number }[];
  peakDays: { day: string; count: number }[];
  capacityUtilization: number;
}

export interface TrainerPerformanceData {
  totalTrainers: number;
  totalSessions: number;
  avgSessionsPerTrainer: number;
  topTrainers: { trainerId: string; sessions: number; rating: number }[];
  utilizationRate: number;
}

export interface WorkoutTrendsData {
  totalWorkouts: number;
  avgWorkoutDuration: number;
  popularExercises: { name: string; count: number }[];
  completionRate: number;
  workoutsByDay: Record<string, number>;
}

export type ReportData =
  | GymOverviewData
  | MemberAnalyticsData
  | RevenueReportData
  | AttendancePatternsData
  | TrainerPerformanceData
  | WorkoutTrendsData;

export interface AggregatedReport {
  id: string;
  reportType: ReportType;
  gymId: string | null;
  data: ReportData;
  generatedAt: Date;
  validUntil: Date;
  version: number;
}

export interface CreateReportInput {
  reportType: ReportType;
  gymId: string | null;
  data: ReportData;
  validUntil: Date;
}
