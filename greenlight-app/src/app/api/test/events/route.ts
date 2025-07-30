import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    console.log('Current time:', now.toISOString());
    console.log('1 hour from now:', oneHourFromNow.toISOString());
    console.log('2 hours from now:', twoHoursFromNow.toISOString());
    
    // Get all events starting in the next 24 hours
    const { data: events, error } = await supabase
      .from('lights')
      .select(`
        id,
        title,
        start_time,
        published,
        light_invitations (
          id,
          user_id,
          status
        )
      `)
      .gte('start_time', now.toISOString())
      .lte('start_time', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Calculate time differences
    const eventsWithTimeDiff = events?.map(event => {
      const eventTime = new Date(event.start_time);
      const diffMs = eventTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return {
        ...event,
        timeUntilEvent: `${diffHours.toFixed(2)} hours`,
        timeUntilEventMs: diffMs,
        acceptedAttendees: event.light_invitations?.filter(inv => inv.status === 'accepted').length || 0
      };
    }) || [];
    
    return NextResponse.json({
      currentTime: now.toISOString(),
      eventsFound: eventsWithTimeDiff.length,
      events: eventsWithTimeDiff
    });
    
  } catch (error) {
    console.error('Error in test events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 