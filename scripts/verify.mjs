import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

/** @typedef {{name: string, command: string, args: string[]}} Check */
/** @typedef {{platform?: string, graceMs?: number, spawnProcess?: typeof spawn}} TreeOptions */

/**
 * Stop the whole check tree, even if its root exits before a resistant worker.
 * POSIX checks own process groups; Windows taskkill traverses descendants.
 * @param {number} pid
 * @param {TreeOptions} options
 */
export async function terminateProcessTree(pid, options = {}) {
  const { platform = process.platform, graceMs = 500, spawnProcess = spawn } = options;
  if (platform === 'win32') {
    const taskkill = (force) =>
      new Promise((done, reject) => {
        const child = spawnProcess(
          'taskkill',
          ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])],
          {
            stdio: 'ignore',
            windowsHide: true,
            shell: false,
          },
        );
        child.once('error', reject);
        // A tree that has already exited makes taskkill nonzero; escalation is still attempted.
        child.once('close', done);
      });
    await taskkill(false);
    await delay(graceMs);
    await taskkill(true);
    return;
  }
  const signalGroup = (signal) => {
    try {
      process.kill(-pid, signal);
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  };
  signalGroup('SIGTERM');
  await delay(graceMs);
  signalGroup('SIGKILL');
}

/** The npm lifecycle supplies its CLI path; direct invocation uses this Node installation's npm. */
export function defaultChecks() {
  const npmCli =
    process.env.npm_execpath ??
    resolve(
      dirname(process.execPath),
      process.platform === 'win32'
        ? 'node_modules/npm/bin/npm-cli.js'
        : '../lib/node_modules/npm/bin/npm-cli.js',
    );
  return ['format:check', 'lint', 'typecheck', 'test'].map((name) => ({
    name,
    command: process.execPath,
    args: [npmCli, 'run', name],
  }));
}

/**
 * Run fixed, trusted argv arrays without a shell. Tests inject small child programs, never verify itself.
 * @param {{checks?: Check[], cwd?: string, write?: (text: string) => void,
 * signals?: Pick<NodeJS.Process, 'on' | 'off'>, maxOutputBytes?: number, graceMs?: number}} options
 */
export async function runVerification(options = {}) {
  const {
    checks = defaultChecks(),
    cwd = process.cwd(),
    write = (text) => {
      process.stdout.write(text);
    },
    signals = process,
    maxOutputBytes = 1024 * 1024,
    graceMs = 500,
  } = options;
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0)
    throw new RangeError('Invalid output limit');
  const states = [];
  const cleanups = [];
  let interrupted;
  const stop = (state) => {
    if (state.stopping || state.pid === undefined) return;
    state.stopping = true;
    cleanups.push(
      terminateProcessTree(state.pid, { graceMs }).catch((error) => {
        state.errors.push(`worker cleanup failed: ${error.message}`);
      }),
    );
  };
  const interrupt = (signal) => {
    interrupted ??= signal;
    for (const state of states) {
      if (!state.closed) state.errors.push(`interrupted by ${signal}`);
      stop(state);
    }
  };
  const onInt = () => interrupt('SIGINT');
  const onTerm = () => interrupt('SIGTERM');
  signals.on('SIGINT', onInt);
  signals.on('SIGTERM', onTerm);
  try {
    // Construct every promise synchronously: no check awaits another check's result.
    const jobs = checks.map(
      (check) =>
        new Promise((done) => {
          const state = {
            name: check.name,
            started: performance.now(),
            elapsed: 0,
            pid: undefined,
            closed: false,
            stopping: false,
            code: null,
            errors: [],
            stdout: [],
            stderr: [],
            bytes: 0,
          };
          states.push(state);
          const finish = (code) => {
            state.closed = true;
            state.code = code;
            state.elapsed = performance.now() - state.started;
            done();
          };
          let child;
          try {
            child = spawn(check.command, check.args, {
              cwd,
              stdio: ['ignore', 'pipe', 'pipe'],
              shell: false,
              detached: process.platform !== 'win32',
              windowsHide: true,
            });
          } catch (error) {
            state.errors.push(`could not start: ${error.message}`);
            finish(null);
            return;
          }
          state.pid = child.pid;
          const collect = (chunks, chunk) => {
            const available = Math.max(0, maxOutputBytes - state.bytes);
            if (available > 0) chunks.push(chunk.subarray(0, available));
            state.bytes += chunk.length;
            if (state.bytes > maxOutputBytes && !state.stopping) {
              state.errors.push(
                `output limit exceeded (${maxOutputBytes} bytes; output truncated)`,
              );
              stop(state);
            }
          };
          child.stdout.on('data', (chunk) => collect(state.stdout, chunk));
          child.stderr.on('data', (chunk) => collect(state.stderr, chunk));
          child.once('error', (error) => {
            state.errors.push(`could not start: ${error.message}`);
          });
          child.once('close', (code, signal) => {
            if (signal !== null && state.errors.length === 0)
              state.errors.push(`terminated by ${signal}`);
            finish(code);
          });
        }),
    );
    await Promise.all(jobs);
    // Do not cancel escalation on root close: grandchildren may still own the group.
    await Promise.all(cleanups);
    for (const state of states) {
      const passed = state.code === 0 && state.errors.length === 0;
      let text = `${passed ? 'PASS' : 'FAIL'} ${state.name} (${Math.round(state.elapsed)} ms)\n`;
      if (!passed) {
        for (const chunks of [state.stdout, state.stderr]) {
          const output = Buffer.concat(chunks).toString('utf8');
          if (output !== '') text += output.endsWith('\n') ? output : `${output}\n`;
        }
        text += `${state.errors.length ? state.errors.join('\n') : `exit code ${state.code}`}\n`;
      }
      write(text);
    }
    return {
      exitCode:
        interrupted === 'SIGINT'
          ? 130
          : interrupted === 'SIGTERM'
            ? 143
            : states.every((state) => state.code === 0 && state.errors.length === 0)
              ? 0
              : 1,
    };
  } finally {
    signals.off('SIGINT', onInt);
    signals.off('SIGTERM', onTerm);
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = await runVerification();
  process.exitCode = result.exitCode;
}
