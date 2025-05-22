import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project credentials
const supabaseUrl = 'https://oxxldhvawfopxauwocvq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eGxkaHZhd2ZvcHhhdXdvY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTY0MzIsImV4cCI6MjA2MzQ5MjQzMn0.ZBfYwASqnufhE1wRf_sIwmsd4_lTgkebeSGx8PIAxEU';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
    id: string;
    email: string;
    username: string;
    created_at: string;
}

export interface FriendList {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
}

export interface FriendListMember {
    list_id: string;
    user_id: string;
}

export interface GreenLight {
    id: string;
    owner_id: string;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
    expires_at: string;
    lists?: {
        list_id: string;
        friend_list: {
            name: string;
            owner_id: string;
            owner_id_data: {
                username: string;
            };
        };
    }[];
}

export interface GreenLightList {
    green_light_id: string;
    list_id: string;
} 