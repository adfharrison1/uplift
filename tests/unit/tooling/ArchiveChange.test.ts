import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
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
interface Result {
  status: number | null;
  stdout: string;
  stderr: string;
}
type Runner = (args: string[], root: string) => Result;
interface ArchiveModule {
  execute(
    root: string,
    args: string[],
    options?: { runCli?: Runner; onStep?: (step: string) => void },
  ): Data;
}
interface StatusModule {
  readProject(root: string): Data;
  readReceipts(root: string, inventory: unknown): unknown;
  reconcileProject(project: unknown, receipts: unknown): Data;
  scanInventory(root: string): Data;
  validateGraph(graph: unknown, inventory: unknown): void;
  execute(root: string, args: string[]): Data;
  withProjectLock(root: string, action: () => unknown): unknown;
}
const modulePath = resolve('scripts/archive-change.mjs');
async function api(): Promise<ArchiveModule> {
  expect(existsSync(modulePath), 'archive wrapper exists').toBe(true);
  return (await import(pathToFileURL(modulePath).href)) as ArchiveModule;
}
async function statusApi(): Promise<StatusModule> {
  return (await import(pathToFileURL(resolve('scripts/project-status.mjs')).href)) as StatusModule;
}
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function put(root: string, path: string, bytes: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), bytes);
}
function git(root: string, ...args: string[]): string {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  return execFileSync('git', args, {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
const dimensions = [
  'adversarial',
  'architecture-adherence',
  'performance',
  'testing',
  'logic-integrity',
  'design-coherence',
];
let template: string | undefined;
afterAll(() => {
  if (template) rmSync(template, { recursive: true, force: true });
});
function fixture(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'uplift-archive-')));
  roots.push(root);
  if (template) {
    cpSync(template, root, { recursive: true });
    return root;
  }
  put(
    root,
    'openspec/roadmap.yaml',
    stringify({
      milestones: [],
      entries: ['alpha', 'beta'].map((id) => ({
        id,
        title: id,
        milestone: null,
        depends_on: [],
        specs_modified: [],
        status: 'planned',
      })),
    }),
  );
  put(
    root,
    'openspec/defect-ledger.yaml',
    stringify({ schema_version: 1, revision: 0, legacy_archives: [], entries: [] }),
  );
  put(root, 'openspec/changes/alpha/proposal.md', '# Proposal\n');
  put(root, 'openspec/changes/alpha/work/checklist.md', '- [x] Complete\n');
  const reviews = dimensions.map((dimension) => {
    const relative_path = `reviews/${dimension}.md`;
    const bytes = `Independent ${dimension} review passed.\n`;
    put(root, `openspec/changes/alpha/${relative_path}`, bytes);
    return {
      dimension,
      reviewer: `reviewer-${dimension}`,
      brief: `High reasoning, medium-to-high model: ${dimension}`,
      disposition: 'passed',
      locator: {
        kind: 'change',
        change_id: 'alpha',
        relative_path,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    };
  });
  put(
    root,
    'openspec/changes/alpha/final-reviews.yaml',
    stringify({ schema_version: 1, change_id: 'alpha', reviews }),
  );
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
  template = mkdtempSync(join(tmpdir(), 'uplift-archive-template-'));
  cpSync(root, template, { recursive: true });
  return root;
}
function moved(root: string): void {
  mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
  renameSync(
    join(root, 'openspec/changes/alpha'),
    join(root, 'openspec/changes/archive/2026-01-02-alpha'),
  );
}
function json(value: unknown): Result {
  return { status: 0, stdout: JSON.stringify(value), stderr: '' };
}
function runner(
  root: string,
  mutate?: (args: string[], result: Result) => Result,
): { run: Runner; calls: string[][] } {
  const calls: string[][] = [];
  const run: Runner = (args) => {
    calls.push(args);
    const rootInfo = { path: root, source: 'nearest' };
    let result: Result;
    if (args[0] === 'context') result = json({ root: rootInfo });
    else if (args[0] === 'list')
      result = json({
        root: rootInfo,
        changes: existsSync(join(root, 'openspec/changes/alpha'))
          ? [{ name: 'alpha', totalTasks: 1, completedTasks: 1 }]
          : [],
      });
    else if (args[0] === 'status')
      result = json({
        root: rootInfo,
        changeName: 'alpha',
        schemaName: 'custom',
        planningHome: { kind: 'repo', root, changesDir: join(root, 'openspec/changes') },
        changeRoot: join(root, 'openspec/changes/alpha'),
        isComplete: true,
        artifacts: [{ id: 'work', status: 'done' }],
        artifactPaths: {
          work: { existingOutputPaths: [join(root, 'openspec/changes/alpha/work/checklist.md')] },
        },
      });
    else if (args[0] === 'instructions')
      result = json({
        root: rootInfo,
        changeName: 'alpha',
        changeDir: join(root, 'openspec/changes/alpha'),
        taskTrackingConfigured: true,
        state: 'all_done',
        progress: { total: 1, complete: 1, remaining: 0 },
        tasks: [
          {
            done: true,
            sourcePath: join(root, 'openspec/changes/alpha/work/checklist.md'),
            line: 1,
          },
        ],
        contextFiles: {},
      });
    else if (args[0] === 'validate') result = json({ valid: true });
    else if (args[0] === 'archive') result = json({ success: true });
    else throw new Error(`unexpected CLI ${args.join(' ')}`);
    if (mutate) return mutate(args, result);
    if (args[0] === 'archive') moved(root);
    return result;
  };
  return { run, calls };
}
function receipt(root: string, archived = false): Data {
  return parse(
    readFileSync(
      join(
        root,
        `openspec/changes/${archived ? 'archive/2026-01-02-alpha' : 'alpha'}/defect-resolution.yaml`,
      ),
      'utf8',
    ),
  ) as Data;
}
function noPreparation(root: string): void {
  expect(existsSync(join(root, 'openspec/archive-transaction.yaml'))).toBe(false);
  expect(existsSync(join(root, 'openspec/changes/alpha/defect-resolution.yaml'))).toBe(false);
}
function addDefect(s: StatusModule, root: string, status = 'open'): void {
  put(
    root,
    'input.json',
    JSON.stringify({
      id: 'D-1',
      summary: 'A reproducible defect',
      source: [{ path: 'proof.md', anchor: 'finding', description: 'Failure' }],
      severity: 'major',
      status,
      fixing_change: 'alpha',
      ...(status === 'parked'
        ? { parked_reason: 'Later', revisit_when: 'capacity increases' }
        : {}),
    }),
  );
  s.execute(root, ['defects', 'add', '--file', 'input.json', '--expect-ledger-revision', '0']);
}

describe('validated archive wrapper', () => {
  it('runs full archive once and reaches empty receipt, roadmap, combined list and reconciliation consumers', async () => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    const cli = runner(root);
    expect(m.execute(root, ['alpha'], { runCli: cli.run })).toMatchObject({
      state: 'finalized',
      change_id: 'alpha',
    });
    expect(cli.calls.filter((args) => args[0] === 'archive')).toEqual([
      ['archive', 'alpha', '--yes', '--json'],
    ]);
    expect(receipt(root, true)).toMatchObject({ state: 'finalized', records: [], resolved: [] });
    expect(s.execute(root, ['defects', 'list', '--include-resolved', '--json'])).toEqual({
      entries: [],
      pending: [],
    });
    expect(s.execute(root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
    expect(readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8')).toContain('status: archived');
  });
  it.each(['open', 'parked'])('refuses %s owned defects before archive', async (status) => {
    const m = await api();
    const root = fixture();
    addDefect(await statusApi(), root, status);
    const cli = runner(root);
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(
      /owned defect must be verified/,
    );
    noPreparation(root);
    expect(cli.calls.some((args) => args[0] === 'archive')).toBe(false);
  });
  it.each(['../alpha', 'alpha/beta', '--skip-specs', 'alpha;touch sentinel'])(
    'rejects unsafe argument %s before any subprocess or mutation',
    async (id) => {
      const m = await api();
      const root = fixture();
      const cli = runner(root);
      expect(() => m.execute(root, [id], { runCli: cli.run })).toThrow();
      expect(cli.calls).toEqual([]);
      noPreparation(root);
    },
  );
  it.each(['--store', '--lock=false', '--skip-specs', '--no-validate'])(
    'rejects unsupported option %s',
    async (flag) => {
      const m = await api();
      const root = fixture();
      const cli = runner(root);
      expect(() => m.execute(root, ['alpha', flag], { runCli: cli.run })).toThrow(/CLI/);
      expect(cli.calls).toEqual([]);
    },
  );
  it.each(['context', 'list', 'status'])(
    'rejects external planning root from %s before preparation',
    async (command) => {
      const m = await api();
      const root = fixture();
      const cli = runner(root, (args, result) =>
        args[0] === command
          ? json({
              ...(JSON.parse(result.stdout) as Data),
              root: { path: '/external', source: 'store' },
            })
          : result,
      );
      expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/ROOT/);
      noPreparation(root);
    },
  );
  it.each([
    'incomplete-tasks',
    'malformed-counts',
    'incomplete-artifacts',
    'blocked-apply',
    'invalid-json',
    'strict-failure',
  ])('refuses %s without generated state', async (mode) => {
    const m = await api();
    const root = fixture();
    const cli = runner(root, (args, result) => {
      if (mode === 'invalid-json' && args[0] === 'status') return { ...result, stdout: 'not JSON' };
      if (mode === 'strict-failure' && args[0] === 'validate')
        return { ...result, status: 1, stderr: 'strict validation failed' };
      const data = JSON.parse(result.stdout) as Data;
      if (mode === 'incomplete-tasks' && args[0] === 'list')
        data['changes'] = [{ name: 'alpha', totalTasks: 2, completedTasks: 1 }];
      if (mode === 'malformed-counts' && args[0] === 'list')
        data['changes'] = [{ name: 'alpha', totalTasks: '1', completedTasks: 1 }];
      if (mode === 'incomplete-artifacts' && args[0] === 'status')
        data['artifacts'] = [{ id: 'work', status: 'ready' }];
      if (mode === 'blocked-apply' && args[0] === 'instructions') data['state'] = 'blocked';
      return json(data);
    });
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow();
    noPreparation(root);
  });
  it.each(['missing', 'five', 'duplicate-reviewer', 'stale'])(
    'rejects %s final review evidence before preparation',
    async (mode) => {
      const m = await api();
      const root = fixture();
      const path = 'openspec/changes/alpha/final-reviews.yaml';
      if (mode === 'missing') rmSync(join(root, path));
      else if (mode === 'stale') put(root, 'openspec/changes/alpha/reviews/testing.md', 'changed');
      else {
        const data = parse(readFileSync(join(root, path), 'utf8')) as { reviews: Data[] };
        if (mode === 'five') data.reviews.pop();
        else {
          const first = data.reviews[0];
          const second = data.reviews[1];
          if (first && second) second['reviewer'] = first['reviewer'];
        }
        put(root, path, stringify(data));
      }
      expect(() => m.execute(root, ['alpha'], { runCli: runner(root).run })).toThrow();
      noPreparation(root);
    },
  );
  it('holds the shared lock through preflight, CLI and repair', async () => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    let assertions = 0;
    const cli = runner(root, (args, result) => {
      expect(() => s.withProjectLock(root, () => undefined)).toThrow(/LOCK/);
      assertions++;
      if (args[0] === 'archive') moved(root);
      return result;
    });
    m.execute(root, ['alpha'], { runCli: cli.run });
    expect(assertions).toBeGreaterThan(5);
    expect(existsSync(join(root, 'openspec/.project-status.lock'))).toBe(false);
  });
  it('rechecks the selected root after preparing and preserves recovery state when selection changes', async () => {
    const m = await api();
    const root = fixture();
    let contexts = 0;
    const cli = runner(root, (args, result) =>
      args[0] === 'context' && ++contexts > 1 ? json({ root: { path: '/external' } }) : result,
    );
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/ROOT/);
    expect(receipt(root)).toMatchObject({ state: 'prepared' });
    expect(cli.calls.some((args) => args[0] === 'archive')).toBe(false);
  });
  it('preserves a failed pre-move archive for explicit resume, refreshes checks, then archives only once on resume', async () => {
    const m = await api();
    const root = fixture();
    const failed = runner(root, (args, result) =>
      args[0] === 'archive' ? { ...result, status: 1, stderr: 'CLI failed' } : result,
    );
    expect(() => m.execute(root, ['alpha'], { runCli: failed.run })).toThrow(/resume.*cancel/s);
    expect(receipt(root)['state']).toBe('prepared');
    const cli = runner(root);
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/resume/);
    m.execute(root, ['alpha', '--resume'], { runCli: cli.run });
    expect(receipt(root, true)['state']).toBe('finalized');
    expect(cli.calls.filter((args) => args[0] === 'archive')).toHaveLength(1);
  });
  it('treats nonzero exit after move as pending and repairs on resume without invoking CLI', async () => {
    const m = await api();
    const root = fixture();
    const cli = runner(root, (args, result) => {
      if (args[0] === 'archive') {
        moved(root);
        return { ...result, status: 1, stderr: 'late CLI failure' };
      }
      return result;
    });
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/repair/);
    expect(receipt(root, true)['state']).toBe('prepared');
    const recovery = runner(root);
    m.execute(root, ['alpha', '--resume'], { runCli: recovery.run });
    expect(recovery.calls).toEqual([]);
    m.execute(root, ['alpha', '--resume'], { runCli: recovery.run });
    expect(recovery.calls).toEqual([]);
    expect((await statusApi()).execute(root, ['defects', 'reconcile', '--check'])).toMatchObject({
      ok: true,
    });
  });
  it.each(['openspec/changes/alpha/defect-resolution.yaml', 'openspec/archive-transaction.yaml'])(
    'preserves preparation at occupied write boundary %s',
    async (path) => {
      const m = await api();
      const root = fixture();
      put(root, `${path}.project-status.tmp`, 'sentinel');
      expect(() => m.execute(root, ['alpha'], { runCli: runner(root).run })).toThrow();
      expect(readFileSync(join(root, `${path}.project-status.tmp`), 'utf8')).toBe('sentinel');
      rmSync(join(root, `${path}.project-status.tmp`));
      if (existsSync(join(root, 'openspec/changes/alpha/defect-resolution.yaml')))
        m.execute(root, ['alpha', '--resume'], { runCli: runner(root).run });
      else m.execute(root, ['alpha'], { runCli: runner(root).run });
      expect(receipt(root, true)['state']).toBe('finalized');
    },
  );
  it.each([
    'openspec/defect-ledger.yaml',
    'openspec/roadmap.yaml',
    'openspec/changes/archive/2026-01-02-alpha/defect-resolution.yaml',
  ])('repairs interruption at finalization write %s idempotently', async (path) => {
    const m = await api();
    const root = fixture();
    const cli = runner(root, (args, result) => {
      if (args[0] === 'archive') {
        moved(root);
        put(root, `${path}.project-status.tmp`, 'sentinel');
      }
      return result;
    });
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/repair/);
    expect(
      (await statusApi()).execute(root, ['defects', 'list', '--include-resolved'])['pending'],
    ).not.toEqual([]);
    rmSync(join(root, `${path}.project-status.tmp`));
    const recovery = runner(root);
    m.execute(root, ['alpha', '--resume'], { runCli: recovery.run });
    const before = readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8');
    m.execute(root, ['alpha', '--resume'], { runCli: recovery.run });
    expect(readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8')).toBe(before);
    expect(recovery.calls).toEqual([]);
  });
  it('rejects linked change directories without touching outside bytes', async () => {
    const m = await api();
    const root = fixture();
    const outside = mkdtempSync(join(tmpdir(), 'uplift-outside-'));
    roots.push(outside);
    put(outside, 'sentinel', 'safe');
    renameSync(join(root, 'openspec/changes/alpha'), join(root, 'original'));
    symlinkSync(outside, join(root, 'openspec/changes/alpha'));
    expect(() => m.execute(root, ['alpha'], { runCli: runner(root).run })).toThrow(/symlink/);
    expect(readFileSync(join(outside, 'sentinel'), 'utf8')).toBe('safe');
  });
});

