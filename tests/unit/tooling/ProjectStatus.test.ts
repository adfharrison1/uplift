import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';

type Data = Record<string, unknown>;
interface StatusModule {
  validateGraph(
    roadmap: unknown,
    inventory: unknown,
    checkReference?: (value: unknown) => void,
  ): void;
  selectNext(roadmap: unknown, inventory: unknown): unknown;
  validateLedger(ledger: unknown, roadmap: unknown, inventory: unknown): void;
  transitionEntry(entry: unknown, request: unknown): Data;
  execute(root: string, args: string[]): unknown;
  readProject(root: string): Data;
  digest(bytes: string): string;
  atomicWrite(root: string, path: string, bytes: string, expected: string | null): void;
  withProjectLock<T>(root: string, action: () => T): T;
  prepareArchive(root: string, id: string): unknown;
  repairArchive(root: string, id: string): unknown;
  cancelArchive(root: string, id: string, options?: { onStep?: (step: string) => void }): unknown;
  resumeArchive(root: string, id: string): unknown;
}
const modulePath = resolve('scripts/project-status.mjs');
async function api(): Promise<StatusModule> {
  // Missing implementation is an observable assertion, not an import error.
  expect(existsSync(modulePath), 'project-status command module exists').toBe(true);
  return (await import(pathToFileURL(modulePath).href)) as StatusModule;
}
const roots: string[] = [];
const writerChildren = new Set<ChildProcess>();
afterEach(() => {
  for (const child of writerChildren) child.kill('SIGKILL');
  writerChildren.clear();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function put(root: string, path: string, value: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), value);
}
function git(root: string, ...args: string[]): string {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  // Detached automatic maintenance can remove objects/maintenance.lock during a fixture copy.
  return execFileSync('git', ['-c', 'maintenance.auto=false', ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
function row(id: string, overrides: Data = {}): Data {
  return {
    id,
    title: id,
    milestone: 'M1',
    depends_on: [],
    specs_modified: [],
    status: 'planned',
    ...overrides,
  };
}
function roadmap(entries = [row('alpha'), row('beta')]): Data {
  return { milestones: [{ id: 'M1', name: 'Foundation', outcome: 'Usable' }], entries };
}
function inventory(active: string[] = [], archives: string[] = []): Data {
  return { active, archives };
}
let template: string | undefined;
function fixture(copyTemplate: typeof cpSync = cpSync): string {
  const root = mkdtempSync(join(tmpdir(), 'uplift-status-'));
  roots.push(root);
  if (template && existsSync(template)) {
    cpSync(template, root, { recursive: true });
    return root;
  }
  put(root, 'openspec/roadmap.yaml', stringify(roadmap()));
  put(
    root,
    'openspec/defect-ledger.yaml',
    stringify({ schema_version: 1, revision: 0, legacy_archives: [], entries: [] }),
  );
  put(root, 'openspec/changes/alpha/proposal.md', 'alpha\n');
  put(root, 'openspec/changes/alpha/evidence.md', 'Passing independent test and review evidence\n');
  put(root, 'proof.md', 'Independent retained evidence\n');
  put(root, 'fix.txt', 'fixed\n');
  git(root, 'init', '-q');
  git(root, 'add', '.');
  git(
    root,
    '-c',
    'commit.gpgsign=false',
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'fixture',
  );
  const candidate = mkdtempSync(join(tmpdir(), 'uplift-status-template-'));
  try {
    copyTemplate(root, candidate, { recursive: true });
    template = candidate;
  } catch (error) {
    rmSync(candidate, { recursive: true, force: true });
    throw error;
  }
  return root;
}
afterAll(() => {
  if (template) rmSync(template, { recursive: true, force: true });
});
function record(id = 'D-1', overrides: Data = {}): Data {
  return {
    id,
    summary: 'Existing behavior fails',
    source: [
      { path: 'proof.md', anchor: 'finding-1', description: 'A reproducible existing failure' },
    ],
    severity: 'major',
    status: 'open',
    fixing_change: 'alpha',
    ...overrides,
  };
}
function command(m: StatusModule, root: string, args: string[], input?: unknown): unknown {
  if (input !== undefined) {
    put(root, 'input.json', JSON.stringify(input));
    args = [...args, '--file', 'input.json'];
  }
  return m.execute(root, args);
}
function add(m: StatusModule, root: string, input = record(), revision = 0): void {
  command(m, root, ['defects', 'add', '--expect-ledger-revision', String(revision)], input);
}
function transition(
  m: StatusModule,
  root: string,
  to: string,
  revision: number,
  extra: string[] = [],
): unknown {
  return command(m, root, [
    'defects',
    'transition',
    'D-1',
    '--to',
    to,
    '--expect-revision',
    String(revision),
    '--reason',
    'Evidence-backed decision',
    ...extra,
  ]);
}
function ledger(root: string): Data {
  return parse(readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8')) as Data;
}
function entries(root: string): Data[] {
  return ledger(root)['entries'] as Data[];
}
function locator(root: string, path = 'proof.md'): Data {
  return {
    kind: 'repo',
    path,
    sha256: createHash('sha256')
      .update(readFileSync(join(root, path)))
      .digest('hex'),
  };
}
function evidence(root: string): Data {
  return {
    fix_ref: { kind: 'git', commit: git(root, 'rev-parse', 'HEAD') },
    tests: [{ command: 'npm test', outcome: 'passed', locator: locator(root) }],
    reviews: [
      {
        reviewer: 'independent reviewer',
        brief: 'Adversarial',
        disposition: 'passed',
        locator: locator(root),
      },
    ],
  };
}
function verify(m: StatusModule, root: string): void {
  transition(m, root, 'in_progress', 1);
  put(root, 'evidence.json', JSON.stringify(evidence(root)));
  transition(m, root, 'verified', 2, ['--evidence', 'evidence.json']);
}

describe('roadmap consumers', () => {
  it('prioritizes actual active proposals over ready later work without edits', async () => {
    const m = await api();
    const root = fixture();
    const before = readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8');
    expect(command(m, root, ['roadmap', '--json'])).toEqual({
      state: 'active',
      active: ['alpha'],
      next: null,
      blocked: [],
    });
    expect(readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8')).toBe(before);
  });
  it('selects declared order after evidenced review completion and exact date-prefixed archive identity', async () => {
    const m = await api();
    const graph = roadmap([
      row('2025-01-02-old', { status: 'archived' }),
      row('reviewed', {
        status: 'done-by-review',
        delivery_ref: { kind: 'git', commit: 'abc1234' },
      }),
      row('z-next', { depends_on: ['reviewed', '2025-01-02-old'], validated_by: ['a-later'] }),
      row('a-later', { depends_on: ['z-next'] }),
    ]);
    m.validateGraph(graph, inventory([], ['2026-01-01-2025-01-02-old']), () => undefined);
    expect(m.selectNext(graph, inventory([], ['2026-01-01-2025-01-02-old']))).toMatchObject({
      state: 'ready',
      next: 'z-next',
    });
  });
  it.each([
    [[row('a'), row('a')], inventory(), 'duplicate'],
    [[row('a', { depends_on: ['missing'] })], inventory(), 'missing'],
    [[row('a', { depends_on: ['a'] })], inventory(), 'cycle'],
    [[row('a', { depends_on: ['b'] }), row('b', { depends_on: ['a'] })], inventory(), 'cycle'],
    [[row('a', { validated_by: ['missing'] })], inventory(), 'missing'],
    [[row('a', { milestone: 'missing' })], inventory(), 'milestone'],
    [[row('a', { status: 'archived' })], inventory(), 'archive'],
    [[row('a', { status: 'proposed' })], inventory(), 'active'],
    [[row('a', { status: 'done-by-review' })], inventory(), 'delivery'],
    [[row('a', { status: 'parked' })], inventory(), 'revisit'],
    [[row('a')], inventory(['a'], ['2026-01-01-a']), 'collision'],
    [
      [row('a', { status: 'archived' })],
      inventory([], ['2026-01-01-a', '2026-01-02-a']),
      'duplicate',
    ],
    [[row('../a')], inventory(), 'ID'],
    [[row('a', { extra: true })], inventory(), 'unknown'],
  ])('rejects invalid graph %j', async (rows, inv, message) => {
    const m = await api();
    expect(() => m.validateGraph(roadmap(rows as Data[]), inv)).toThrow(String(message));
  });
  it('reports blocked and parked work rather than inventing a next item', async () => {
    const m = await api();
    expect(
      m.selectNext(
        roadmap([
          row('a', { status: 'parked', revisit_when: '100 bodies' }),
          row('b', { depends_on: ['a'] }),
        ]),
        inventory(),
      ),
    ).toMatchObject({ state: 'blocked', next: null, blocked: ['a', 'b'] });
  });
});

describe('defect lifecycle and history', () => {
  it('adds sorted records and rejects stale writers without changing bytes', async () => {
    const m = await api();
    const root = fixture();
    add(m, root, record('Z'));
    add(m, root, record('A'), 1);
    expect(entries(root).map((x) => x['id'])).toEqual(['A', 'Z']);
    expect(ledger(root)['revision']).toBe(2);
    const before = readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8');
    expect(() => add(m, root, record('B'), 1)).toThrow('revision');
    expect(readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8')).toBe(before);
    expect(command(m, root, ['defects', 'list', '--status', 'open', '--json'])).toMatchObject({
      entries: [{ id: 'A' }, { id: 'Z' }],
      pending: [],
    });
  });
  const edges: Record<string, string[]> = {
    open: ['in_progress', 'blocked', 'parked'],
    in_progress: ['open', 'blocked', 'verified', 'parked'],
    blocked: ['open', 'in_progress', 'parked'],
    verified: ['open', 'in_progress', 'blocked'],
    parked: ['open'],
  };
  for (const from of Object.keys(edges))
    for (const to of [...Object.keys(edges), 'resolved']) {
      it(`${from} -> ${to} enforces the transition contract`, async () => {
        const m = await api();
        const root = fixture();
        add(m, root);
        if (from === 'in_progress' || from === 'verified') transition(m, root, 'in_progress', 1);
        if (from === 'verified') {
          put(root, 'evidence.json', JSON.stringify(evidence(root)));
          transition(m, root, 'verified', 2, ['--evidence', 'evidence.json']);
        }
        if (from === 'blocked')
          transition(m, root, 'blocked', 1, ['--blocker', 'Waiting for prerequisite']);
        if (from === 'parked')
          transition(m, root, 'parked', 1, ['--revisit-when', '100 bodies', '--owner', 'null']);
        const current = entries(root)[0];
        if (!current) throw new Error('fixture absent');
        put(root, 'evidence.json', JSON.stringify(evidence(root)));
        const extra =
          to === 'blocked'
            ? ['--blocker', 'Dependency missing']
            : to === 'parked'
              ? ['--revisit-when', '100 bodies']
              : to === 'verified'
                ? ['--evidence', 'evidence.json']
                : ['--owner', 'alpha'];
        const run = (): unknown => transition(m, root, to, Number(current['revision']), extra);
        if (edges[from]?.includes(to)) {
          run();
          expect(entries(root)[0]).toMatchObject({
            status: to,
            revision: Number(current['revision']) + 1,
          });
          m.validateLedger(ledger(root), roadmap(), inventory(['alpha']));
        } else {
          const before = JSON.stringify(ledger(root));
          expect(run).toThrow();
          expect(JSON.stringify(ledger(root))).toBe(before);
        }
      });
    }
  it.each([
    'status',
    'fixing_change',
    'severity',
    'evidence',
    'blocker',
    'revisit_when',
    'revision',
  ])('rejects current %s contradicting replay', async (field) => {
    const m = await api();
    const root = fixture();
    add(m, root);
    const value = ledger(root);
    const first = (value['entries'] as Data[])[0];
    if (!first) throw new Error('absent');
    first[field] = field === 'revision' ? 7 : field === 'evidence' ? {} : 'changed';
    expect(() => m.validateLedger(value, roadmap(), inventory(['alpha']))).toThrow();
  });
  it('preserves invalidated evidence in history and clears blocker/revisit state', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    verify(m, root);
    transition(m, root, 'blocked', 3, ['--blocker', 'Regression']);
    expect(entries(root)[0]).toMatchObject({
      status: 'blocked',
      evidence: null,
      blocker: 'Regression',
    });
    transition(m, root, 'parked', 4, ['--revisit-when', '100 bodies', '--owner', 'null']);
    transition(m, root, 'open', 5, ['--owner', 'beta']);
    expect(entries(root)[0]).toMatchObject({
      fixing_change: 'beta',
      blocker: null,
      revisit_when: null,
    });
  });
  it('records owner/severity/source updates and forbids rewriting verified claims', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    command(
      m,
      root,
      ['defects', 'update', 'D-1', '--expect-revision', '1', '--reason', 'Reclassified'],
      { fixing_change: 'beta', severity: 'minor' },
    );
    expect(entries(root)[0]).toMatchObject({
      fixing_change: 'beta',
      severity: 'minor',
      revision: 2,
    });
    m.validateLedger(ledger(root), roadmap(), inventory(['alpha']));
    const second = fixture();
    add(m, second);
    verify(m, second);
    expect(() =>
      command(
        m,
        second,
        ['defects', 'update', 'D-1', '--expect-revision', '3', '--reason', 'New owner'],
        { fixing_change: 'beta' },
      ),
    ).toThrow('reopen');
  });
  it.each([
    { status: 'verified' },
    { id: '../escape' },
    { fixing_change: 'missing' },
    { status: 'parked', fixing_change: null },
    { surprise: 1 },
  ])('rejects invalid adds %j', async (override) => {
    const m = await api();
    const root = fixture();
    expect(() => add(m, root, record('D-1', override))).toThrow();
    expect(ledger(root)['revision']).toBe(0);
  });
  it('rejects malformed YAML, unknown CLI flags and incomplete destination prerequisites', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    expect(() => transition(m, root, 'blocked', 1)).toThrow('blocker');
    expect(() => transition(m, root, 'parked', 1)).toThrow('revisit');
    expect(() => command(m, root, ['defects', 'list', '--invented'])).toThrow('option');
    put(root, 'openspec/defect-ledger.yaml', 'revision: 1\nrevision: 2\n');
    expect(() => command(m, root, ['defects', 'list'])).toThrow('YAML');
  });
});

describe('evidence and serialized filesystem writes', () => {
  it('checks tracked retained evidence, digests and real Git commits', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    transition(m, root, 'in_progress', 1);
    const proof = evidence(root);
    proof['fix_ref'] = { kind: 'git', commit: 'deadbeef' };
    put(root, 'evidence.json', JSON.stringify(proof));
    expect(() => transition(m, root, 'verified', 2, ['--evidence', 'evidence.json'])).toThrow(
      'Git',
    );
    proof['fix_ref'] = evidence(root)['fix_ref'];
    put(root, 'proof.md', 'Changed proof');
    put(root, 'evidence.json', JSON.stringify(proof));
    expect(() => transition(m, root, 'verified', 2, ['--evidence', 'evidence.json'])).toThrow(
      'digest',
    );
    put(root, 'untracked.md', 'untracked');
    proof['tests'] = [
      { command: 'test', outcome: 'passed', locator: locator(root, 'untracked.md') },
    ];
    put(root, 'evidence.json', JSON.stringify(proof));
    expect(() => transition(m, root, 'verified', 2, ['--evidence', 'evidence.json'])).toThrow(
      'tracked',
    );
  });
  it('retains change-local evidence across archive relocation', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    transition(m, root, 'in_progress', 1);
    const proof = evidence(root);
    proof['tests'] = [
      {
        command: 'test',
        outcome: 'passed',
        locator: {
          kind: 'change',
          change_id: 'alpha',
          relative_path: 'evidence.md',
          sha256: locator(root, 'openspec/changes/alpha/evidence.md')['sha256'],
        },
      },
    ];
    put(root, 'evidence.json', JSON.stringify(proof));
    transition(m, root, 'verified', 2, ['--evidence', 'evidence.json']);
    m.prepareArchive(root, 'alpha');
    mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
    renameSync(
      join(root, 'openspec/changes/alpha'),
      join(root, 'openspec/changes/archive/2026-01-01-alpha'),
    );
    m.repairArchive(root, 'alpha');
    expect(command(m, root, ['defects', 'list', '--include-resolved', '--json'])).toMatchObject({
      entries: [{ id: 'D-1', status: 'resolved' }],
      pending: [],
    });
  });
  it('rejects symlinks, traversal, held locks and stale hashes preserving sentinels', async () => {
    const m = await api();
    const root = fixture();
    expect(() => m.withProjectLock(root, () => add(m, root))).toThrow('lock');
    expect(ledger(root)['revision']).toBe(0);
  });
  it('refuses stale hash and unsafe paths without truncation', async () => {
    const m = await api();
    const root = fixture();
    const before = readFileSync(join(root, 'proof.md'), 'utf8');
    expect(() => m.atomicWrite(root, 'proof.md', 'new', m.digest('wrong'))).toThrow('conflict');
    expect(readFileSync(join(root, 'proof.md'), 'utf8')).toBe(before);
    expect(() => m.atomicWrite(root, '../escape', 'new', null)).toThrow();
    symlinkSync(join(root, 'proof.md'), join(root, 'link'));
    expect(() => m.atomicWrite(root, 'link', 'new', null)).toThrow('symlink');
  });
});

describe('archive receipts and explicit recovery primitives', () => {
  function move(root: string): void {
    mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
    renameSync(
      join(root, 'openspec/changes/alpha'),
      join(root, 'openspec/changes/archive/2026-01-01-alpha'),
    );
  }
  it('blocks unverified owners and pending mutations; cancel preserves original ledger and permits later edits', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    expect(() => m.prepareArchive(root, 'alpha')).toThrow('verified');
    verify(m, root);
    const before = readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8');
    m.prepareArchive(root, 'alpha');
    expect(() => command(m, root, ['defects', 'reconcile', '--check'])).toThrow('pending');
    expect(() => add(m, root, record('D-2'), 3)).toThrow('pending');
    expect(m.resumeArchive(root, 'alpha')).toMatchObject({ state: 'prepared' });
    m.cancelArchive(root, 'alpha');
    expect(readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8')).toBe(before);
    add(m, root, record('D-2'), 3);
    expect(entries(root)).toHaveLength(2);
  });
  it('preserves conflicts and refuses cancellation after a move', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    verify(m, root);
    m.prepareArchive(root, 'alpha');
    put(root, 'openspec/specs/changed/spec.md', 'external CLI edit');
    expect(() => m.cancelArchive(root, 'alpha')).toThrow('conflict');
    expect(readFileSync(join(root, 'openspec/specs/changed/spec.md'), 'utf8')).toBe(
      'external CLI edit',
    );
    move(root);
    expect(() => m.cancelArchive(root, 'alpha')).toThrow('archive');
  });
  it('lists pending IDs when ledger cleanup already happened, repairs idempotently, and reopens a successor', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    verify(m, root);
    m.prepareArchive(root, 'alpha');
    move(root);
    const receipt = parse(
      readFileSync(
        join(root, 'openspec/changes/archive/2026-01-01-alpha/defect-resolution.yaml'),
        'utf8',
      ),
    ) as Data;
    put(root, 'openspec/defect-ledger.yaml', (receipt['targets'] as Data)['ledger'] as string);
    expect(command(m, root, ['defects', 'list', '--include-resolved', '--json'])).toMatchObject({
      entries: [],
      pending: [{ change_id: 'alpha', ids: ['D-1'] }],
    });
    m.repairArchive(root, 'alpha');
    const finalized = readFileSync(
      join(root, 'openspec/changes/archive/2026-01-01-alpha/defect-resolution.yaml'),
      'utf8',
    );
    m.repairArchive(root, 'alpha');
    expect(
      readFileSync(
        join(root, 'openspec/changes/archive/2026-01-01-alpha/defect-resolution.yaml'),
        'utf8',
      ),
    ).toBe(finalized);
    command(m, root, [
      'defects',
      'reopen',
      'D-1',
      '--new-id',
      'D-2',
      '--owner',
      'beta',
      '--reason',
      'Recurrence reproduced',
      '--expect-ledger-revision',
      '4',
    ]);
    expect(entries(root)[0]).toMatchObject({
      id: 'D-2',
      status: 'open',
      reopened_from: { id: 'D-1', change_id: 'alpha' },
    });
    expect(command(m, root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
    rmSync(join(root, 'openspec/changes/archive/2026-01-01-alpha/defect-resolution.yaml'));
    expect(() => command(m, root, ['defects', 'reconcile', '--check'])).toThrow('receipt');
  });
  it('detects bypass archives, forged snapshots and closed pending journals', async () => {
    const m = await api();
    const bypass = fixture();
    move(bypass);
    expect(() => command(m, bypass, ['defects', 'reconcile', '--check'])).toThrow();
    const root = fixture();
    add(m, root);
    verify(m, root);
    m.prepareArchive(root, 'alpha');
    const journal = readFileSync(join(root, 'openspec/archive-transaction.yaml'), 'utf8');
    move(root);
    m.repairArchive(root, 'alpha');
    put(root, 'openspec/archive-transaction.yaml', journal);
    expect(() => command(m, root, ['defects', 'reconcile', '--check'])).toThrow('pending');
    m.repairArchive(root, 'alpha');
    const file = 'openspec/changes/archive/2026-01-01-alpha/defect-resolution.yaml';
    const receipt = parse(readFileSync(join(root, file), 'utf8')) as Data;
    (receipt['records'] as Data[]).push(record('fake'));
    put(root, file, stringify(receipt));
    expect(() => command(m, root, ['defects', 'list', '--include-resolved'])).toThrow();
  });
  it('supports orphan prepared receipts and zero-defect archives without extending legacy exemptions', async () => {
    const m = await api();
    const root = fixture();
    m.prepareArchive(root, 'alpha');
    rmSync(join(root, 'openspec/archive-transaction.yaml'));
    expect(() => add(m, root)).toThrow('pending');
    expect(m.resumeArchive(root, 'alpha')).toMatchObject({ state: 'prepared' });
    m.cancelArchive(root, 'alpha');
    m.prepareArchive(root, 'alpha');
    move(root);
    m.repairArchive(root, 'alpha');
    expect(ledger(root)).toMatchObject({ revision: 1, legacy_archives: [], entries: [] });
    expect(command(m, root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
  });
});

describe('recovery conflict and replay regressions', () => {
  it('treats completed repair as a no-op after later unrelated mutations', async () => {
    const m = await api();
    const root = fixture();
    m.prepareArchive(root, 'alpha');
    mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
    renameSync(
      join(root, 'openspec/changes/alpha'),
      join(root, 'openspec/changes/archive/2026-01-01-alpha'),
    );
    m.repairArchive(root, 'alpha');
    add(m, root, record('D-2', { fixing_change: 'beta' }), 1);
    const before = readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8');
    expect(m.repairArchive(root, 'alpha')).toMatchObject({ state: 'finalized' });
    expect(readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8')).toBe(before);
  });
  it('recovers a failed roadmap write while preserving pending consumer visibility', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    verify(m, root);
    m.prepareArchive(root, 'alpha');
    mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
    renameSync(
      join(root, 'openspec/changes/alpha'),
      join(root, 'openspec/changes/archive/2026-01-01-alpha'),
    );
    put(root, 'openspec/roadmap.yaml.project-status.tmp', 'occupied sentinel');
    expect(() => m.repairArchive(root, 'alpha')).toThrow();
    expect(entries(root)).toEqual([]);
    expect(command(m, root, ['defects', 'list', '--include-resolved'])).toMatchObject({
      pending: [{ ids: ['D-1'] }],
    });
    expect(readFileSync(join(root, 'openspec/roadmap.yaml.project-status.tmp'), 'utf8')).toBe(
      'occupied sentinel',
    );
    rmSync(join(root, 'openspec/roadmap.yaml.project-status.tmp'));
    m.repairArchive(root, 'alpha');
    expect(command(m, root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
  });
  it('refuses conflicting cleanup rather than discarding a changed active record', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    verify(m, root);
    m.prepareArchive(root, 'alpha');
    mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
    renameSync(
      join(root, 'openspec/changes/alpha'),
      join(root, 'openspec/changes/archive/2026-01-01-alpha'),
    );
    const original = readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8');
    put(root, 'openspec/defect-ledger.yaml', original + '# external edit\n');
    expect(() => m.repairArchive(root, 'alpha')).toThrow('conflict');
    expect(readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8')).toBe(
      original + '# external edit\n',
    );
  });
  it('rejects forged historical transitions even when current fields and revisions agree', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    transition(m, root, 'in_progress', 1);
    const value = ledger(root);
    const current = (value['entries'] as Data[])[0];
    if (!current) throw new Error('missing');
    const events = current['history'] as Data[];
    const event = events[1];
    if (!event) throw new Error('missing');
    (event['after'] as Data)['severity'] = 'minor';
    current['severity'] = 'minor';
    expect(() => m.validateLedger(value, roadmap(), inventory(['alpha']))).toThrow(
      'transition changed severity',
    );
  });
  it('requires complete evidence and blocks verified claim edits while allowing supplementary evidence', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    transition(m, root, 'in_progress', 1);
    put(root, 'evidence.json', JSON.stringify({ ...evidence(root), reviews: [] }));
    expect(() => transition(m, root, 'verified', 2, ['--evidence', 'evidence.json'])).toThrow();
    put(root, 'evidence.json', JSON.stringify(evidence(root)));
    transition(m, root, 'verified', 2, ['--evidence', 'evidence.json']);
    command(
      m,
      root,
      [
        'defects',
        'update',
        'D-1',
        '--expect-revision',
        '3',
        '--reason',
        'Additional reviewed support',
      ],
      { evidence: { ...evidence(root), supplementary: [locator(root, 'fix.txt')] } },
    );
    expect(entries(root)[0]).toMatchObject({ status: 'verified', revision: 4 });
    expect(() =>
      command(
        m,
        root,
        ['defects', 'update', 'D-1', '--expect-revision', '4', '--reason', 'Changed claim'],
        { summary: 'Different failure' },
      ),
    ).toThrow('reopen');
  });
});

describe('immutable provenance in replay', () => {
  it.each(['id', 'parent_id', 'reopened_from'])(
    'rejects edited %s even with unchanged workflow state',
    async (field) => {
      const m = await api();
      const root = fixture();
      add(m, root, record('D-1', { parent_id: 'PARENT' }));
      const value = ledger(root);
      const current = (value['entries'] as Data[])[0];
      if (!current) throw new Error('missing');
      current[field] =
        field === 'reopened_from'
          ? { id: 'R', change_id: 'beta', receipt_sha256: 'a'.repeat(64) }
          : 'OTHER';
      expect(() => m.validateLedger(value, roadmap(), inventory(['alpha']))).toThrow();
    },
  );
});

describe('independent review regressions', () => {
  it('recovers cancellation interrupted between journal and receipt removal', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    verify(m, root);
    m.prepareArchive(root, 'alpha');
    expect(() =>
      m.cancelArchive(root, 'alpha', {
        onStep: (step) => {
          if (step === 'journal-removed') throw new Error('Injected interruption');
        },
      }),
    ).toThrow('Injected interruption');
    expect(existsSync(join(root, 'openspec/archive-transaction.yaml'))).toBe(false);
    expect(existsSync(join(root, 'openspec/changes/alpha/defect-resolution.yaml'))).toBe(true);
    expect(() => add(m, root, record('D-2'), 3)).toThrow('pending');
    m.cancelArchive(root, 'alpha');
    add(m, root, record('D-2'), 3);
    expect(entries(root)).toHaveLength(2);
  });
  it('rejects a finalized zero-defect receipt relocated into a different change', async () => {
    const m = await api();
    const root = fixture();
    m.prepareArchive(root, 'alpha');
    mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
    renameSync(
      join(root, 'openspec/changes/alpha'),
      join(root, 'openspec/changes/archive/2026-01-01-alpha'),
    );
    m.repairArchive(root, 'alpha');
    put(root, 'openspec/changes/beta/proposal.md', 'beta');
    renameSync(
      join(root, 'openspec/changes/archive/2026-01-01-alpha/defect-resolution.yaml'),
      join(root, 'openspec/changes/beta/defect-resolution.yaml'),
    );
    expect(() => command(m, root, ['defects', 'reconcile', '--check'])).toThrow('receipt');
  });
  it('rejects repository locators under movable change directories before verification', async () => {
    const m = await api();
    const root = fixture();
    add(m, root);
    transition(m, root, 'in_progress', 1);
    const proof = evidence(root);
    proof['tests'] = [
      {
        command: 'test',
        outcome: 'passed',
        locator: locator(root, 'openspec/changes/alpha/evidence.md'),
      },
    ];
    put(root, 'evidence.json', JSON.stringify(proof));
    expect(() => transition(m, root, 'verified', 2, ['--evidence', 'evidence.json'])).toThrow(
      'change locator',
    );
    expect(entries(root)[0]).toMatchObject({ status: 'in_progress', revision: 2 });
  });
  it('serializes two independent writers starting at the same ledger revision', async () => {
    await api();
    const root = fixture();
    put(root, 'race-a.json', JSON.stringify(record('RACE-A')));
    put(root, 'race-b.json', JSON.stringify(record('RACE-B')));
    const source = `import {writeFileSync,existsSync,readFileSync} from 'node:fs';import {execute,digest} from ${JSON.stringify(pathToFileURL(modulePath).href)};const [root,name]=process.argv.slice(1);writeFileSync(root+'/ready-'+name,'ready');while(!existsSync(root+'/release'))await new Promise(r=>setTimeout(r,5));try{execute(root,['defects','add','--file','race-'+name+'.json','--expect-ledger-revision','0']);console.log(JSON.stringify({hash:digest(readFileSync(root+'/openspec/defect-ledger.yaml'))}));}catch(error){console.error(error.message);process.exitCode=1;}`;
    function writer(
      name: string,
    ): Promise<{ code: number | null; stdout: string; stderr: string }> {
      const child = spawn(process.execPath, ['--input-type=module', '-e', source, root, name], {
        env: Object.fromEntries(
          Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
        ),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      writerChildren.add(child);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      return new Promise((resolveResult, reject) => {
        child.once('error', reject);
        child.once('close', (code) => {
          writerChildren.delete(child);
          resolveResult({ code, stdout, stderr });
        });
      });
    }
    const writers = [writer('a'), writer('b')];
    for (
      let attempt = 0;
      attempt < 200 && !(existsSync(join(root, 'ready-a')) && existsSync(join(root, 'ready-b')));
      attempt++
    )
      await new Promise((resolveWait) => setTimeout(resolveWait, 5));
    expect(existsSync(join(root, 'ready-a')) && existsSync(join(root, 'ready-b'))).toBe(true);
    put(root, 'release', 'go');
    const results = await Promise.all(writers);
    expect(results.map((r) => r.code).sort()).toEqual([0, 1]);
    const winner = results.find((r) => r.code === 0);
    const loser = results.find((r) => r.code !== 0);
    if (!winner || !loser) throw new Error('Expected a winner and conflict');
    expect(loser.stderr).toMatch(/lock|revision/i);
    expect(ledger(root)['revision']).toBe(1);
    expect(entries(root)).toHaveLength(1);
    expect((JSON.parse(winner.stdout) as Data)['hash']).toBe(
      createHash('sha256')
        .update(readFileSync(join(root, 'openspec/defect-ledger.yaml')))
        .digest('hex'),
    );
  });
});

describe('review boundary completeness', () => {
  it('preserves an external receipt edit between cancellation removals', async () => {
    const m = await api();
    const root = fixture();
    m.prepareArchive(root, 'alpha');
    const path = 'openspec/changes/alpha/defect-resolution.yaml';
    const changed = readFileSync(join(root, path), 'utf8') + '# outside edit\n';
    expect(() =>
      m.cancelArchive(root, 'alpha', {
        onStep: (step) => {
          if (step === 'journal-removed') put(root, path, changed);
        },
      }),
    ).toThrow('conflict');
    expect(readFileSync(join(root, path), 'utf8')).toBe(changed);
  });
  it('rejects misplaced prepared receipts without deleting either change', async () => {
    const m = await api();
    const root = fixture();
    m.prepareArchive(root, 'alpha');
    put(root, 'openspec/changes/beta/proposal.md', 'beta');
    const from = 'openspec/changes/alpha/defect-resolution.yaml';
    const to = 'openspec/changes/beta/defect-resolution.yaml';
    renameSync(join(root, from), join(root, to));
    const before = readFileSync(join(root, to), 'utf8');
    expect(() => m.cancelArchive(root, 'alpha')).toThrow('receipt');
    expect(readFileSync(join(root, to), 'utf8')).toBe(before);
    expect(existsSync(join(root, 'openspec/archive-transaction.yaml'))).toBe(true);
  });
  it.each(['fix_ref', 'reviews', 'supplementary'])(
    'rejects unstable %s evidence at the shared locator boundary',
    async (field) => {
      const m = await api();
      const root = fixture();
      add(m, root);
      transition(m, root, 'in_progress', 1);
      const proof = evidence(root);
      const unstable = locator(root, 'openspec/changes/alpha/evidence.md');
      proof[field] =
        field === 'fix_ref'
          ? unstable
          : field === 'supplementary'
            ? [unstable]
            : [
                {
                  reviewer: 'independent',
                  brief: 'audit',
                  disposition: 'passed',
                  locator: unstable,
                },
              ];
      put(root, 'evidence.json', JSON.stringify(proof));
      expect(() => transition(m, root, 'verified', 2, ['--evidence', 'evidence.json'])).toThrow(
        'change locator',
      );
      expect(entries(root)[0]).toMatchObject({ revision: 2, status: 'in_progress' });
    },
  );
  it('rejects unstable done-by-review delivery references', async () => {
    const m = await api();
    const root = fixture();
    const graph = roadmap([
      row('alpha'),
      row('beta', {
        status: 'done-by-review',
        delivery_ref: locator(root, 'openspec/changes/alpha/evidence.md'),
      }),
    ]);
    put(root, 'openspec/roadmap.yaml', stringify(graph));
    expect(() => command(m, root, ['roadmap'])).toThrow('change locator');
  });
});

it('keeps future status fixtures usable when a template copy fails', async () => {
  const m = await api();
  const previous = template;
  template = undefined;
  let candidate: string | undefined;
  try {
    expect(() =>
      fixture((_source, target) => {
        candidate = String(target);
        put(candidate, 'partial.txt', 'partial copy');
        throw new Error('injected template copy failure');
      }),
    ).toThrow(/injected template copy failure/);
    if (candidate === undefined) throw new Error('copy was not attempted');
    expect(existsSync(candidate)).toBe(false);
    const root = fixture();
    expect(m.execute(root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
  } finally {
    if (template && template !== previous) rmSync(template, { recursive: true, force: true });
    template = previous;
  }
});
