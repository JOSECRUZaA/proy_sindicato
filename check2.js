import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: existPerfil, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('ci', '9999901')
        .maybeSingle();
  console.log("existPerfil:", existPerfil);
  console.log("error:", error);
}
run();
