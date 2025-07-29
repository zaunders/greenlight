import { supabase } from './supabaseClient';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'light_invitation' | 'light_message_owner' | 'light_message_attending' | 'light_attending' | 'light_reminder' | 'light_cancelled' | 'system';
  related_id?: string; // ID of related light, etc.
  read: boolean;
  created_at: string;
  data?: Record<string, any>; // Additional data for the notification
}

export interface NotificationPreferences {
  user_id: string;
  light_invitation: boolean;
  light_message_owner: boolean;
  light_message_attending: boolean;
  light_attending: boolean;
  light_reminder: boolean;
  light_reminder_advance_hours: number; // How many hours in advance to send reminders
  light_cancelled: boolean;
  system: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationCount {
  unread: number;
  total: number;
}

// Create a notification
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>) {
  try {
    console.log('Creating notification:', notification);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating notification:', error);
      throw error;
    }

    console.log('Notification created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createNotification:', error);
    throw error;
  }
}

// Get notifications for a user
export async function getNotifications(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

// Get unread notification count
export async function getNotificationCount(userId: string): Promise<NotificationCount> {
  const { count: total, error: totalError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (totalError) throw totalError;

  const { count: unread, error: unreadError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (unreadError) throw unreadError;

  return {
    unread: unread || 0,
    total: total || 0
  };
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
}

// Delete notification
export async function deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

// Create notification for light invitation
export async function createLightInvitationNotification(
  userId: string, 
  lightId: string, 
  lightTitle: string, 
  authorName: string
) {
  return createNotification({
    user_id: userId,
    title: 'New Event Invitation',
    message: `${authorName} invited you to "${lightTitle}"`,
    type: 'light_invitation',
    related_id: lightId,
    read: false,
    data: {
      light_title: lightTitle,
      author_name: authorName
    }
  });
}

// Create notification for light reminder
export async function createLightReminderNotification(
  userId: string,
  lightId: string,
  lightTitle: string,
  startTime: string
) {
  return createNotification({
    user_id: userId,
    title: 'Event Reminder',
    message: `"${lightTitle}" starts in 1 hour`,
    type: 'light_reminder',
    related_id: lightId,
    read: false,
    data: {
      light_title: lightTitle,
      start_time: startTime
    }
  });
}

// Create system notification
export async function createSystemNotification(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  return createNotification({
    user_id: userId,
    title,
    message,
    type: 'system',
    read: false,
    data
  });
}

// Get notification preferences for a user
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    console.log('Attempting to fetch preferences for user:', userId);
    
    // First, let's check if the table exists by trying a simple query
    const { data: tableCheck, error: tableError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .limit(1);

    if (tableError) {
      console.error('Table check error:', tableError);
      if (tableError.code === '42P01') { // Table doesn't exist
        console.error('The notification_preferences table does not exist. Please run the SQL migration first.');
        throw new Error('Table notification_preferences does not exist. Please run the SQL migration in Supabase.');
      }
      throw tableError;
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // If no preferences exist, return null
    if (!data) {
      console.log('No preferences found for user, returning null');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getNotificationPreferences:', error);
    throw error;
  }
}

// Create or update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
) {
  try {
    console.log('Updating preferences for user:', userId, 'with data:', preferences);
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error in updateNotificationPreferences:', error);
      throw error;
    }

    console.log('Successfully updated preferences:', data);
    return data;
  } catch (error) {
    console.error('Error in updateNotificationPreferences:', error);
    throw error;
  }
}

// Check if a user wants to receive a specific type of notification
export async function shouldSendNotification(userId: string, type: string): Promise<boolean> {
  console.log('Checking notification preference for user:', userId, 'type:', type);
  
  const preferences = await getNotificationPreferences(userId);
  console.log('User preferences:', preferences);
  
  if (!preferences) {
    console.log('No preferences found, defaulting to true');
    return true; // Default to true if no preferences set
  }
  
  const shouldSend = preferences[type as keyof NotificationPreferences] === true;
  console.log('Should send notification:', shouldSend);
  return shouldSend;
}

// Create notification for light message to owner
export async function createLightMessageOwnerNotification(
  userId: string,
  lightId: string,
  lightTitle: string,
  senderName: string,
  message: string
) {
  // Check if user wants to receive this type of notification
  const shouldSend = await shouldSendNotification(userId, 'light_message_owner');
  if (!shouldSend) {
    console.log('Skipping light_message_owner notification for user:', userId, '- preference disabled');
    return null;
  }

  return createNotification({
    user_id: userId,
    title: 'New Message on Your Light',
    message: `${senderName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
    type: 'light_message_owner',
    related_id: lightId,
    read: false,
    data: {
      light_title: lightTitle,
      sender_name: senderName,
      message: message
    }
  });
}

// Create notification for light message to attendee
export async function createLightMessageAttendingNotification(
  userId: string,
  lightId: string,
  lightTitle: string,
  senderName: string,
  message: string
) {
  // Check if user wants to receive this type of notification
  const shouldSend = await shouldSendNotification(userId, 'light_message_attending');
  if (!shouldSend) {
    console.log('Skipping light_message_attending notification for user:', userId, '- preference disabled');
    return null;
  }

  return createNotification({
    user_id: userId,
    title: 'New Message on Light',
    message: `${senderName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
    type: 'light_message_attending',
    related_id: lightId,
    read: false,
    data: {
      light_title: lightTitle,
      sender_name: senderName,
      message: message
    }
  });
}

// Create notification for light attendance
export async function createLightAttendingNotification(
  userId: string,
  lightId: string,
  lightTitle: string,
  attendeeName: string
) {
  return createNotification({
    user_id: userId,
    title: 'Someone Joined Your Light',
    message: `${attendeeName} is now attending "${lightTitle}"`,
    type: 'light_attending',
    related_id: lightId,
    read: false,
    data: {
      light_title: lightTitle,
      attendee_name: attendeeName
    }
  });
}

// Create notification for light cancellation
export async function createLightCancelledNotification(
  userId: string,
  lightId: string,
  lightTitle: string,
  authorName: string
) {
  return createNotification({
    user_id: userId,
    title: 'Light Cancelled',
    message: `${authorName} cancelled "${lightTitle}"`,
    type: 'light_cancelled',
    related_id: lightId,
    read: false,
    data: {
      light_title: lightTitle,
      author_name: authorName
    }
  });
} 