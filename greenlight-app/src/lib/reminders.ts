import { supabase } from './supabaseClient';
import { createLightReminderNotification } from './notifications';
import { updateNotificationPreferences } from './notifications';

export interface Reminder {
  id: string;
  user_id: string;
  light_id: string;
  light_title: string;
  event_start_time: string;
  reminder_time: string;
  advance_hours: number;
  sent: boolean;
  created_at: string;
}

export async function ensureUserHasPreferences(userId: string): Promise<void> {
  try {
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // No preferences found, create default ones
      console.log('Creating default preferences for user:', userId);
      await updateNotificationPreferences(userId, {
        light_invitation: true,
        light_message_owner: true,
        light_message_attending: true,
        light_attending: true,
        light_reminder: true,
        light_reminder_advance_hours: 1,
        light_cancelled: true,
        system: true
      });
    }
  } catch (error) {
    console.error('Error ensuring user preferences:', error);
  }
}

export async function createRemindersForUser(userId: string, lightId: string, lightTitle: string, eventStartTime: string): Promise<void> {
  try {
    console.log(`Creating reminders for user ${userId} for light ${lightId}`);
    
    // Ensure user has notification preferences
    await ensureUserHasPreferences(userId);
    
    // Get user's notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('light_reminder, light_reminder_advance_hours')
      .eq('user_id', userId)
      .single();
    
    if (prefError) {
      console.error('Error fetching notification preferences:', prefError);
      return;
    }
    
    // If reminders are disabled, don't create any
    if (!preferences || preferences.light_reminder !== true) {
      console.log(`Reminders disabled for user ${userId}`);
      return;
    }
    
    const advanceHours = preferences.light_reminder_advance_hours || 1;
    const eventTime = new Date(eventStartTime);
    const reminderTime = new Date(eventTime.getTime() - (advanceHours * 60 * 60 * 1000));
    
    // Only create reminder if it's in the future
    if (reminderTime > new Date()) {
      console.log(`Creating reminder for ${advanceHours}h before event at ${reminderTime.toISOString()}`);
      
      const { error: insertError } = await supabase
        .from('reminders')
        .insert({
          user_id: userId,
          light_id: lightId,
          light_title: lightTitle,
          event_start_time: eventStartTime,
          reminder_time: reminderTime.toISOString(),
          advance_hours: advanceHours,
          sent: false
        });
      
      if (insertError) {
        console.error('Error creating reminder:', insertError);
      } else {
        console.log(`Reminder created successfully for user ${userId}`);
      }
    } else {
      console.log(`Reminder time ${reminderTime.toISOString()} is in the past, skipping`);
    }
  } catch (error) {
    console.error('Error creating reminders for user:', error);
  }
}

export async function processReminders(): Promise<void> {
  try {
    console.log('Processing reminders...');
    const now = new Date();
    
    // Find all unsent reminders that are due
    const { data: dueReminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('sent', false)
      .lte('reminder_time', now.toISOString());
    
    if (error) {
      console.error('Error fetching due reminders:', error);
      return;
    }
    
    console.log(`Found ${dueReminders?.length || 0} due reminders`);
    
    for (const reminder of dueReminders || []) {
      try {
        console.log(`Processing reminder for user ${reminder.user_id} for light ${reminder.light_id}`);
        
        // Send the notification
        const notification = await createLightReminderNotification(
          reminder.user_id,
          reminder.light_id,
          reminder.light_title,
          reminder.event_start_time,
          reminder.advance_hours
        );
        
        if (notification) {
          // Mark reminder as sent
          const { error: updateError } = await supabase
            .from('reminders')
            .update({ sent: true })
            .eq('id', reminder.id);
          
          if (updateError) {
            console.error('Error marking reminder as sent:', updateError);
          } else {
            console.log(`Reminder ${reminder.id} marked as sent`);
          }
          
          // Log the reminder
          await supabase.from('reminder_logs').insert({
            user_id: reminder.user_id,
            light_id: reminder.light_id,
            notification_id: notification.id,
            reminder_type: `${reminder.advance_hours}h`,
            light_title: reminder.light_title,
            advance_hours: reminder.advance_hours,
            event_start_time: reminder.event_start_time,
            sent_at: new Date().toISOString()
          });
        }
      } catch (reminderError) {
        console.error(`Error processing reminder ${reminder.id}:`, reminderError);
      }
    }
    
    console.log('Reminder processing completed');
  } catch (error) {
    console.error('Error in processReminders:', error);
  }
}

export async function deleteRemindersForUser(userId: string, lightId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('user_id', userId)
      .eq('light_id', lightId);
    
    if (error) {
      console.error('Error deleting reminders:', error);
    } else {
      console.log(`Deleted reminders for user ${userId} and light ${lightId}`);
    }
  } catch (error) {
    console.error('Error deleting reminders for user:', error);
  }
} 