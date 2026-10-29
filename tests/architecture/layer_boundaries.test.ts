import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const SRC_ROOT = join(REPO_ROOT, 'src');
const TESTS_ROOT = join(REPO_ROOT, 'tests');

export interface Violation {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly detail: string;
}

/**
 * Strips comments and string literals while preserving newline counts so line numbers remain accurate.
 */
export function stripCommentsAndStrings(source: string): string {
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
    (match) => match.replace(/[^\n]/g, ' '),
  );
}

/**
 * Extracts all static and dynamic module import/export specifiers with their 1-based line numbers.
 */
export function extractImports(source: string): ReadonlyArray<{ specifier: string; line: number }> {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.replace(/[^\n]/g, ' '),
  );
  const results: Array<{ specifier: string; line: number }> = [];
  const lines = withoutComments.split('\n');

  const fromRegex = /\b(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g;
  const dynamicRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (let i = 0; i < lines.length; i += 1) {
    const lineText = lines[i] ?? '';
    for (const regex of [fromRegex, dynamicRegex]) {
      regex.lastIndex = 0;
      let match = regex.exec(lineText);
      while (match !== null) {
        const specifier = match[1];
        if (specifier !== undefined) {
          results.push({ specifier, line: i + 1 });
        }
        match = regex.exec(lineText);
      }
    }
  }

  return results;
}

function collectTypeScriptFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTypeScriptFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Checks a single TypeScript source string for explicit `any` annotations or casts.
 */
export function findExplicitAnyViolations(filePath: string, source: string): Violation[] {
  const sanitized = stripCommentsAndStrings(source);
  const lines = sanitized.split('\n');
  const violations: Violation[] = [];
  const explicitAnyPattern =
    /(?::\s*any\b|\bas\s+any\b|<\s*any\s*>|\bany\s*\[\]|\b(?:Record|Map|Set|Array|ReadonlyArray|Promise)\s*<[^>]*\bany\b)/;

  for (let i = 0; i < lines.length; i += 1) {
    const lineText = lines[i] ?? '';
    if (explicitAnyPattern.test(lineText)) {
      violations.push({
        file: filePath,
        line: i + 1,
        rule: 'no-explicit-any',
        detail: `Explicit 'any' type annotation or cast is forbidden on line ${i + 1}`,
      });
    }
  }

  return violations;
}

/**
 * Checks a single TypeScript source string in domain/ or content/ for unseeded randomness or wall-clock calls.
 */
export function findDeterminismViolations(filePath: string, source: string): Violation[] {
  const sanitized = stripCommentsAndStrings(source);
  const lines = sanitized.split('\n');
  const violations: Violation[] = [];
  const nonDeterministicPattern = /\b(?:Math\.random|Date\.now|performance\.now)\s*\(/;

  for (let i = 0; i < lines.length; i += 1) {
    const lineText = lines[i] ?? '';
    if (nonDeterministicPattern.test(lineText)) {
      violations.push({
        file: filePath,
        line: i + 1,
        rule: 'deterministic-simulation',
        detail: `Unseeded randomness or wall-clock time is forbidden in domain/content on line ${i + 1}; use SeededRandom`,
      });
    }
  }

  return violations;
}

/**
 * Checks a single TypeScript source file for Clean Architecture inward dependency violations.
 */
export function findLayerImportViolations(relFilePath: string, source: string): Violation[] {
  const normalizedPath = relFilePath.split(sep).join('/');
  const imports = extractImports(source);
  const violations: Violation[] = [];

  const checkForbiddenSpecifiers = (
    layerName: string,
    forbiddenLayers: ReadonlyArray<string>,
    forbiddenPackages: ReadonlyArray<string>,
  ): void => {
    for (const imp of imports) {
      for (const pkg of forbiddenPackages) {
        if (imp.specifier === pkg || imp.specifier.startsWith(`${pkg}/`)) {
          violations.push({
            file: normalizedPath,
            line: imp.line,
            rule: `${layerName}-layer-boundary`,
            detail: `${layerName} must not import external package '${imp.specifier}'`,
          });
        }
      }

      for (const forbiddenLayer of forbiddenLayers) {
        const layerPattern = new RegExp(`(?:^|/)${forbiddenLayer}(?:/|$)`);
        if (layerPattern.test(imp.specifier)) {
          violations.push({
            file: normalizedPath,
            line: imp.line,
            rule: `${layerName}-layer-boundary`,
            detail: `${layerName} must not import outward layer '${forbiddenLayer}' via '${imp.specifier}'`,
          });
        }
      }
    }
  };

  if (normalizedPath.startsWith('src/domain/')) {
    checkForbiddenSpecifiers(
      'domain',
      ['application', 'infrastructure', 'interfaces', 'content'],
      ['three', '@huggingface/transformers'],
    );

    const sanitized = stripCommentsAndStrings(source);
    const domGlobalPattern = /\b(?:window|document|WebGLRenderingContext|HTMLCanvasElement)\b/;
    const lines = sanitized.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (domGlobalPattern.test(lines[i] ?? '')) {
        violations.push({
          file: normalizedPath,
          line: i + 1,
          rule: 'domain-no-dom-webgl',
          detail: `domain must not reference DOM or WebGL globals on line ${i + 1}`,
        });
      }
    }
  } else if (normalizedPath.startsWith('src/application/')) {
    checkForbiddenSpecifiers(
      'application',
      ['infrastructure', 'interfaces', 'content'],
      ['three', '@huggingface/transformers'],
    );
  } else if (normalizedPath.startsWith('src/infrastructure/')) {
    checkForbiddenSpecifiers('infrastructure', ['application', 'interfaces', 'content'], ['three']);
  } else if (
    normalizedPath.startsWith('src/content/') &&
    !normalizedPath.startsWith('src/content/scene/')
  ) {
    checkForbiddenSpecifiers(
      'content',
      ['infrastructure', 'interfaces'],
      ['three', '@huggingface/transformers'],
    );
  }

  return violations;
}

