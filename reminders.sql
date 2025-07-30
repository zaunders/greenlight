-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    light_id UUID NOT NULL REFERENCES lights(id) ON DELETE CASCADE,
    light_title VARCHAR(255) NOT NULL,
    event_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    advance_hours INTEGER NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service can view reminders" ON reminders FOR SELECT USING (true);
CREATE POLICY "Service can insert reminders" ON reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update reminders" ON reminders FOR UPDATE USING (true);
CREATE POLICY "Service can delete reminders" ON reminders FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_light_id ON reminders(light_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_sent ON reminders(sent);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(reminder_time, sent) WHERE sent = false;

-- Create a view for easier querying of due reminders
CREATE OR REPLACE VIEW due_reminders AS
SELECT r.*, u.email as user_email
FROM reminders r
LEFT JOIN auth.users u ON r.user_id = u.id
WHERE r.sent = false AND r.reminder_time <= NOW()
ORDER BY r.reminder_time ASC; 