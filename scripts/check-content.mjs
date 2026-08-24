import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { productionSiteCollectionSchema } from '../src/data/siteSchema.ts';
import { validateProductionContent } from './check-production-content.mjs';
import { checkMedia } from './check-media.mjs';
import { flattenMediaManifest } from './check-upload-reconciliation.mjs';
import { generateSites, serializeSites } from './generate-sites.mjs';

const placeholderHostPattern =
  /(?:example(?:\.|$)|\.invalid$|\.test$|localhost$|^127\.|^0\.0\.0\.0$|placeholder|invalid)/i;
const forbiddenProductionText =
  /(?:fixture|synthetic|example\.test|\.invalid|localhost|placeholder|test-data|todo|tbd|待补|占位)/i;
const MEDIA_CHECK_MODE_ENV = 'RED_FOOTPRINT_MEDIA_CHECK_MODE';

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
  const options = { sites: 'src/data/sites.json', release: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--release') {
      options.release = true;
      continue;
    }
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

function resolveReleaseMode(options) {
  const environmentMode = process.env[MEDIA_CHECK_MODE_ENV];
  if (
    environmentMode !== undefined &&
    environmentMode !== 'local' &&
    environmentMode !== 'release'
  ) {
    throw new Error(`unknown media check mode: ${environmentMode}`);
  }
  return options.release || environmentMode === 'release';
}

function validateReleaseBuildInputs(input, root) {
  const errors = [];
  let manifest;
  let reconciliation;
  try {
    manifest = JSON.parse(
      readFileSync(resolve(root, 'content/media/media-manifest.json'), 'utf8'),
    );
  } catch (error) {
    return [`[release build input] media manifest is unreadable (${error.message})`];
  }
  try {
    reconciliation = JSON.parse(
      readFileSync(
        resolve(root, 'content/cloudbase/upload-reconciliation.json'),
        'utf8',
      ),
    );
  } catch (error) {
    return [`[release build input] upload reconciliation is unreadable (${error.message})`];
  }

  const expectedObjects = new Map(
    flattenMediaManifest(manifest).map((object) => [object.objectPath, object]),
  );
  const reconciledObjects = new Map(
    (reconciliation.objects ?? []).map((object) => [object.objectPath, object]),
  );
  const resources = input.flatMap((site) => [
    site.heroAsset,
    ...(site.photos ?? []).map((photo) => photo.asset),
    site.video?.asset,
    site.video?.posterAsset,
    site.video?.captionsAsset,
  ]);
  const resourcePaths = resources.map((resource) => resource?.objectPath);

  if (
    resources.length !== expectedObjects.size ||
    new Set(resourcePaths).size !== expectedObjects.size
  ) {
    errors.push(
      `[release build input] sites.json must contain ${expectedObjects.size} unique media resources`,
    );
  }

  for (const resource of resources) {
    const expected = expectedObjects.get(resource?.objectPath);
    const reconciled = reconciledObjects.get(resource?.objectPath);
    if (!expected || !reconciled) {
      errors.push(
        `[release build input] ${resource?.objectPath ?? 'unknown resource'} is absent from manifest or reconciliation`,
      );
      continue;
    }
    for (const field of ['bytes', 'mime', 'sha256']) {
      if (resource[field] !== expected[field]) {
        errors.push(
          `[release build input] ${resource.objectPath}.${field} must match media manifest`,
        );
      }
    }
    if (
      resource.deliveryStatus !== 'reconciled-production' ||
      resource.url !== reconciled.httpsUrl ||
      resource.productionUrl !== reconciled.httpsUrl
    ) {
      errors.push(
        `[release build input] ${resource.objectPath} must use its reconciled production HTTPS URL`,
      );
    }
    if (resource.digestRef !== `sha256:${expected.sha256}`) {
      errors.push(
        `[release build input] ${resource.objectPath}.digestRef must match media manifest`,
      );
    }
  }

  for (const site of input) {
    if (
      site.mediaDelivery?.status !== 'reconciled-production' ||
      site.mediaDelivery?.productionBaseUrl !== reconciliation.cdnBaseUrl
    ) {
      errors.push(
        `[release build input] ${site.id}.mediaDelivery must match upload reconciliation`,
      );
    }
  }

  return errors;
}

export function runContentCheck(
  argv = process.argv.slice(2),
  root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
) {
  const options = parseArguments(argv);
  const releaseMode = resolveReleaseMode(options);
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

  const mediaErrors = checkMedia(root, {
    mode: releaseMode ? 'release' : 'local',
  });
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

      if (releaseMode) {
        const releaseInputErrors = validateReleaseBuildInputs(input, root);
        if (releaseInputErrors.length > 0) {
          errors.push(...releaseInputErrors);
        } else {
          console.log(
            '[check:content] release build inputs match the media manifest and upload reconciliation',
          );
        }
      } else if (
        productionContentErrors.length === 0 &&
        mediaErrors.length === 0
      ) {
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
      } else {
        errors.push(
          '[generated sites] strict deterministic generation requires valid local production content and media files',
        );
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
