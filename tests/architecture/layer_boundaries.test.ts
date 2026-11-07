import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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

function lineNumberAtOffset(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

/**
 * Extracts all single-line and multi-line static/dynamic/side-effect module import/export specifiers
 * with their 1-based line numbers.
 */
export function extractImports(source: string): ReadonlyArray<{ specifier: string; line: number }> {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.replace(/[^\n]/g, ' '),
  );
  const results: Array<{ specifier: string; line: number }> = [];

  const patterns = [
    /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const regex of patterns) {
    regex.lastIndex = 0;
    let match = regex.exec(withoutComments);
    while (match !== null) {
      const specifier = match[1];
      if (specifier !== undefined) {
        results.push({
          specifier,
          line: lineNumberAtOffset(withoutComments, match.index),
        });
      }
      match = regex.exec(withoutComments);
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
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.replace(/[^\n]/g, ' '),
  );
  const lines = withoutComments.split('\n');
  const violations: Violation[] = [];
  const nonDeterministicPattern =
    /(?:\b(?:Math\.random|Date\.now|performance\.now)\s*\(|\bnew\s+Date\s*\(|\b(?:Math|Date|performance)\s*\[\s*['"](?:random|now)['"]\s*\])/;

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
      ['application', 'infrastructure', 'interfaces'],
      ['three', '@huggingface/transformers'],
    );
  } else if (normalizedPath.startsWith('src/content/scene/')) {
    checkForbiddenSpecifiers(
      'content-scene',
      ['application', 'infrastructure'],
      ['@huggingface/transformers'],
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

  it('detects single-line, multi-line, layer, explicit-any, and non-determinism violations across all layers', () => {
    const forbiddenTypeWord = ['a', 'n', 'y'].join('');
    const syntheticAnySample = `const bad: ${forbiddenTypeWord} = 42;\n// comment with : ${forbiddenTypeWord} is ignored`;
    const anyViolations = findExplicitAnyViolations('src/domain/sample.ts', syntheticAnySample);
    expect(anyViolations).toHaveLength(1);
    expect(anyViolations[0]?.line).toBe(1);

    const multilineLayerSample = [
      'import {',
      '  WebGLRenderer,',
      "} from 'three';",
      "import { foo } from '../interfaces/index.js';",
      'const el = window.document;',
    ].join('\n');
    const domainViolations = findLayerImportViolations(
      'src/domain/sample.ts',
      multilineLayerSample,
    );
    expect(domainViolations).toHaveLength(3);

    const appViolations = findLayerImportViolations(
      'src/application/useCase.ts',
      "import { worker } from '../infrastructure/index.js';",
    );
    expect(appViolations).toHaveLength(1);

    const infraViolations = findLayerImportViolations(
      'src/infrastructure/adapter.ts',
      "import { hud } from '../interfaces/index.js';",
    );
    expect(infraViolations).toHaveLength(1);

    const contentTopologyViolations = findLayerImportViolations(
      'src/content/worlds/highglass.ts',
      "import { Mesh } from 'three';",
    );
    expect(contentTopologyViolations).toHaveLength(1);

    const contentSceneAllowed = findLayerImportViolations(
      'src/content/scene/highglassScene.ts',
      "import { Mesh } from 'three';",
    );
    expect(contentSceneAllowed).toHaveLength(0);

    const syntheticRandomSample = [
      'const r1 = Math.random();',
      'const r2 = globalThis.Math["random"]();',
      'const d1 = new Date();',
    ].join('\n');
    const rngViolations = findDeterminismViolations('src/domain/sample.ts', syntheticRandomSample);
    expect(rngViolations).toHaveLength(3);
  });

  it('verifies master and per-section README.md and AGENTS.md exist and are linked from root', () => {
    const rootReadmePath = join(REPO_ROOT, 'README.md');
    const rootAgentsPath = join(REPO_ROOT, 'AGENTS.md');
    expect(existsSync(rootReadmePath)).toBe(true);
    expect(existsSync(rootAgentsPath)).toBe(true);

    const rootReadme = readFileSync(rootReadmePath, 'utf8');
    const rootAgents = readFileSync(rootAgentsPath, 'utf8');
    expect(rootReadme.trim().length).toBeGreaterThan(100);
    expect(rootAgents.trim().length).toBeGreaterThan(100);

    const requiredSections = [
      'src/domain',
      'src/application',
      'src/infrastructure',
      'src/content',
      'src/interfaces',
      'tests',
    ] as const;

    for (const section of requiredSections) {
      const sectionReadmeRel = `${section}/README.md`;
      const sectionAgentsRel = `${section}/AGENTS.md`;
      const sectionReadmeAbs = join(REPO_ROOT, sectionReadmeRel);
      const sectionAgentsAbs = join(REPO_ROOT, sectionAgentsRel);

      expect(existsSync(sectionReadmeAbs), `Missing ${sectionReadmeRel}`).toBe(true);
      expect(existsSync(sectionAgentsAbs), `Missing ${sectionAgentsRel}`).toBe(true);

      const sectionReadmeContent = readFileSync(sectionReadmeAbs, 'utf8');
      const sectionAgentsContent = readFileSync(sectionAgentsAbs, 'utf8');
      expect(sectionReadmeContent.trim().length).toBeGreaterThan(50);
      expect(sectionAgentsContent.trim().length).toBeGreaterThan(50);

      expect(rootReadme).toContain(sectionReadmeRel);
      expect(rootAgents).toContain(sectionAgentsRel);
    }
  });

  it('verifies ESLint, Prettier, editor format-on-save, and Husky pre-commit hook configurations', () => {
    const eslintConfigPath = join(REPO_ROOT, 'eslint.config.mjs');
    const prettierrcPath = join(REPO_ROOT, '.prettierrc.json');
    const vscodeSettingsPath = join(REPO_ROOT, '.vscode/settings.json');
    const huskyPreCommitPath = join(REPO_ROOT, '.husky/pre-commit');
    const packageJsonPath = join(REPO_ROOT, 'package.json');

    expect(existsSync(eslintConfigPath)).toBe(true);
    expect(existsSync(prettierrcPath)).toBe(true);
    expect(existsSync(vscodeSettingsPath)).toBe(true);
    expect(existsSync(huskyPreCommitPath)).toBe(true);

    const eslintConfigContent = readFileSync(eslintConfigPath, 'utf8');
    expect(eslintConfigContent).toContain("'@typescript-eslint/no-explicit-any': 'error'");
    expect(eslintConfigContent).toContain('no-restricted-syntax');

    const vscodeSettings = JSON.parse(readFileSync(vscodeSettingsPath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(vscodeSettings['editor.formatOnSave']).toBe(true);
    expect(vscodeSettings['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');

    const preCommitHook = readFileSync(huskyPreCommitPath, 'utf8');
    expect(preCommitHook).toContain('npx lint-staged');

    const pkgJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      'lint-staged'?: Record<string, ReadonlyArray<string>>;
    };
    const tsStagedCommands = pkgJson['lint-staged']?.['*.{ts,mjs}'];
    expect(tsStagedCommands).toEqual(['eslint --fix', 'prettier --write']);
  });

  it('verifies .agents/skills/uplift-debug/SKILL.md exists, forbids .cursor/skills, and documents log querying, compaction, save slots, and trace-and-fix workflow', () => {
    const forbiddenCursorSkillsDir = join(REPO_ROOT, '.cursor/skills');
    expect(
      existsSync(forbiddenCursorSkillsDir),
      'Skills must live in .agents/skills, never in .cursor/skills',
    ).toBe(false);

    const skillPath = join(REPO_ROOT, '.agents/skills/uplift-debug/SKILL.md');
    expect(existsSync(skillPath)).toBe(true);

    const skillContent = readFileSync(skillPath, 'utf8');
    expect(skillContent).toContain('name: uplift-debug');
    expect(skillContent).toContain('current-session.jsonl');
    expect(skillContent).toContain('current-session.compacted.jsonl');
    expect(skillContent).toContain('npm run logs:query');
    expect(skillContent).toContain('./saves/');
    expect(skillContent).toContain('Trace-and-Fix Debugging Workflow');
  });
});
