#!/bin/bash

# Configuration - UPDATE THIS URL TO YOUR ACTUAL DOMAIN
REMINDER_URL="https://your-domain.com/api/cron/reminders"

# Get the current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Debug: Log that script is starting
echo "[$TIMESTAMP] 🔄 Starting reminder processing..." >> /tmp/cron-debug.log

# Make the curl request and capture the response
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$REMINDER_URL")

# Extract HTTP status code (last line of response)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract response body (everything except last line)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

# Debug: Log the response for troubleshooting
echo "[$TIMESTAMP] HTTP Code: $HTTP_CODE" >> /tmp/cron-debug.log
echo "[$TIMESTAMP] Response: $RESPONSE_BODY" >> /tmp/cron-debug.log

# Check if the curl was successful (HTTP 200)
if [ "$HTTP_CODE" = "200" ]; then
    # Extract success status from JSON response
    SUCCESS=$(echo "$RESPONSE_BODY" | grep -o '"success":\s*true' || echo "")
    
    if [ -n "$SUCCESS" ]; then
        echo "[$TIMESTAMP] ✅ Reminder processing completed successfully"
    else
        echo "[$TIMESTAMP] ❌ Reminder processing failed or returned error"
        echo "[$TIMESTAMP] Response: $RESPONSE_BODY" >> /tmp/cron-debug.log
    fi
else
    echo "[$TIMESTAMP] ❌ Failed to connect to reminder endpoint (HTTP $HTTP_CODE)"
    echo "[$TIMESTAMP] URL: $REMINDER_URL" >> /tmp/cron-debug.log
fi 