describe('archive identity integration', () => {
  it('preserves an original date-prefixed ID from actual directory inventory', async () => {
    const s = await statusApi();
    const root = fixture();
    const graph = parse(readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8')) as {
      entries: Data[];
    };
    const row = graph.entries[0];
    if (!row) throw new Error('missing fixture row');
    row['id'] = '2026-01-02-alpha';
    put(root, 'openspec/roadmap.yaml', stringify(graph));
    mkdirSync(join(root, 'openspec/changes/archive'));
    renameSync(
      join(root, 'openspec/changes/alpha'),
      join(root, 'openspec/changes/archive/2026-01-02-alpha'),
    );
    expect(s.scanInventory(root)['archiveIds']).toEqual({ '2026-01-02-alpha': '2026-01-02-alpha' });
  });
  it('rejects both declared candidate IDs instead of guessing an archive identity', async () => {
    const s = await statusApi();
    const root = fixture();
    const graph = parse(readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8')) as {
      entries: Data[];
    };
    const row = graph.entries[0];
    if (!row) throw new Error('missing fixture row');
    graph.entries.push({ ...structuredClone(row), id: '2026-01-02-alpha' });
    put(root, 'openspec/roadmap.yaml', stringify(graph));
    moved(root);
    expect(() => s.scanInventory(root)).toThrow(/ambiguous/);
  });
  it('rejects forged inventory mappings in pure graph validation', async () => {
    const s = await statusApi();
    const root = fixture();
    const graph = parse(readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8')) as Data;
    expect(() =>
      s.validateGraph(graph, {
        active: [],
        archives: ['2026-01-02-alpha'],
        archiveIds: { '2026-01-02-alpha': 'beta' },
      }),
    ).toThrow(/identity/);
  });
});

function verifiedDefect(s: StatusModule, root: string): void {
  addDefect(s, root);
  s.execute(root, [
    'defects',
    'transition',
    'D-1',
    '--to',
    'in_progress',
    '--expect-revision',
    '1',
    '--reason',
    'fixture repair',
  ]);
  const reviews = parse(
    readFileSync(join(root, 'openspec/changes/alpha/final-reviews.yaml'), 'utf8'),
  ) as { reviews: { locator: unknown }[] };
  const locator = reviews.reviews[0]?.locator;
  put(
    root,
    'evidence.json',
    JSON.stringify({
      fix_ref: locator,
      tests: [{ command: 'fixture tests', outcome: 'passed', locator }],
      reviews: [
        { reviewer: 'independent', brief: 'fixture check', disposition: 'passed', locator },
      ],
    }),
  );
  s.execute(root, [
    'defects',
    'transition',
    'D-1',
    '--to',
    'verified',
    '--expect-revision',
    '2',
    '--reason',
    'retained proof',
    '--evidence',
    'evidence.json',
  ]);
}
function fixtureDelta(
  root: string,
  delta: string,
  main: string,
): { run: Runner; calls: string[][] } {
  put(root, 'openspec/changes/alpha/specs/fixture/spec.md', delta);
  put(root, 'openspec/specs/fixture/spec.md', main);
  return runner(root, (args, result) => {
    if (args[0] === 'status') {
      const data = JSON.parse(result.stdout) as { artifactPaths: Data };
      data.artifactPaths['specs'] = {
        existingOutputPaths: [join(root, 'openspec/changes/alpha/specs/fixture/spec.md')],
      };
      return json(data);
    }
    if (args[0] === 'archive') moved(root);
    return result;
  });
}

describe('archive durable boundaries and evidence', () => {
  it.each([
    'prepared-receipt-written',
    'journal-written',
    'ledger-written',
    'roadmap-written',
    'finalized-receipt-written',
    'journal-removed',
  ])('recovers failure after %s without duplicate history or lost listing rows', async (step) => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    verifiedDefect(s, root);
    const cli = runner(root);
    expect(() =>
      m.execute(root, ['alpha'], {
        runCli: cli.run,
        onStep: (current) => {
          if (current === step) throw new Error(`injected ${step}`);
        },
      }),
    ).toThrow(/injected/);
    const listing = s.execute(root, ['defects', 'list', '--include-resolved']);
    if (step === 'journal-removed')
      expect(listing['entries']).toMatchObject([{ id: 'D-1', status: 'resolved', revision: 4 }]);
    else expect(listing['pending']).toEqual([{ change_id: 'alpha', ids: ['D-1'] }]);
    const recovery = runner(root);
    m.execute(root, ['alpha', '--resume'], { runCli: recovery.run });
    const once = readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8');
    m.execute(root, ['alpha', '--resume'], { runCli: recovery.run });
    expect(readFileSync(join(root, 'openspec/defect-ledger.yaml'), 'utf8')).toBe(once);
    expect(s.execute(root, ['defects', 'list', '--include-resolved'])['entries']).toMatchObject([
      { id: 'D-1', status: 'resolved', revision: 4 },
    ]);
    expect([...cli.calls, ...recovery.calls].filter((args) => args[0] === 'archive')).toHaveLength(
      1,
    );
    expect(s.execute(root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
  });
  it('cancels an intact failed preparation, then allows a fresh archive', async () => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    const cli = runner(root, (args, result) =>
      args[0] === 'archive' ? { ...result, status: 1 } : result,
    );
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/resume/);
    expect(
      s.execute(root, ['defects', 'reconcile', '--cancel', '--change', 'alpha']),
    ).toMatchObject({ state: 'canceled' });
    noPreparation(root);
    m.execute(root, ['alpha'], { runCli: runner(root).run });
    expect(() =>
      s.execute(root, ['defects', 'reconcile', '--cancel', '--change', 'alpha']),
    ).toThrow(/cancel/);
  });
  it('requires refreshed completion checks on pre-move resume', async () => {
    const m = await api();
    const root = fixture();
    const fail = runner(root, (args, result) =>
      args[0] === 'archive' ? { ...result, status: 1 } : result,
    );
    expect(() => m.execute(root, ['alpha'], { runCli: fail.run })).toThrow();
    const cli = runner(root, (args, result) =>
      args[0] === 'instructions'
        ? json({ ...(JSON.parse(result.stdout) as Data), state: 'ready' })
        : result,
    );
    expect(() => m.execute(root, ['alpha', '--resume'], { runCli: cli.run })).toThrow(/TASKS/);
    expect(cli.calls.some((args) => args[0] === 'archive')).toBe(false);
  });
  it('preserves external edits on resume and cancellation', async () => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    const fail = runner(root, (args, result) =>
      args[0] === 'archive' ? { ...result, status: 1 } : result,
    );
    expect(() => m.execute(root, ['alpha'], { runCli: fail.run })).toThrow();
    put(root, 'openspec/changes/alpha/proposal.md', 'external edit');
    expect(() => m.execute(root, ['alpha', '--resume'], { runCli: runner(root).run })).toThrow(
      /preimage conflict/,
    );
    expect(() =>
      s.execute(root, ['defects', 'reconcile', '--cancel', '--change', 'alpha']),
    ).toThrow(/preimage conflict/);
    expect(readFileSync(join(root, 'openspec/changes/alpha/proposal.md'), 'utf8')).toBe(
      'external edit',
    );
  });
  it('rechecks prepared preimages immediately before invoking archive', async () => {
    const m = await api();
    const root = fixture();
    let calls = 0;
    const cli = runner(root, (args, result) => {
      if (args[0] === 'status' && ++calls === 2)
        put(root, 'openspec/changes/alpha/proposal.md', 'external edit');
      return result;
    });
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/preimage conflict/);
    expect(cli.calls.some((args) => args[0] === 'archive')).toBe(false);
  });
  it('rejects changed delivery evidence after move without removing owned records', async () => {
    const m = await api();
    const root = fixture();
    const cli = runner(root, (args, result) => {
      if (args[0] === 'archive') {
        moved(root);
        put(root, 'openspec/changes/archive/2026-01-02-alpha/reviews/testing.md', 'tampered');
      }
      return result;
    });
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/digest mismatch/);
    expect(receipt(root, true)['state']).toBe('prepared');
  });
  it.each([
    ['added', '## ADDED Requirements\n\n### Requirement: Existing\nOld body\n'],
    ['modified', '## MODIFIED Requirements\n\n### Requirement: Existing\nOld body\n'],
    ['removed', '## REMOVED Requirements\n\n### Requirement: Missing\nReason\n'],
    [
      'renamed',
      '## RENAMED Requirements\n- FROM: `### Requirement: Missing`\n- TO: `### Requirement: Existing`\n',
    ],
  ])('stops a pre-synchronized %s conflict before preparation', async (_name, delta) => {
    const m = await api();
    const root = fixture();
    const cli = fixtureDelta(
      root,
      delta,
      '# Main\n\n## Requirements\n\n### Requirement: Existing\nOld body\n',
    );
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/PRESYNC/);
    noPreparation(root);
  });
  it('rejects a bypass archive and a deleted finalized empty receipt', async () => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    m.execute(root, ['alpha'], { runCli: runner(root).run });
    rmSync(join(root, 'openspec/changes/archive/2026-01-02-alpha/defect-resolution.yaml'));
    expect(() => s.execute(root, ['defects', 'reconcile', '--check'])).toThrow(/missing receipt/);
    expect(() => m.execute(root, ['alpha', '--resume'], { runCli: runner(root).run })).toThrow(
      /missing receipt/,
    );
  });
});

