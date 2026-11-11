import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const runnerPath = join(root, 'scripts/verify.mjs');
const directories: string[] = [];
const children = new Set<ChildProcess>();
const descendantPids = new Set<number>();
function temporary(): string {
  const directory = mkdtempSync(join(tmpdir(), 'uplift-verify-'));
  directories.push(directory);
  return directory;
}
interface Check {
  name: string;
  command: string;
  args: string[];
}
interface RunnerModule {
  runVerification(options: {
    checks: Check[];
    cwd?: string;
    write: (text: string) => void;
    signals?: EventEmitter;
    maxOutputBytes?: number;
    graceMs?: number;
  }): Promise<{ exitCode: number }>;
  terminateProcessTree(
    pid: number,
    options: {
      platform?: string;
      graceMs?: number;
      spawnProcess?: (
        command: string,
        args: readonly string[],
        options: SpawnOptions,
      ) => ChildProcess;
    },
  ): Promise<void>;
}
async function runner(): Promise<RunnerModule> {
  const url = pathToFileURL(runnerPath).href;
  return (await import(url)) as RunnerModule;
}
function check(name: string, source: string, ...args: string[]): Check {
  return { name, command: process.execPath, args: ['-e', source, ...args] };
}
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function publishedPids(path: string): number[] | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(value) && value.length === 2 && value.every(Number.isSafeInteger)
      ? (value as number[])
      : undefined;
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}
function fixtureEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
}
function snapshotTree(directory: string): Record<string, string> {
  return Object.fromEntries(
    readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const path = join(entry.parentPath, entry.name);
        return [path.slice(directory.length + 1), readFileSync(path).toString('base64')];
      }),
  );
}
async function cleanupDriver(child: ChildProcess): Promise<void> {
  if (child.exitCode === null && child.signalCode === null) {
    const closed = new Promise<void>((done) => child.once('close', () => done()));
    const timer = setTimeout(() => child.kill('SIGKILL'), 2000);
    if (process.platform === 'win32' && child.connected) child.send('SIGTERM');
    else child.kill('SIGTERM');
    await closed;
    clearTimeout(timer);
  }
}
afterEach(async () => {
  vi.unstubAllEnvs();
  for (const pid of descendantPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* Already exited. */
    }
  }
  descendantPids.clear();
  for (const child of children) {
    await cleanupDriver(child);
  }
  children.clear();
  directories.forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  directories.length = 0;
});

