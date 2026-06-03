const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Configuración de archivos y carpetas a copiar/procesar
const filesToCopy = [
  'index.html',
  'LOGOCOUNTRY.png',
  'wolf_icon.png',
  'manifest.json',
  'Analisis_Country_Club_Golf.pdf'
];

const dirsToCopy = [
  'css'
];

function cleanDist() {
  console.log('Limpiando carpeta dist...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);
}

function copyStaticFiles() {
  console.log('Copiando archivos estáticos...');
  filesToCopy.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(distDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`- Copiado: ${file}`);
    } else {
      console.warn(`- Advertencia: No se encontró el archivo ${file}`);
    }
  });

  dirsToCopy.forEach(dir => {
    const srcPath = path.join(srcDir, dir);
    const destPath = path.join(distDir, dir);
    if (fs.existsSync(srcPath)) {
      fs.cpSync(srcPath, destPath, { recursive: true });
      console.log(`- Copiada carpeta: ${dir}`);
    } else {
      console.warn(`- Advertencia: No se encontró la carpeta ${dir}`);
    }
  });
}

function obfuscateJSFiles() {
  console.log('Ofuscando archivos JavaScript...');
  const jsSrcDir = path.join(srcDir, 'js');
  const jsDestDir = path.join(distDir, 'js');

  if (!fs.existsSync(jsDestDir)) {
    fs.mkdirSync(jsDestDir, { recursive: true });
  }

  // 1. Procesar archivos en la carpeta js/
  if (fs.existsSync(jsSrcDir)) {
    const files = fs.readdirSync(jsSrcDir);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const srcPath = path.join(jsSrcDir, file);
        const destPath = path.join(jsDestDir, file);
        obfuscateFile(srcPath, destPath, file);
      }
    });
  }

  // 2. Procesar sw.js en la raíz
  const swSrcPath = path.join(srcDir, 'sw.js');
  const swDestPath = path.join(distDir, 'sw.js');
  if (fs.existsSync(swSrcPath)) {
    obfuscateFile(swSrcPath, swDestPath, 'sw.js');
  }
}

function obfuscateFile(srcPath, destPath, label) {
  const code = fs.readFileSync(srcPath, 'utf8');
  
  try {
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: false, // Seguro y rápido
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: true,
      
      // CRÍTICO: renameGlobals debe ser FALSE. 
      // Si es TRUE, las funciones llamadas desde el HTML (ej: handleLogin()) se romperían.
      renameGlobals: false,
      
      rotateStringArray: true,
      selfDefending: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.8
    });

    fs.writeFileSync(destPath, obfuscationResult.getObfuscatedCode());
    console.log(`- Ofuscado con éxito: ${label}`);
  } catch (err) {
    console.error(`- Error ofuscando ${label}:`, err);
    process.exit(1);
  }
}

function main() {
  try {
    cleanDist();
    copyStaticFiles();
    obfuscateJSFiles();
    console.log('\n¡Compilación lista con éxito en la carpeta dist/!');
  } catch (err) {
    console.error('Error general durante la compilación:', err);
    process.exit(1);
  }
}

main();
