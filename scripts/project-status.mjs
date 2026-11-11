import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { parseDocument, stringify as yamlStringify } from 'yaml';
import { z } from 'zod';

const stringify = (value) => yamlStringify(value, { aliasDuplicateObjects: false });
const ID = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/, 'unsafe ID');
const text = z.string().trim().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const integer = z.number().int().nonnegative();
const pathSchema = text.refine(
  (v) =>
    !isAbsolute(v) && !v.includes('\\') && v.split('/').every((p) => p && p !== '.' && p !== '..'),
  'unsafe path',
);
const locatorSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('repo'),
      path: pathSchema.refine(
        (path) =>
          !path.startsWith('openspec/changes/') || path.startsWith('openspec/changes/archive/'),
        'use a change locator for evidence beneath an active change',
      ),
      sha256: hash,
    })
    .strict(),
  z
    .object({ kind: z.literal('change'), change_id: ID, relative_path: pathSchema, sha256: hash })
    .strict(),
]);
const fixSchema = z.union([
  z.object({ kind: z.literal('git'), commit: z.string().regex(/^[a-f0-9]{7,40}$/) }).strict(),
  locatorSchema,
]);
const evidenceSchema = z
  .object({
    fix_ref: fixSchema,
    tests: z
      .array(
        z.object({ command: text, outcome: z.literal('passed'), locator: locatorSchema }).strict(),
      )
      .min(1),
    reviews: z
      .array(
        z
          .object({
            reviewer: text,
            brief: text,
            disposition: z.literal('passed'),
            locator: locatorSchema,
          })
          .strict(),
      )
      .min(1),
    supplementary: z.array(locatorSchema).optional(),
  })
  .strict();
const sourceSchema = z
  .array(z.object({ path: pathSchema, anchor: text, description: text }).strict())
  .min(1);
const activeStatuses = ['open', 'in_progress', 'blocked', 'verified', 'parked'];
const stateShape = {
  summary: text,
  source: sourceSchema,
  severity: z.enum(['critical', 'major', 'minor']),
  status: z.enum([...activeStatuses, 'resolved']),
  fixing_change: ID.nullable(),
  evidence: evidenceSchema.nullable(),
  blocker: text.nullable(),
  revisit_when: text.nullable(),
  parked_reason: text.nullable(),
};
const stateSchema = z.object(stateShape).strict();
const identityShape = {
  id: ID,
  parent_id: ID.optional(),
  reopened_from: z.object({ id: ID, change_id: ID, receipt_sha256: hash }).strict().optional(),
};
function identityOf(entry) {
  return Object.fromEntries(
    Object.keys(identityShape)
      .filter((k) => entry[k] !== undefined)
      .map((k) => [k, entry[k]]),
  );
}
const eventSchema = z
  .object({
    identity: z.object(identityShape).strict(),
    sequence: z.number().int().positive(),
    operation: z.enum(['add', 'transition', 'update', 'reopen', 'resolve']),
    reason: text,
    before: stateSchema.nullable(),
    after: stateSchema,
  })
  .strict();
const entrySchema = z
  .object({
    id: ID,
    ...stateShape,
    revision: z.number().int().positive(),
    history: z.array(eventSchema).min(1),
    parent_id: ID.optional(),
    reopened_from: z.object({ id: ID, change_id: ID, receipt_sha256: hash }).strict().optional(),
  })
  .strict();
const ledgerSchema = z
  .object({
    schema_version: z.literal(1),
    revision: integer,
    legacy_archives: z.array(text),
    entries: z.array(entrySchema),
  })
  .strict();
const rowSchema = z
  .object({
    id: ID,
    title: text,
    milestone: ID.nullable(),
    depends_on: z.array(ID),
    specs_modified: z.array(text),
    status: z.enum(['archived', 'done-by-review', 'planned', 'parked', 'proposed']),
    validated_by: z.array(ID).optional(),
    revisit_when: text.optional(),
    delivery_ref: fixSchema.optional(),
    archive_protocol: z.literal('v1').optional(),
    archive_receipt: z
      .object({
        kind: z.literal('change'),
        change_id: ID,
        relative_path: z.literal('defect-resolution.yaml'),
      })
      .strict()
      .optional(),
    note: text.optional(),
    delivery_note: text.optional(),
    scope: text.optional(),
  })
  .strict();
const roadmapSchema = z
  .object({
    milestones: z.array(z.object({ id: ID, name: text, outcome: text }).strict()),
    entries: z.array(rowSchema),
  })
  .strict();
