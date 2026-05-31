import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function seedTestUsers() {
  console.log("=== INICIANDO SIEMBRA DE USUARIOS DE PRUEBA ===");

  // 1. Leer archivo .env para extraer las credenciales
  try {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) {
      throw new Error("No se encontró el archivo .env en la raíz del proyecto.");
    }
    
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

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidos en el .env");
    }

    console.log(`Conectando a Supabase: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 2. Definición de perfiles a crear (Contraseña: 12345678 para todos)
    const mockUsers = [
      { email: 'admin_prueba@sindicato.org', roleName: 'Administrador', nombres: 'Jose', paterno: 'Cruz', ci: '9999901' },
      { email: 'secretario@sindicato.org', roleName: 'Secretario', nombres: 'Carlos', paterno: 'Gomez', ci: '1000002' },
      { email: 'tesorero@sindicato.org', roleName: 'Tesorero', nombres: 'Maria', paterno: 'Choque', ci: '1000003' },
      { email: 'controlador@sindicato.org', roleName: 'Controlador', nombres: 'Luis', paterno: 'Mamani', ci: '1000004' },
      { email: 'afiliado@sindicato.org', roleName: 'Afiliado', nombres: 'Juan', paterno: 'Flores', ci: '1000005' }
    ];

    for (const user of mockUsers) {
      console.log(`\nProcesando: ${user.email} (${user.roleName})...`);
      
      let authUserId = null;
      
      // A. Registrar en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: '12345678'
      });

      if (signUpError) {
        // Si ya está registrado, iniciar sesión para obtener su auth_user_id
        console.log(`El usuario ya existe en Auth, logueando para obtener UUID...`);
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

      // B. Obtener ID del Rol (con fallback para Consulta si es Afiliado)
      let { data: roleData, error: roleErr } = await supabase
        .from('roles')
        .select('id_rol')
        .eq('nombre', user.roleName)
        .single();

      if (roleErr || !roleData) {
        if (user.roleName === 'Afiliado') {
          console.log(`Rol 'Afiliado' no encontrado, intentando con fallback 'Consulta'...`);
          const { data: fallbackRole, error: fallbackErr } = await supabase
            .from('roles')
            .select('id_rol')
            .eq('nombre', 'Consulta')
            .single();
          if (!fallbackErr && fallbackRole) {
            roleData = fallbackRole;
            roleErr = null;
          }
        }
      }

      if (roleErr || !roleData) {
        console.error(`No se encontró el rol '${user.roleName}' en la base de datos. Asegúrate de haber ejecutado las semillas SQL.`);
        continue;
      }

      // C. Verificar/Insertar Persona
      let personaId = null;
      const { data: existPers } = await supabase
        .from('personas')
        .select('id_persona')
        .eq('ci', user.ci)
        .maybeSingle();

      if (existPers) {
        personaId = existPers.id_persona;
        console.log(`Persona con C.I. ${user.ci} ya existe con ID: ${personaId}`);
      } else {
        const { data: newPers, error: persErr } = await supabase
          .from('personas')
          .insert([{
            nombres: user.nombres,
            paterno: user.paterno,
            ci: user.ci,
            celular: '7881692',
            estado: 1
          }])
          .select()
          .single();

        if (persErr) {
          console.error(`Error al crear persona: ${persErr.message}`);
          continue;
        }
        personaId = newPers.id_persona;
        console.log(`Creada nueva persona con ID: ${personaId}`);
      }

      // D. Verificar/Insertar Usuario administrativo
      const { data: existUser } = await supabase
        .from('usuarios')
        .select('id_usuario')
        .eq('id_persona', personaId)
        .maybeSingle();

      if (existUser) {
        console.log(`Usuario administrativo ya vinculado. Actualizando rol y Auth ID...`);
        await supabase
          .from('usuarios')
          .update({ auth_user_id: authUserId, id_rol: roleData.id_rol })
          .eq('id_usuario', existUser.id_usuario);
      } else {
        const { error: userErr } = await supabase
          .from('usuarios')
          .insert([{
            auth_user_id: authUserId,
            id_persona: personaId,
            id_rol: roleData.id_rol,
            estado: 1
          }]);
        
        if (userErr) {
          console.error(`Error al vincular usuario: ${userErr.message}`);
          continue;
        }
        console.log(`Usuario vinculado correctamente en la tabla 'usuarios'.`);
      }

      // E. Si es el 'Afiliado', poblar datos sindicales simulados (para que el portal no aparezca vacío)
      if (user.roleName === 'Afiliado') {
        console.log("Poblando datos sindicales mock para el Afiliado...");
        
        // 1. Crear afiliado
        let affiliateId = null;
        const { data: existAff } = await supabase
          .from('afiliados')
          .select('id_afiliado')
          .eq('id_persona', personaId)
          .maybeSingle();

        if (existAff) {
          affiliateId = existAff.id_afiliado;
        } else {
          const { data: newAff, error: affErr } = await supabase
            .from('afiliados')
            .insert([{
              id_persona: personaId,
              numero_afiliado: 'AF-2551',
              tipo_afiliado: 'Socio Propietario',
              estado_organico: 'Activo'
            }])
            .select()
            .single();
          
          if (affErr) {
            console.error("Error al crear registro de afiliado:", affErr.message);
            continue;
          }
          affiliateId = newAff.id_afiliado;
        }

        // 2. Asociar un vehículo de propiedad (Disco #75)
        const { data: existVeh } = await supabase
          .from('vehiculos')
          .select('id_vehiculo')
          .eq('numero_disco', 75)
          .maybeSingle();

        if (!existVeh) {
          const { error: vehErr } = await supabase
            .from('vehiculos')
            .insert([{
              id_propietario: affiliateId,
              numero_disco: 75,
              placa: 'GTD788',
              numero_linea: '1',
              marca: 'Toyota',
              modelo: 'King Long',
              estado: 'Operativo'
            }]);
          if (vehErr) console.error("Error al crear vehículo mock:", vehErr.message);
        }

        // 3. Crear cuotas pendientes y pagadas
        const { data: cuotaType } = await supabase.from('tipos_cuota').select('id_tipo_cuota').limit(1).single();
        if (cuotaType) {
          // Borrar previas para evitar error UNIQUE
          await supabase.from('cuotas').delete().eq('id_afiliado', affiliateId);
          
          // Registrar cuota cancelada
          await supabase.from('cuotas').insert([{
            id_afiliado: affiliateId,
            id_tipo_cuota: cuotaType.id_tipo_cuota,
            gestion: 2026,
            mes: 4,
            monto_bs: 30.00,
            estado: 'Cancelado'
          }]);

          // Registrar cuota pendiente
          await supabase.from('cuotas').insert([{
            id_afiliado: affiliateId,
            id_tipo_cuota: cuotaType.id_tipo_cuota,
            gestion: 2026,
            mes: 5,
            monto_bs: 30.00,
            estado: 'Pendiente'
          }]);
        }

        // 4. Crear multa pendiente
        const { data: multaType } = await supabase.from('tipos_multa').select('id_tipo_multa').limit(1).single();
        if (multaType) {
          // Limpiar previas
          await supabase.from('multas').delete().eq('id_afiliado', affiliateId);

          await supabase.from('multas').insert([{
            id_afiliado: affiliateId,
            id_usuario_emisor: 1, // Usuario Admin ID 1
            id_tipo_multa: multaType.id_tipo_multa,
            concepto: 'Inasistencia a asambleas generales',
            monto_bs: 100.00,
            estado: 'Pendiente',
            observacion: '[Turno 1] Ausencia injustificada en la asamblea del 15 de mayo.'
          }]);
        }
      }
    }

    console.log("\n=== SIEMBRA FINALIZADA EXITOSAMENTE ===");
    console.log("Cuentas creadas (Contraseña de todas: '12345678'):");
    mockUsers.forEach(u => console.log(`- Correo: ${u.email} | Rol: ${u.roleName}`));

  } catch (err) {
    console.error("Fallo general en la siembra:", err.message);
  }
}

seedTestUsers();
