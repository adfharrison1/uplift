import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { delimiter, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';

// These internal, read-only APIs are deliberately version pinned. A CLI upgrade needs
// a compatibility review and installed-CLI smoke before this adapter can accept it.
export const proofEngine = 'openspec-1.14.3';

export function buildSpecProof(root, id) {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), root, id], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024,
    env: { ...process.env, OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1' },
  });
  if (result.status !== 0 || result.error)
    throw new Error(
      `[SPEC_SYNC] Cannot establish sync outcomes: ${result.stderr || result.error?.message || 'builder terminated'}`,
    );
  return JSON.parse(result.stdout);
}

async function expectedTargets(root, id) {
  const { safePath, digest } = await import('./project-status.mjs');
  const executable = (process.env.PATH ?? '')
    .split(delimiter)
    .map((dir) => join(dir, 'openspec'))
    .find(existsSync);
  if (!executable) throw new Error('OpenSpec CLI is not installed on PATH');
  const cli = realpathSync(executable);
  const packageRoot = dirname(dirname(cli));
  const metadata = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  if (
    metadata.name !== '@fission-ai/openspec' ||
    `openspec-${metadata.version}` !== proofEngine ||
    resolve(packageRoot, metadata.bin?.openspec ?? '') !== cli
  )
    throw new Error(
      `Unsupported OpenSpec sync builder ${metadata.version}; expected ${proofEngine}. Review adapter compatibility before archiving.`,
    );
  const moduleAt = (path) => import(pathToFileURL(join(packageRoot, 'dist', path)).href);
  const [merge, endings, markers, validation] = await Promise.all([
    moduleAt('core/specs-apply.js'),
    moduleAt('utils/line-endings.js'),
    moduleAt('utils/change-metadata.js'),
    moduleAt('core/validation/validator.js'),
  ]);
  if (
    typeof merge.findSpecUpdates !== 'function' ||
    typeof merge.buildUpdatedSpec !== 'function' ||
    typeof endings.matchLineEnding !== 'function' ||
    typeof markers.readRetireCapabilitiesMarker !== 'function' ||
    typeof validation.Validator !== 'function'
  )
    throw new Error('Unsupported OpenSpec builder capabilities; review adapter compatibility');
  const changeDir = safePath(root, `openspec/changes/${id}`);
  const marker = markers.readRetireCapabilitiesMarker(changeDir);
  if (marker.invalidReason) throw new Error(marker.invalidReason);
  const retirement = marker.declared ? await moduleAt('core/archive.js') : null;
  if (retirement && typeof retirement.isRetirableSpec !== 'function')
    throw new Error('Unsupported OpenSpec retirement validator; review adapter compatibility');
  const targets = {};
  const updates = await merge.findSpecUpdates(changeDir, safePath(root, 'openspec/specs'));
  for (const update of updates) {
    const source = `openspec/changes/${id}/specs/${update.id}/spec.md`;
    const target = `openspec/specs/${update.id}/spec.md`;
    if (
      safePath(root, source) !== update.source ||
      safePath(root, target) !== update.target ||
      relative(root, update.target) !== target
    )
      throw new Error('OpenSpec builder returned an unconfined spec path');
    const built = await merge.buildUpdatedSpec(update, id, { silent: true });
    // Exact 1.14.3 archive decision with validation enabled (the wrapper never
    // passes --no-validate). All parsing/merging/retirement validation stays in CLI.
    const retirable =
      marker.declared &&
      built.noRequirementBlocks &&
      built.unaccountedContent.length === 0 &&
      (await retirement.isRetirableSpec(update.id, built.rebuilt));
    if (retirable && (!update.exists || built.counts.removed > 0)) targets[target] = null;
    else {
      const report = await new validation.Validator().validateSpecContent(update.id, built.rebuilt);
      if (!report.valid) throw new Error(`Invalid rebuilt spec outcome: ${update.id}`);
      const operations = Object.values(built.counts);
      if (
        operations.length !== 4 ||
        !operations.every((count) => Number.isSafeInteger(count) && count >= 0)
      )
        throw new Error('Unsupported OpenSpec operation counts; review adapter compatibility');
      const previous = update.exists ? readFileSync(update.target) : null;
      // archive.js mutates only retirements and writes with at least one operation.
      targets[target] = operations.some((count) => count > 0)
        ? digest(
            previous === null
              ? built.rebuilt
              : endings.matchLineEnding(built.rebuilt, previous.toString('utf8')),
          )
        : previous === null
          ? null
          : digest(previous);
    }
  }
  return targets;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  expectedTargets(process.argv[2], process.argv[3])
    .then((targets) => process.stdout.write(JSON.stringify(targets)))
    .catch((error) => {
      process.stderr.write(error.message + '\n');
      process.exitCode = 1;
    });
}
