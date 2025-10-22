import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const event = process.argv[2];
if (!event) {
  console.error('[log.js] Missing event name. Usage: node scripts/log.js <event>');
  process.exit(1);
}
const msg = `[${new Date().toISOString()}] ${event} in ${process.cwd()}\n`;

try {
  fs.appendFileSync(path.join(__dirname, '..', 'hooks.log'), msg);
} catch (e) {
  console.error('Failed writing hooks.log:', e);
  process.exit(0);
}
