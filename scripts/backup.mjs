import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, chmod } from 'node:fs/promises';
import { dirname } from 'node:path';
const output = process.argv[2];
if (!output) throw new Error('Backup output path required');
await mkdir(dirname(output), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(process.env.DATABASE_PATH || '/app/data/milo.sqlite', { readOnly: true });
await backup(db, output); db.close(); await chmod(output, 0o600);
console.log('Consistent SQLite backup completed.');