function dateFixture(root: string, id = '2026-01-02-alpha'): void {
  const graph = parse(readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8')) as {
    entries: Data[];
  };
  const row = graph.entries[0];
  if (!row) throw new Error('missing row');
  row['id'] = id;
  put(root, 'openspec/roadmap.yaml', stringify(graph));
  renameSync(join(root, 'openspec/changes/alpha'), join(root, `openspec/changes/${id}`));
  const file = `openspec/changes/${id}/final-reviews.yaml`;
  put(
    root,
    file,
    readFileSync(join(root, file), 'utf8').replaceAll('change_id: alpha', `change_id: ${id}`),
  );
  git(root, 'add', '.');
}
function datedRunner(root: string): Runner {
  return runner(root, (args, result) => {
    if (args[0] === 'list')
      return json({
        root: { path: root, source: 'nearest' },
        changes: [{ name: '2026-01-02-alpha', totalTasks: 1, completedTasks: 1 }],
      });
    if (args[0] === 'archive') {
      mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
      renameSync(
        join(root, 'openspec/changes/2026-01-02-alpha'),
        join(root, 'openspec/changes/archive/2026-01-02-alpha'),
      );
    }
    return { ...result, stdout: result.stdout.replaceAll('alpha', '2026-01-02-alpha') };
  }).run;
}
describe('dated identity consumer consistency', () => {
  it('accepts a dated receipt through pure reconciliation without an adapter mapping', async () => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    dateFixture(root);
    m.execute(root, ['2026-01-02-alpha'], { runCli: datedRunner(root) });
    const project = s.readProject(root);
    const receipts = s.readReceipts(root, project['inventory']);
    project['inventory'] = { active: [], archives: ['2026-01-02-alpha'] };
    expect(s.reconcileProject(project, receipts)).toMatchObject({ ok: true });
  });
  it('rejects an ambiguous future dated destination before CLI invocation or preparation', async () => {
    const m = await api();
    const root = fixture();
    dateFixture(root);
    const graph = parse(readFileSync(join(root, 'openspec/roadmap.yaml'), 'utf8')) as {
      entries: Data[];
    };
    const row = graph.entries[0];
    if (!row) throw new Error('missing row');
    graph.entries.push({ ...structuredClone(row), id: 'alpha' });
    put(root, 'openspec/roadmap.yaml', stringify(graph));
    let archived = false;
    const cli = datedRunner(root);
    expect(() =>
      m.execute(root, ['2026-01-02-alpha'], {
        runCli: (args, r) => {
          if (args[0] === 'archive') archived = true;
          return cli(args, r);
        },
      }),
    ).toThrow(/ambiguous/);
    expect(archived).toBe(false);
    expect(existsSync(join(root, 'openspec/changes/2026-01-02-alpha/defect-resolution.yaml'))).toBe(
      false,
    );
  });
});