const transitions = {
  open: ['in_progress', 'blocked', 'parked'],
  in_progress: ['open', 'blocked', 'verified', 'parked'],
  blocked: ['open', 'in_progress', 'parked'],
  verified: ['open', 'in_progress', 'blocked'],
  parked: ['open'],
  resolved: [],
};
const LEDGER = 'openspec/defect-ledger.yaml';
const ROADMAP = 'openspec/roadmap.yaml';
const JOURNAL = 'openspec/archive-transaction.yaml';
const LOCK = 'openspec/.project-status.lock';
export function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}
function check(schema, value, label) {
  const result = schema.safeParse(value);
  if (!result.success)
    fail(
      'INVALID',
      `${label}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.code === 'unrecognized_keys' ? 'unknown fields ' + i.keys.join(', ') : i.message}`).join('; ')}`,
    );
  return result.data;
}
export function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function same(a, b) {
  return canonical(a) === canonical(b);
}
function unique(values, label) {
  const found = new Set();
  for (const value of values) {
    if (found.has(value)) fail('DUPLICATE', `duplicate ${label}: ${value}`);
    found.add(value);
  }
}
export function parseYaml(bytes, label = 'document') {
  const doc = parseDocument(bytes, { uniqueKeys: true });
  if (doc.errors.length) fail('YAML', `${label}: ${doc.errors.map((e) => e.message).join('; ')}`);
  try {
    return doc.toJS({ maxAliasCount: 0 });
  } catch (error) {
    fail('YAML', `${label}: ${error.message}`);
  }
}
export function archiveIdentity(name) {
  const match = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(name);
  if (
    !match ||
    !Number.isFinite(Date.parse(`${match[1]}T00:00:00Z`)) ||
    new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0, 10) !== match[1]
  )
    fail('ARCHIVE', `invalid archive directory: ${name}`);
  return check(ID, match[2], 'archive ID');
}
function identities(inventory) {
  const active = inventory.active.map((v) => check(ID, v, 'active ID'));
  const archived = inventory.archives.map(archiveIdentity);
  unique(active, 'active ID');
  unique(archived, 'archive identity');
  for (const id of active)
    if (archived.includes(id)) fail('COLLISION', `active/archive collision: ${id}`);
  return { active, archived };
}
export function validateGraph(value, inventory, checkReference = () => undefined) {
  const graph = check(roadmapSchema, value, 'roadmap');
  const { active, archived } = identities(inventory);
  unique(
    graph.entries.map((e) => e.id),
    'roadmap ID',
  );
  unique(
    graph.milestones.map((m) => m.id),
    'milestone',
  );
  const rows = new Map(graph.entries.map((e) => [e.id, e]));
  const milestones = new Set(graph.milestones.map((m) => m.id));
  for (const id of [...active, ...archived])
    if (!rows.has(id)) fail('REFERENCE', `missing roadmap ID for discovered change ${id}`);
  for (const row of graph.entries) {
    if (row.milestone !== null && !milestones.has(row.milestone))
      fail('REFERENCE', `missing milestone ${row.id}: ${row.milestone}`);
    unique(row.depends_on, `${row.id} dependency`);
    for (const id of [...row.depends_on, ...(row.validated_by ?? [])])
      if (!rows.has(id)) fail('REFERENCE', `missing reference ${row.id} -> ${id}`);
    if (row.status === 'archived' && !archived.includes(row.id))
      fail('DRIFT', `missing archive: ${row.id}`);
    if (archived.includes(row.id) && row.status !== 'archived')
      fail('DRIFT', `archive has stale roadmap status: ${row.id}`);
    if (row.status === 'proposed' && !active.includes(row.id))
      fail('DRIFT', `missing active proposal: ${row.id}`);
    if (row.status === 'done-by-review') {
      if (!row.delivery_ref) fail('EVIDENCE', `missing delivery reference: ${row.id}`);
      if (active.includes(row.id)) fail('DRIFT', `done-by-review has active proposal: ${row.id}`);
      checkReference(row.delivery_ref);
    }
    if (row.status === 'parked' && !row.revisit_when)
      fail('INVALID', `missing revisit condition: ${row.id}`);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail('CYCLE', `dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of rows.get(id).depends_on) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of rows.keys()) visit(id);
}
export function selectNext(roadmap, inventory) {
  validateGraph(roadmap, inventory);
  const { active, archived } = identities(inventory);
  if (active.length)
    return { state: 'active', active: [...active].sort(), next: null, blocked: [] };
  const done = new Set([
    ...archived,
    ...roadmap.entries.filter((e) => e.status === 'done-by-review').map((e) => e.id),
  ]);
  const pending = roadmap.entries.filter((e) => !done.has(e.id));
  const next = pending.find(
    (e) => e.status === 'planned' && e.depends_on.every((id) => done.has(id)),
  );
  return {
    state: next ? 'ready' : pending.length ? 'blocked' : 'complete',
    active: [],
    next: next?.id ?? null,
    blocked: pending
      .filter(
        (e) => e !== next && (e.status === 'parked' || !e.depends_on.every((id) => done.has(id))),
      )
      .map((e) => e.id),
  };
}
function stateOf(entry) {
  return Object.fromEntries(Object.keys(stateShape).map((k) => [k, entry[k]]));
}
function validateState(state, label) {
  check(stateSchema, state, label);
  if (state.status !== 'parked' && !state.fixing_change)
    fail('OWNER', `${label}: live owner required`);
  if ((state.status === 'blocked') !== (state.blocker !== null))
    fail('INVALID', `${label}: blocker required only when blocked`);
  if (state.status === 'parked') {
    if (!state.revisit_when || !state.parked_reason)
      fail('INVALID', `${label}: parked reason and revisit condition required`);
  } else if (state.revisit_when !== null || state.parked_reason !== null)
    fail('INVALID', `${label}: stale revisit fields`);
  if (['verified', 'resolved'].includes(state.status)) {
    if (!state.evidence) fail('EVIDENCE', `${label}: fix/test/review evidence required`);
  } else if (state.evidence !== null)
    fail('EVIDENCE', `${label}: verification evidence requires verified status`);
}
function validateEvent(event, previous, id) {
  if (!same(event.before, previous)) fail('HISTORY', `${id}: history before-state mismatch`);
  const after = event.after;
  validateState(after, id);
  if (previous === null) {
    if (!['add', 'reopen'].includes(event.operation) || !['open', 'parked'].includes(after.status))
      fail('HISTORY', `${id}: invalid initial history`);
  } else if (event.operation === 'transition') {
    if (!transitions[previous.status].includes(after.status))
      fail(
        'TRANSITION',
        `${id}: illegal historical transition ${previous.status} -> ${after.status}`,
      );
    for (const key of ['summary', 'source', 'severity'])
      if (!same(previous[key], after[key])) fail('HISTORY', `${id}: transition changed ${key}`);
  } else if (event.operation === 'update') {
    if (previous.status !== after.status) fail('HISTORY', `${id}: update changed status`);
    if (
      previous.status === 'verified' &&
      ['summary', 'fixing_change'].some((k) => !same(previous[k], after[k]))
    )
      fail('HISTORY', `${id}: reopen verified claim first`);
    if (
      previous.status === 'verified' &&
      !same(coreEvidence(previous.evidence), coreEvidence(after.evidence))
    )
      fail('HISTORY', `${id}: reopen evidence first`);
    if (!previous.source.every((s) => after.source.some((a) => same(a, s))))
      fail('HISTORY', `${id}: source provenance removed`);
    if (same(previous, after)) fail('HISTORY', `${id}: no-op update`);
  } else if (event.operation === 'resolve') {
    if (
      previous.status !== 'verified' ||
      after.status !== 'resolved' ||
      !same({ ...previous, status: 'resolved' }, after)
    )
      fail('HISTORY', `${id}: invalid resolution`);
  } else fail('HISTORY', `${id}: unexpected operation ${event.operation}`);
}
function coreEvidence(evidence) {
  if (!evidence) return null;
  return { fix_ref: evidence.fix_ref, tests: evidence.tests, reviews: evidence.reviews };
}
export function validateEntry(value, { resolved = false, checkEvidence = () => undefined } = {}) {
  const entry = check(entrySchema, value, 'defect');
  let previous = null;
  for (const [index, event] of entry.history.entries()) {
    if (event.sequence !== index + 1) fail('HISTORY', `${entry.id}: noncontiguous sequence`);
    if (!same(event.identity, identityOf(entry)))
      fail('HISTORY', `${entry.id}: immutable identity/provenance differs from history`);
    validateEvent(event, previous, entry.id);
    previous = event.after;
    if (event.after.evidence) checkEvidence(event.after.evidence);
  }
  if (entry.revision !== entry.history.length || !same(previous, stateOf(entry)))
    fail('HISTORY', `${entry.id}: current state/revision differs from history replay`);
  if ((entry.status === 'resolved') !== resolved)
    fail('STATUS', `${entry.id}: resolved belongs only in finalized receipts`);
  if ((entry.history[0].operation === 'reopen') !== Boolean(entry.reopened_from))
    fail('HISTORY', `${entry.id}: recurrence provenance mismatch`);
  return entry;
}
export function validateLedger(
  value,
  roadmap,
  inventory,
  { checkEvidence = () => undefined, allowArchivedOwners = false } = {},
) {
  const ledger = check(ledgerSchema, value, 'ledger');
  const { archived } = identities(inventory);
  unique(
    ledger.entries.map((e) => e.id),
    'defect ID',
  );
  unique(ledger.legacy_archives, 'legacy archive');
  ledger.legacy_archives.forEach(archiveIdentity);
  if (ledger.revision < ledger.entries.reduce((n, e) => n + e.revision, 0))
    fail('REVISION', 'ledger revision below event count');
  const rows = new Map(roadmap.entries.map((e) => [e.id, e]));
  for (const entry of ledger.entries) {
    validateEntry(entry, { checkEvidence });
    for (const event of entry.history)
      if (event.after.fixing_change !== null && !rows.has(event.after.fixing_change))
        fail('OWNER', `${entry.id}: missing historical owner ${event.after.fixing_change}`);
    if (entry.fixing_change !== null) {
      const row = rows.get(entry.fixing_change);
      if (
        !row ||
        (!allowArchivedOwners && (archived.includes(row.id) || row.status === 'done-by-review'))
      )
        fail('OWNER', `${entry.id}: owner absent or delivered: ${entry.fixing_change}`);
    }
  }
}
function append(entry, after, operation, reason) {
  check(text, reason, 'reason');
  const before = stateOf(entry);
  const revision = entry.revision + 1;
  const next = {
    ...entry,
    ...after,
    revision,
    history: [
      ...entry.history,
      { identity: identityOf(entry), sequence: revision, operation, reason, before, after },
    ],
  };
  validateEntry(next);
  return next;
}
export function transitionEntry(value, request) {
  const entry = validateEntry(value);
  check(
    z
      .object({
        to: z.enum(activeStatuses),
        expect_revision: integer,
        reason: text,
        owner: ID.nullable().optional(),
        blocker: text.optional(),
        revisit_when: text.optional(),
        evidence: evidenceSchema.optional(),
      })
      .strict(),
    request,
    'transition',
  );
  if (request.expect_revision !== entry.revision)
    fail(
      'REVISION',
      `${entry.id}: expected revision ${request.expect_revision}, actual ${entry.revision}`,
    );
  if (!transitions[entry.status].includes(request.to))
    fail('TRANSITION', `${entry.id}: illegal transition ${entry.status} -> ${request.to}`);
  const after = {
    ...stateOf(entry),
    status: request.to,
    fixing_change: request.owner === undefined ? entry.fixing_change : request.owner,
    blocker: request.blocker ?? null,
    revisit_when: request.revisit_when ?? null,
    parked_reason: request.to === 'parked' ? request.reason : null,
    evidence: request.evidence ?? null,
  };
  return append(entry, after, 'transition', request.reason);
}
export function updateEntry(value, patch, revision, reason) {
  const entry = validateEntry(value);
  if (revision !== entry.revision) fail('REVISION', `${entry.id}: stale revision`);
  check(
    z
      .object({
        summary: text.optional(),
        source: sourceSchema.optional(),
        severity: stateShape.severity.optional(),
        fixing_change: ID.nullable().optional(),
        blocker: text.optional(),
        revisit_when: text.optional(),
        parked_reason: text.optional(),
        evidence: evidenceSchema.optional(),
      })
      .strict(),
    patch,
    'update',
  );
  const after = {
    ...stateOf(entry),
    ...patch,
    source: patch.source
      ? [...entry.source, ...patch.source.filter((s) => !entry.source.some((p) => same(p, s)))]
      : entry.source,
  };
  return append(entry, after, 'update', reason);
}
function addEntry(input, reason = 'Accepted finding', recurrence) {
  const value = check(
    z
      .object({
        id: ID,
        summary: text,
        source: sourceSchema,
        severity: stateShape.severity,
        status: z.enum(['open', 'parked']),
        fixing_change: ID.nullable(),
        parent_id: ID.optional(),
        revisit_when: text.optional(),
        parked_reason: text.optional(),
      })
      .strict(),
    input,
    'add',
  );
  const entry = {
    ...value,
    evidence: null,
    blocker: null,
    revisit_when: value.revisit_when ?? null,
    parked_reason: value.parked_reason ?? null,
    revision: 1,
    ...(recurrence ? { reopened_from: recurrence } : {}),
  };
  const after = stateOf(entry);
  return validateEntry({
    ...entry,
    ...(recurrence ? { reopened_from: recurrence } : {}),
    history: [
      {
        identity: identityOf(entry),
        sequence: 1,
        operation: recurrence ? 'reopen' : 'add',
        reason,
        before: null,
        after,
      },
    ],
  });
}

