-- ============================================================================
-- Admin Settings & Alerts Tables
-- ============================================================================

-- Admin settings (key-value store for admin configurations)
CREATE TABLE IF NOT EXISTS admin_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  value       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default profit margin
INSERT INTO admin_settings (key, value, description)
VALUES ('profit_margin', '20', 'Profit margin percentage applied to AI costs')
ON CONFLICT (key) DO NOTHING;

-- Insert default feature toggles
INSERT INTO admin_settings (key, value, description)
VALUES ('anomaly_detection', 'true', 'Enable anomaly detection alerts')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value, description)
VALUES ('realtime_alerts', 'true', 'Enable real-time alert notifications')
ON CONFLICT (key) DO NOTHING;

-- Admin alerts table
CREATE TABLE IF NOT EXISTS admin_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type  VARCHAR(50) NOT NULL,     -- 'usage_spike', 'payment_failure', 'system_error', 'low_balance'
  severity    VARCHAR(20) NOT NULL DEFAULT 'medium',  -- 'high', 'medium', 'low'
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active', 'resolved', 'dismissed'
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON admin_alerts (status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON admin_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON admin_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_company_id ON admin_alerts (company_id);
