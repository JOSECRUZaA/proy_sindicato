import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function testLogin() {
  console.log("=== INICIANDO PRUEBA DE LOGIN DESDE NODE ===");
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

    console.log(`URL: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log("Intentando iniciar sesión con afiliado@sindicato.org...");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'afiliado@sindicato.org',
      password: '12345678'
    });

    if (error) {
      console.error("❌ ERROR DE AUTENTICACIÓN:", error.message);
    } else {
      console.log("✅ AUTENTICACIÓN EXITOSA!");
      console.log("Usuario UUID:", data.user.id);
      console.log("Sesión Token:", data.session.access_token.substring(0, 20) + "...");
    }
  } catch (err) {
    console.error("❌ ERROR DEL SCRIPT:", err.message);
  }
}

testLogin();
