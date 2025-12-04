-- Create aloa_app_settings table for global application settings
-- This table stores key-value pairs for app-wide configuration
-- Only super_admin users can modify these settings

CREATE TABLE IF NOT EXISTS aloa_app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES aloa_user_profiles(id)
);

-- Enable RLS
ALTER TABLE aloa_app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read app settings"
  ON aloa_app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only super_admin can insert/update/delete settings
CREATE POLICY "Super admins can manage app settings"
  ON aloa_app_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON aloa_app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Insert default settings
INSERT INTO aloa_app_settings (key, value, description)
VALUES
  ('default_notification_email', '"info@aloa.agency"', 'Default email address for form submission notifications when no project is attached'),
  ('company_name', '"Aloa Agency"', 'Company name displayed in emails and UI'),
  ('support_email', '"support@aloa.agency"', 'Support email address for user inquiries')
ON CONFLICT (key) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE aloa_app_settings IS 'Global application settings managed by super admins. Each setting is a key-value pair with JSONB value for flexibility.';
