import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createLightReminderNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting reminder notification check...');
    
    const now = new Date();
    const reminderHours = [1, 2, 6, 12, 24];
    
    for (const hours of reminderHours) {
      console.log(`Checking for events starting in ${hours} hour(s)...`);
      
      // Calculate the target time (now + hours)
      const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
      
      // Round to the nearest minute to avoid missing events due to seconds
      targetTime.setSeconds(0, 0);
      
      // Format the target time for database query
      const targetTimeString = targetTime.toISOString();
      
      // Find events starting at the target time
      const { data: events, error: eventsError } = await supabase
        .from('lights')
        .select(`
          id,
          title,
          start_time,
          light_invitations (
            id,
            user_id,
            status
          )
        `)
        .eq('start_time', targetTimeString)
        .eq('published', true);
      
      if (eventsError) {
        console.error(`Error fetching events for ${hours}h reminder:`, eventsError);
        continue;
      }
      
      console.log(`Found ${events?.length || 0} events starting in ${hours} hour(s)`);
      
      if (!events || events.length === 0) {
        continue;
      }
      
      // Process each event
      for (const event of events) {
        console.log(`Processing event: ${event.title} (${event.id})`);
        
        // Get all accepted attendees for this event
        const acceptedAttendees = event.light_invitations?.filter(
          invitation => invitation.status === 'accepted'
        ) || [];
        
        console.log(`Found ${acceptedAttendees.length} accepted attendees`);
        
        // Check each attendee's notification preferences
        for (const attendee of acceptedAttendees) {
          try {
            // Get the attendee's notification preferences
            const { data: preferences, error: prefError } = await supabase
              .from('notification_preferences')
              .select('light_reminder, light_reminder_advance_hours')
              .eq('user_id', attendee.user_id)
              .single();
            
            if (prefError) {
              console.error(`Error fetching preferences for user ${attendee.user_id}:`, prefError);
              continue;
            }
            
            // Check if user wants reminders and if the advance hours match
            if (preferences && 
                preferences.light_reminder === true && 
                preferences.light_reminder_advance_hours === hours) {
              
              console.log(`Sending ${hours}h reminder to user ${attendee.user_id} for event ${event.title}`);
              
              // Send the reminder notification
              await createLightReminderNotification(
                attendee.user_id,
                event.id,
                event.title,
                event.start_time
              );
              
              console.log(`Successfully sent ${hours}h reminder to user ${attendee.user_id}`);
            } else {
              console.log(`Skipping reminder for user ${attendee.user_id} - preferences: light_reminder=${preferences?.light_reminder}, advance_hours=${preferences?.light_reminder_advance_hours}`);
            }
          } catch (notificationError) {
            console.error(`Error sending reminder to user ${attendee.user_id}:`, notificationError);
          }
        }
      }
    }
    
    console.log('Reminder notification check completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Reminder notifications processed successfully',
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('Error in reminder notification cron job:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also handle GET requests for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Reminder notification endpoint is working',
    timestamp: new Date().toISOString()
  });
} 