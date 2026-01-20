-- Database Migration: Create Analytics Service Tables
-- migrations/001_create_analytics_tables.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. METRIC SNAPSHOTS - Time-series data
-- ============================================
CREATE TABLE IF NOT EXISTS metric_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL,
    gym_id UUID,  -- NULL for platform-wide
    
    value DECIMAL(20, 4) NOT NULL,
    previous_value DECIMAL(20, 4),
    percent_change DECIMAL(10, 4),
    
    period_type VARCHAR(20) NOT NULL,  -- hourly, daily, weekly, monthly
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_metric_period UNIQUE (metric_type, gym_id, period_type, period_start)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_metrics_type_gym ON metric_snapshots(metric_type, gym_id);
CREATE INDEX IF NOT EXISTS idx_metrics_period ON metric_snapshots(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_type_period ON metric_snapshots(metric_type, period_type, period_start DESC);

-- ============================================
-- 2. AGGREGATED REPORTS - Pre-computed reports
-- ============================================
CREATE TABLE IF NOT EXISTS aggregated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL,
    gym_id UUID,
    
    data JSONB NOT NULL,
    
    generated_at TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP NOT NULL,
    version INTEGER DEFAULT 1,
    
    CONSTRAINT unique_report UNIQUE (report_type, gym_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_type ON aggregated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_valid ON aggregated_reports(valid_until);

-- ============================================
-- 3. DASHBOARDS - User configurations
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    gym_id UUID,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    layout JSONB DEFAULT '{"columns": 12, "rowHeight": 100}',
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboards_user ON analytics_dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_gym ON analytics_dashboards(gym_id);

-- ============================================
-- 4. DASHBOARD WIDGETS
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
    
    widget_type VARCHAR(30) NOT NULL,  -- line_chart, bar_chart, stat_card, table
    metric_type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 2,
    
    config JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON dashboard_widgets(dashboard_id);

-- ============================================
-- 5. AGGREGATION JOBS - Track job runs
-- ============================================
CREATE TABLE IF NOT EXISTS aggregation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending',  -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON aggregation_jobs(status, created_at DESC);

-- ============================================
-- 6. Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dashboards_updated_at ON analytics_dashboards;
CREATE TRIGGER update_dashboards_updated_at
    BEFORE UPDATE ON analytics_dashboards
    FOR EACH ROW EXECUTE FUNCTION update_analytics_updated_at();

DROP TRIGGER IF EXISTS update_widgets_updated_at ON dashboard_widgets;
CREATE TRIGGER update_widgets_updated_at
    BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW EXECUTE FUNCTION update_analytics_updated_at();
