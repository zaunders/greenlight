-- Create reminder_logs table to track sent reminders
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    light_id UUID NOT NULL REFERENCES lights(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- '1h', '2h', '6h', '12h', '24h'
    light_title VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    user_username VARCHAR(255),
    advance_hours INTEGER NOT NULL,
    event_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reminder logs" ON reminder_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert reminder logs" ON reminder_logs
    FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_light_id ON reminder_logs(light_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_type ON reminder_logs(reminder_type);

-- Create a view for easy querying of recent reminders
CREATE OR REPLACE VIEW recent_reminder_logs AS
SELECT 
    rl.id,
    rl.user_id,
    rl.light_id,
    rl.notification_id,
    rl.reminder_type,
    rl.light_title,
    rl.user_email,
    rl.user_username,
    rl.advance_hours,
    rl.event_start_time,
    rl.sent_at,
    u.username as recipient_username,
    u.email as recipient_email
FROM reminder_logs rl
LEFT JOIN auth.users u ON rl.user_id = u.id
ORDER BY rl.sent_at DESC; 