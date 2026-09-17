import { writeFile, readFile, access } from 'node:fs/promises';
export async function exportSite() {
  const root = new URL('../../', import.meta.url);
  await access(new URL('assets/dashboard.js', root));
  await access(new URL('assets/dashboard.css', root));
  const bundlePath = new URL('assets/dashboard.js', root);
  const bundle = await readFile(bundlePath, 'utf8');
  await writeFile(bundlePath, bundle.replace(/\/\*![\s\S]*?\*\//g, comment => comment.replace(/[ \t]+$/gm, '')));
  await writeFile(new URL('index.html', root), `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#163b38"><title>IoT Lab · MQTT Dashboard</title><link rel="stylesheet" href="./assets/dashboard.css"></head><body><div id="root"></div><noscript>กรุณาเปิด JavaScript เพื่อใช้ Dashboard</noscript><script defer src="./assets/dashboard.js"></script></body></html>\n`);
  await writeFile(new URL('.nojekyll', root), '');
  console.log('Ready: open repository index.html or publish main / (root) with GitHub Pages.');
}
