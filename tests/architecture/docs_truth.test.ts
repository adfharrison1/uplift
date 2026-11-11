import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { parse, stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const semver = require('semver') as { satisfies(version: string, range: string): boolean };
interface Problem {
  file: string;
  reference: string;
  rule: string;
}
interface Document {
  file: string;
  text: string;
}

function files(directory: string, discoveredDirectories: string[]): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      discoveredDirectories.push(path);
      return files(path, discoveredDirectories);
    }
    return entry.isFile() ? [path] : [];
  });
}

function budgetIssues(agents: string, context: string): Problem[] {
  const count = (value: string): number => value.trim().split(/\s+/).length;
  return [
    ...(count(agents) > 1050
      ? [{ file: 'AGENTS.md', reference: String(count(agents)), rule: 'budget' }]
      : []),
    ...(count(context) >= 1500
      ? [{ file: 'openspec/config.yaml', reference: String(count(context)), rule: 'budget' }]
      : []),
  ];
}

function indexIssues(
  documents: Document[],
  roadmap: ReadonlySet<string>,
  designFiles: string[],
  index: string,
): Problem[] {
  const issues: Problem[] = [];
  for (const { file, text } of documents) {
    for (const match of text.matchAll(/\(planned:\s*([^)]*)\)/g)) {
      const marker = (match[1] ?? '').trim();
      if (marker === '<roadmap id>') continue;
      const [list = '', ...annotations] = marker.split(';');
      for (const part of list.replace(/,\s+and\s+/g, ', ').split(/,|\s+and\s+/)) {
        const segment = part.trim();
        const item = segment.match(/^([a-z0-9][a-z0-9_-]*)(?: for the [a-z ]+)?$/);
        if (!item) issues.push({ file, reference: segment, rule: 'ambiguous roadmap marker' });
        else if (!roadmap.has(item[1] ?? ''))
          issues.push({ file, reference: item[1] ?? '', rule: 'roadmap' });
      }
      for (const annotation of annotations) {
        for (const reference of annotation.matchAll(
          /`([a-z0-9][a-z0-9_-]*)`|\bchange\s+([a-z0-9][a-z0-9_-]*)\b/gi,
        )) {
          const id = reference[1] ?? reference[2] ?? '';
          if (!roadmap.has(id)) issues.push({ file, reference: id, rule: 'roadmap' });
        }
      }
    }
  }
  const rows = new Set(
    [...index.matchAll(/^\|[^\n]*`(design\/[^`]+\.md)`[^\n]*\|/gm)].map((match) => match[1]),
  );
  for (const file of designFiles)
    if (file !== 'design/README.md' && !rows.has(file))
      issues.push({ file: 'DESIGN_NOTES.md', reference: file, rule: 'design index' });
  return issues;
}

function citationIssues(documents: Document[], ids: ReadonlySet<string>): Problem[] {
  const issues: Problem[] = [];
  for (const { file, text } of documents) {
    for (const id of ids) {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = id.includes('-')
        ? `(?<![\\w-])${escaped}(?![\\w-])`
        : `(?:\u0060${escaped}\u0060|\\bchange\\s+${escaped}\\b)`;
      if (new RegExp(pattern, 'i').test(text))
        issues.push({ file, reference: id, rule: 'change citation' });
    }
    for (const match of text.matchAll(/\bChange\s+#?\d+\b/gi))
      issues.push({ file, reference: match[0], rule: 'numbered change' });
  }
  return issues;
}

function comments(text: string): string {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text,
  );
  const result: string[] = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    )
      result.push(scanner.getTokenText());
  }
  return result.join('\n');
}

interface SourceIndex {
  symbols: Set<string>;
  fields: Set<string>;
  values: Set<string>;
  fieldValues: Map<string, Set<string>[]>;
  members: Map<string, Set<string>>;
  shapes: Map<string, Map<string, { type: string; optional: boolean }>>;
  commands: Map<string, Set<string>>;
}
function sourceIndex(sources: readonly string[]): SourceIndex {
  const index: SourceIndex = {
    symbols: new Set(),
    fields: new Set(),
    values: new Set(),
    fieldValues: new Map(),
    members: new Map(),
    shapes: new Map(),
    commands: new Map(),
  };
  for (const text of sources) {
    const file = ts.createSourceFile(
      'source.ts',
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const aliases = new Map<string, ts.Expression>();
    for (const statement of file.statements)
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          if (ts.isIdentifier(declaration.name) && declaration.initializer)
            aliases.set(declaration.name.text, declaration.initializer);
    const schemaType = (
      expression: ts.Expression,
      seen = new Set<string>(),
    ): { type: string; optional: boolean } => {
      if (ts.isIdentifier(expression)) {
        const alias = aliases.get(expression.text);
        if (alias && !seen.has(expression.text))
          return schemaType(alias, new Set([...seen, expression.text]));
      }
      if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
        const method = expression.expression.name.text;
        const base = expression.expression.expression;
        if (
          ts.isIdentifier(base) &&
          base.text === 'z' &&
          ['string', 'number', 'boolean'].includes(method)
        )
          return { type: method, optional: false };
        const inner = schemaType(base, seen);
        return { ...inner, optional: inner.optional || method === 'optional' };
      }
      return { type: 'unsupported', optional: false };
    };
    const visit = (node: ts.Node): void => {
      const exported =
        ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (
        exported &&
        (ts.isClassDeclaration(node) ||
          ts.isFunctionDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node))
      ) {
        if (node.name) index.symbols.add(node.name.text);
      }
      if (exported && ts.isClassDeclaration(node) && node.name) {
        const members = new Set<string>();
        for (const member of node.members) {
          const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
          if (
            modifiers?.some(
              (modifier) =>
                modifier.kind === ts.SyntaxKind.PrivateKeyword ||
                modifier.kind === ts.SyntaxKind.ProtectedKeyword,
            )
          )
            continue;
          if (member.name && ts.isIdentifier(member.name)) members.add(member.name.text);
        }
        index.members.set(node.name.text, members);
      }
      if (exported && ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations)
          if (ts.isIdentifier(declaration.name)) index.symbols.add(declaration.name.text);
      }
      if (ts.isExportSpecifier(node)) index.symbols.add(node.name.text);
      if (
        ts.isPropertyAssignment(node) ||
        ts.isPropertySignature(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isMethodSignature(node)
      ) {
        if (node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)))
          index.fields.add(node.name.text);
      }
      if (
        ts.isPropertyAssignment(node) &&
        (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
      ) {
        const literals = new Set<string>();
        const collect = (item: ts.Node): void => {
          if (ts.isStringLiteral(item) || ts.isNumericLiteral(item)) literals.add(item.text);
          ts.forEachChild(item, collect);
        };
        collect(node.initializer);
        if (literals.size) {
          const values = index.fieldValues.get(node.name.text) ?? [];
          values.push(literals);
          index.fieldValues.set(node.name.text, values);
        }
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'specs' &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        for (const property of node.initializer.properties)
          if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
            const flags = new Set<string>();
            const collect = (item: ts.Node): void => {
              if (ts.isStringLiteral(item) && item.text.startsWith('--')) flags.add(item.text);
              ts.forEachChild(item, collect);
            };
            collect(property.initializer);
            index.commands.set(property.name.text, flags);
          }
      }
      if (
        ts.isIfStatement(node) &&
        ts.isBinaryExpression(node.expression) &&
        ts.isIdentifier(node.expression.left) &&
        ['command', 'group'].includes(node.expression.left.text) &&
        ts.isStringLiteral(node.expression.right)
      ) {
        const flags = new Set<string>();
        const collect = (item: ts.Node): void => {
          if (
            ts.isCallExpression(item) &&
            ts.isIdentifier(item.expression) &&
            item.expression.text === 'options'
          ) {
            const argument = item.arguments[1];
            if (argument && ts.isArrayLiteralExpression(argument))
              for (const value of argument.elements)
                if (ts.isStringLiteral(value) && value.text.startsWith('--')) flags.add(value.text);
          }
          ts.forEachChild(item, collect);
        };
        collect(node.thenStatement);
        if (flags.size) index.commands.set(node.expression.right.text, flags);
      }
      if (
        ts.isBinaryExpression(node) &&
        ts.isIdentifier(node.left) &&
        node.left.text === 'mode' &&
        ts.isStringLiteral(node.right) &&
        node.right.text.startsWith('--')
      ) {
        const flags = index.commands.get('change:archive') ?? new Set<string>();
        flags.add(node.right.text);
        index.commands.set('change:archive', flags);
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        ['locatorSchema', 'fixSchema'].includes(node.name.text) &&
        node.initializer
      ) {
        const collect = (item: ts.Node): void => {
          if (
            ts.isCallExpression(item) &&
            ts.isPropertyAccessExpression(item.expression) &&
            item.expression.name.text === 'object' &&
            item.arguments[0] &&
            ts.isObjectLiteralExpression(item.arguments[0])
          ) {
            const shape = new Map<string, { type: string; optional: boolean }>();
            let kind = '';
            for (const property of item.arguments[0].properties)
              if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
                const key = property.name.text;
                if (
                  key === 'kind' &&
                  ts.isCallExpression(property.initializer) &&
                  property.initializer.arguments[0] &&
                  ts.isStringLiteral(property.initializer.arguments[0])
                )
                  kind = property.initializer.arguments[0].text;
                else shape.set(key, schemaType(property.initializer));
              } else shape.set('<unsupported property>', { type: 'unsupported', optional: false });
            if (kind) index.shapes.set(kind, shape);
          }
          ts.forEachChild(item, collect);
        };
        collect(node.initializer);
      }
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        index.values.add(node.text);
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return index;
}

function versionIssues(
  readme: string,
  versions: Readonly<Record<string, string>>,
  pin: string,
  engine: string,
): Problem[] {
  const issues: Problem[] = [];
  for (const [name, version] of Object.entries(versions)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `(?<![\\w@/-])${escaped}\\s+(?:v|version\\s*)?(\\d+\\.\\d+\\.\\d+)`,
      'gi',
    );
    const pinned = version.match(/(?:^|@)(\d+\.\d+\.\d+)$/)?.[1] ?? version;
    for (const match of readme.matchAll(pattern))
      if (match[1] !== pinned)
        issues.push({ file: 'README.md', reference: match[0], rule: 'version' });
  }
  if (!semver.satisfies(pin.trim().replace(/^v/, ''), engine))
    issues.push({ file: '.nvmrc', reference: `${pin.trim()} / ${engine}`, rule: 'engine' });
  return issues;
}

function numericIssues(
  text: string,
  limits: { maxOutputBytes: number; graceMs: number },
  file = 'AGENTS.md',
): Problem[] {
  const issues: Problem[] = [];
  for (const sentence of text.split(/(?<!\d)\.(?!\d)|[!?\n]/)) {
    const quantities = [...sentence.matchAll(/\b(\d+(?:\.\d+)?)\s*([A-Za-z]+)\b/gi)];
    const choose = (
      concept: RegExp,
      factors: Record<string, number>,
      unrelated: Record<string, number>,
    ): RegExpMatchArray | undefined => {
      const target = sentence.search(concept);
      if (target < 0) return undefined;
      const candidates = quantities.filter(
        (item) => unrelated[(item[2] ?? '').toLowerCase()] === undefined,
      );
      const recognized = candidates.filter(
        (item) => factors[(item[2] ?? '').toLowerCase()] !== undefined,
      );
      return (recognized.length ? recognized : candidates).sort(
        (first, second) =>
          Math.abs((first.index ?? 0) - target) - Math.abs((second.index ?? 0) - target),
      )[0];
    };
    const sizeFactors: Record<string, number> = { mib: 1024 * 1024, kib: 1024, bytes: 1, byte: 1 };
    const timeFactors: Record<string, number> = {
      ms: 1,
      millisecond: 1,
      milliseconds: 1,
      s: 1000,
      second: 1000,
      seconds: 1000,
    };
    const output = choose(/\boutput\b/i, sizeFactors, timeFactors);
    if (/\boutput\b/i.test(sentence) && output) {
      const factor = sizeFactors[output[2]?.toLowerCase() ?? ''];
      if (factor === undefined || Number(output[1]) * factor !== limits.maxOutputBytes)
        issues.push({ file, reference: sentence.trim(), rule: 'output limit' });
    }
    const grace = choose(/\bescalat\w*\b|\bgrace\b/i, timeFactors, sizeFactors);
    if (/\bescalat\w*\b|\bgrace\b/i.test(sentence) && grace) {
      const factor = timeFactors[grace[2]?.toLowerCase() ?? ''];
      if (factor === undefined || Number(grace[1]) * factor !== limits.graceMs)
        issues.push({ file, reference: sentence.trim(), rule: 'grace period' });
    }
  }
  return issues;
}

// Built-in language terms and external tools are not project-defined identifiers.
const builtins = new Set([
  'any',
  'nvm use',
  'npx lint-staged',
  'prettier --check .',
  'prettier --write .',
  'tsc --noEmit',
  'eslint src tests vitest.config.ts vite.config.ts eslint.config.mjs scripts',
  'dbaeumer.vscode-eslint',
  'esbenp.prettier-vscode',
]);
function referenceIssues(
  documents: Document[],
  scripts: ReadonlySet<string>,
  sources: readonly string[],
  paths: ReadonlySet<string>,
  configKeys: ReadonlySet<string> = new Set(),
): Problem[] {
  const issues: Problem[] = [];
  const index = sourceIndex(sources);
  const fieldAccepts = (key: string, value: string): boolean => {
    const sets = index.fieldValues.get(key) ?? [];
    const variants = new Set(sets.map((values) => [...values].sort().join('\0')));
    return variants.size === 1 && sets[0]?.has(value) === true;
  };
  const includesValue = (value: string): boolean =>
    [...index.values].some((entry) => entry.includes(value));
  const checkCommand = (file: string, value: string, command: string, flags: string[]): void => {
    const allowed = index.commands.get(command);
    if (!allowed) issues.push({ file, reference: value, rule: 'command' });
    else
      for (const flag of flags)
        if (!allowed.has(flag)) issues.push({ file, reference: flag, rule: 'option' });
  };
  for (const { file, text } of documents) {
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = (match[1] ?? '').split('#')[0] ?? '';
      if (target && !/^(?:https?:|mailto:)/.test(target) && !paths.has(target.replace(/\/$/, '')))
        issues.push({ file, reference: target, rule: 'link' });
    }
    for (const match of text.matchAll(/`([^`\n]+)`/g)) {
      const value = (match[1] ?? '').trim();
      if (builtins.has(value) || value.startsWith('/opsx-') || value === '/root-and-branch-review')
        continue;
      if (value.startsWith('npm run ')) {
        const parts = value.split(/\s+/);
        const script = parts[2] ?? '';
        if (!scripts.has(script)) issues.push({ file, reference: value, rule: 'npm script' });
        else if (script === 'defects' && parts.length > 3)
          checkCommand(
            file,
            value,
            parts[parts.indexOf('--') + 1] ?? '',
            parts.slice(parts.indexOf('--') + 2).filter((part) => part.startsWith('--')),
          );
        else if (script === 'roadmap:next' && parts.length > 3)
          checkCommand(
            file,
            value,
            'roadmap',
            parts.slice(3).filter((part) => part.startsWith('--') && part !== '--'),
          );
        else if (script === 'change:archive' && parts.length > 3)
          checkCommand(
            file,
            value,
            'change:archive',
            parts.slice(3).filter((part) => part.startsWith('--') && part !== '--'),
          );
        continue;
      }
      if (value.startsWith('{')) {
        try {
          const object: unknown = JSON.parse(value);
          if (typeof object !== 'object' || object === null || Array.isArray(object))
            throw new Error('not an object');
          const record = object as Record<string, unknown>;
          if ('kind' in record) {
            const shape =
              typeof record.kind === 'string' ? index.shapes.get(record.kind) : undefined;
            if (!shape) issues.push({ file, reference: value, rule: 'schema discriminant' });
            else {
              for (const [key, descriptor] of shape)
                if (
                  descriptor.type === 'unsupported' ||
                  (record[key] === undefined
                    ? !descriptor.optional
                    : typeof record[key] !== descriptor.type)
                )
                  issues.push({
                    file,
                    reference: `${value}: ${key}`,
                    rule: 'schema required field or type',
                  });
              for (const key of Object.keys(record))
                if (key !== 'kind' && !shape.has(key))
                  issues.push({ file, reference: `${value}: ${key}`, rule: 'schema field' });
            }
          } else
            for (const [key, literal] of Object.entries(record)) {
              if (!fieldAccepts(key, String(literal)))
                issues.push({
                  file,
                  reference: `${value}: ${key}`,
                  rule: 'schema value or ambiguous field',
                });
            }
        } catch {
          issues.push({ file, reference: value, rule: 'JSON example' });
        }
        continue;
      }
      if (value.includes(' -> ')) continue;
      if (value.startsWith('defects reopen ')) {
        checkCommand(file, value, 'reopen', value.match(/--[\w-]+/g) ?? []);
        continue;
      }
      if (value.startsWith('--')) {
        const flag = value.split(/\s+/)[0] ?? value;
        const start = text.lastIndexOf('\n\n', match.index);
        const end = text.indexOf('\n\n', match.index);
        const paragraph = text.slice(start < 0 ? 0 : start + 2, end < 0 ? text.length : end);
        const commands = [...index.commands.keys()].filter(
          (command) =>
            paragraph.includes(command) ||
            (command === 'change:archive' && /archive/i.test(paragraph)),
        );
        if (!commands.some((command) => index.commands.get(command)?.has(flag)))
          issues.push({ file, reference: value, rule: 'option' });
        continue;
      }
      if (value.startsWith('/api/')) {
        if (!includesValue(value)) issues.push({ file, reference: value, rule: 'route' });
        continue;
      }
      if (value.includes('/') || /\.(?:jsonl?|yaml|md)$/.test(value)) {
        if (!paths.has(value.replace(/\/$/, '')) && !includesValue(value) && !configKeys.has(value))
          issues.push({ file, reference: value, rule: 'path' });
        continue;
      }
      const symbol = value.match(/^[A-Za-z_$][\w$-]*/)?.[0];
      if (configKeys.has(value)) continue;
      const member = value.match(/^([A-Z][\w$]*)\.([A-Za-z_$][\w$]*)\s*(?:\(.*\))?$/);
      if (member) {
        if (!index.members.get(member[1] ?? '')?.has(member[2] ?? ''))
          issues.push({ file, reference: value, rule: 'member' });
        continue;
      }
      if (value.includes(': ')) {
        const [key, literal] = value.split(': ');
        if (!key || !literal || !fieldAccepts(key, literal))
          issues.push({ file, reference: value, rule: 'schema value' });
      } else if (
        symbol &&
        !index.symbols.has(symbol) &&
        (/^[A-Z]/.test(symbol) ||
          (!index.fields.has(symbol) &&
            (!/^[a-z][a-z0-9_-]*$/.test(symbol) || !index.values.has(symbol))))
      )
        issues.push({ file, reference: value, rule: 'identifier' });
    }
  }
  return issues;
}

