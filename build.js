const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = __dirname;
const distDir = path.join(root, 'dist');

// 1. Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 2. Run esbuild via Node API (avoids shell escaping on Windows)
esbuild.buildSync({
  entryPoints: [path.join(root, 'index.tsx')],
  bundle: true,
  outfile: path.join(distDir, 'index.js'),
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
  },
  external: [
    'react',
    'react-dom',
    'lucide-react',
    'uuid',
    'react-router-dom',
    '@google/genai',
  ],
});

// 3. Copy index.html to dist
fs.copyFileSync(path.join(root, 'index.html'), path.join(distDir, 'index.html'));

// 4. Replace script src in dist/index.html
const distHtmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(distHtmlPath, 'utf8');
html = html.replace('src="./index.tsx"', 'src="/index.js"');
fs.writeFileSync(distHtmlPath, html);

console.log('Build complete. dist/index.html and dist/index.js are ready.');
