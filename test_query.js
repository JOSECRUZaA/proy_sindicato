import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function listUsers() {
  console.log("=== LISTANDO USUARIOS DESDE LA TABLA usuarios ===");
  try {
    const envPath = path.resolve('.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split(/\r?\n/);
    const env = {};
    envLines.forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id_usuario,
        auth_user_id,
        personas ( nombres, paterno, ci ),
        roles ( nombre )
      `);

    if (error) {
      console.error("❌ ERROR EN QUERY:", error);
    } else {
      console.log(`✅ OBTENIDOS ${data?.length} USUARIOS:`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("❌ ERROR GENERAL DEL SCRIPT:", err.message);
  }
}

listUsers();