function skillIssues(
  names: readonly string[],
  guide: string,
  existing: ReadonlySet<string>,
  linkTarget: string | null,
): Problem[] {
  const issues: Problem[] = [];
  for (const name of names) {
    const path = `.agents/skills/${name}/SKILL.md`;
    if (!existing.has(path) || !guide.includes(path))
      issues.push({ file: 'AGENTS.md', reference: path, rule: 'skill link' });
  }
  for (const match of guide.matchAll(/\.agents\/skills\/[\w-]+\/SKILL\.md/g)) {
    if (!existing.has(match[0]))
      issues.push({ file: 'AGENTS.md', reference: match[0], rule: 'missing linked skill' });
  }
  if (linkTarget !== '.agents/skills/root-and-branch-review')
    issues.push({
      file: '.claude/skills/root-and-branch-review',
      reference: String(linkTarget),
      rule: 'skill symlink',
    });
  return issues;
}

interface Evidence {
  fix_ref: unknown;
  tests: { locator: unknown }[];
  reviews: { locator: unknown }[];
  supplementary?: unknown[];
}
interface Project {
  root: string;
  roadmap: { entries: { id: string; depends_on: string[]; status: string }[] };
  inventory: { active: string[]; archives: string[] };
  ledger: {
    entries: {
      fixing_change: string | null;
      history: {
        before: { fixing_change: string | null } | null;
        after: { fixing_change: string | null };
      }[];
    }[];
  };
}
interface StatusModule {
  readProject(path: string): Project;
  readReceipts(path: string, inventory: Project['inventory']): unknown[];
  createReferenceChecker(
    path: string,
    inventory: Project['inventory'],
  ): (reference: unknown) => void;
  validateGraph(roadmap: unknown, inventory: unknown, reference: (value: unknown) => void): void;
  validateLedger(
    ledger: unknown,
    roadmap: unknown,
    inventory: unknown,
    options: { checkEvidence: (evidence: Evidence) => void },
  ): void;
  reconcileProject(
    project: Project,
    receipts: unknown[],
    journal: unknown,
  ): { ok: boolean; diagnostics: string[] };
  digest(bytes: string): string;
  canonical(value: unknown): string;
}
function projectIssues(
  status: StatusModule,
  project: Project,
  receipts: unknown[],
  journal: unknown,
): string[] {
  try {
    const reconciled = status.reconcileProject(project, receipts, journal);
    if (!reconciled.ok) return reconciled.diagnostics;
    const reference = status.createReferenceChecker(project.root, project.inventory);
    status.validateGraph(project.roadmap, project.inventory, reference);
    status.validateLedger(project.ledger, project.roadmap, project.inventory, {
      checkEvidence: (evidence) => {
        reference(evidence.fix_ref);
        for (const item of [...evidence.tests, ...evidence.reviews]) reference(item.locator);
        for (const item of evidence.supplementary ?? []) reference(item);
      },
    });
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

describe('documentation truth helpers', () => {
  it('rejects contextual schema, command and member mismatches', () => {
    const source = `export class ExampleClass { method() {} };
      const alpha = {state: "ready"}; const beta = {mode: "pending"};
      const locatorSchema = z.discriminatedUnion('kind', [z.object({kind: z.literal('repo'), path: z.string(), sha256: z.string()}).strict()]);
      const specs = { reopen: [1, ['--new-id', '--owner']] };`;
    const rejected = [
      '`state: pending`',
      '`{"kind":"repo","path":42}`',
      '`{"kind":"repo","path":"x"}`',
      '`{"kind":"unknown","path":"x"}`',
      '`ExampleClass.missingMethod()`',
      '`--block`',
      '`npm run defects -- frobnicate`',
      '`npm run defects -- reopen OLD --block`',
    ];
    for (const value of rejected)
      expect(
        referenceIssues(
          [{ file: 'README.md', text: value }],
          new Set(['defects']),
          [source],
          new Set(),
        ),
        value,
      ).not.toEqual([]);
    for (const value of [
      '`state: ready`',
      '`ExampleClass.method()`',
      '`{"kind":"repo","path":"x","sha256":"abc"}`',
      '`npm run defects -- reopen OLD --new-id NEW --owner example`',
    ])
      expect(
        referenceIssues(
          [{ file: 'README.md', text: value }],
          new Set(['defects']),
          [source],
          new Set(),
        ),
        value,
      ).toEqual([]);
    expect(
      referenceIssues(
        [{ file: 'README.md', text: '`npm run defects`' }],
        new Set(['defects']),
        [source],
        new Set(),
      ),
    ).toEqual([]);
    expect(
      referenceIssues(
        [{ file: 'README.md', text: '`state: pending`' }],
        new Set(),
        ['const a = {state: "ready"}; const b = {state: "pending"}'],
        new Set(),
      ),
    ).not.toEqual([]);
    const changedSchema = `const pathSchema = z.number(); const locatorSchema = z.object({kind: z.literal('repo'), path: pathSchema});`;
    expect(
      referenceIssues(
        [{ file: 'README.md', text: '`{"kind":"repo","path":42}`' }],
        new Set(),
        [changedSchema],
        new Set(),
      ),
    ).toEqual([]);
    expect(
      referenceIssues(
        [{ file: 'README.md', text: '`{"kind":"repo","path":"x"}`' }],
        new Set(),
        [changedSchema],
        new Set(),
      ),
    ).not.toEqual([]);
    expect(
      referenceIssues(
        [{ file: 'README.md', text: '`{"kind":"repo","path":"x"}`' }],
        new Set(),
        [`const locatorSchema = z.object({kind: z.literal('repo'), path: externalSchema});`],
        new Set(),
      ),
    ).not.toEqual([]);
    expect(
      referenceIssues(
        [{ file: 'README.md', text: '`{"kind":"repo","path":"x"}`' }],
        new Set(),
        [
          `const locatorSchema = z.object({kind: z.literal('repo'), path: z.string(), ...otherFields});`,
        ],
        new Set(),
      ),
    ).not.toEqual([]);
  });
  it('checks decimal and unsupported numeric claims in each root guide', () => {
    const limits = { maxOutputBytes: 1048576, graceMs: 500 };
    for (const file of ['README.md', 'AGENTS.md']) {
      expect(numericIssues('The output limit is 1.5 MiB.', limits, file)).toMatchObject([{ file }]);
      expect(numericIssues('The output limit is 1 gigabyte.', limits, file)).toMatchObject([
        { file },
      ]);
      expect(numericIssues('The grace period is 2 hours.', limits, file)).toMatchObject([{ file }]);
      expect(numericIssues('After 501 ms the escalation begins.', limits, file)).toMatchObject([
        { file },
      ]);
      expect(numericIssues('After 500 milliseconds the escalation begins.', limits, file)).toEqual(
        [],
      );
      expect(numericIssues('At 2 MiB the output is capped.', limits, file)).toMatchObject([
        { file },
      ]);
      expect(numericIssues('At 1024 KiB the output is capped.', limits, file)).toEqual([]);
      expect(
        numericIssues('The output limit is 1 MiB and escalation takes 0.5 seconds.', limits, file),
      ).toEqual([]);
    }
  });
  it('rejects missing IDs after conjunctions and explanatory text', () => {
    for (const text of [
      '(planned: valid and bogus)',
      '(planned: valid and contracts)',
      '(planned: valid; no change bogus exists)',
      '(planned: valid; no `bogus` exists)',
      '(planned: valid for the runtime, bogus for the fuse)',
    ])
      expect(
        indexIssues([{ file: 'design/a.md', text }], new Set(['valid']), [], ''),
        text,
      ).not.toEqual([]);
    expect(
      indexIssues(
        [{ file: 'design/a.md', text: '(planned: valid; no bogus exists)' }],
        new Set(['valid']),
        [],
        '',
      ),
    ).toEqual([]);
  });
  it('checks budgets at the boundary', () => {
    expect(budgetIssues('x '.repeat(1050), 'x '.repeat(1499))).toEqual([]);
    expect(budgetIssues('x '.repeat(1051), 'x '.repeat(1500))).toHaveLength(2);
  });
  it('checks planned references and feature index rows while exempting navigation', () => {
    const roadmap = new Set(['example-plan']);
    expect(
      indexIssues(
        [{ file: 'design/a.md', text: '(planned: example-plan)' }],
        roadmap,
        ['design/a.md', 'design/README.md'],
        '| `design/a.md` | planned |',
      ),
    ).toEqual([]);
    expect(
      indexIssues(
        [{ file: 'design/a.md', text: '(planned: missing-plan)' }],
        roadmap,
        ['design/a.md'],
        '| other |',
      ),
    ).toHaveLength(2);
    expect(
      indexIssues([{ file: 'design/a.md', text: '(planned: missing)' }], roadmap, [], ''),
    ).toHaveLength(1);
  });
  it('rejects exact known citations and numbered changes but accepts commands and prose', () => {
    const ids = new Set(['synthetic-plan']);
    expect(
      citationIssues(
        [{ file: 'README.md', text: 'Change the flow; `/opsx-propose`; onboarding.' }],
        new Set([...ids, 'onboarding']),
      ),
    ).toEqual([]);
    expect(
      citationIssues([{ file: 'README.md', text: 'synthetic-plan and Change 42' }], ids),
    ).toHaveLength(2);
    expect(comments('const value = "synthetic-plan"; // Change 42')).toContain('Change 42');
    expect(comments('const value = "synthetic-plan";')).not.toContain('synthetic-plan');
  });
  it('compares package versions and checks Node against the engine range', () => {
    expect(versionIssues('vite 8.3.5', { vite: '8.3.5' }, 'v24.22.2', '>=24.0.0')).toEqual([]);
    expect(versionIssues('vite 8.3.4', { vite: '8.3.5' }, 'v23.0.0', '>=24.0.0')).toHaveLength(2);
    expect(
      versionIssues(
        'typescript 6.0.2; @types/node 24.19.2',
        { typescript: 'npm:@typescript/typescript6@6.0.2', '@types/node': '24.19.2' },
        'v24.22.2',
        '>=24.0.0',
      ),
    ).toEqual([]);
    expect(
      versionIssues('@types/node 24.19.1', { '@types/node': '24.19.2' }, 'v24.22.2', '>=24.0.0'),
    ).toHaveLength(1);
  });
  it('requires existing linked skills and the correct Claude symlink', () => {
    const path = '.agents/skills/example/SKILL.md';
    expect(
      skillIssues(['example'], path, new Set([path]), '.agents/skills/root-and-branch-review'),
    ).toEqual([]);
    expect(skillIssues(['example'], 'missing', new Set(), 'wrong')).toHaveLength(2);
    expect(skillIssues([], path, new Set(), '.agents/skills/root-and-branch-review')).toHaveLength(
      1,
    );
  });
  it('binds numeric runner claims to canonical limits', () => {
    const limits = { maxOutputBytes: 1048576, graceMs: 500 };
    expect(
      numericIssues('caps captured output at 1 MiB; forced escalation after 500 ms', limits),
    ).toEqual([]);
    expect(
      numericIssues('caps captured output at 2 MiB; forced escalation after 501 ms', limits),
    ).toHaveLength(2);
    expect(
      numericIssues('The output limit is 1024 KiB. The grace period is 500 ms.', limits),
    ).toEqual([]);
    expect(
      numericIssues('The output limit is 5 KiB. The grace period is 20 ms.', limits),
    ).toHaveLength(2);
  });
  it('resolves referenced paths, symbols and commands and rejects plausible missing names', () => {
    const documents = [
      { file: 'AGENTS.md', text: '`ExampleClass` `src/live.ts` `npm run verify`' },
    ];
    expect(
      referenceIssues(
        documents,
        new Set(['verify']),
        ['export class ExampleClass {}'],
        new Set(['src/live.ts']),
      ),
    ).toEqual([]);
    expect(
      referenceIssues(
        [{ file: 'AGENTS.md', text: '`ExampleClas` `src/missing.ts` `npm run verif`' }],
        new Set(['verify']),
        ['export class ExampleClass {}'],
        new Set(['src/live.ts']),
      ),
    ).toHaveLength(3);
    expect(
      referenceIssues(
        [{ file: 'AGENTS.md', text: '`MissingClass`' }],
        new Set(),
        [
          '// MissingClass\nconst MissingClass = 1; const x = "MissingClass"; const schema = { MissingClass: true }',
        ],
        new Set(),
      ),
    ).toHaveLength(1);
    expect(
      referenceIssues(
        [
          {
            file: 'AGENTS.md',
            text: '`{"missing_field": "example"}` `defects reopen OLD --missing-option X`',
          },
        ],
        new Set(),
        ['const schema = {known_field: "reopen"}'],
        new Set(),
      ),
    ).toHaveLength(2);
    expect(
      referenceIssues(
        [{ file: 'README.md', text: '[guide](src/absent.md)' }],
        new Set(),
        [],
        new Set(),
      ),
    ).toHaveLength(1);
  });
});

describe('live documentation truth', () => {
  const directories = ['.agents', 'src', 'tests', 'scripts', 'design', 'agent'] as const;
  const discoveredDirectories: string[] = [];
  const inventory = Object.fromEntries(
    directories.map((directory) => [directory, files(directory, discoveredDirectories)]),
  ) as Record<(typeof directories)[number], string[]>;
  const documents = new Map<string, string>();
  const read = (path: string): string => {
    const cached = documents.get(path);
    if (cached !== undefined) return cached;
    const text = readFileSync(join(root, path), 'utf8');
    documents.set(path, text);
    return text;
  };
  const guides = ['README.md', 'AGENTS.md'].map((file) => ({ file, text: read(file) }));
  const sourceFiles = [...inventory.src, ...inventory.scripts, ...inventory.tests].filter((file) =>
    /\.(?:ts|mjs)$/.test(file),
  );
  const projectSource = [...inventory.src, ...inventory.scripts]
    .filter((file) => /\.(?:ts|mjs)$/.test(file))
    .map(read);
  const packageJson = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    engines: { node: string };
  };
  const roadmap = parse(read('openspec/roadmap.yaml')) as { entries: { id: string }[] };
  const ids = new Set(roadmap.entries.map((entry) => entry.id));
  it('resolves root references and npm scripts', () => {
    const paths = new Set([
      'README.md',
      'AGENTS.md',
      ...readdirSync(root),
      ...inventory['.agents'],
      ...inventory.src,
      ...inventory.tests,
      ...inventory.scripts,
      '.husky/pre-commit',
      '.vscode/settings.json',
      'src/content',
      'tests',
    ]);
    for (const guide of guides) {
      for (const match of guide.text.matchAll(/(?:`|\]\()(openspec\/[^`)\s#]+)/g)) {
        const path = match[1] ?? '';
        const absolute = join(root, path);
        if (
          existsSync(absolute) &&
          lstatSync(absolute).isFile() &&
          realpathSync(absolute) === join(realpathSync(root), path)
        )
          paths.add(path);
      }
    }
    expect(
      referenceIssues(
        guides,
        new Set(Object.keys(packageJson.scripts)),
        projectSource,
        paths,
        new Set(Object.keys(JSON.parse(read('.vscode/settings.json')) as object)),
      ),
    ).toEqual([]);
  });
  it('enforces budgets, current versions and runner limits', () => {
    const config = parse(read('openspec/config.yaml')) as { context: string };
    expect(budgetIssues(read('AGENTS.md'), config.context)).toEqual([]);
    expect(
      versionIssues(
        read('README.md'),
        { ...packageJson.dependencies, ...packageJson.devDependencies },
        read('.nvmrc'),
        packageJson.engines.node,
      ),
    ).toEqual([]);
    const runner =
      read('scripts/verify.mjs').split('export async function runVerification')[1] ?? '';
    const output = runner.match(/maxOutputBytes\s*=\s*(\d+)\s*\*\s*(\d+)/);
    const grace = runner.match(/graceMs\s*=\s*(\d+)/);
    expect(output).not.toBeNull();
    expect(grace).not.toBeNull();
    for (const guide of guides)
      expect(
        numericIssues(
          guide.text,
          {
            maxOutputBytes: Number(output?.[1]) * Number(output?.[2]),
            graceMs: Number(grace?.[1]),
          },
          guide.file,
        ),
      ).toEqual([]);
  });
  it('resolves planned markers and indexes each feature design', () => {
    const designFiles = inventory.design.filter((file) => file.endsWith('.md'));
    const docs = ['DESIGN_NOTES.md', ...designFiles].map((file) => ({ file, text: read(file) }));
    expect(indexIssues(docs, ids, designFiles, read('DESIGN_NOTES.md'))).toEqual([]);
  });
  it('restricts live change citations without scanning immutable reviews', () => {
    const docs = [
      ...guides,
      ...inventory.src,
      ...inventory.tests,
      ...inventory['.agents'],
      ...inventory.agent,
    ]
      .filter(
        (entry): entry is string | Document => typeof entry !== 'string' || entry.endsWith('.md'),
      )
      .map((entry) => (typeof entry === 'string' ? { file: entry, text: read(entry) } : entry));
    const sourceComments = sourceFiles.map((file) => ({ file, text: comments(read(file)) }));
    expect(citationIssues([...docs, ...sourceComments], ids)).toEqual([]);
  });
  it('links every project skill and preserves the Claude skill symlink', () => {
    const skills = discoveredDirectories
      .filter((directory) => /^\.agents\/skills\/[^/]+$/.test(directory))
      .map((directory) => directory.slice('.agents/skills/'.length));
    const link = join(root, '.claude/skills/root-and-branch-review');
    const target =
      existsSync(link) && lstatSync(link).isSymbolicLink()
        ? relative(root, realpathSync(link))
        : null;
    const existing = new Set(
      skills
        .map((name) => `.agents/skills/${name}/SKILL.md`)
        .filter((path) => existsSync(join(root, path))),
    );
    expect(skillIssues(skills, read('AGENTS.md'), existing, target)).toEqual([]);
    expect(existsSync(join(root, '.cursor/skills'))).toBe(false);
  });
  it('runs the shared graph, ledger and reconciliation validators in process', async () => {
    const path = join(root, 'scripts/project-status.mjs');
    const status = (await import(path)) as StatusModule;
    const project = status.readProject(root);
    const receipts = status.readReceipts(root, project.inventory);
    const journalPath = 'openspec/archive-transaction.yaml';
    const journal: unknown = existsSync(join(root, journalPath)) ? parse(read(journalPath)) : null;
    expect(projectIssues(status, project, receipts, journal)).toEqual([]);
  });
  it('rejects invalid synthetic graph, owners and prepared receipt without live records', async () => {
    const status = (await import(join(root, 'scripts/project-status.mjs'))) as StatusModule;
    const syntheticRow = {
      id: 'synthetic-alpha',
      title: 'Alpha',
      milestone: 'M1',
      depends_on: [],
      specs_modified: [],
      status: 'proposed',
    };
    const syntheticRoadmap = {
      milestones: [{ id: 'M1', name: 'Foundation', outcome: 'Usable' }],
      entries: [syntheticRow],
    };
    const syntheticLedger = { schema_version: 1, revision: 0, legacy_archives: [], entries: [] };
    const syntheticProject: Project = {
      root,
      inventory: { active: ['synthetic-alpha'], archives: [] },
      roadmap: syntheticRoadmap,
      ledger: syntheticLedger,
    };
    expect(projectIssues(status, syntheticProject, [], null)).toEqual([]);
    const missingGraph = structuredClone(syntheticProject);
    const row = missingGraph.roadmap.entries[0];
    if (!row) throw new Error('missing synthetic row');
    row.depends_on.push('synthetic-missing');
    expect(projectIssues(status, missingGraph, [], null).join(' ')).toContain('synthetic-missing');
    const state = {
      summary: 'Synthetic finding',
      source: [{ path: 'proof.md', anchor: 'finding', description: 'Synthetic proof' }],
      severity: 'major',
      status: 'open',
      fixing_change: 'synthetic-missing',
      evidence: null,
      blocker: null,
      revisit_when: null,
      parked_reason: null,
    };
    const entry = {
      id: 'SYNTHETIC-1',
      ...state,
      revision: 1,
      history: [
        {
          identity: { id: 'SYNTHETIC-1' },
          sequence: 1,
          operation: 'add',
          reason: 'Synthetic',
          before: null,
          after: state,
        },
      ],
    };
    const missingOwner = {
      ...syntheticProject,
      ledger: { ...syntheticLedger, revision: 1, entries: [entry] },
    };
    expect(projectIssues(status, missingOwner, [], null).join(' ')).toContain('synthetic-missing');
    const archivedId = 'synthetic-archived';
    const archivedState = { ...state, fixing_change: archivedId };
    const archivedEntry = {
      ...entry,
      ...archivedState,
      history: [
        {
          identity: { id: 'SYNTHETIC-1' },
          sequence: 1,
          operation: 'add',
          reason: 'Synthetic',
          before: null,
          after: archivedState,
        },
      ],
    };
    const archive = '2026-01-01-synthetic-archived';
    const archivedProject = {
      ...syntheticProject,
      inventory: { active: ['synthetic-alpha'], archives: [archive] },
      roadmap: {
        ...syntheticRoadmap,
        entries: [syntheticRow, { ...syntheticRow, id: archivedId, status: 'archived' }],
      },
      ledger: {
        ...syntheticLedger,
        revision: 1,
        legacy_archives: [archive],
        entries: [archivedEntry],
      },
    };
    expect(projectIssues(status, archivedProject, [], null).join(' ')).toContain(
      'owner absent or delivered',
    );
    const hash = 'a'.repeat(64);
    const pending = {
      schema_version: 1,
      operation: 'archive',
      change_id: 'synthetic-pending',
      prepared_sha256: hash,
      finalized_sha256: hash,
      before: { ledger: hash, roadmap: hash },
      after: { ledger: hash, roadmap: hash },
    };
    expect(projectIssues(status, syntheticProject, [], pending).join(' ')).toContain('pending');
    const yaml = (value: unknown): string => stringify(value, { aliasDuplicateObjects: false });
    const receipt = {
      schema_version: 1,
      protocol: 'v1',
      change_id: 'synthetic-alpha',
      state: 'prepared',
      ledger_base_revision: 0,
      roadmap_row_sha256: status.digest(status.canonical(syntheticRow)),
      records_sha256: status.digest(status.canonical([])),
      records: [],
      resolved: [],
      preimages: { ledger: yaml(syntheticLedger), roadmap: yaml(syntheticRoadmap), files: {} },
      targets: {
        ledger: yaml({ ...syntheticLedger, revision: 1 }),
        roadmap: yaml({
          ...syntheticRoadmap,
          entries: [
            {
              ...syntheticRow,
              status: 'archived',
              archive_protocol: 'v1',
              archive_receipt: {
                kind: 'change',
                change_id: 'synthetic-alpha',
                relative_path: 'defect-resolution.yaml',
              },
            },
          ],
        }),
      },
    };
    expect(projectIssues(status, syntheticProject, [], null)).toEqual([]);
    expect(
      projectIssues(
        status,
        syntheticProject,
        [
          {
            path: 'openspec/changes/synthetic-alpha/defect-resolution.yaml',
            bytes: yaml(receipt),
            receipt,
          },
        ],
        null,
      ).join(' '),
    ).toContain('pending finalization');
  });
});
