import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_ENVIRONMENT_ID = 'red-footprint-preview-d5322636bd';
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateNullableString(value, field, errors) {
  if (value !== null && (typeof value !== 'string' || value.trim() === '')) {
    errors.push(`${field} must be a non-empty string or null`);
  }
}

function validateNullableBoolean(value, field, errors) {
  if (value !== null && typeof value !== 'boolean') {
    errors.push(`${field} must be a boolean or null`);
  }
}

function validateStringArray(value, field, errors, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item === '')) {
    errors.push(`${field} must be an array of non-empty strings${nullable ? ' or null' : ''}`);
  }
}

function validateNullableNonnegativeNumber(value, field, errors) {
  if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
    errors.push(`${field} must be a non-negative number or null`);
  }
}

function validatePlan(plan, errors) {
  if (!isRecord(plan)) {
    errors.push('plan must be an object');
    return;
  }
  validateNullableString(plan.id, 'plan.id', errors);
  validateNullableString(plan.name, 'plan.name', errors);
  if (plan.quotas !== null && !isRecord(plan.quotas)) {
    errors.push('plan.quotas must be an object or null');
  }
}

function validateHosting(hosting, errors) {
  if (!isRecord(hosting)) {
    errors.push('hosting must be an object');
    return;
  }
  validateNullableBoolean(hosting.exists, 'hosting.exists', errors);
  validateNullableString(hosting.instanceId, 'hosting.instanceId', errors);
  validateNullableString(hosting.bucketId, 'hosting.bucketId', errors);
  validateNullableString(hosting.status, 'hosting.status', errors);
  validateNullableString(hosting.defaultDomain, 'hosting.defaultDomain', errors);
  validateStringArray(hosting.customDomains, 'hosting.customDomains', errors, { nullable: true });
  validateNullableBoolean(hosting.defaultDomainRouteEnabled, 'hosting.defaultDomainRouteEnabled', errors);
  validateNullableNonnegativeNumber(hosting.capacityBytes, 'hosting.capacityBytes', errors);
}

function validateStorage(storage, errors) {
  if (!isRecord(storage)) {
    errors.push('storage must be an object');
    return;
  }
  validateNullableBoolean(storage.exists, 'storage.exists', errors);
  validateNullableString(storage.bucketId, 'storage.bucketId', errors);
  validateNullableString(storage.status, 'storage.status', errors);
  validateStringArray(storage.publicDomains, 'storage.publicDomains', errors, { nullable: true });
  validateStringArray(storage.cdnDomains, 'storage.cdnDomains', errors, { nullable: true });
  validateNullableNonnegativeNumber(storage.objectCount, 'storage.objectCount', errors);
  validateNullableNonnegativeNumber(storage.capacityBytes, 'storage.capacityBytes', errors);
}

function validateGithub(github, errors) {
  if (!isRecord(github)) {
    errors.push('github must be an object');
    return;
  }
  validateNullableBoolean(github.linked, 'github.linked', errors);
  validateNullableString(github.repository, 'github.repository', errors);
  validateNullableString(github.branch, 'github.branch', errors);
}

function validatePermissions(permissions, errors) {
  if (!isRecord(permissions)) {
    errors.push('permissions must be an object');
    return;
  }
  validateNullableBoolean(permissions.visible, 'permissions.visible', errors);
  validateNullableString(permissions.summary, 'permissions.summary', errors);
}

function validateReadOnlyCalls(calls, mcpAvailable, errors) {
  if (!Array.isArray(calls)) {
    errors.push('readOnlyCalls must be an array');
    return;
  }
  if (mcpAvailable === true && calls.length === 0) {
    errors.push('readOnlyCalls must record at least one call when MCP is available');
  }
  calls.forEach((call, index) => {
    const prefix = `readOnlyCalls[${index}]`;
    if (!isRecord(call)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    if (call.tool !== 'mcp__cloudbase__queryEnv') {
      errors.push(`${prefix}.tool must be mcp__cloudbase__queryEnv`);
    }
    if (call.action !== 'info' && call.action !== 'usage') {
      errors.push(`${prefix}.action must be info or usage`);
    }
    if (call.environmentId !== EXPECTED_ENVIRONMENT_ID) {
      errors.push(`${prefix}.environmentId must equal ${EXPECTED_ENVIRONMENT_ID}`);
    }
  });
}

export function validateCloudBaseInventory(input) {
  const errors = [];
  if (!isRecord(input)) return ['inventory must be a JSON object'];

  if (input.status !== 'complete' && input.status !== 'blocked') {
    errors.push('status must be complete or blocked');
  }
  if (input.environmentId !== EXPECTED_ENVIRONMENT_ID) {
    errors.push(`environmentId must equal ${EXPECTED_ENVIRONMENT_ID}`);
  }
  if (
    typeof input.observedAt !== 'string' ||
    !isoTimestampPattern.test(input.observedAt) ||
    Number.isNaN(Date.parse(input.observedAt))
  ) {
    errors.push('observedAt must be an ISO 8601 timestamp with timezone');
  }
  if (typeof input.mcpAvailable !== 'boolean') {
    errors.push('mcpAvailable must be a boolean');
  }
  if (input.accessMode !== 'read-only') {
    errors.push('accessMode must be read-only');
  }
  if (input.writeOperationsPerformed !== false) {
    errors.push('writeOperationsPerformed must be false');
  }
  validateNullableString(input.region, 'region', errors);
  validatePlan(input.plan, errors);
  validateHosting(input.hosting, errors);
  validateStorage(input.storage, errors);
  validateGithub(input.github, errors);
  validatePermissions(input.permissions, errors);
  validateReadOnlyCalls(input.readOnlyCalls, input.mcpAvailable, errors);
  validateStringArray(input.unknowns, 'unknowns', errors);

  if (input.status === 'blocked') {
    if (typeof input.blocker !== 'string' || input.blocker.trim() === '') {
      errors.push('blocker must explain a blocked inventory');
    }
    if (!Array.isArray(input.unknowns) || input.unknowns.length === 0) {
      errors.push('unknowns must list unreadable fields for a blocked inventory');
    }
  }

  return errors;
}

function parseArguments(argv) {
  const options = { root: process.cwd(), inventory: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--inventory' && argument !== '--root') {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a path`);
    if (argument === '--inventory') options.inventory = value;
    if (argument === '--root') options.root = value;
    index += 1;
  }
  return options;
}

export function runCloudBaseInventoryCheck(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const root = resolve(options.root);
  const inventoryPath = resolve(
    root,
    options.inventory ?? 'content/cloudbase/environment-inventory.json',
  );
  if (!existsSync(inventoryPath)) {
    console.error(`[cloudbase-inventory] ${inventoryPath}: inventory is missing`);
    return 1;
  }

  const input = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const errors = validateCloudBaseInventory(input);
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`[cloudbase-inventory] ${error}`));
    return 1;
  }
  if (input.status === 'blocked') {
    console.error(`[cloudbase-inventory] blocked: ${input.blocker}`);
    input.unknowns.forEach((field) => console.error(`[cloudbase-inventory] unknown: ${field}`));
    return 1;
  }

  console.log('[cloudbase-inventory] passed');
  return 0;
}

const isCommandLine =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCommandLine) {
  try {
    process.exitCode = runCloudBaseInventoryCheck();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
