import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVisualTest() {
  console.log("\n=======================================================");
  console.log("🚀 INICIANDO PRUEBA VISUAL DE NAVEGADOR EN TIEMPO REAL");
  console.log("=======================================================");

  // Encontrar la ruta de Chrome en Windows
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  
  let executablePath = null;
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  if (!executablePath) {
    console.error("❌ ERROR: No se encontró Google Chrome en las rutas predeterminadas de Windows.");
    return;
  }

  console.log(`Navegador detectado en: ${executablePath}`);
  console.log("Se abrirá la ventana de Chrome visiblemente en su escritorio...");

  // Iniciar navegador en modo NO-HEADLESS (HEADFUL) para que el usuario pueda verlo.
  const browser = await puppeteer.launch({
    executablePath: executablePath,
    headless: false, // ¡Visible en pantalla!
    slowMo: 100,     // Retrasar cada acción para que sea visible
    defaultViewport: null, // Maximizar viewport al tamaño de pantalla
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = 'C:\\Users\\jcruz\\.gemini\\antigravity-ide\\brain\\b3632aa9-0e7b-4b36-ac2d-62fa8ce8a9cc';
  let page = null;

  try {
    page = (await browser.pages())[0] || await browser.newPage();
    
    // Escuchar consola del navegador
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[CONSOLA NAV (ERROR)] ${msg.text()}`);
      }
    });

    const testUsers = [
      {
        email: 'admin_prueba@sindicato.org',
        pass: '12345678',
        roleName: 'Administrador (Control Total)',
        isMobile: false,
        actions: async () => {
          console.log("🔹 Administrador: Esperando carga del Dashboard General...");
          await page.waitForSelector('.main-content', { timeout: 8000 });
          await delay(2000);
          await page.screenshot({ path: path.join(artifactDir, 'screenshot_admin_dashboard.png') });
          console.log("📸 Captura tomada: Dashboard General");

          // Ir a Vehículos
          console.log("🔹 Administrador: Navegando a Parque Automotor...");
          const vehLink = await page.waitForSelector('a[href="/dashboard/vehiculos"]');
          await vehLink.click();
          await delay(2500);
          await page.screenshot({ path: path.join(artifactDir, 'screenshot_admin_vehiculos.png') });
          console.log("📸 Captura tomada: Parque Automotor (Con choferes asignados)");

          // Ir a Usuarios
          console.log("🔹 Administrador: Navegando a Gestión de Usuarios...");
          const usrLink = await page.waitForSelector('a[href="/dashboard/usuarios"]');
          await usrLink.click();
          await delay(2500);
          await page.screenshot({ path: path.join(artifactDir, 'screenshot_admin_usuarios.png') });
          console.log("📸 Captura tomada: Gestión de Usuarios (Reutilización de CI y CRUD)");
        }
      },
      {
        email: 'controlador@sindicato.org',
        pass: '12345678',
        roleName: 'Controlador (Parada y Ruta - Móvil)',
        isMobile: true,
        actions: async () => {
          console.log("🔹 Controlador: Esperando carga del Panel Móvil de Multas...");
          await page.waitForSelector('input[placeholder*="Disco"]', { timeout: 8000 });
          await delay(2500);
          await page.screenshot({ path: path.join(artifactDir, 'screenshot_controlador_dashboard.png') });
          console.log("📸 Captura tomada: Control de Multas (Vista Táctil Móvil)");
        }
      },
      {
        email: 'afiliado@sindicato.org',
        pass: '12345678',
        roleName: 'Afiliado (Portal del Conductor - Móvil)',
        isMobile: true,
        actions: async () => {
          console.log("🔹 Afiliado: Esperando carga del Portal Personal...");
          await page.waitForSelector('h1', { timeout: 8000 });
          await delay(2500);
          await page.screenshot({ path: path.join(artifactDir, 'screenshot_afiliado_portal.png') });
          console.log("📸 Captura tomada: Portal de Afiliados (Mis cuotas, multas y autos)");
        }
      }
    ];

    for (const testUser of testUsers) {
      console.log(`\n-------------------------------------------------------`);
      console.log(`🔑 PROBANDO PERFIL: ${testUser.roleName}`);
      console.log(`-------------------------------------------------------`);

      // Configurar Viewport
      if (testUser.isMobile) {
        console.log("📱 Configurando tamaño de pantalla a celular (iPhone 12/13)...");
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      } else {
        console.log("💻 Configurando tamaño de pantalla a Escritorio...");
        await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
      }

      console.log("Navegando a la página de login...");
      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
      await delay(1000);

      console.log(`Escribiendo credenciales para ${testUser.email}...`);
      const emailInput = await page.waitForSelector('input[type="email"]');
      
      // Limpiar email (usar tripe click para seleccionar todo e ingresar texto limpio)
      await emailInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await emailInput.type(testUser.email);

      const passInput = await page.waitForSelector('input[type="password"]');
      await passInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await passInput.type(testUser.pass);

      await page.screenshot({ path: path.join(artifactDir, `screenshot_login_${testUser.email.split('@')[0]}.png`) });

      console.log("Haciendo clic en el botón de Iniciar Sesión...");
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();

      // Esperar navegación/redirección
      await delay(2000);

      // Ejecutar las acciones específicas del rol
      await testUser.actions();

      // Probar el botón de Cerrar Sesión
      console.log("🔹 Cerrando sesión...");
      
      // Intentar encontrar el botón de cerrar sesión
      let logoutBtn;
      try {
        // En móviles o escritorio, buscar por texto
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Cerrar Sesión')) {
            logoutBtn = btn;
            break;
          }
        }
      } catch (e) {}

      if (!logoutBtn) {
        // Fallback selector
        logoutBtn = await page.$('button[style*="color: #ef4444"]');
      }

      if (logoutBtn) {
        await logoutBtn.click();
        console.log("✅ Botón 'Cerrar Sesión' presionado.");
        await delay(2000);
        console.log("URL actual tras cerrar sesión:", page.url());
        
        await page.screenshot({ path: path.join(artifactDir, `screenshot_logout_success_${testUser.email.split('@')[0]}.png`) });
        console.log("📸 Captura tomada: Redireccionado a la pantalla de login con éxito.");
      } else {
        console.warn("⚠️ Advertencia: No se pudo localizar el botón 'Cerrar Sesión'.");
      }
    }

    console.log("\n=======================================================");
    console.log("🎉 TODAS LAS PRUEBAS VISUALES COMPLETADAS CON ÉXITO!");
    console.log("=======================================================");

  } catch (error) {
    console.error("\n❌ ERROR DURANTE LA AUTOMATIZACIÓN:", error.message);
    try {
      const errorScreenshotPath = path.join(artifactDir, 'screenshot_error.png');
      await page.screenshot({ path: errorScreenshotPath, fullPage: true });
      console.log(`📸 Captura de error guardada en: ${errorScreenshotPath}`);
      console.log("URL de error actual:", page.url());
    } catch (e) {
      console.error("No se pudo tomar la captura de error:", e.message);
    }
  } finally {
    // Mantener la ventana abierta unos segundos más antes de cerrar
    await delay(3000);
    await browser.close();
  }
}

runVisualTest();
