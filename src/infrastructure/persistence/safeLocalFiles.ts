import * as fs from 'node:fs';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

/** Trusted synchronous I/O seam; adapters delegate to real files unless injecting a fault. */
export interface LocalFileOps {
  readonly lstat: (path: string) => fs.Stats;
  readonly realpath: (path: string) => string;
  readonly mkdir: (path: string) => void;
  readonly readdir: (path: string) => string[];
  readonly open: (path: string, flags: number) => number;
  readonly fstat: (fd: number) => fs.Stats;
  readonly read: (fd: number) => string;
  readonly write: (fd: number, content: string) => void;
  readonly close: (fd: number) => void;
  readonly rename: (from: string, to: string) => void;
  readonly unlink: (path: string) => void;
  readonly rmdir: (path: string) => void;
}

export const nodeLocalFileOps: LocalFileOps = {
  lstat: (path) => fs.lstatSync(path),
  realpath: (path) => fs.realpathSync(path),
  mkdir: (path) => {
    fs.mkdirSync(path);
  },
  readdir: (path) => fs.readdirSync(path),
  open: (path, flags) => fs.openSync(path, flags, 0o600),
  fstat: (fd) => fs.fstatSync(fd),
  read: (fd) => fs.readFileSync(fd, 'utf8'),
  write: (fd, content) => {
    fs.writeFileSync(fd, content, 'utf8');
  },
  close: (fd) => {
    fs.closeSync(fd);
  },
  rename: (from, to) => {
    fs.renameSync(from, to);
  },
  unlink: (path) => {
    fs.unlinkSync(path);
  },
  rmdir: (path) => {
    fs.rmdirSync(path);
  },
};

export interface LocalFileOptions {
  readonly fileOps?: LocalFileOps;
  readonly temporaryName?: () => string;
}

export class UnsafeLocalPathError extends Error {
  public constructor() {
    super('Unsafe storage path');
    this.name = 'UnsafeLocalPathError';
  }
}

export function localFileErrorCode(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : 'STORAGE_ERROR';
}

let temporarySequence = 0;
const noFollow = fs.constants.O_NOFOLLOW ?? 0;

/** Single-writer confinement, not isolation from a hostile process running as the same user. */
export class SafeLocalFiles {
  private readonly root: string;
  private readonly ops: LocalFileOps;
  private readonly temporaryName: () => string;

  public constructor(root: string, options: LocalFileOptions = {}) {
    this.ops = options.fileOps ?? nodeLocalFileOps;
    let absolute = resolve(root);
    // Only OS-owned aliases above the application anchor may be resolved once.
    if (process.platform === 'darwin') {
      for (const alias of ['/tmp', '/var', '/etc']) {
        if (absolute === alias || absolute.startsWith(`${alias}/`)) {
          absolute = resolve(this.ops.realpath(alias), relative(alias, absolute));
          break;
        }
      }
    }
    this.root = absolute;
    this.temporaryName =
      options.temporaryName ?? (() => `.uplift-${process.pid}-${++temporarySequence}.tmp`);
    const stat = this.inspect(this.root);
    if (stat !== undefined && !stat.isDirectory()) throw new UnsafeLocalPathError();
  }

  public stat(path = ''): fs.Stats | undefined {
    return this.inspect(this.path(path));
  }

  public ensureDirectory(path = '', exclusive = false): void {
    const target = this.path(path);
    if (exclusive) {
      this.inspect(dirname(target), true);
      if (this.inspect(target) !== undefined) throw new UnsafeLocalPathError();
      this.ops.mkdir(target);
    }
    const stat = this.inspect(target, !exclusive);
    if (stat === undefined || !stat.isDirectory()) throw new UnsafeLocalPathError();
  }

  public list(path = ''): string[] {
    const target = this.path(path);
    const stat = this.inspect(target);
    if (stat === undefined) return [];
    if (!stat.isDirectory()) throw new UnsafeLocalPathError();
    return this.ops.readdir(target);
  }

  public read(path: string): string | undefined {
    const target = this.filePath(path);
    if (this.checkFile(target) === undefined) return undefined;
    return this.withFile(target, fs.constants.O_RDONLY, (fd) => this.ops.read(fd));
  }

  public append(path: string, content: string): void {
    const target = this.filePath(path);
    this.checkFile(target);
    this.withFile(target, fs.constants.O_WRONLY | fs.constants.O_APPEND, (fd) =>
      this.ops.write(fd, content),
    );
  }

