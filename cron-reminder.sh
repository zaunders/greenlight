#!/bin/bash

# Get the current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Make the curl request and capture the response
RESPONSE=$(curl -s -X POST https://your-domain.com/api/cron/reminders)

# Check if the curl was successful (HTTP 200)
if [ $? -eq 0 ]; then
    # Extract success status from JSON response (assuming response contains "success": true)
    SUCCESS=$(echo "$RESPONSE" | grep -o '"success":\s*true' || echo "")
    
    if [ -n "$SUCCESS" ]; then
        echo "[$TIMESTAMP] ✅ Reminder processing completed successfully"
    else
        echo "[$TIMESTAMP] ❌ Reminder processing failed or returned error"
    fi
else
    echo "[$TIMESTAMP] ❌ Failed to connect to reminder endpoint"
fi 