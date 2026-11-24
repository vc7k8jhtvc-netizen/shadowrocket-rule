#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'rules', 'ai-rules.json');
const shadowrocketPath = path.join(root, 'Shadowrocket_Routing.conf');
const clashPath = path.join(root, 'Clash_Verge_Rev_Script.js');

const SHADOW_BEGIN = '# >>> BEGIN AI RULES (generated from rules/ai-rules.json; run `node scripts/sync-ai-rules.js`) >>>';
const SHADOW_END = '# <<< END AI RULES <<<';
const CLASH_BEGIN = '    // >>> BEGIN AI RULES (generated from rules/ai-rules.json; run `node scripts/sync-ai-rules.js`) >>>';
const CLASH_END = '    // <<< END AI RULES <<<';

const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const WILDCARD_HOST_PATTERN = /^(?=.*\*)[a-z0-9*](?:[a-z0-9*-]{0,61}[a-z0-9*])?(?:\.[a-z0-9*](?:[a-z0-9*-]{0,61}[a-z0-9*])?)+$/;
const ALLOWED_POLICIES = new Set(['🤖 AI', 'DIRECT']);

const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};

function parseAiRule(rule, sectionId) {
  assert(typeof rule === 'string', `unsupported AI rule syntax in rules/ai-rules.json (${sectionId}): ${rule}`);
  const parts = rule.split(',');
  assert(parts.length === 3, `unsupported AI rule syntax in rules/ai-rules.json (${sectionId}): ${rule}`);
  const [type, host, policy] = parts;
  assert(ALLOWED_POLICIES.has(policy), `unsupported AI rule syntax in rules/ai-rules.json (${sectionId}): ${rule}`);
  if (type === 'DOMAIN' || type === 'DOMAIN-SUFFIX') {
    assert(HOST_PATTERN.test(host), `unsupported AI rule syntax in rules/ai-rules.json (${sectionId}): ${rule}`);
  } else if (type === 'DOMAIN-WILDCARD') {
    assert(WILDCARD_HOST_PATTERN.test(host), `unsupported AI rule syntax in rules/ai-rules.json (${sectionId}): ${rule}`);
  } else {
    throw new Error(`unsupported AI rule syntax in rules/ai-rules.json (${sectionId}): ${rule}`);
  }
  return { type, host, policy, raw: rule, sectionId };
}

function validateComments(comments, label) {
  if (comments === undefined) return [];
  assert(Array.isArray(comments), `${label} must be an array of strings`);
  for (const line of comments) {
    assert(typeof line === 'string' && line.trim().length > 0 && !/[\r\n]/.test(line), `${label} contains an invalid comment line`);
  }
  return comments;
}

function loadSource() {
  const raw = fs.readFileSync(sourcePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`rules/ai-rules.json is not valid JSON: ${error.message}`);
  }
  assert(data && typeof data === 'object' && Array.isArray(data.sections) && data.sections.length > 0, 'rules/ai-rules.json must contain a non-empty sections array');

  const seenIds = new Set();
  const seenRules = new Set();
  const seenDomainPolicies = new Map();
  const parsedRules = [];
  let totalRules = 0;

  const sections = data.sections.map((section, index) => {
    assert(section && typeof section === 'object', `section[${index}] must be an object`);
    assert(typeof section.id === 'string' && section.id.trim().length > 0, `section[${index}] missing id`);
    assert(!seenIds.has(section.id), `duplicate section id in rules/ai-rules.json: ${section.id}`);
    seenIds.add(section.id);

    assert(typeof section.title === 'string' && section.title.trim().length > 0 && !/[\r\n]/.test(section.title), `section[${section.id}] missing valid title`);
    const headerComments = validateComments(section.headerComments, `section[${section.id}].headerComments`);
    const footerComments = validateComments(section.footerComments, `section[${section.id}].footerComments`);

    assert(Array.isArray(section.rules) && section.rules.length > 0, `section[${section.id}] must have a non-empty rules array`);
    for (const rule of section.rules) {
      const parsed = parseAiRule(rule, section.id);
      const canonicalKey = `${parsed.type},${parsed.host.toLowerCase()},${parsed.policy}`;
      assert(!seenRules.has(canonicalKey), `duplicate AI rule in rules/ai-rules.json: ${rule}`);
      seenRules.add(canonicalKey);

      const hostKey = parsed.host.toLowerCase();
      if (seenDomainPolicies.has(hostKey)) {
        const previous = seenDomainPolicies.get(hostKey);
        assert(previous.policy === parsed.policy, `conflicting AI rule policies in rules/ai-rules.json: ${previous.raw} vs ${rule}`);
        throw new Error(`duplicate AI rule in rules/ai-rules.json: ${rule}`);
      }
      seenDomainPolicies.set(hostKey, parsed);
      parsedRules.push(parsed);
      totalRules++;
    }

    return {
      id: section.id,
      title: section.title,
      headerComments,
      footerComments,
      rules: section.rules
    };
  });

  // Prevent redundant same-policy shadowing or parent suffix swallowing a later different-policy child rule.
  for (let i = 0; i < parsedRules.length; i++) {
    const parent = parsedRules[i];
    if (parent.type !== 'DOMAIN-SUFFIX') continue;
    for (let j = 0; j < parsedRules.length; j++) {
      if (i === j) continue;
      const child = parsedRules[j];
      if (child.type === 'DOMAIN-WILDCARD') continue;
      if (child.host.endsWith('.' + parent.host)) {
        if (child.policy === parent.policy) {
          throw new Error(`redundant shadowed AI rule in rules/ai-rules.json: ${child.raw} is already covered by ${parent.raw}`);
        }
        if (i < j) {
          throw new Error(`shadowed AI rule order in rules/ai-rules.json: ${child.raw} is preceded by ${parent.raw}`);
        }
      }
    }
  }

  return { sections, totalRules };
}

