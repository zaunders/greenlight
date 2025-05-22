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
2. Create the following tables in your Supabase database:

```sql
-- Users table (handled by Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  username text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Friend Lists
create table public.friend_lists (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references public.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Friend List Members
create table public.friend_list_members (
  list_id uuid references public.friend_lists not null,
  user_id uuid references public.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (list_id, user_id)
);

-- Green Lights
create table public.green_lights (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references public.friend_lists not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);
```

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