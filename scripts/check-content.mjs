import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { productionSiteCollectionSchema } from '../src/data/siteSchema.ts';
import { validateProductionContent } from './check-production-content.mjs';
import { checkMedia } from './check-media.mjs';
import { generateSites, serializeSites } from './generate-sites.mjs';

const placeholderHostPattern =
  /(?:example(?:\.|$)|\.invalid$|\.test$|localhost$|^127\.|^0\.0\.0\.0$|placeholder|invalid)/i;
const forbiddenProductionText =
  /(?:fixture|synthetic|example\.test|\.invalid|localhost|placeholder|test-data|todo|tbd|待补|占位)/i;

function visitStrings(value, path, visitor) {
  if (typeof value === 'string') {
    visitor(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitStrings(item, `${path}[${index}]`, visitor));
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      visitStrings(item, path ? `${path}.${key}` : key, visitor);
    });
  }
}

export function validateContent(input, _options = {}) {
  const result = productionSiteCollectionSchema.safeParse(input);
  const errors = result.success
    ? []
    : result.error.issues.map(
        (issue) => `[schema] ${issue.path.join('.') || 'sites'}: ${issue.message}`,
      );

  visitStrings(input, 'sites', (value, path) => {
    if (!/^https?:\/\//i.test(value)) return;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') {
        errors.push(`[schema] ${path}: production web URLs must use HTTPS`);
      }
      if (placeholderHostPattern.test(url.hostname)) {
        errors.push(`[schema] ${path}: placeholder or test domain is forbidden`);
      }
    } catch {
      errors.push(`[schema] ${path}: invalid web URL`);
    }
  });

  return [...new Set(errors)];
}

function parseArguments(argv) {
  const options = { sites: 'src/data/sites.json' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--sites') {
      throw new Error(`unknown argument: ${argv[index]}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error('--sites requires a path');
    }
    options.sites = value;
    index += 1;
  }
  return options;
}

export function runContentCheck(argv = process.argv.slice(2)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const options = parseArguments(argv);
  const sitesPath = resolve(root, options.sites);
  const errors = [];

  const productionContentErrors = validateProductionContent(root);
  if (productionContentErrors.length > 0) {
    errors.push(
      ...productionContentErrors.map((error) => `[Task 3 production content] ${error}`),
    );
  } else {
    console.log('[check:content] Task 3 production content passed');
  }

  const mediaErrors = checkMedia(root);
  if (mediaErrors.length > 0) {
    errors.push(...mediaErrors.map((error) => `[Task 4 media] ${error}`));
  } else {
    console.log('[check:content] Task 4 media passed');
  }

  if (!existsSync(sitesPath)) {
    errors.push(`[generated sites] ${sitesPath}: sites.json is missing`);
  } else {
    let input;
    try {
      input = JSON.parse(readFileSync(sitesPath, 'utf8'));
    } catch (error) {
      errors.push(`[generated sites] ${sitesPath}: unreadable JSON (${error.message})`);
    }

    if (input !== undefined) {
      const schemaErrors = validateContent(input, { root });
      if (schemaErrors.length > 0) {
        errors.push(...schemaErrors);
      } else {
        console.log('[check:content] production schema passed');
      }

      const firstGenerated = serializeSites(generateSites(root));
      const secondGenerated = serializeSites(generateSites(root));
      if (firstGenerated !== secondGenerated) {
        errors.push('[generated sites] repeated generation is not byte-identical');
      } else if (readFileSync(sitesPath, 'utf8') !== firstGenerated) {
        errors.push(
          `[generated sites] ${sitesPath} does not match generated output; manual drift is forbidden`,
        );
      } else {
        console.log('[check:content] generated sites are byte-identical and drift-free');
      }

      const serialized = JSON.stringify(input);
      if (forbiddenProductionText.test(serialized)) {
        errors.push(
          '[production safety] fixture, placeholder, or synthetic text is forbidden in sites.json',
        );
      }

      const mainSource = readFileSync(resolve(root, 'src/main.tsx'), 'utf8');
      if (
        !mainSource.includes("from './data/sites.json'") ||
        !mainSource.includes("from './data/loadSites'") ||
        !mainSource.includes('loadSites(') ||
        !mainSource.includes('<App sites={sites}') ||
        /test\/fixtures|syntheticSites|validEightSites/.test(mainSource)
      ) {
        errors.push(
          '[production safety] main.tsx must load generated sites.json through loadSites without fixtures',
        );
      }
      if (!forbiddenProductionText.test(serialized) && errors.length === 0) {
        console.log(
          '[check:content] fixture, placeholder, and manual drift are absent',
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Content check failed with ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    return 1;
  }

  console.log('[check:content] all production content gates passed');
  return 0;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    process.exitCode = runContentCheck();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