// All repository paths, including reads, reject symlink components. No shell is used.
export function safePath(root, path) {
  check(pathSchema, path, 'path');
  const base = realpathSync(root);
  const target = resolve(base, path);
  if (!target.startsWith(base + sep)) fail('PATH', `outside repository: ${path}`);
  let current = base;
  for (const part of path.split('/')) {
    current = join(current, part);
    if (
      existsSync(current) ||
      (() => {
        try {
          lstatSync(current);
          return true;
        } catch {
          return false;
        }
      })()
    ) {
      if (lstatSync(current).isSymbolicLink()) fail('PATH', `symlink: ${path}`);
    }
  }
  return target;
}
function bytes(root, path) {
  return readFileSync(safePath(root, path), 'utf8');
}
function optionalBytes(root, path) {
  const target = safePath(root, path);
  return existsSync(target) ? readFileSync(target, 'utf8') : null;
}
function currentHash(root, path) {
  const value = optionalBytes(root, path);
  return value === null ? null : digest(value);
}
export function atomicWrite(root, path, value, expected) {
  const target = safePath(root, path);
  const temporary = `${target}.project-status.tmp`;
  if (currentHash(root, path) !== expected) fail('CONFLICT', `hash conflict: ${path}`);
  const fd = openSync(temporary, 'wx', 0o600);
  try {
    writeFileSync(fd, value);
    fsyncSync(fd);
    closeSync(fd);
    if (currentHash(root, path) !== expected) fail('CONFLICT', `hash conflict: ${path}`);
    safePath(root, path);
    renameSync(temporary, target);
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* already closed */
    }
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}
export function withProjectLock(root, action) {
  const target = safePath(root, LOCK);
  let fd;
  try {
    fd = openSync(target, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST')
      fail(
        'LOCK',
        `project lock held: ${optionalBytes(root, LOCK)}; inspect owner and remove only after confirming no writer remains`,
      );
    throw error;
  }
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, operation: 'project-status' }) + '\n');
    fsyncSync(fd);
    return action();
  } finally {
    closeSync(fd);
    unlinkSync(target);
  }
}
export function gitEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
}
function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      env: gitEnvironment(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    fail('EVIDENCE', `Git reference or tracked-file check failed: ${args.join(' ')}`);
  }
}
export function scanInventory(root) {
  function directories(path) {
    const target = safePath(root, path);
    if (!existsSync(target)) return [];
    return readdirSync(target, { withFileTypes: true })
      .filter((e) => {
        if (e.isSymbolicLink()) fail('PATH', `symlink change directory: ${e.name}`);
        return e.isDirectory();
      })
      .map((e) => e.name)
      .sort();
  }
  return {
    active: directories('openspec/changes').filter((v) => v !== 'archive'),
    archives: directories('openspec/changes/archive'),
  };
}
export function changePath(inventory, id) {
  check(ID, id, 'change ID');
  const { active, archived } = identities(inventory);
  if (active.includes(id)) return `openspec/changes/${id}`;
  if (archived.includes(id))
    return `openspec/changes/archive/${inventory.archives.find((name) => archiveIdentity(name) === id)}`;
  fail('REFERENCE', `missing change ${id}`);
}
export function validateReference(root, inventory, value) {
  const reference = check(fixSchema, value, 'evidence reference');
  if (reference.kind === 'git') {
    git(root, ['cat-file', '-e', `${reference.commit}^{commit}`]);
    return;
  }
  const path =
    reference.kind === 'repo'
      ? reference.path
      : `${changePath(inventory, reference.change_id)}/${reference.relative_path}`;
  const content = bytes(root, path);
  // During a wrapper move the index still names the original tracked change files.
  const original =
    reference.kind === 'change'
      ? `openspec/changes/${reference.change_id}/${reference.relative_path}`
      : path;
  const tracked = git(root, ['ls-files', '--', path, original]).split('\n');
  if (!tracked.includes(path) && !tracked.includes(original))
    fail('EVIDENCE', `evidence must be tracked: ${path}`);
  if (digest(content) !== reference.sha256) fail('EVIDENCE', `evidence digest mismatch: ${path}`);
}
function evidenceChecker(root, inventory) {
  const checked = new Set();
  const reference = (value) => {
    const key = canonical(value);
    if (!checked.has(key)) {
      validateReference(root, inventory, value);
      checked.add(key);
    }
  };
  return (evidence) => {
    reference(evidence.fix_ref);
    for (const record of [...evidence.tests, ...evidence.reviews]) reference(record.locator);
    for (const locator of evidence.supplementary ?? []) reference(locator);
  };
}
export function readProject(root) {
  const ledgerBytes = bytes(root, LEDGER);
  const roadmapBytes = bytes(root, ROADMAP);
  return {
    root,
    ledger: check(ledgerSchema, parseYaml(ledgerBytes, LEDGER), 'ledger'),
    roadmap: check(roadmapSchema, parseYaml(roadmapBytes, ROADMAP), 'roadmap'),
    ledgerBytes,
    roadmapBytes,
    inventory: scanInventory(root),
  };
}
const receiptSchema = z
  .object({
    schema_version: z.literal(1),
    protocol: z.literal('v1'),
    change_id: ID,
    state: z.enum(['prepared', 'finalized']),
    ledger_base_revision: integer,
    roadmap_row_sha256: hash,
    records_sha256: hash,
    records: z.array(entrySchema),
    resolved: z.array(entrySchema),
    preimages: z
      .object({ ledger: z.string(), roadmap: z.string(), files: z.record(z.string(), hash) })
      .strict(),
    targets: z.object({ ledger: z.string(), roadmap: z.string() }).strict(),
  })
  .strict();
