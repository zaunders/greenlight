#!/usr/bin/env node

/**
 * Test script for the reminder notification system
 * This script helps verify that the cron job is working correctly
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function testReminderEndpoint() {
  console.log('🧪 Testing reminder notification endpoint...');
  console.log(`📍 Endpoint: ${BASE_URL}/api/cron/reminders`);
  
  try {
    // Test GET request (should return basic info)
    console.log('\n📡 Testing GET request...');
    const getResponse = await fetch(`${BASE_URL}/api/cron/reminders`);
    const getData = await getResponse.json();
    console.log('✅ GET response:', getData);
    
    // Test POST request (should process reminders)
    console.log('\n📡 Testing POST request...');
    const postResponse = await fetch(`${BASE_URL}/api/cron/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const postData = await postResponse.json();
    console.log('✅ POST response:', postData);
    
    if (postData.success) {
      console.log('\n🎉 Reminder system is working correctly!');
    } else {
      console.log('\n❌ Reminder system encountered an error:', postData.error);
    }
    
  } catch (error) {
    console.error('\n❌ Error testing reminder endpoint:', error.message);
    console.log('\n💡 Make sure your development server is running on port 3001');
  }
}

// Run the test
testReminderEndpoint(); 