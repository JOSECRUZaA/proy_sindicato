import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function seedTestUsers() {
  console.log("=== INICIANDO SIEMBRA DE USUARIOS DE PRUEBA (V2) ===");

  try {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) throw new Error("No se encontró el archivo .env en la raíz del proyecto.");
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split(/\r?\n/);
    const env = {};
    envLines.forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Credenciales incompletas en el .env");

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const mockUsers = [
      { email: 'admin_prueba@sindicato.org', rol: 'Administrador', nombres: 'Jose', paterno: 'Cruz', ci: '9999901' },
      { email: 'secretario@sindicato.org', rol: 'Secretario', nombres: 'Carlos', paterno: 'Gomez', ci: '1000002' },
      { email: 'tesorero@sindicato.org', rol: 'Tesorero', nombres: 'Maria', paterno: 'Choque', ci: '1000003' },
      { email: 'controlador@sindicato.org', rol: 'Controlador', nombres: 'Luis', paterno: 'Mamani', ci: '1000004' },
      { email: 'afiliado@sindicato.org', rol: 'Afiliado', nombres: 'Juan', paterno: 'Flores', ci: '1000005' }
    ];

    for (const user of mockUsers) {
      console.log(`\nProcesando: ${user.email} (${user.rol})...`);
      
      let authUserId = null;
      
      // A. Registrar en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: '12345678'
      });

      if (signUpError) {
        console.log(`El usuario ya existe en Auth, obteniendo UUID...`);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: '12345678'
        });
        if (signInError) {
          console.error(`Error al iniciar sesión: ${signInError.message}`);
          continue;
        }
        authUserId = signInData.user.id;
      } else {
        authUserId = signUpData.user.id;
      }

      console.log(`UUID Auth obtenido: ${authUserId}`);

      // B. Verificar/Insertar Perfil
      let perfilId = null;
      const { data: existPerfil } = await supabase
        .from('perfiles')
        .select('id_perfil')
        .eq('ci', user.ci)
        .maybeSingle();

      if (existPerfil) {
        perfilId = existPerfil.id_perfil;
        console.log(`Perfil con C.I. ${user.ci} ya existe. Actualizando auth_user_id...`);
        await supabase
          .from('perfiles')
          .update({ auth_user_id: authUserId, rol: user.rol })
          .eq('id_perfil', perfilId);
      } else {
        const { data: newPerfil, error: persErr } = await supabase
          .from('perfiles')
          .insert([{
            auth_user_id: authUserId,
            nombres: user.nombres,
            paterno: user.paterno,
            ci: user.ci,
            correo: user.email,
            celular: '7881692',
            rol: user.rol,
            estado: 1
          }])
          .select()
          .single();

        if (persErr) {
          console.error(`Error al crear perfil: ${persErr.message}`);
          continue;
        }
        perfilId = newPerfil.id_perfil;
        console.log(`Creado nuevo perfil con ID: ${perfilId}`);
      }

      // C. Si es el 'Afiliado', poblar datos sindicales simulados
      if (user.rol === 'Afiliado') {
        console.log("Poblando datos sindicales mock para el Afiliado...");
        
        // 1. Actualizar perfil con datos de afiliado
        await supabase.from('perfiles').update({
          numero_afiliado: 'AF-2551',
          tipo_afiliado: 'Socio Propietario',
          estado_organico: 'Activo',
          categoria_licencia: 'C'
        }).eq('id_perfil', perfilId);

        // 2. Asociar un vehículo
        const { data: existVeh } = await supabase.from('vehiculos').select('id_vehiculo').eq('numero_disco', 75).maybeSingle();
        if (!existVeh) {
          const { error: vehErr } = await supabase.from('vehiculos').insert([{
            id_propietario: perfilId,
            numero_disco: 75,
            placa: 'GTD788',
            numero_linea: '1',
            marca: 'Toyota',
            modelo: 'King Long',
            estado: 'Operativo'
          }]);
          if (vehErr) console.error("Error al crear vehículo mock:", vehErr.message);
        }

        // 3. Crear obligaciones financieras (Cuotas y Multas)
        // Limpiar previas
        await supabase.from('obligaciones_financieras').delete().eq('id_afiliado', perfilId);
        
        // Cuota cancelada
        await supabase.from('obligaciones_financieras').insert([{
          id_afiliado: perfilId,
          tipo_obligacion: 'Cuota',
          concepto: 'Cuota Mensual Ordinaria',
          gestion: 2026,
          mes: 4,
          monto_total: 30.00,
          monto_pagado: 30.00,
          estado: 'Pagado'
        }]);

        // Cuota pendiente
        await supabase.from('obligaciones_financieras').insert([{
          id_afiliado: perfilId,
          tipo_obligacion: 'Cuota',
          concepto: 'Cuota Mensual Ordinaria',
          gestion: 2026,
          mes: 5,
          monto_total: 30.00,
          monto_pagado: 0.00,
          estado: 'Pendiente'
        }]);

        // Multa pendiente
        await supabase.from('obligaciones_financieras').insert([{
          id_afiliado: perfilId,
          tipo_obligacion: 'Multa',
          concepto: 'Inasistencia a asambleas generales',
          monto_total: 100.00,
          monto_pagado: 0.00,
          estado: 'Pendiente',
          id_emisor: 1, // ID del admin
          observacion: '[Turno 1] Ausencia injustificada en la asamblea del 15 de mayo.'
        }]);
      }
    }

    console.log("\n=== SIEMBRA V2 FINALIZADA EXITOSAMENTE ===");
  } catch (err) {
    console.error("Fallo general en la siembra:", err.message);
  }
}

seedTestUsers();
