import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createSafeLocalFiles,
  nodeLocalFileOps,
  UnsafeLocalPathError,
} from '../../../src/infrastructure/persistence/safeLocalFiles.js';

describe('confined local files', () => {
  let base: string;
  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'uplift-safe-files-'));
  });
  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it('creates safe missing ancestors and supports read, append, replace, list and delete', () => {
    const files = createSafeLocalFiles(join(base, 'nested', 'storage'));
    expect(files.read('missing')).toBeUndefined();
    files.writeAtomic('assets/value.json', 'old');
    files.append('assets/value.json', '+appended');
    expect(files.read('assets/value.json')).toBe('old+appended');
    files.writeAtomic('assets/value.json', 'replacement');
    expect(files.list('assets')).toEqual(['value.json']);
    expect(files.read('assets/value.json')).toBe('replacement');
    expect(files.removeFile('assets/value.json')).toBe(true);
    expect(files.removeFile('assets/value.json')).toBe(false);
  });

  it.each(['../outside', '/outside', 'a/../../outside', 'a\\outside'])(
    'rejects escaping child %s',
    (path) => {
      const files = createSafeLocalFiles(join(base, 'storage'));
      expect(() => files.writeAtomic(path, 'bad')).toThrow(UnsafeLocalPathError);
      expect(readdirSync(base)).toEqual([]);
    },
  );

  it.each(['root', 'parent', 'destination', 'dangling', 'temporary'])(
    'rejects a %s symlink without touching its target',
    (position) => {
      const outside = join(base, 'outside');
      mkdirSync(outside);
      const sentinel = join(outside, 'sentinel');
      writeFileSync(sentinel, 'keep');
      const root = join(base, 'storage');
      if (position === 'root') symlinkSync(outside, root, 'dir');
      else {
        mkdirSync(root);
        if (position === 'parent') symlinkSync(outside, join(root, 'assets'), 'dir');
        else {
          mkdirSync(join(root, 'assets'));
          symlinkSync(
            position === 'dangling' ? join(outside, 'missing') : sentinel,
            join(root, 'assets', position === 'temporary' ? 'candidate.tmp' : 'value'),
          );
        }
      }
      expect(() =>
        createSafeLocalFiles(root, { temporaryName: () => 'candidate.tmp' }).writeAtomic(
          'assets/value',
          'bad',
        ),
      ).toThrow();
      expect(readFileSync(sentinel, 'utf8')).toBe('keep');
      expect(readdirSync(outside)).toEqual(['sentinel']);
    },
  );

  it('rejects linked ancestors above the configured root and a root replaced after construction', () => {
    const outside = join(base, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, join(base, 'alias'), 'dir');
    expect(() => createSafeLocalFiles(join(base, 'alias', 'storage'))).toThrow(
      UnsafeLocalPathError,
    );
    const root = join(base, 'storage');
    const files = createSafeLocalFiles(root);
    files.writeAtomic('value', 'old');
    renameSync(root, join(base, 'original'));
    symlinkSync(outside, root, 'dir');
    for (const operation of [
      () => files.read('value'),
      () => files.append('value', 'bad'),
      () => files.list(),
      () => files.removeFile('value'),
    ]) {
      expect(operation).toThrow(UnsafeLocalPathError);
    }
    expect(readFileSync(join(base, 'original', 'value'), 'utf8')).toBe('old');
    expect(readdirSync(outside)).toEqual([]);
  });

  it('does not follow file links on read, append or delete, including dangling links', () => {
    const files = createSafeLocalFiles(base);
    writeFileSync(join(base, 'outside'), 'keep');
    for (const target of ['outside', 'missing']) {
      const linked = `link-${target}`;
      symlinkSync(join(base, target), join(base, linked));
      for (const operation of [
        () => files.read(linked),
        () => files.append(linked, 'bad'),
        () => files.removeFile(linked),
      ])
        expect(operation).toThrow(UnsafeLocalPathError);
    }
    expect(readFileSync(join(base, 'outside'), 'utf8')).toBe('keep');
  });

  it('preserves the old destination and an unowned colliding temporary file', () => {
    writeFileSync(join(base, 'value'), 'old');
    writeFileSync(join(base, 'candidate.tmp'), 'belongs to someone else');
    const files = createSafeLocalFiles(base, { temporaryName: () => 'candidate.tmp' });
    expect(() => files.writeAtomic('value', 'new')).toThrow();
    expect(readFileSync(join(base, 'value'), 'utf8')).toBe('old');
    expect(readFileSync(join(base, 'candidate.tmp'), 'utf8')).toBe('belongs to someone else');
  });

  it('preserves the old destination and cleans its own temporary on rename failure', () => {
    writeFileSync(join(base, 'value'), 'old');
    const files = createSafeLocalFiles(base, {
      fileOps: {
        ...nodeLocalFileOps,
        rename: () => {
          throw Object.assign(new Error('injected'), { code: 'EIO' });
        },
      },
    });
    expect(() => files.writeAtomic('value', 'new')).toThrow();
    expect(readFileSync(join(base, 'value'), 'utf8')).toBe('old');
    expect(readdirSync(base)).toEqual(['value']);
  });

  it('propagates permission failures instead of treating them as missing files', () => {
    const files = createSafeLocalFiles(base, {
      fileOps: {
        ...nodeLocalFileOps,
        open: () => {
          throw Object.assign(new Error('denied'), { code: 'EACCES' });
        },
      },
    });
    writeFileSync(join(base, 'value'), 'old');
    expect(() => files.read('value')).toThrow('denied');
    expect(readFileSync(join(base, 'value'), 'utf8')).toBe('old');
  });
});

describe('exclusive file ownership', () => {
  it('refuses directory destinations and cleans only its own temporary after a failed write', () => {
    const base = mkdtempSync(join(tmpdir(), 'uplift-exclusive-'));
    try {
      mkdirSync(join(base, 'directory'));
      const files = createSafeLocalFiles(base, {
        temporaryName: () => 'owned.tmp',
        fileOps: {
          ...nodeLocalFileOps,
          write: () => {
            throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
          },
        },
      });
      expect(() => files.writeAtomic('directory', 'bad')).toThrow(UnsafeLocalPathError);
      writeFileSync(join(base, 'destination'), 'keep');
      expect(() => files.writeAtomic('destination', 'bad')).toThrow('disk full');
      expect(readFileSync(join(base, 'destination'), 'utf8')).toBe('keep');
      expect(readdirSync(base)).toEqual(['destination', 'directory']);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
