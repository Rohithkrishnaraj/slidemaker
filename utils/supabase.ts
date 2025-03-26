import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project credentials
const supabaseUrl = 'https://nuwwjtxydnbwgrxaabhm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51d3dqdHh5ZG5id2dyeGFhYmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3ODI2ODIsImV4cCI6MjA1NzM1ODY4Mn0.wNPgQgXKdT0UmrT_m1Lc-L-6wZswht1avyOJHrTu8YU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 