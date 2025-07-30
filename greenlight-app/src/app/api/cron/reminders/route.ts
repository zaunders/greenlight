import { NextRequest, NextResponse } from 'next/server';
import { processReminders } from '@/lib/reminders';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting reminder processing...');
    console.log('Current time:', new Date().toISOString());
    
    await processReminders();
    
    console.log('Reminder processing completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Reminders processed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in reminder processing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Manual reminder processing triggered...');
    await processReminders();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Manual reminder processing completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in manual reminder processing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 