it('refuses an invalid calendar-prefixed ID before preparing or invoking the CLI', async () => {
  const m = await api();
  const root = fixture();
  dateFixture(root, '2026-99-99-alpha');
  const cli = runner(root);
  expect(() => m.execute(root, ['2026-99-99-alpha'], { runCli: cli.run })).toThrow(
    /invalid archive directory/,
  );
  expect(cli.calls).toEqual([]);
  expect(existsSync(join(root, 'openspec/changes/2026-99-99-alpha/defect-resolution.yaml'))).toBe(
    false,
  );
});

const presyncCases = [
  { kind: 'ADDED', body: '## ADDED Requirements\n\n### Requirement: Existing\nOld body\n' },
  { kind: 'MODIFIED', body: '## MODIFIED Requirements\n\n### Requirement: Existing\nOld body\n' },
  { kind: 'REMOVED', body: '## REMOVED Requirements\n\n### Requirement: Missing\nReason\n' },
  {
    kind: 'RENAMED',
    body: '## RENAMED Requirements\n- FROM: `### Requirement: Missing`\n- TO: `### Requirement: Existing`\n',
  },
];
it.each(
  presyncCases.flatMap((item) => [
    { ...item, mainEnding: '\r\n', deltaEnding: '\r\n', style: 'CRLF' },
    { ...item, mainEnding: '\r\n', deltaEnding: '\n', style: 'CRLF main / LF delta' },
    { ...item, mainEnding: '\n', deltaEnding: '\r\n', style: 'LF main / CRLF delta' },
  ]),
)(
  'rejects presynced $kind with $style line endings before preparation',
  async ({ body, mainEnding, deltaEnding }) => {
    const m = await api();
    const root = fixture();
    const cli = fixtureDelta(
      root,
      body.replaceAll('\n', deltaEnding),
      '# Main\n\n## Requirements\n\n### Requirement: Existing\nOld body\n'.replaceAll(
        '\n',
        mainEnding,
      ),
    );
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/PRESYNC/);
    noPreparation(root);
    expect(cli.calls.some((args) => args[0] === 'archive')).toBe(false);
  },
);