function renderShadowrocket(sections) {
  const blocks = sections.map(section => {
    const lines = [`# ${section.title}`];
    for (const comment of section.headerComments) lines.push(`# ${comment}`);
    for (const rule of section.rules) lines.push(rule);
    for (const comment of section.footerComments) lines.push(`# ${comment}`);
    return lines.join('\n');
  });
  return `${SHADOW_BEGIN}\n${blocks.join('\n\n')}\n${SHADOW_END}`;
}

function renderClash(sections) {
  const blocks = sections.map(section => {
    const lines = [`    // ${section.title}`];
    for (const comment of section.headerComments) lines.push(`    // ${comment}`);
    for (const rule of section.rules) lines.push(`    '${rule}',`);
    for (const comment of section.footerComments) lines.push(`    // ${comment}`);
    return lines.join('\n');
  });
  return `${CLASH_BEGIN}\n${blocks.join('\n')}\n${CLASH_END}`;
}

function replaceBlock(content, beginMarker, endMarker, rendered, label) {
  const normalized = content.replace(/\r\n/g, '\n');
  const beginIndex = normalized.indexOf(beginMarker);
  assert(beginIndex !== -1, `${label}: missing AI rules begin marker`);
  assert(normalized.indexOf(beginMarker, beginIndex + beginMarker.length) === -1, `${label}: duplicate AI rules begin marker`);

  const endIndex = normalized.indexOf(endMarker);
  assert(endIndex !== -1, `${label}: missing AI rules end marker`);
  assert(normalized.indexOf(endMarker, endIndex + endMarker.length) === -1, `${label}: duplicate AI rules end marker`);
  assert(beginIndex < endIndex, `${label}: AI rules end marker precedes begin marker`);

  const updated = normalized.slice(0, beginIndex) + rendered + normalized.slice(endIndex + endMarker.length);
  return { normalized, updated, changed: updated !== normalized };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  for (const arg of args) {
    assert(arg === '--check', `unknown argument: ${arg}`);
  }

  const { sections, totalRules } = loadSource();
  const targets = [
    {
      label: 'Shadowrocket_Routing.conf',
      filePath: shadowrocketPath,
      begin: SHADOW_BEGIN,
      end: SHADOW_END,
      rendered: renderShadowrocket(sections)
    },
    {
      label: 'Clash_Verge_Rev_Script.js',
      filePath: clashPath,
      begin: CLASH_BEGIN,
      end: CLASH_END,
      rendered: renderClash(sections)
    }
  ];

  const drifted = [];
  for (const target of targets) {
    const current = fs.readFileSync(target.filePath, 'utf8');
    const result = replaceBlock(current, target.begin, target.end, target.rendered, target.label);
    if (result.changed) {
      if (checkOnly) {
        drifted.push(target.label);
      } else {
        fs.writeFileSync(target.filePath, result.updated, 'utf8');
      }
    }
  }

  if (checkOnly) {
    assert(drifted.length === 0, `AI rules out of sync with rules/ai-rules.json (${drifted.join(', ')}); run \`node scripts/sync-ai-rules.js\``);
    console.log(`PASS: AI rules in sync with rules/ai-rules.json (${sections.length} sections, ${totalRules} rules)`);
  } else {
    console.log(`Synced AI rules from rules/ai-rules.json (${sections.length} sections, ${totalRules} rules)`);
  }
}

try {
  main();
} catch (error) {
  console.error('FAIL: ' + error.message);
  process.exit(1);
}
