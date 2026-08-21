import { describe, expect, it } from 'vitest';

import { validateCloudBaseInventory } from './check-cloudbase-inventory.mjs';

const validRecord = {
  status: 'complete',
  environmentId: 'red-footprint-preview-d5322636bd',
  observedAt: '2026-08-21T09:00:00+08:00',
  mcpAvailable: true,
  accessMode: 'read-only',
  writeOperationsPerformed: false,
  region: 'ap-shanghai',
  plan: { id: null, name: null, quotas: null },
  hosting: {
    exists: false,
    instanceId: null,
    bucketId: null,
    status: null,
    defaultDomain: null,
    customDomains: [],
    defaultDomainRouteEnabled: null,
    capacityBytes: null,
  },
  storage: {
    exists: false,
    bucketId: null,
    status: null,
    publicDomains: [],
    cdnDomains: [],
    objectCount: null,
    capacityBytes: null,
  },
  github: { linked: false, repository: null, branch: null },
  permissions: { visible: false, summary: null },
  readOnlyCalls: [
    {
      tool: 'mcp__cloudbase__queryEnv',
      action: 'info',
      environmentId: 'red-footprint-preview-d5322636bd',
    },
  ],
  unknowns: [],
};

describe('validateCloudBaseInventory', () => {
  it('rejects a different environment or any write operation', () => {
    expect(
      validateCloudBaseInventory({ ...validRecord, environmentId: 'another-environment' }),
    ).toContain('environmentId must equal red-footprint-preview-d5322636bd');
    expect(validateCloudBaseInventory({ ...validRecord, writeOperationsPerformed: true })).toContain(
      'writeOperationsPerformed must be false',
    );
  });

  it('rejects an inventory status outside complete or blocked', () => {
    expect(validateCloudBaseInventory({ ...validRecord, status: 'pending' })).toContain(
      'status must be complete or blocked',
    );
  });
});
