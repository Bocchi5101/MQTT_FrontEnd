// Generates a ready-to-open site at the repository root.
// No JSX transform or dependency download is required by visitors.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { exportSite } from './export-site.mjs';
const frontend = fileURLToPath(new URL('../', import.meta.url));
await build({ absWorkingDir: frontend, entryPoints: ['src/main.jsx'], bundle: true,
  minify: true, format: 'iife', platform: 'browser', target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: '../assets/dashboard.js', legalComments: 'eof' });
await exportSite();
