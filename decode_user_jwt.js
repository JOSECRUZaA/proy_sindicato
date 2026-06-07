import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function testJWT() {
  console.log("=== INICIANDO ANÁLISIS DE JWT ===");
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'controlador@sindicato.org',
      password: '12345678'
    });

    if (error) {
      console.error("❌ ERROR AL LOGUEAR:", error.message);
      return;
    }

    const token = data.session.access_token;
    console.log("✅ LOGIN EXITOSO!");
    
    // Decodificar el JWT (parte del payload es el segundo bloque en base64)
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(decodedPayload);

    console.log("Payload del JWT:");
    console.log(JSON.stringify(payload, null, 2));

    const iat = payload.iat;
    const exp = payload.exp;
    const durationSeconds = exp - iat;
    console.log(`\nIssued At (iat): ${new Date(iat * 1000).toISOString()}`);
    console.log(`Expires At (exp): ${new Date(exp * 1000).toISOString()}`);
    console.log(`Duración del Token: ${durationSeconds} segundos (${durationSeconds / 60} minutos)`);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

testJWT();