const journalSchema = z
  .object({
    schema_version: z.literal(1),
    operation: z.literal('archive'),
    change_id: ID,
    prepared_sha256: hash,
    finalized_sha256: hash,
    before: z.object({ ledger: hash, roadmap: hash }).strict(),
    after: z.object({ ledger: hash, roadmap: hash }).strict(),
  })
  .strict();
function resolvedEntry(entry) {
  const after = { ...stateOf(entry), status: 'resolved' };
  return {
    ...entry,
    ...after,
    revision: entry.revision + 1,
    history: [
      ...entry.history,
      {
        identity: identityOf(entry),
        sequence: entry.revision + 1,
        operation: 'resolve',
        reason: 'Validated archive finalization',
        before: stateOf(entry),
        after,
      },
    ],
  };
}
function targetsFor(ledger, roadmap, id, records) {
  const ids = new Set(records.map((e) => e.id));
  return {
    ledger: stringify({
      ...ledger,
      revision: ledger.revision + 1,
      entries: ledger.entries.filter((e) => !ids.has(e.id)),
    }),
    roadmap: stringify({
      ...roadmap,
      entries: roadmap.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'archived',
              archive_protocol: 'v1',
              archive_receipt: {
                kind: 'change',
                change_id: id,
                relative_path: 'defect-resolution.yaml',
              },
            }
          : e,
      ),
    }),
  };
}
export function validateReceipt(value, checkEvidence = () => undefined) {
  const receipt = check(receiptSchema, value, 'receipt');
  const ledger = check(
    ledgerSchema,
    parseYaml(receipt.preimages.ledger),
    'receipt ledger preimage',
  );
  const roadmap = check(
    roadmapSchema,
    parseYaml(receipt.preimages.roadmap),
    'receipt roadmap preimage',
  );
  const row = roadmap.entries.find((e) => e.id === receipt.change_id);
  if (!row || row.status === 'archived' || row.status === 'done-by-review')
    fail('RECEIPT', `invalid receipt owner: ${receipt.change_id}`);
  if (
    receipt.ledger_base_revision !== ledger.revision ||
    receipt.roadmap_row_sha256 !== digest(canonical(row))
  )
    fail('RECEIPT', 'receipt preimage fingerprint conflict');
  const owned = ledger.entries.filter((e) => e.fixing_change === receipt.change_id);
  if (
    !same(owned, receipt.records) ||
    receipt.records_sha256 !== digest(canonical(receipt.records))
  )
    fail('RECEIPT', 'receipt snapshots conflict');
  for (const record of receipt.records) {
    validateEntry(record, { checkEvidence });
    if (record.status !== 'verified')
      fail('RECEIPT', `${record.id}: receipt must contain verified records`);
  }
  for (const path of Object.keys(receipt.preimages.files))
    check(pathSchema, path, 'receipt preimage path');
  if (!same(receipt.targets, targetsFor(ledger, roadmap, receipt.change_id, receipt.records)))
    fail('RECEIPT', 'receipt target conflict');
  const expected = receipt.state === 'finalized' ? receipt.records.map(resolvedEntry) : [];
  if (!same(receipt.resolved, expected)) fail('RECEIPT', 'receipt terminal history conflict');
  receipt.resolved.forEach((e) => validateEntry(e, { resolved: true, checkEvidence }));
  return receipt;
}
function journalFor(receipt) {
  const prepared = { ...receipt, state: 'prepared', resolved: [] };
  const finalized = {
    ...receipt,
    state: 'finalized',
    resolved: receipt.records.map(resolvedEntry),
  };
  return {
    schema_version: 1,
    operation: 'archive',
    change_id: receipt.change_id,
    prepared_sha256: digest(stringify(prepared)),
    finalized_sha256: digest(stringify(finalized)),
    before: {
      ledger: digest(receipt.preimages.ledger),
      roadmap: digest(receipt.preimages.roadmap),
    },
    after: { ledger: digest(receipt.targets.ledger), roadmap: digest(receipt.targets.roadmap) },
  };
}
function receiptPath(inventory, id) {
  return `${changePath(inventory, id)}/defect-resolution.yaml`;
}
export function readReceipts(root, inventory) {
  const result = [];
  for (const id of [...inventory.active, ...inventory.archives.map(archiveIdentity)].sort()) {
    const path = receiptPath(inventory, id);
    const content = optionalBytes(root, path);
    if (content !== null)
      result.push({
        path,
        bytes: content,
        receipt: validateReceipt(parseYaml(content, path), evidenceChecker(root, inventory)),
      });
  }
  for (const item of result)
    if (item.path !== receiptPath(inventory, item.receipt.change_id))
      fail(
        'RECEIPT',
        `receipt directory/identity mismatch: ${item.path} declares ${item.receipt.change_id}`,
      );
  return result;
}
function readJournal(root) {
  const value = optionalBytes(root, JOURNAL);
  return value === null ? null : check(journalSchema, parseYaml(value, JOURNAL), 'archive journal');
}
function checkProject(project, { pending = false } = {}) {
  // Graph labels may lag the move only while a proven transaction is pending.
  const graph = pending
    ? {
        ...project.roadmap,
        entries: project.roadmap.entries.map((e) =>
          project.inventory.archives.some((a) => archiveIdentity(a) === e.id)
            ? { ...e, status: 'archived' }
            : e,
        ),
      }
    : project.roadmap;
  validateGraph(graph, project.inventory, (reference) =>
    validateReference(project.root, project.inventory, reference),
  );
  validateLedger(project.ledger, project.roadmap, project.inventory, {
    checkEvidence: evidenceChecker(project.root, project.inventory),
    allowArchivedOwners: pending,
  });
}
// Pure reconciliation consumes already-parsed files; callers supply retained receipts, not guessed state.
export function reconcileProject(project, receipts, journal = null) {
  const { ledger, roadmap, inventory } = project;
  const { archived } = identities(inventory);
  const diagnostics = [];
  const byId = new Map();
  for (const item of receipts) {
    const receipt = validateReceipt(item.receipt);
    if (item.path !== receiptPath(inventory, receipt.change_id))
      fail(
        'RECEIPT',
        `receipt directory/identity mismatch: ${item.path} declares ${receipt.change_id}`,
      );
    if (byId.has(receipt.change_id)) fail('RECEIPT', `duplicate receipt ${receipt.change_id}`);
    byId.set(receipt.change_id, item);
  }
  const pending = receipts
    .filter(
      (item) => item.receipt.state === 'prepared' || journal?.change_id === item.receipt.change_id,
    )
    .map((item) => ({
      change_id: item.receipt.change_id,
      ids: item.receipt.records.map((e) => e.id),
    }));
  if (journal) {
    check(journalSchema, journal, 'archive journal');
    const item = byId.get(journal.change_id);
    if (!item) diagnostics.push(`pending journal missing receipt ${journal.change_id}`);
    else if (!same(journal, journalFor(item.receipt)))
      diagnostics.push(`pending journal/receipt conflict ${journal.change_id}`);
  }
  for (const name of ledger.legacy_archives)
    if (!inventory.archives.includes(name)) diagnostics.push(`legacy archive missing ${name}`);
  for (const name of inventory.archives) {
    const id = archiveIdentity(name);
    const row = roadmap.entries.find((e) => e.id === id);
    const item = byId.get(id);
    if (ledger.legacy_archives.includes(name)) {
      if (item) diagnostics.push(`legacy archive unexpectedly has receipt ${id}`);
      continue;
    }
    if (!item) diagnostics.push(`missing receipt for archive ${id}`);
    else if (item.receipt.state === 'finalized') {
      if (
        row?.archive_protocol !== 'v1' ||
        row.archive_receipt?.change_id !== id ||
        row.archive_receipt?.relative_path !== 'defect-resolution.yaml'
      )
        diagnostics.push(`archive receipt reference missing ${id}`);
      for (const record of item.receipt.records)
        if (ledger.entries.some((e) => e.id === record.id))
          diagnostics.push(`resolved record still active ${record.id}`);
    }
  }
  for (const row of roadmap.entries)
    if (row.archive_protocol || row.archive_receipt) {
      if (!archived.includes(row.id) || !byId.has(row.id))
        diagnostics.push(`roadmap receipt missing ${row.id}`);
    }
  for (const item of receipts)
    if (item.receipt.state === 'finalized' && !archived.includes(item.receipt.change_id))
      diagnostics.push(`finalized receipt without archive ${item.receipt.change_id}`);
  const resolved = receipts
    .filter(
      (item) =>
        item.receipt.state === 'finalized' &&
        !pending.some((p) => p.change_id === item.receipt.change_id),
    )
    .flatMap((item) => item.receipt.resolved);
  unique(
    [...ledger.entries, ...resolved].map((e) => e.id),
    'active/resolved ID',
  );
  for (const entry of ledger.entries)
    if (entry.reopened_from) {
      const item = byId.get(entry.reopened_from.change_id);
      if (
        !item ||
        item.receipt.state !== 'finalized' ||
        digest(item.bytes) !== entry.reopened_from.receipt_sha256 ||
        !item.receipt.resolved.some((e) => e.id === entry.reopened_from.id)
      )
        diagnostics.push(`recurrence receipt mismatch ${entry.id}`);
    }
  if (pending.length || journal)
    diagnostics.push(
      `pending finalization: ${pending.map((p) => `${p.change_id} [${p.ids.join(', ')}]`).join('; ') || journal.change_id}`,
    );
  return { ok: diagnostics.length === 0, diagnostics, pending, resolved };
}
function repositoryState(root) {
  const project = readProject(root);
  const receipts = readReceipts(root, project.inventory);
  const journal = readJournal(root);
  const reconciliation = reconcileProject(project, receipts, journal);
  return { project, receipts, journal, reconciliation };
}
function assertClean(state) {
  if (!state.reconciliation.ok) fail('RECONCILE', state.reconciliation.diagnostics.join('; '));
  checkProject(state.project);
}
function snapshotFiles(root, paths) {
  const result = {};
  function visit(path) {
    const target = safePath(root, path);
    if (!existsSync(target)) return;
    if (lstatSync(target).isDirectory()) {
      for (const name of readdirSync(target).sort()) visit(`${path}/${name}`);
    } else if (!path.endsWith('/defect-resolution.yaml'))
      result[path] = digest(readFileSync(target));
  }
  paths.forEach(visit);
  return result;
}
function preMoveCheck(root, project, receipt) {
  if (
    !project.inventory.active.includes(receipt.change_id) ||
    project.inventory.archives.some((a) => archiveIdentity(a) === receipt.change_id)
  )
    fail('CONFLICT', 'archive moved or active directory missing; cancellation/resume refused');
  if (
    project.ledgerBytes !== receipt.preimages.ledger ||
    project.roadmapBytes !== receipt.preimages.roadmap ||
    !same(
      snapshotFiles(root, ['openspec/specs', `openspec/changes/${receipt.change_id}`]),
      receipt.preimages.files,
    )
  )
    fail('CONFLICT', 'transaction preimage conflict; preserve edits and inspect before recovery');
}
function locked(root, options, action) {
  return options?.lock === false ? action() : withProjectLock(root, action);
}
export function prepareArchive(root, id, options = {}) {
  return locked(root, options, () => {
    check(ID, id, 'change ID');
    const state = repositoryState(root);
    assertClean(state);
    const { project } = state;
    if (!project.inventory.active.includes(id)) fail('ARCHIVE', `missing active change ${id}`);
    const records = project.ledger.entries.filter((e) => e.fixing_change === id);
    for (const record of records)
      if (record.status !== 'verified')
        fail('ARCHIVE', `${record.id}: owned defect must be verified`);
    const path = receiptPath(project.inventory, id);
    if (optionalBytes(root, path) !== null) fail('CONFLICT', `preexisting receipt: ${path}`);
    const receipt = {
      schema_version: 1,
      protocol: 'v1',
      change_id: id,
      state: 'prepared',
      ledger_base_revision: project.ledger.revision,
      roadmap_row_sha256: digest(canonical(project.roadmap.entries.find((e) => e.id === id))),
      records_sha256: digest(canonical(records)),
      records,
      resolved: [],
      preimages: {
        ledger: project.ledgerBytes,
        roadmap: project.roadmapBytes,
        files: snapshotFiles(root, ['openspec/specs', `openspec/changes/${id}`]),
      },
      targets: targetsFor(project.ledger, project.roadmap, id, records),
    };
    validateReceipt(receipt);
    atomicWrite(root, path, stringify(receipt), null);
    atomicWrite(root, JOURNAL, stringify(journalFor(receipt)), null);
    return receipt;
  });
}
function recoveryState(root, id) {
  check(ID, id, 'change ID');
  const state = repositoryState(root);
  const item = state.receipts.find((r) => r.receipt.change_id === id);
  if (!item) fail('RECEIPT', `missing receipt ${id}`);
  if (state.journal && !same(state.journal, journalFor(item.receipt)))
    fail('CONFLICT', `journal/receipt conflict ${id}`);
  if (state.receipts.some((r) => r.receipt.change_id !== id && r.receipt.state === 'prepared'))
    fail('CONFLICT', 'another transaction is pending');
  return { ...state, item };
}
export function cancelArchive(root, id, options = {}) {
  return locked(root, options, () => {
    const state = recoveryState(root, id);
    const { receipt } = state.item;
    if (receipt.state !== 'prepared') fail('ARCHIVE', 'cannot cancel finalized archive');
    preMoveCheck(root, state.project, receipt);
    if (currentHash(root, state.item.path) !== digest(state.item.bytes))
      fail('CONFLICT', 'receipt hash conflict');
    if (state.journal) {
      if (currentHash(root, JOURNAL) !== digest(stringify(journalFor(receipt))))
        fail('CONFLICT', 'journal hash conflict');
      unlinkSync(safePath(root, JOURNAL));
      options.onStep?.('journal-removed');
    }
    // A crash here leaves an intact prepared receipt, which resume/cancel can recover.
    preMoveCheck(root, readProject(root), receipt);
    if (currentHash(root, state.item.path) !== digest(state.item.bytes))
      fail('CONFLICT', 'receipt hash conflict');
    unlinkSync(safePath(root, state.item.path));
    options.onStep?.('receipt-removed');
    return { state: 'canceled', change_id: id, ids: receipt.records.map((e) => e.id) };
  });
}
export function resumeArchive(root, id, options = {}) {
  return locked(root, options, () => {
    const state = recoveryState(root, id);
    if (state.project.inventory.archives.some((a) => archiveIdentity(a) === id))
      return repairArchive(root, id, { lock: false });
    preMoveCheck(root, state.project, state.item.receipt);
    checkProject(state.project);
    if (!state.journal) atomicWrite(root, JOURNAL, stringify(journalFor(state.item.receipt)), null);
    return state.item.receipt;
  });
}
export function repairArchive(root, id, options = {}) {
  return locked(root, options, () => {
    const state = recoveryState(root, id);
    const { receipt } = state.item;
    if (!state.project.inventory.archives.some((a) => archiveIdentity(a) === id))
      fail('ARCHIVE', 'archive not moved; use explicit resume or cancel');
    if (!state.journal && receipt.state === 'finalized') {
      assertClean(state);
      return { state: 'finalized', change_id: id };
    }
    const plan = journalFor(receipt);
    for (const [key, path] of [
      ['ledger', LEDGER],
      ['roadmap', ROADMAP],
    ])
      if (![plan.before[key], plan.after[key]].includes(currentHash(root, path)))
        fail('CONFLICT', `transaction ${path} hash conflict`);
    const finalized = {
      ...receipt,
      state: 'finalized',
      resolved: receipt.records.map(resolvedEntry),
    };
    if (!state.journal) atomicWrite(root, JOURNAL, stringify(plan), null);
    for (const [key, path] of [
      ['ledger', LEDGER],
      ['roadmap', ROADMAP],
    ])
      if (currentHash(root, path) === plan.before[key])
        atomicWrite(root, path, receipt.targets[key], plan.before[key]);
    if (receipt.state !== 'finalized')
      atomicWrite(root, state.item.path, stringify(finalized), digest(state.item.bytes));
    // Verify all finalized consumers before removing the last durable recovery marker.
    const finalState = repositoryState(root);
    const withoutJournal = reconcileProject(finalState.project, finalState.receipts, null);
    if (!withoutJournal.ok) fail('RECONCILE', withoutJournal.diagnostics.join('; '));
    checkProject(finalState.project);
    if (currentHash(root, JOURNAL) !== digest(stringify(plan)))
      fail('CONFLICT', 'journal hash conflict');
    unlinkSync(safePath(root, JOURNAL));
    return { state: 'finalized', change_id: id, ids: receipt.records.map((e) => e.id) };
  });
}

