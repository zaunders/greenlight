# Green Light - Playdate Organizer

A social app for organizing playdates using Supabase and Lit Elements.

## Features

- User authentication with Google
- Create and manage friend lists
- Set "Green Light" status for playdates
- View active playdates in your network
- Add friends to your lists

## Setup

1. Create a Supabase project at https://supabase.com
2. Create the tables in your Supabase database:

3. Copy your Supabase project URL and anon key from the project settings
4. Update `src/supabase.ts` with your Supabase credentials
5. Install dependencies:
```bash
npm install
```

6. Start the development server:
```bash
npm run dev
```

## Development

The app is built with:
- Lit Elements for UI components
- Supabase for backend and authentication
- TypeScript for type safety
- Vite for development and building

## Building for Production

```bash
npm run build
```

This will create a production build in the `dist` directory. 