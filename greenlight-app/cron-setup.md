# Event Reminder Cron Job Setup

This document explains how to set up the automated reminder notifications for upcoming events.

## How It Works

The system checks every minute for events that are starting in exactly:
- 1 hour
- 2 hours  
- 6 hours
- 12 hours
- 24 hours

For each matching event, it sends reminder notifications to attendees who have:
- `light_reminder = true` in their notification preferences
- `light_reminder_advance_hours` matching the current check (1, 2, 6, 12, or 24)

## API Endpoint

The cron job calls: `POST /api/cron/reminders`

## Setting Up the Cron Job

### Option 1: Using crontab (Linux/macOS)

1. Open your crontab:
   ```bash
   crontab -e
   ```

2. Add this line to run every minute:
   ```bash
   * * * * * curl -X POST https://your-domain.com/api/cron/reminders
   ```

### Option 2: Using a Cron Service

You can use services like:
- **Cron-job.org** - Free service
- **EasyCron** - Free tier available
- **Cronitor** - Paid service with monitoring

Set the URL to: `https://your-domain.com/api/cron/reminders`
Set the schedule to: Every minute

### Option 3: Using Vercel Cron (Recommended)

If you're deploying on Vercel, add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

## Testing

You can test the endpoint manually:

```bash
curl -X POST https://your-domain.com/api/cron/reminders
```

Or visit: `https://your-domain.com/api/cron/reminders` in your browser for a GET request.

## Logs

The cron job logs detailed information about:
- Events found for each time period
- Attendees processed
- Notifications sent/skipped
- Any errors encountered

Check your server logs to monitor the cron job execution.

## Security

The endpoint doesn't require authentication since it's designed to be called by cron services. If you need additional security, you can:

1. Add an API key check
2. Use IP whitelisting
3. Add basic authentication

## Troubleshooting

### Common Issues:

1. **No reminders being sent**
   - Check if events have the correct `start_time` format
   - Verify attendees have `status = 'accepted'`
   - Confirm notification preferences are set correctly

2. **Cron job not running**
   - Verify the URL is accessible
   - Check server logs for errors
   - Test the endpoint manually

3. **Duplicate notifications**
   - The system checks for exact time matches, so duplicates should be rare
   - If needed, add a "last_reminder_sent" field to track sent reminders

## Database Requirements

Make sure these tables exist:
- `lights` (with `start_time`, `published` fields)
- `light_invitations` (with `user_id`, `status` fields)
- `notification_preferences` (with `light_reminder`, `light_reminder_advance_hours` fields)
- `notifications` (for storing the reminder notifications) 