import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const sections = [await readFile('docs/THIRD_PARTY_NOTICES.md', 'utf8')];
for (const [directory, metadata] of Object.entries(lock.packages)) {
  if (
    !directory ||
    metadata.link ||
    (metadata.dev && !['node_modules/tailwindcss', 'node_modules/electron'].includes(directory))
  )
    continue;
  const files = (await readdir(directory)).filter((name) =>
    /^(licen[sc]e|copying|notice)(\.|$)/i.test(name),
  );
  sections.push(
    `\n${directory} ${metadata.version ?? ''}\nDeclared license: ${metadata.license ?? 'See package notices'}\n`,
  );
  for (const file of files.sort())
    sections.push(`${file}\n${await readFile(path.join(directory, file), 'utf8')}`);
}
sections.push('\nElectron and Chromium notices are included separately with the Electron runtime.');
await mkdir('build', { recursive: true });
await writeFile('build/THIRD_PARTY_LICENSES.txt', sections.join('\n\n') + '\n');
console.log('Collected production-package license notices.');
