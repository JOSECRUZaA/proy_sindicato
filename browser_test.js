import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log("=== INICIANDO PRUEBA DEL NAVEGADOR AUTOMATIZADA ===");
  
  // 1. Encontrar la ruta de Chrome en Windows
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
    console.error("❌ No se encontró Google Chrome ni Microsoft Edge instalado en las rutas estándar.");
    return;
  }

  console.log(`Usando navegador en: ${executablePath}`);
  
  const browser = await puppeteer.launch({
    executablePath: executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Configurar viewport de celular (ya que probaremos el portal del afiliado)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Escuchar la consola del navegador
    page.on('console', msg => {
      console.log(`[CONSOLA NAV] [${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    console.log("Navegando a la página de Login: http://localhost:5173/login");
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    console.log("Escribiendo credenciales del Afiliado...");
    // Esperar a que los inputs estén visibles
    await page.waitForSelector('input[type="email"]');
    
    // Limpiar y escribir email
    await page.focus('input[type="email"]');
    await page.keyboard.type('afiliado@sindicato.org');

    // Limpiar y escribir password
    await page.focus('input[type="password"]');
    await page.keyboard.type('12345678');

    console.log("Haciendo clic en el botón de Iniciar Sesión...");
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();

    console.log("Esperando la redirección al panel de afiliados (mi-panel)...");
    // Esperar 4 segundos para que se completen las peticiones y se renderice el dashboard
    await new Promise(r => setTimeout(r, 4000));

    console.log("Página actual:", page.url());

    // Capturar screenshot
    const screenshotPath = path.resolve('C:\\Users\\jcruz\\.gemini\\antigravity-ide\\brain\\4f17a913-0661-4a77-9b90-9e0f773f6246\\browser_screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`✅ CAPTURA DE PANTALLA GUARDADA EN: ${screenshotPath}`);
    console.log("=== PRUEBA FINALIZADA EXITOSAMENTE ===");

  } catch (err) {
    console.error("❌ ERROR EN LA AUTOMATIZACIÓN:", err.message);
  } finally {
    await browser.close();
  }
}

runTest();
