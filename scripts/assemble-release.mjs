import { cp, mkdir, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
export async function assembleRelease(build, release) {
  build = resolve(build); release = resolve(release);
  await access(join(build, '.next/standalone/server.js'));
  await mkdir(release, { recursive: true });
  await cp(join(build, '.next/standalone'), release, { recursive: true });
  await mkdir(join(release, '.next'), { recursive: true });
  await cp(join(build, '.next/static'), join(release, '.next/static'), { recursive: true });
  await cp(join(build, 'public'), join(release, 'public'), { recursive: true });
  await mkdir(join(release, 'scripts'), { recursive: true });
  await cp(join(build, 'scripts/backup.mjs'), join(release, 'scripts/backup.mjs'));
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/assemble-release.mjs BUILD RELEASE');
  await assembleRelease(process.argv[2], process.argv[3]);
}
