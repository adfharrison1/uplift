import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { delimiter, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { z } from 'zod';
import {
  archiveIdentity,
  changePath,
  execute as statusCommand,
  fail,
  parseYaml,
  prepareArchive,
  readProject,
  readReceipts,
  repairArchive,
  resumeArchive,
  safePath,
  scanInventory,
  createReferenceChecker,
  withProjectLock,
} from './project-status.mjs';

const dimensions = [
  'adversarial',
  'architecture-adherence',
  'performance',
  'testing',
  'logic-integrity',
  'design-coherence',
];
const reviewSchema = z
  .object({
    schema_version: z.literal(1),
    change_id: z.string(),
    reviews: z
      .array(
        z
          .object({
            dimension: z.enum(dimensions),
            reviewer: z.string().trim().min(1),
            brief: z.string().trim().min(1),
            disposition: z.literal('passed'),
            locator: z.unknown(),
          })
          .strict(),
      )
      .length(6),
  })
  .strict();

function installedCli(args, root) {
  const executable = (process.env.PATH ?? '')
    .split(delimiter)
    .map((dir) => join(dir, 'openspec'))
    .find(existsSync);
  if (!executable) fail('CLI', 'OpenSpec CLI is not installed on PATH');
  // Use this process's supported Node runtime, including installations with an absolute shebang.
  return spawnSync(process.execPath, [realpathSync(executable), ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024,
    env: { ...process.env, OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1' },
  });
}
function query(run, root, args) {
  const result = run(args, root);
  if (result.status !== 0 || result.error)
    fail(
      'CLI',
      `${args[0]} failed: ${result.stderr || result.stdout || result.error?.message || 'terminated'}`,
    );
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail('CLI', `${args[0]} returned invalid JSON`);
  }
}
function localRoot(root, value, label) {
  if (value?.root?.path !== root || !['nearest', 'explicit'].includes(value.root.source))
    fail(
      'ROOT',
      `${label} must resolve to local repository ${root}; external/declared/global stores are unsupported. Inspect OpenSpec context and store selection before retrying.`,
    );
}
function confined(root, path, base, label) {
  if (typeof path !== 'string' || resolve(path) !== path || !path.startsWith(base + '/'))
    fail('PATH', `${label} outside intended change: ${path}`);
  safePath(root, relative(root, path));
}
function rootsAndStatus(root, id, run) {
  const context = query(run, root, ['context', '--json']);
  localRoot(root, context, 'context');
  const list = query(run, root, ['list', '--json']);
  localRoot(root, list, 'list');
  const status = query(run, root, ['status', '--change', id, '--json']);
  localRoot(root, status, 'status');
  const base = join(root, 'openspec/changes', id);
  if (
    status.changeName !== id ||
    status.planningHome?.kind !== 'repo' ||
    status.planningHome.root !== root ||
    status.planningHome.changesDir !== join(root, 'openspec/changes') ||
    status.changeRoot !== base
  )
    fail(
      'ROOT',
      'status planningHome/changeRoot differs from intended local change; external stores are unsupported',
    );
  safePath(root, `openspec/changes/${id}`);
  for (const artifact of Object.values(status.artifactPaths ?? {})) {
    if (!Array.isArray(artifact.existingOutputPaths)) fail('CLI', 'invalid artifact paths');
    for (const path of artifact.existingOutputPaths) confined(root, path, base, 'artifact');
  }
  return { list, status, base };
}
function completed(root, id, run, state) {
  const matches = state.list.changes?.filter((entry) => entry.name === id);
  const entry = matches?.[0];
  if (
    matches?.length !== 1 ||
    !Number.isSafeInteger(entry.totalTasks) ||
    !Number.isSafeInteger(entry.completedTasks) ||
    entry.totalTasks < 0 ||
    entry.completedTasks < 0 ||
    entry.completedTasks !== entry.totalTasks
  )
    fail('TASKS', 'selected change must have valid, completed schema-tracked tasks');
  if (
    !Array.isArray(state.status.artifacts) ||
    !state.status.artifacts.length ||
    state.status.artifacts.some((artifact) => !['done', 'skipped'].includes(artifact.status))
  )
    fail('ARTIFACTS', 'all schema artifacts must be complete or explicitly skipped');
  const apply = query(run, root, ['instructions', 'apply', '--change', id, '--json']);
  localRoot(root, apply, 'apply instructions');
  if (apply.changeName !== id || apply.changeDir !== state.base)
    fail('ROOT', 'apply instructions resolved another change');
  if (
    apply.state !== 'all_done' ||
    apply.progress?.total !== entry.totalTasks ||
    apply.progress?.complete !== entry.completedTasks ||
    apply.progress?.remaining !== 0 ||
    !Array.isArray(apply.tasks) ||
    apply.tasks.some((task) => task.done !== true)
  )
    fail('TASKS', 'apply instructions must confirm all tracked tasks done');
  for (const task of apply.tasks) confined(root, task.sourcePath, state.base, 'tracked task');
  for (const paths of Object.values(apply.contextFiles ?? {})) {
    if (!Array.isArray(paths)) fail('CLI', 'invalid context file paths');
    for (const path of paths) confined(root, path, state.base, 'context artifact');
  }
}
function finalReviews(root, id) {
  const inventory = scanInventory(root);
  const path = safePath(root, `${changePath(inventory, id)}/final-reviews.yaml`);
  if (!existsSync(path))
    fail(
      'REVIEWS',
      'record all six independent delivery reviews in final-reviews.yaml before archive',
    );
  const parsed = reviewSchema.safeParse(parseYaml(readFileSync(path, 'utf8'), 'final reviews'));
  if (!parsed.success) fail('REVIEWS', `invalid final reviews: ${parsed.error.message}`);
  const record = parsed.data;
  if (
    record.change_id !== id ||
    new Set(record.reviews.map((review) => review.dimension)).size !== 6 ||
    new Set(record.reviews.map((review) => review.reviewer)).size !== 6
  )
    fail(
      'REVIEWS',
      'six distinct delivery dimensions and independent reviewer identifiers are required for this change',
    );
  const referenceChecker = createReferenceChecker(root, inventory);
  for (const review of record.reviews) {
    if (!review.locator || !['repo', 'change'].includes(review.locator.kind))
      fail('REVIEWS', 'review requires a tracked evidence locator with digest');
    if (review.locator.kind === 'repo' && review.locator.path.startsWith('openspec/specs/'))
      fail('REVIEWS', 'retain an immutable review snapshot outside the mutable main-spec tree');
    referenceChecker(review.locator);
  }
  return record.reviews.map((review) => review.locator);
}
// This conservative check diagnoses observable prior synchronization. The CLI remains
// authoritative for parsing, merge validation, retirement and writing main specs.
function detectPresync(root, state) {
  for (const path of state.status.artifactPaths?.specs?.existingOutputPaths ?? []) {
    const prefix = join(state.base, 'specs') + '/';
    if (!path.startsWith(prefix))
      fail('PATH', 'delta spec outside conventional specs tree; inspect schema before archive');
    const target = safePath(root, `openspec/specs/${path.slice(prefix.length)}`);
    if (!existsSync(target)) continue;
    const main = readFileSync(target, 'utf8').replaceAll('\r\n', '\n');
    const delta = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
    const renames = delta.matchAll(
      /^- FROM:\s*`?### Requirement:\s*([^`\n]+)`?\r?\n- TO:\s*`?### Requirement:\s*([^`\n]+)`?/gm,
    );
    const names = new Set(
      [...main.matchAll(/^### Requirement:\s*(.+)$/gm)].map((match) => match[1].trim()),
    );
    for (const rename of renames)
      if (!names.has(rename[1].trim()) && names.has(rename[2].trim()))
        fail('PRESYNC', `rename appears already synchronized: ${path}; inspect before archive`);
    let section = '';
    for (const block of delta.split(/(?=^## |^### Requirement:)/m)) {
      if (block.startsWith('## ')) section = block.split('\n')[0];
      const match = /^### Requirement:\s*(.+)\r?\n/.exec(block);
      if (!match) continue;
      const name = match[1].trim();
      const existing = main
        .split(/(?=^### Requirement:)/m)
        .find((value) => value.split('\n')[0].trim() === `### Requirement: ${name}`);
      if (
        (section === '## ADDED Requirements' && existing) ||
        (section === '## MODIFIED Requirements' && existing?.trim() === block.trim()) ||
        (section === '## REMOVED Requirements' && !existing)
      )
        fail(
          'PRESYNC',
          `delta appears already synchronized or conflicts with main spec: ${path} (${name}); inspect and reconcile the delta before archive; do not sync again or skip specs`,
        );
    }
  }
}
function archiveDestination(root, id) {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const name = /^\d{4}-\d{2}-\d{2}-/.test(id) ? id : `${date}-${id}`;
  const stripped = archiveIdentity(name);
  const project = readProject(root);
  if (
    name !== stripped &&
    project.roadmap.entries.some((entry) => entry.id === name) &&
    project.roadmap.entries.some((entry) => entry.id === stripped)
  )
    fail(
      'ARCHIVE',
      `ambiguous archive identity: ${name} matches both declared IDs; inspect the roadmap before archive`,
    );
  safePath(root, `openspec/changes/archive/${name}`);
}
function preflight(root, id, run, resuming) {
  archiveDestination(root, id);
  const state = rootsAndStatus(root, id, run);
  completed(root, id, run, state);
  const retainedEvidence = finalReviews(root, id);
  detectPresync(root, state);
  query(run, root, ['validate', id, '--strict', '--json']);
  if (!resuming) statusCommand(root, ['defects', 'reconcile', '--check']);
  return { ...state, retainedEvidence };
}
function consumerReadback(root, id) {
  const project = readProject(root);
  if (project.inventory.active.includes(id))
    fail('ARCHIVE', 'change remains active after finalization');
  const receipts = readReceipts(root, project.inventory);
  const item = receipts.find((value) => value.receipt.change_id === id);
  if (item?.receipt.state !== 'finalized') fail('RECEIPT', 'finalized receipt missing');
  const combined = statusCommand(root, ['defects', 'list', '--include-resolved', '--json']);
  const reconcile = statusCommand(root, ['defects', 'reconcile', '--check']);
  statusCommand(root, ['roadmap', '--json']);
  for (const record of item.receipt.records)
    if (!combined.entries.some((entry) => entry.id === record.id && entry.status === 'resolved'))
      fail('RECEIPT', `resolved record missing from combined list: ${record.id}`);
  return {
    state: 'finalized',
    change_id: id,
    archive_path: changePath(project.inventory, id),
    ids: item.receipt.records.map((record) => record.id),
    reconcile,
  };
}
function recoveryAdvice(id, moved) {
  return moved
    ? `Run npm run defects -- reconcile --repair --change ${id} (or npm run change:archive -- ${id} --resume); never rearchive a moved change.`
    : `Run npm run change:archive -- ${id} --resume after inspection, or npm run defects -- reconcile --cancel --change ${id}.`;
}
export function execute(root, args, options = {}) {
  const [id, mode, ...rest] = args;
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id ?? '') ||
    rest.length ||
    (mode !== undefined && mode !== '--resume')
  )
    fail('CLI', 'usage: change:archive <safe-change-id> [--resume]');
  root = realpathSync(root);
  const run = options.runCli ?? installedCli;
  return withProjectLock(root, () => {
    const inventory = scanInventory(root);
    const location = changePath(inventory, id);
    const moved = !inventory.active.includes(id);
    const hasReceipt = existsSync(safePath(root, `${location}/defect-resolution.yaml`));
    // Recovery dispatch precedes active-only CLI checks: moved changes cannot be queried by status.
    if (mode === '--resume' && moved) {
      finalReviews(root, id);
      repairArchive(root, id, { lock: false, onStep: options.onStep });
      return consumerReadback(root, id);
    }
    if (moved) fail('ARCHIVE', `change already moved. ${recoveryAdvice(id, true)}`);
    if (hasReceipt && mode !== '--resume')
      fail('RECOVERY', `prepared transaction exists. ${recoveryAdvice(id, false)}`);
    if (!hasReceipt && mode === '--resume') fail('RECOVERY', 'no prepared receipt to resume');
    try {
      const checked = preflight(root, id, run, mode === '--resume');
      if (mode === '--resume')
        resumeArchive(root, id, { lock: false, buildSpecProof: options.buildSpecProof });
      else
        prepareArchive(root, id, {
          lock: false,
          onStep: options.onStep,
          retainedEvidence: checked.retainedEvidence,
          buildSpecProof: options.buildSpecProof,
        });
      rootsAndStatus(root, id, run);
      archiveDestination(root, id);
      resumeArchive(root, id, { lock: false, buildSpecProof: options.buildSpecProof });
      let result;
      try {
        result = run(['archive', id, '--yes', '--json'], root);
      } catch (error) {
        result = { status: null, stderr: error.message };
      }
      const actual = scanInventory(root);
      // Resolve actual inventory even on failure; never infer a move from CLI status alone.
      const actualPath = changePath(actual, id);
      const didMove =
        !actual.active.includes(id) && actualPath.startsWith('openspec/changes/archive/');
      if (result.status !== 0 || result.error || !didMove)
        fail(
          'ARCHIVE',
          `${result.stderr || result.stdout || 'CLI did not complete the archive move'}. ${recoveryAdvice(id, didMove)}`,
        );
      finalReviews(root, id);
      repairArchive(root, id, { lock: false, onStep: options.onStep });
      return consumerReadback(root, id);
    } catch (error) {
      let didMove = false;
      try {
        didMove = !scanInventory(root).active.includes(id);
      } catch {
        /* Preserve conflicting inventory for operator inspection. */
      }
      throw new Error(`${error.message}\n${recoveryAdvice(id, didMove)}`, { cause: error });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.stdout.write(
      JSON.stringify(execute(process.cwd(), process.argv.slice(2)), null, 2) + '\n',
    );
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