it.each(['artifact', 'task', 'context'])(
  'rejects dot-segment escape in CLI-returned %s path before preparation',
  async (kind) => {
    const m = await api();
    const root = fixture();
    put(root, 'openspec/changes/beta/proof.md', 'outside selected change');
    const outside = join(root, 'openspec/changes/alpha') + '/../beta/proof.md';
    const cli = runner(root, (args, result) => {
      const data = JSON.parse(result.stdout) as Data;
      if (args[0] === 'status' && kind === 'artifact')
        data['artifactPaths'] = { work: { existingOutputPaths: [outside] } };
      if (args[0] === 'instructions' && kind === 'task')
        data['tasks'] = [{ done: true, sourcePath: outside, line: 1 }];
      if (args[0] === 'instructions' && kind === 'context')
        data['contextFiles'] = { proposal: [outside] };
      if (args[0] === 'archive') moved(root);
      return json(data);
    });
    expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/PATH/);
    noPreparation(root);
    expect(cli.calls.some((args) => args[0] === 'archive')).toBe(false);
    expect(readFileSync(join(root, 'openspec/changes/beta/proof.md'), 'utf8')).toBe(
      'outside selected change',
    );
  },
);

it.each([
  { phase: 'pending', defects: false },
  { phase: 'pending', defects: true },
  { phase: 'finalized', defects: false },
  { phase: 'finalized', defects: true },
])(
  'direct repair and reconciliation reject changed review proof for $phase archive (defects=$defects)',
  async ({ phase, defects }) => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    if (defects) verifiedDefect(s, root);
    if (phase === 'pending')
      expect(() =>
        m.execute(root, ['alpha'], {
          runCli: runner(root).run,
          onStep: (step) => {
            if (step === 'ledger-written') throw new Error('injected');
          },
        }),
      ).toThrow(/injected/);
    else m.execute(root, ['alpha'], { runCli: runner(root).run });
    const archived = 'openspec/changes/archive/2026-01-02-alpha';
    const proof = `${archived}/reviews/testing.md`;
    const original = readFileSync(join(root, proof), 'utf8');
    const before = [
      'openspec/defect-ledger.yaml',
      'openspec/roadmap.yaml',
      `${archived}/defect-resolution.yaml`,
    ].map((path) => readFileSync(join(root, path), 'utf8'));
    put(root, proof, 'changed independent delivery evidence');
    expect(() =>
      s.execute(root, ['defects', 'reconcile', '--repair', '--change', 'alpha']),
    ).toThrow(/EVIDENCE/);
    expect(() => s.execute(root, ['defects', 'reconcile', '--check'])).toThrow(/EVIDENCE/);
    expect(
      [
        'openspec/defect-ledger.yaml',
        'openspec/roadmap.yaml',
        `${archived}/defect-resolution.yaml`,
      ].map((path) => readFileSync(join(root, path), 'utf8')),
    ).toEqual(before);
    expect(readFileSync(join(root, proof), 'utf8')).toBe('changed independent delivery evidence');
    put(root, proof, original);
    expect(
      s.execute(root, ['defects', 'reconcile', '--repair', '--change', 'alpha']),
    ).toMatchObject({ state: 'finalized' });
    expect(s.execute(root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
  },
);

it('direct recovery rejects a missing archived final-review manifest in an empty receipt', async () => {
  const m = await api();
  const s = await statusApi();
  const root = fixture();
  m.execute(root, ['alpha'], { runCli: runner(root).run });
  rmSync(join(root, 'openspec/changes/archive/2026-01-02-alpha/final-reviews.yaml'));
  expect(() => s.execute(root, ['defects', 'reconcile', '--repair', '--change', 'alpha'])).toThrow(
    /EVIDENCE/,
  );
  expect(() => s.execute(root, ['defects', 'reconcile', '--check'])).toThrow(/EVIDENCE/);
});

it.each(['changed', 'deleted'])(
  'direct repair preserves %s repository-located final-review evidence in an empty receipt',
  async (mode) => {
    const m = await api();
    const s = await statusApi();
    const root = fixture();
    const manifest = 'openspec/changes/alpha/final-reviews.yaml';
    const data = parse(readFileSync(join(root, manifest), 'utf8')) as {
      reviews: { locator: unknown }[];
    };
    const review = data.reviews[3];
    if (!review) throw new Error('missing fixture review');
    const proof = 'retained-review.md';
    const original = 'Independent repository review passed\n';
    put(root, proof, original);
    review.locator = {
      kind: 'repo',
      path: proof,
      sha256: createHash('sha256').update(original).digest('hex'),
    };
    put(root, manifest, stringify(data));
    git(root, 'add', '.');
    expect(() =>
      m.execute(root, ['alpha'], {
        runCli: runner(root).run,
        onStep: (step) => {
          if (step === 'ledger-written') throw new Error('injected');
        },
      }),
    ).toThrow(/injected/);
    if (mode === 'deleted') rmSync(join(root, proof));
    else put(root, proof, 'changed repository review');
    expect(() =>
      s.execute(root, ['defects', 'reconcile', '--repair', '--change', 'alpha']),
    ).toThrow(/EVIDENCE/);
    expect(() => s.execute(root, ['defects', 'reconcile', '--check'])).toThrow(/EVIDENCE/);
    expect(receipt(root, true)['state']).toBe('prepared');
    expect(existsSync(join(root, 'openspec/archive-transaction.yaml'))).toBe(true);
    if (mode === 'deleted') expect(existsSync(join(root, proof))).toBe(false);
    else expect(readFileSync(join(root, proof), 'utf8')).toBe('changed repository review');
    put(root, proof, original);
    expect(
      s.execute(root, ['defects', 'reconcile', '--repair', '--change', 'alpha']),
    ).toMatchObject({
      state: 'finalized',
    });
  },
);

it('requires an immutable review snapshot outside the mutable main-spec tree', async () => {
  const m = await api();
  const root = fixture();
  const manifest = 'openspec/changes/alpha/final-reviews.yaml';
  const data = parse(readFileSync(join(root, manifest), 'utf8')) as {
    reviews: { locator: unknown }[];
  };
  const review = data.reviews[0];
  if (!review) throw new Error('missing fixture review');
  const proof = 'openspec/specs/fixture/spec.md';
  const bytes = 'Main spec used as review proof';
  put(root, proof, bytes);
  review.locator = {
    kind: 'repo',
    path: proof,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  put(root, manifest, stringify(data));
  git(root, 'add', '.');
  const cli = runner(root);
  expect(() => m.execute(root, ['alpha'], { runCli: cli.run })).toThrow(/immutable.*snapshot/i);
  noPreparation(root);
  expect(cli.calls.some((args) => args[0] === 'archive')).toBe(false);
});

it('retains evidence in another change across shared archive recovery', async () => {
  const m = await api();
  const s = await statusApi();
  const root = fixture();
  const manifest = 'openspec/changes/alpha/final-reviews.yaml';
  const data = parse(readFileSync(join(root, manifest), 'utf8')) as {
    reviews: { locator: unknown }[];
  };
  const review = data.reviews[0];
  if (!review) throw new Error('missing fixture review');
  const proof = 'openspec/changes/beta/review.md';
  const bytes = 'Independent retained cross-change review';
  put(root, proof, bytes);
  review.locator = {
    kind: 'change',
    change_id: 'beta',
    relative_path: 'review.md',
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  put(root, manifest, stringify(data));
  git(root, 'add', '.');
  m.execute(root, ['alpha'], { runCli: runner(root).run });
  put(root, proof, 'tampered other-change review');
  expect(() => s.execute(root, ['defects', 'reconcile', '--check'])).toThrow(/EVIDENCE/);
  put(root, proof, bytes);
  expect(s.execute(root, ['defects', 'reconcile', '--repair', '--change', 'alpha'])).toMatchObject({
    state: 'finalized',
  });
});

it('a later reconciliation observes removed Git tracking instead of reusing an earlier index snapshot', async () => {
  const m = await api();
  const s = await statusApi();
  const root = fixture();
  m.execute(root, ['alpha'], { runCli: runner(root).run });
  expect(s.execute(root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
  git(root, 'rm', '--cached', '--', 'openspec/changes/alpha/reviews/testing.md');
  expect(() => s.execute(root, ['defects', 'reconcile', '--check'])).toThrow(/must be tracked/);
  git(root, 'add', '--', 'openspec/changes/archive/2026-01-02-alpha/reviews/testing.md');
  expect(s.execute(root, ['defects', 'reconcile', '--check'])).toMatchObject({ ok: true });
});