  public createFile(path: string, content = ''): void {
    const target = this.filePath(path);
    this.checkFile(target);
    this.inspect(dirname(target), true);
    this.withFile(
      target,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
      (fd) => this.ops.write(fd, content),
    );
  }

  public writeAtomic(path: string, content: string): void {
    const target = this.filePath(path);
    this.checkFile(target);
    this.inspect(dirname(target), true);
    const name = this.temporaryName();
    if (
      !name ||
      name === '.' ||
      name === '..' ||
      basename(name) !== name ||
      name.includes('\\') ||
      name.includes('\0')
    )
      throw new UnsafeLocalPathError();
    const temporary = join(dirname(target), name);
    if (temporary === target) throw new UnsafeLocalPathError();
    this.checkFile(temporary);
    // A collision must fail before ownership is acquired, leaving the existing file untouched.
    const fd = this.ops.open(
      temporary,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow,
    );
    try {
      try {
        if (!this.ops.fstat(fd).isFile()) throw new UnsafeLocalPathError();
        this.ops.write(fd, content);
      } finally {
        this.ops.close(fd);
      }
      this.checkFile(temporary);
      this.checkFile(target);
      this.ops.rename(temporary, target);
    } catch (error) {
      try {
        this.checkFile(temporary);
        this.ops.unlink(temporary);
      } catch {
        /* Preserve the original failure and any recoverable temporary. */
      }
      throw error;
    }
  }

  public move(from: string, to: string): void {
    const source = this.filePath(from);
    const destination = this.filePath(to);
    const stat = this.inspect(source);
    if (stat === undefined || (!stat.isFile() && !stat.isDirectory()))
      throw new UnsafeLocalPathError();
    if (this.inspect(destination) !== undefined) throw new UnsafeLocalPathError();
    const parent = this.inspect(dirname(destination));
    if (parent === undefined || !parent.isDirectory()) throw new UnsafeLocalPathError();
    this.ops.rename(source, destination);
  }

  public removeFile(path: string): boolean {
    const target = this.filePath(path);
    if (this.checkFile(target) === undefined) return false;
    this.ops.unlink(target);
    return true;
  }

  public removeDirectory(path: string): void {
    const target = this.filePath(path);
    const stat = this.inspect(target);
    if (stat === undefined || !stat.isDirectory()) throw new UnsafeLocalPathError();
    this.ops.rmdir(target);
  }

  private path(path: string): string {
    if (
      isAbsolute(path) ||
      path.includes('\\') ||
      path.includes('\0') ||
      path.split('/').includes('..')
    )
      throw new UnsafeLocalPathError();
    const target = resolve(this.root, path);
    const rel = relative(this.root, target);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))
      throw new UnsafeLocalPathError();
    return target;
  }

  private filePath(path: string): string {
    const target = this.path(path);
    if (target === this.root) throw new UnsafeLocalPathError();
    return target;
  }

  private checkFile(target: string): fs.Stats | undefined {
    const stat = this.inspect(target);
    if (stat !== undefined && !stat.isFile()) throw new UnsafeLocalPathError();
    return stat;
  }

  private withFile<T>(target: string, flags: number, action: (fd: number) => T): T {
    const fd = this.ops.open(target, flags | noFollow);
    try {
      if (!this.ops.fstat(fd).isFile()) throw new UnsafeLocalPathError();
      return action(fd);
    } finally {
      this.ops.close(fd);
    }
  }

  private inspect(target: string, createDirectories = false): fs.Stats | undefined {
    let current = parse(target).root;
    const parts = relative(current, target).split(sep).filter(Boolean);
    let stat = this.ops.lstat(current);
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part === undefined) throw new UnsafeLocalPathError();
      current = join(current, part);
      try {
        stat = this.ops.lstat(current);
      } catch (error) {
        if (localFileErrorCode(error) !== 'ENOENT') throw error;
        if (!createDirectories) return undefined;
        this.ops.mkdir(current);
        stat = this.ops.lstat(current);
      }
      if (
        stat.isSymbolicLink() ||
        ((index < parts.length - 1 || createDirectories) && !stat.isDirectory())
      )
        throw new UnsafeLocalPathError();
      if (this.ops.realpath(current) !== current) throw new UnsafeLocalPathError();
    }
    return stat;
  }
}

export function createSafeLocalFiles(root: string, options: LocalFileOptions = {}): SafeLocalFiles {
  return new SafeLocalFiles(root, options);
}
