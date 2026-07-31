import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const input = path.join(root, 'datafono.png');
const outputDir = path.join(root, 'assets');
const widths = [420, 716];

async function ensureInput() {
  try {
    await fs.access(input);
  } catch {
    throw new Error('No se encontro datafono.png en la raiz del proyecto.');
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function toFormat({ width, format }) {
  const suffix = `${width}.${format}`;
  const output = path.join(outputDir, `datafono-${suffix}`);
  const pipeline = sharp(input).resize({ width, withoutEnlargement: true });

  if (format === 'webp') {
    await pipeline.webp({ quality: 72, effort: 6 }).toFile(output);
  } else if (format === 'avif') {
    await pipeline.avif({ quality: 50, effort: 7 }).toFile(output);
  } else {
    throw new Error(`Formato no soportado: ${format}`);
  }

  const stat = await fs.stat(output);
  return { output, bytes: stat.size, width, format };
}

async function main() {
  await ensureInput();
  await fs.mkdir(outputDir, { recursive: true });

  const sourceStat = await fs.stat(input);
  console.log(`Fuente: datafono.png (${kb(sourceStat.size)})`);

  const jobs = [];
  for (const width of widths) {
    jobs.push(toFormat({ width, format: 'webp' }));
    jobs.push(toFormat({ width, format: 'avif' }));
  }

  const files = await Promise.all(jobs);
  for (const file of files.sort((a, b) => a.width - b.width || a.format.localeCompare(b.format))) {
    const rel = path.relative(root, file.output).replaceAll('\\', '/');
    const saving = ((1 - file.bytes / sourceStat.size) * 100).toFixed(1);
    console.log(`- ${rel}: ${kb(file.bytes)} (${saving}% mas liviano que el PNG original)`);
  }

  console.log('\nListo. Revisa assets/datafono-420.* y assets/datafono-716.*');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
