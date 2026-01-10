import { createClient } from '@supabase/supabase-js';

// To connect with wanted databse in supabase
const supabaseUrl = 'https://hphyprjbvwdonlmthhwn.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaHlwcmpidndkb25sbXRoaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzE2MTksImV4cCI6MjA4MDgwNzYxOX0.e2zRU03P8kcO9ttniZouRcDin6ut_egDCao7aMI5gAA'; 
export const supabase = createClient(supabaseUrl, supabaseAnonKey);