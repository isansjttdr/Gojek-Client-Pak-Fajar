import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let storage: any = undefined;
if (Platform.OS !== 'web') {
  // native: use AsyncStorage (install if needed)
  // npm install @react-native-async-storage/async-storage
  storage = require('@react-native-async-storage/async-storage').default;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lhdpyvrihbrgrfdqakie.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoZHB5dnJpaGJyZ3JmZHFha2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NDg1NTEsImV4cCI6MjA3NTIyNDU1MX0.qQZbfV71VcgYuJj_1S_V9oxfM6GyDhwmgGEIG0rVvzg';
const authOptions: any = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: false,
};
if (storage) authOptions.storage = storage;

declare global {
  var __supabase_client__: SupabaseClient | undefined;
}

if (!globalThis.__supabase_client__) {
  globalThis.__supabase_client__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: authOptions,
  });
  console.log('supabase: created singleton client, storage =', storage ? 'AsyncStorage' : 'localStorage (web)');
} else {
  console.log('supabase: reusing existing singleton client');
}

export const supabase = globalThis.__supabase_client__ as SupabaseClient;