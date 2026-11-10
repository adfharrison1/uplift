import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
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
afterEach(async () => {
  for (const pid of descendantPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* Already exited. */
    }
  }
  descendantPids.clear();
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await new Promise<void>((done) => child.once('close', () => done()));
    }
  }
  children.clear();
  directories.forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  directories.length = 0;
});

describe('verification process runner', () => {
  it('starts every check before waiting and reports one buffered summary per step', async () => {
    const directory = temporary();
    const { runVerification } = await runner();
    const source = `const fs=require('node:fs'); const p=require('node:path'); const [dir,name]=process.argv.slice(1);
      fs.writeFileSync(p.join(dir,name),'ready');
      const timer=setInterval(()=>{if(fs.readdirSync(dir).length===4){clearInterval(timer);clearTimeout(limit);console.log(name+' hidden success');}},5);
      const limit=setTimeout(()=>process.exit(9),700);`;
    let output = '';
    const signals = new EventEmitter();
    const result = await runVerification({
      signals,
      checks: ['format', 'lint', 'types', 'tests'].map((name) =>
        check(name, source, directory, name),
      ),
      write: (text) => {
        output += text;
      },
    });
    expect(result.exitCode).toBe(0);
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
        `process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(process.argv[2],JSON.stringify([process.ppid,process.pid]));setInterval(()=>{},1000);`,
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
        await vi.waitFor(() => expect(existsSync(pidPath), output).toBe(true), {
          interval: 5,
          timeout: 1500,
        });
        const pids = JSON.parse(readFileSync(pidPath, 'utf8')) as number[];
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
        if (existsSync(pidPath))
          for (const pid of JSON.parse(readFileSync(pidPath, 'utf8')) as number[])
            descendantPids.add(pid);
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
      const directory = temporary();
      const bin = join(directory, 'bin');
      mkdirSync(bin);
      writeFileSync(join(directory, 'staged.txt'), 'staged');
      writeFileSync(join(directory, 'unrelated.txt'), 'unrelated');
      const git = (...args: string[]) =>
        spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
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
        env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`, TRACE: trace },
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
            ...process.env,
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
    },
  );
});