describe('Clean Architecture & Code Quality Guardrails', () => {
  it('enforces inward layer boundaries across all files in src/', () => {
    const srcFiles = collectTypeScriptFiles(SRC_ROOT);
    expect(srcFiles.length).toBeGreaterThanOrEqual(5);

    const allViolations: Violation[] = [];
    for (const absPath of srcFiles) {
      const relPath = relative(REPO_ROOT, absPath);
      const content = readFileSync(absPath, 'utf8');
      allViolations.push(...findLayerImportViolations(relPath, content));
    }

    expect(allViolations).toEqual([]);
  });

  it('forbids explicit any across all TypeScript files in src/ and tests/', () => {
    const allFiles = [...collectTypeScriptFiles(SRC_ROOT), ...collectTypeScriptFiles(TESTS_ROOT)];
    const allViolations: Violation[] = [];

    for (const absPath of allFiles) {
      const relPath = relative(REPO_ROOT, absPath);
      const content = readFileSync(absPath, 'utf8');
      allViolations.push(...findExplicitAnyViolations(relPath, content));
    }

    expect(allViolations).toEqual([]);
  });

  it('forbids unseeded Math.random() and Date.now() in src/domain/ and src/content/', () => {
    const targetFiles = [
      ...collectTypeScriptFiles(join(SRC_ROOT, 'domain')),
      ...collectTypeScriptFiles(join(SRC_ROOT, 'content')),
    ];
    const allViolations: Violation[] = [];

    for (const absPath of targetFiles) {
      const relPath = relative(REPO_ROOT, absPath);
      const content = readFileSync(absPath, 'utf8');
      allViolations.push(...findDeterminismViolations(relPath, content));
    }

    expect(allViolations).toEqual([]);
  });

  it('detects synthetic layer, explicit-any, and non-determinism violations accurately', () => {
    const forbiddenTypeWord = ['a', 'n', 'y'].join('');
    const syntheticAnySample = `const bad: ${forbiddenTypeWord} = 42;\n// comment with : ${forbiddenTypeWord} is ignored`;
    const anyViolations = findExplicitAnyViolations('src/domain/sample.ts', syntheticAnySample);
    expect(anyViolations).toHaveLength(1);
    expect(anyViolations[0]?.line).toBe(1);

    const syntheticLayerSample = `import { Scene } from 'three';\nimport { foo } from '../interfaces/index.js';`;
    const layerViolations = findLayerImportViolations('src/domain/sample.ts', syntheticLayerSample);
    expect(layerViolations).toHaveLength(2);

    const syntheticRandomSample = `const r = Math.random();`;
    const rngViolations = findDeterminismViolations('src/domain/sample.ts', syntheticRandomSample);
    expect(rngViolations).toHaveLength(1);
  });
});