function options(args, allowed, positional = 0) {
  const result = {};
  const values = args.slice(0, positional);
  if (values.length !== positional || values.some((v) => v.startsWith('--')))
    fail('CLI', 'missing positional ID');
  for (let i = positional; i < args.length; i++) {
    const key = args[i];
    if (!allowed.includes(key) || key in result) fail('CLI', `unknown or duplicate option ${key}`);
    if (['--json', '--include-resolved', '--check', '--repair', '--cancel'].includes(key))
      result[key] = true;
    else {
      const value = args[++i];
      if (value === undefined || value.startsWith('--'))
        fail('CLI', `option ${key} requires a value`);
      result[key] = value;
    }
  }
  return { values, flags: result };
}
function required(flags, key) {
  if (flags[key] === undefined) fail('CLI', `required option ${key}`);
  return flags[key];
}
function revision(flags, key) {
  const value = required(flags, key);
  if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value)))
    fail('CLI', `invalid revision ${value}`);
  return Number(value);
}
function inputJson(root, path) {
  try {
    return JSON.parse(bytes(root, path));
  } catch (error) {
    fail('INPUT', `invalid JSON input ${path}: ${error.message}`);
  }
}
export function execute(root, args) {
  const [group, command, ...rest] = args;
  if (group === 'roadmap') {
    options(args.slice(1), ['--json']);
    const project = readProject(root);
    validateGraph(project.roadmap, project.inventory, (ref) =>
      validateReference(root, project.inventory, ref),
    );
    return selectNext(project.roadmap, project.inventory);
  }
  if (group !== 'defects') fail('CLI', 'expected roadmap or defects command');
  if (command === 'list') {
    const { flags } = options(rest, ['--json', '--include-resolved', '--status']);
    const state = repositoryState(root);
    const nonpending = state.reconciliation.diagnostics.filter(
      (d) => !d.startsWith('pending finalization:'),
    );
    if (nonpending.length) fail('RECONCILE', nonpending.join('; '));
    checkProject(state.project, { pending: state.reconciliation.pending.length > 0 });
    const status = flags['--status'];
    if (status) check(z.enum([...activeStatuses, 'resolved']), status, 'status filter');
    return {
      entries: [
        ...state.project.ledger.entries,
        ...(flags['--include-resolved'] ? state.reconciliation.resolved : []),
      ]
        .filter((e) => !status || e.status === status)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      pending: state.reconciliation.pending,
    };
  }
  if (command === 'reconcile') {
    const { flags } = options(rest, ['--check', '--repair', '--cancel', '--change', '--json']);
    if (['--check', '--repair', '--cancel'].filter((k) => flags[k]).length !== 1)
      fail('CLI', 'choose exactly one reconcile mode');
    if (flags['--repair']) return repairArchive(root, required(flags, '--change'));
    if (flags['--cancel']) return cancelArchive(root, required(flags, '--change'));
    if (flags['--change']) fail('CLI', '--change requires recovery mode');
    const state = repositoryState(root);
    assertClean(state);
    return {
      ok: true,
      active: state.project.ledger.entries.length,
      resolved: state.reconciliation.resolved.length,
    };
  }
  const specs = {
    add: [0, ['--file', '--expect-ledger-revision']],
    transition: [
      1,
      [
        '--to',
        '--expect-revision',
        '--reason',
        '--owner',
        '--blocker',
        '--revisit-when',
        '--evidence',
      ],
    ],
    update: [1, ['--file', '--expect-revision', '--reason']],
    reopen: [1, ['--new-id', '--owner', '--reason', '--expect-ledger-revision']],
  };
  if (!specs[command]) fail('CLI', `unknown command ${command}`);
  const { values, flags } = options(rest, specs[command][1], specs[command][0]);
  return withProjectLock(root, () => {
    const state = repositoryState(root);
    assertClean(state);
    const { project } = state;
    let next;
    if (command === 'add' || command === 'reopen') {
      if (revision(flags, '--expect-ledger-revision') !== project.ledger.revision)
        fail('REVISION', `stale ledger revision; actual ${project.ledger.revision}`);
      if (command === 'add') next = addEntry(inputJson(root, required(flags, '--file')));
      else {
        const original = state.reconciliation.resolved.find((e) => e.id === values[0]);
        if (!original) fail('REFERENCE', `resolved defect missing: ${values[0]}`);
        const receipt = state.receipts.find((r) =>
          r.receipt.resolved.some((e) => e.id === original.id),
        );
        next = addEntry(
          {
            id: required(flags, '--new-id'),
            summary: original.summary,
            source: original.source,
            severity: original.severity,
            status: 'open',
            fixing_change: required(flags, '--owner'),
            parent_id: original.id,
          },
          required(flags, '--reason'),
          {
            id: original.id,
            change_id: receipt.receipt.change_id,
            receipt_sha256: digest(receipt.bytes),
          },
        );
      }
      if (
        [...project.ledger.entries, ...state.reconciliation.resolved].some((e) => e.id === next.id)
      )
        fail('DUPLICATE', `duplicate defect ID ${next.id}`);
    } else {
      check(ID, values[0], 'defect ID');
      const current = project.ledger.entries.find((e) => e.id === values[0]);
      if (!current) fail('REFERENCE', `active defect missing ${values[0]}`);
      if (command === 'update')
        next = updateEntry(
          current,
          inputJson(root, required(flags, '--file')),
          revision(flags, '--expect-revision'),
          required(flags, '--reason'),
        );
      else
        next = transitionEntry(current, {
          to: required(flags, '--to'),
          expect_revision: revision(flags, '--expect-revision'),
          reason: required(flags, '--reason'),
          ...(flags['--owner'] !== undefined
            ? { owner: flags['--owner'] === 'null' ? null : flags['--owner'] }
            : {}),
          ...(flags['--blocker'] ? { blocker: flags['--blocker'] } : {}),
          ...(flags['--revisit-when'] ? { revisit_when: flags['--revisit-when'] } : {}),
          ...(flags['--evidence'] ? { evidence: inputJson(root, flags['--evidence']) } : {}),
        });
    }
    const candidate = {
      ...project.ledger,
      revision: project.ledger.revision + 1,
      entries: [...project.ledger.entries.filter((e) => e.id !== next.id), next].sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
      ),
    };
    validateLedger(candidate, project.roadmap, project.inventory, {
      checkEvidence: evidenceChecker(root, project.inventory),
    });
    if (
      currentHash(root, ROADMAP) !== digest(project.roadmapBytes) ||
      !same(scanInventory(root), project.inventory)
    )
      fail('CONFLICT', 'roadmap or change inventory changed');
    atomicWrite(root, LEDGER, stringify(candidate), digest(project.ledgerBytes));
    return { revision: candidate.revision, entry: next };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = execute(process.cwd(), process.argv.slice(2));
    process.stdout.write(
      JSON.stringify(result, null, process.argv.includes('--json') ? 2 : undefined) + '\n',
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