describe('verification process runner', () => {
  it('cleans up the tree when readiness times out before PID publication', async () => {
    const directory = temporary();
    const observed = join(directory, 'observed.json');
    const unpublished = join(directory, 'pids.json');
    const driver = join(directory, 'driver.mjs');
    const worker = join(directory, 'worker.cjs');
    const grandchild = join(directory, 'grandchild.cjs');
    writeFileSync(
      grandchild,
      `require('node:fs').writeFileSync(process.argv[2],JSON.stringify([process.ppid,process.pid]));setInterval(()=>{},1000);`,
    );
    writeFileSync(
      worker,
      `require('node:child_process').spawn(process.execPath,[process.argv[2],process.argv[3]],{stdio:'ignore'});setInterval(()=>{},1000);`,
    );
    writeFileSync(
      driver,
      `import {runVerification} from ${JSON.stringify(pathToFileURL(runnerPath).href)};if(process.platform==='win32')process.on('message',signal=>process.emit(signal));await runVerification({checks:[{name:'tree',command:process.execPath,args:process.argv.slice(2)}],graceMs:40});`,
    );
    const child = spawn(process.execPath, [driver, worker, grandchild, observed], {
      stdio:
        process.platform === 'win32'
          ? ['ignore', 'pipe', 'pipe', 'ipc']
          : ['ignore', 'pipe', 'pipe'],
    });
    children.add(child);
    let pids: number[] = [];
    try {
      await vi.waitFor(() => expect(publishedPids(observed)).toHaveLength(2), {
        interval: 5,
        timeout: 1500,
      });
      pids = publishedPids(observed) ?? [];
      await expect(
        vi.waitFor(() => expect(publishedPids(unpublished)).toHaveLength(2), {
          interval: 5,
          timeout: 30,
        }),
      ).rejects.toThrow();
      await cleanupDriver(child);
      await vi.waitFor(() => expect(pids.map(alive)).toEqual([false, false]), {
        interval: 5,
        timeout: 300,
      });
    } finally {
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* Already exited. */
        }
      }
    }
  });
  it('waits for a complete PID publication', () => {
    const path = join(temporary(), 'pids.json');
    expect(publishedPids(path)).toBeUndefined();
    writeFileSync(path, '');
    expect(publishedPids(path)).toBeUndefined();
    writeFileSync(path, '[123,');
    expect(publishedPids(path)).toBeUndefined();
    writeFileSync(path, '[123,456]');
    expect(publishedPids(path)).toEqual([123, 456]);
  });
  it('starts every check before waiting and reports one buffered summary per step', async () => {
    const directory = temporary();
    const { runVerification } = await runner();
    const source = `const fs=require('node:fs'); const p=require('node:path'); const [dir,name]=process.argv.slice(1);
      setTimeout(()=>fs.writeFileSync(p.join(dir,name),'ready'),name==='tests'?900:0);
      const timer=setInterval(()=>{if(fs.readdirSync(dir).length===4){clearInterval(timer);console.log(name+' hidden success');}},5);`;
    let output = '';
    const signals = new EventEmitter();
    const watchdog = setTimeout(() => signals.emit('SIGTERM'), 4000);
    let result: { exitCode: number };
    try {
      result = await runVerification({
        signals,
        checks: ['format', 'lint', 'types', 'tests'].map((name) =>
          check(name, source, directory, name),
        ),
        write: (text) => {
          output += text;
        },
      });
    } finally {
      clearTimeout(watchdog);
    }
    expect(result.exitCode, output).toBe(0);
    expect(signals.listenerCount('SIGINT')).toBe(0);
    expect(signals.listenerCount('SIGTERM')).toBe(0);
    expect(output.match(/^PASS /gm)).toHaveLength(4);
    expect(output).not.toContain('hidden success');
    for (const name of ['format', 'lint', 'types', 'tests'])
      expect(output).toContain(`PASS ${name}`);
  });

  it('reports failure and spawn errors while waiting for all other checks and keeping diagnostics together', async () => {
    const { runVerification } = await runner();
    let output = '';
    const result = await runVerification({
      checks: [
        check(
          'failed',
          "console.log('first-out');setTimeout(()=>{console.error('last-err');process.exit(7)},20)",
        ),
        { name: 'missing', command: join(temporary(), 'absent'), args: [] },
        { name: 'invalid', command: process.execPath, args: ['\0'] },
        check('sibling', "setTimeout(()=>console.log('sibling finished'),40)"),
      ],
      write: (text) => {
        output += text;
      },
    });
    expect(result.exitCode).toBe(1);
    expect(output.match(/^FAIL /gm)).toHaveLength(3);
    expect(output.match(/^PASS /gm)).toHaveLength(1);
    expect(output).toMatch(/first-out\nlast-err/);
    expect(output).toContain('ENOENT');
    expect(output).toContain('PASS sibling');
  });

  it.each(['stdout', 'stderr'])(
    'bounds %s output and fails even when the overflowing process would exit successfully',
    async (stream) => {
      const { runVerification } = await runner();
      let output = '';
      const result = await runVerification({
        checks: [check('flood', `process.${stream}.write('x'.repeat(4096));`)],
        maxOutputBytes: 128,
        graceMs: 20,
        write: (text) => {
          output += text;
        },
      });
      expect(result.exitCode).toBe(1);
      expect(output).toContain('FAIL flood');
      expect(output).toContain('output limit');
      expect(output.length).toBeLessThan(600);
    },
  );

  it.each([
    ['SIGINT', false],
    ['SIGTERM', true],
  ] as const)(
    'terminates and reaps a real worker and grandchild on %s (root resists TERM: %s), including resistant descendants',
    async (signal, resistantRoot) => {
      const directory = temporary();
      const pidPath = join(directory, 'pids.json');
      const driver = join(directory, 'driver.mjs');
      const worker = join(directory, 'worker.cjs');
      const grandchild = join(directory, 'grandchild.cjs');
      writeFileSync(
        grandchild,
        `process.on('SIGTERM',()=>{});const fs=require('node:fs');const path=process.argv[2];fs.writeFileSync(path+'.tmp',JSON.stringify([process.ppid,process.pid]));fs.renameSync(path+'.tmp',path);setInterval(()=>{},1000);`,
      );
      writeFileSync(
        worker,
        `const {spawn}=require('node:child_process');spawn(process.execPath,[process.argv[2],process.argv[3]],{stdio:'ignore'});${resistantRoot ? "process.on('SIGTERM',()=>{});" : ''}setInterval(()=>{},1000);`,
      );
      writeFileSync(
        driver,
        `import {runVerification} from ${JSON.stringify(pathToFileURL(runnerPath).href)};
      if(process.platform==='win32') process.on('message',(signal)=>process.emit(signal));
      const result=await runVerification({checks:[{name:'tree',command:process.execPath,args:process.argv.slice(2)}],graceMs:40});process.exitCode=result.exitCode;if(process.connected)process.disconnect();`,
      );
      const child = spawn(process.execPath, [driver, worker, grandchild, pidPath], {
        stdio:
          process.platform === 'win32'
            ? ['ignore', 'pipe', 'pipe', 'ipc']
            : ['ignore', 'pipe', 'pipe'],
      });
      children.add(child);
      let output = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
      const closed = new Promise<number | null>((done) =>
        child.once('close', (code) => done(code)),
      );
      try {
        await vi.waitFor(() => expect(publishedPids(pidPath), output).toHaveLength(2), {
          interval: 5,
          timeout: 1500,
        });
        const pids = publishedPids(pidPath);
        if (!pids) throw new Error('PID publication disappeared');
        pids.forEach((pid) => descendantPids.add(pid));
        expect(pids).toHaveLength(2);
        expect(pids.every(alive)).toBe(true);
        // Windows kill() bypasses Node handlers; IPC triggers cancellation there. POSIX uses native signals.
        if (process.platform === 'win32') child.send(signal);
        else child.kill(signal);
        expect(await closed).not.toBe(0);
        await vi.waitFor(() => expect(pids.map(alive)).toEqual([false, false]), {
          interval: 5,
          timeout: 1500,
        });
        expect(output).toContain('FAIL tree');
        expect(output).toContain(signal);
      } finally {
        await cleanupDriver(child);
        for (const pid of publishedPids(pidPath) ?? []) descendantPids.add(pid);
      }
    },
  );

  it('uses Windows tree termination with forced escalation and waits for both taskkill commands', async () => {
    const { terminateProcessTree } = await runner();
    const invocations: string[][] = [];
    const completed: number[] = [];
    const adapter = (
      command: string,
      args: readonly string[],
      options: SpawnOptions,
    ): ChildProcess => {
      invocations.push([command, ...args]);
      const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{},10)'], options);
      child.once('close', () => completed.push(invocations.length));
      children.add(child);
      return child;
    };
    await terminateProcessTree(12345, { platform: 'win32', spawnProcess: adapter, graceMs: 5 });
    expect(invocations).toEqual([
      ['taskkill', ['/PID', '12345', '/T']].flat(),
      ['taskkill', ['/PID', '12345', '/T', '/F']].flat(),
    ]);
    expect(completed).toHaveLength(2);
  });
});

