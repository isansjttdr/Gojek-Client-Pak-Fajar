import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://lhdpyvrihbrgrfdqakie.supabase.co";
const supabaseAnonKey = "sb_publishable_KSagnZojo8lkD1bZIKSAQQ_tYYRlerw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
