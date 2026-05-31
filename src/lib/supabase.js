import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://xhphjiyuzblrcnlcyltw.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhocGhqaXl1emJscmNubGN5bHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2Nzk2NTUsImV4cCI6MjA5NDI1NTY1NX0.o2cUlWCQzlURrBZD1LgU7VxiEATwZaDYn3hnE6UklZU";

const customFetch = async (url, options) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error) {
    console.error('Supabase fetch failed or timed out:', error);
    throw error;
  } finally {
    clearTimeout(id);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch,
  },
});