describe('pre-commit gate', () => {
  it.each([
    [0, 0, 0, ['staged', 'verify']],
    [3, 0, 3, ['staged']],
    [0, 4, 4, ['staged', 'verify']],
  ] as const)(
    'propagates staged=%i verify=%i status',
    (stagedCode, verifyCode, expectedCode, expectedSteps) => {
      const foreign = temporary();
      const foreignGit = (...args: string[]) =>
        spawnSync('git', args, { cwd: foreign, encoding: 'utf8', env: fixtureEnvironment() });
      expect(foreignGit('init', '-q').status).toBe(0);
      writeFileSync(join(foreign, 'sentinel.txt'), 'foreign');
      expect(foreignGit('add', 'sentinel.txt').status).toBe(0);
      const foreignState = snapshotTree(join(foreign, '.git'));
      const externalConfig = join(foreign, 'external-config');
      writeFileSync(externalConfig, '[user]\n\tname = Outside\n');
      vi.stubEnv('GIT_DIR', join(foreign, '.git'));
      vi.stubEnv('GIT_WORK_TREE', foreign);
      vi.stubEnv('GIT_INDEX_FILE', join(foreign, '.git/index'));
      vi.stubEnv('GIT_OBJECT_DIRECTORY', join(foreign, '.git/objects'));
      vi.stubEnv('GIT_ALTERNATE_OBJECT_DIRECTORIES', join(foreign, '.git/objects'));
      vi.stubEnv('GIT_COMMON_DIR', join(foreign, '.git'));
      vi.stubEnv('GIT_CONFIG_GLOBAL', externalConfig);
      vi.stubEnv('GIT_CONFIG_COUNT', '1');
      vi.stubEnv('GIT_CONFIG_KEY_0', 'user.name');
      vi.stubEnv('GIT_CONFIG_VALUE_0', 'Foreign');
      const directory = temporary();
      const bin = join(directory, 'bin');
      mkdirSync(bin);
      writeFileSync(join(directory, 'staged.txt'), 'staged');
      writeFileSync(join(directory, 'unrelated.txt'), 'unrelated');
      const git = (...args: string[]) =>
        spawnSync('git', args, { cwd: directory, encoding: 'utf8', env: fixtureEnvironment() });
      expect(git('init', '-q').status).toBe(0);
      expect(git('add', 'staged.txt').status).toBe(0);
      const index = git('diff', '--cached', '--name-only').stdout;
      writeFileSync(
        join(bin, 'npx'),
        `#!/bin/sh\n[ "$*" = "lint-staged" ] || exit 90\necho staged >> "$TRACE"\nexit ${stagedCode}\n`,
      );
      writeFileSync(
        join(bin, 'npm'),
        `#!/bin/sh\n[ "$*" = "run verify" ] || exit 90\necho verify >> "$TRACE"\nexit ${verifyCode}\n`,
      );
      chmodSync(join(bin, 'npx'), 0o755);
      chmodSync(join(bin, 'npm'), 0o755);
      const trace = join(directory, 'trace');
      const result = spawnSync('sh', [join(root, '.husky/pre-commit')], {
        cwd: directory,
        env: {
          ...fixtureEnvironment(),
          PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
          TRACE: trace,
        },
        encoding: 'utf8',
      });
      expect(result.status).toBe(expectedCode);
      expect(readFileSync(trace, 'utf8').trim().split('\n')).toEqual(expectedSteps);
      expect(git('diff', '--cached', '--name-only').stdout).toBe(index);
      const hook = join(directory, '.git/hooks/pre-commit');
      writeFileSync(hook, '#!/bin/sh\nexec sh "$UPLIFT_HOOK"\n');
      chmodSync(hook, 0o755);
      const commit = spawnSync(
        'git',
        [
          '-c',
          'user.name=Fixture',
          '-c',
          'user.email=fixture@example.invalid',
          '-c',
          'commit.gpgsign=false',
          '-c',
          'core.hooksPath=.git/hooks',
          'commit',
          '-qm',
          'fixture',
        ],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...fixtureEnvironment(),
            PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
            TRACE: trace,
            UPLIFT_HOOK: join(root, '.husky/pre-commit'),
          },
        },
      );
      expect(commit.status === 0, commit.stderr).toBe(expectedCode === 0);
      if (expectedCode === 0)
        expect(git('ls-tree', '--name-only', 'HEAD').stdout.trim()).toBe('staged.txt');
      else {
        expect(git('rev-parse', '--verify', 'HEAD').status).not.toBe(0);
        expect(git('diff', '--cached', '--name-only').stdout).toBe(index);
      }
      expect(git('ls-files', 'unrelated.txt').stdout).toBe('');
      expect(snapshotTree(join(foreign, '.git'))).toEqual(foreignState);
      expect(readFileSync(externalConfig, 'utf8')).toBe('[user]\n\tname = Outside\n');
      expect(readFileSync(join(foreign, 'sentinel.txt'), 'utf8')).toBe('foreign');
    },
  );
});
