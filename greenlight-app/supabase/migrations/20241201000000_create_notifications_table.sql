-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('light_invitation', 'light_message_owner', 'light_message_attending', 'light_attending', 'light_reminder', 'light_cancelled', 'system')),
  related_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  light_invitation BOOLEAN DEFAULT TRUE,
  light_message_owner BOOLEAN DEFAULT TRUE,
  light_message_attending BOOLEAN DEFAULT TRUE,
  light_attending BOOLEAN DEFAULT TRUE,
  light_reminder BOOLEAN DEFAULT TRUE,
  light_reminder_advance_hours INTEGER DEFAULT 1,
  light_cancelled BOOLEAN DEFAULT TRUE,
  system BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Allow authenticated users to create notifications for any user (needed for invitations)
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for notification preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create notification for light invitation
CREATE OR REPLACE FUNCTION create_light_invitation_notification(
  p_user_id UUID,
  p_light_id UUID,
  p_light_title TEXT,
  p_author_name TEXT
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_id,
    data
  ) VALUES (
    p_user_id,
    'New Event Invitation',
    p_author_name || ' invited you to "' || p_light_title || '"',
    'light_invitation',
    p_light_id,
    jsonb_build_object(
      'light_title', p_light_title,
      'author_name', p_author_name
    )
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 