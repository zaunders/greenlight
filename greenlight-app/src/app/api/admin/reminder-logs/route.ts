import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const reminderType = searchParams.get('type');
    const userId = searchParams.get('user_id');

    // Build query
    let query = supabase
      .from('recent_reminder_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters if provided
    if (reminderType) {
      query = query.eq('reminder_type', reminderType);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminder logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reminder logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: data || [],
      count: data?.length || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in reminder logs API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 