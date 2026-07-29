// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { upsertUser } from '@/lib/userStore';
import { sendRequest, respondToRequest } from '@/lib/friendStore';
import {
  publishDashboard,
  unpublishDashboard,
  listOwnedDashboards,
  getDashboardForViewer,
  saveDashboardEdits,
  createShare,
  listShares,
  revokeShare,
  listSharedWithMe,
  AccessError,
  NotFoundError,
} from '@/lib/serverDashboards';
import type { Dashboard, WidgetInstance } from '@/types';

function makeDashboard(id: string, overrides: Partial<Dashboard> = {}): Dashboard {
  return { id, name: 'My Dashboard', settings: { gridColumns: 12, gridRowHeight: 60 }, isDefault: false, ...overrides };
}

function makeWidget(instanceId: string, dashboardId: string, overrides: Partial<WidgetInstance> = {}): WidgetInstance {
  return {
    instanceId,
    dashboardId,
    widgetType: 'MarkdownWidget',
    layout: { x: 0, y: 0, w: 4, h: 3 },
    configuration: { content: 'hello' },
    visibility: 'private',
    mode: 'readonly',
    ...overrides,
  };
}

beforeAll(() => {
  upsertUser({ id: 'owner1', email: 'owner1@example.com', name: 'Owner', picture: '' });
  upsertUser({ id: 'friend1', email: 'friend1@example.com', name: 'Friend', picture: '' });
  upsertUser({ id: 'stranger1', email: 'stranger1@example.com', name: 'Stranger', picture: '' });
  const req = sendRequest('owner1', 'friend1');
  respondToRequest(req.id, 'friend1', true);
});

describe('serverDashboards: publish + ownership', () => {
  it('publishes a dashboard with its widgets', () => {
    const dash = makeDashboard('dash1');
    const widgets = [makeWidget('w1', 'dash1'), makeWidget('w2', 'dash1')];
    publishDashboard('owner1', dash, widgets);

    const summary = listOwnedDashboards('owner1');
    expect(summary.map((d) => d.id)).toContain('dash1');
  });

  it('re-publishing updates existing widgets and drops removed ones', () => {
    const dash = makeDashboard('dash1', { name: 'Renamed' });
    // w2 dropped, w1 updated, w3 added
    const widgets = [makeWidget('w1', 'dash1', { configuration: { content: 'updated' } }), makeWidget('w3', 'dash1')];
    publishDashboard('owner1', dash, widgets);

    const view = getDashboardForViewer('dash1', 'owner1');
    expect(view.dashboard.name).toBe('Renamed');
    expect(view.widgets.map((w) => w.instanceId).sort()).toEqual(['w1', 'w3']);
    expect(view.widgets.find((w) => w.instanceId === 'w1')?.configuration.content).toBe('updated');
  });

  it('refuses to publish over a dashboard id owned by someone else', () => {
    expect(() => publishDashboard('stranger1', makeDashboard('dash1'), [])).toThrow(AccessError);
  });

  it('unpublish removes the dashboard and cascades to widgets', () => {
    publishDashboard('owner1', makeDashboard('dash-temp'), [makeWidget('wtemp', 'dash-temp')]);
    unpublishDashboard('dash-temp', 'owner1');
    expect(() => getDashboardForViewer('dash-temp', 'owner1')).toThrow(NotFoundError);
  });

  it('only the owner may unpublish', () => {
    publishDashboard('owner1', makeDashboard('dash-owned'), []);
    expect(() => unpublishDashboard('dash-owned', 'stranger1')).toThrow(AccessError);
  });
});

describe('serverDashboards: access is share-gated; visibility further filters within that access', () => {
  beforeAll(() => {
    publishDashboard('owner1', makeDashboard('dash-vis'), [
      makeWidget('pub', 'dash-vis', { visibility: 'public' }),
      makeWidget('fr', 'dash-vis', { visibility: 'friends' }),
      makeWidget('priv', 'dash-vis', { visibility: 'private' }),
    ]);
  });

  it('the owner sees every widget regardless of visibility', () => {
    const view = getDashboardForViewer('dash-vis', 'owner1');
    expect(view.widgets.map((w) => w.instanceId).sort()).toEqual(['fr', 'priv', 'pub']);
    expect(view.role).toBe('owner');
  });

  it('a user with no share at all has no access, even if they are a friend', () => {
    expect(() => getDashboardForViewer('dash-vis', 'friend1')).toThrow(AccessError);
  });

  it('direct (non-public) shares are restricted to friends', () => {
    expect(() =>
      createShare('dash-vis', 'owner1', { sharedWithEmail: 'stranger1@example.com', permission: 'view' }),
    ).toThrow(AccessError);
  });

  it('unknown dashboard id raises NotFoundError', () => {
    expect(() => getDashboardForViewer('does-not-exist', 'owner1')).toThrow(NotFoundError);
  });

  it('once shared, a friend sees public + friends widgets, not private', () => {
    createShare('dash-vis', 'owner1', { sharedWithEmail: 'friend1@example.com', permission: 'view' });
    const view = getDashboardForViewer('dash-vis', 'friend1');
    expect(view.widgets.map((w) => w.instanceId).sort()).toEqual(['fr', 'pub']);
    expect(view.role).toBe('viewer');
  });
});

describe('serverDashboards: collaborative edits', () => {
  beforeAll(() => {
    publishDashboard('owner1', makeDashboard('dash-edit'), [
      makeWidget('collab', 'dash-edit', { visibility: 'friends', mode: 'collaborative', configuration: { columns: [] } }),
      makeWidget('locked', 'dash-edit', { visibility: 'friends', mode: 'readonly', configuration: { content: 'orig' } }),
    ]);
    createShare('dash-edit', 'owner1', { sharedWithEmail: 'friend1@example.com', permission: 'edit' });
  });

  it('the owner can edit any widget regardless of mode', () => {
    const result = saveDashboardEdits('dash-edit', 'owner1', [{ instanceId: 'locked', configuration: { content: 'owner edit' } }]);
    expect(result.applied).toEqual(['locked']);
    expect(getDashboardForViewer('dash-edit', 'owner1').widgets.find((w) => w.instanceId === 'locked')?.configuration.content).toBe('owner edit');
  });

  it('an editor can write to collaborative widgets but not readonly ones', () => {
    const result = saveDashboardEdits('dash-edit', 'friend1', [
      { instanceId: 'collab', configuration: { columns: ['todo'] } },
      { instanceId: 'locked', configuration: { content: 'friend tries to sneak in' } },
    ]);
    expect(result.applied).toEqual(['collab']);
    expect(result.rejected).toEqual(['locked']);

    const view = getDashboardForViewer('dash-edit', 'friend1');
    expect(view.widgets.find((w) => w.instanceId === 'collab')?.configuration.columns).toEqual(['todo']);
    expect(view.widgets.find((w) => w.instanceId === 'locked')?.configuration.content).toBe('owner edit'); // unchanged
  });

  it('a view-only share cannot write at all', () => {
    publishDashboard('owner1', makeDashboard('dash-viewonly'), [
      makeWidget('c1', 'dash-viewonly', { mode: 'collaborative', visibility: 'friends' }),
    ]);
    createShare('dash-viewonly', 'owner1', { sharedWithEmail: 'friend1@example.com', permission: 'view' });
    expect(() => saveDashboardEdits('dash-viewonly', 'friend1', [{ instanceId: 'c1', configuration: { content: 'x' } }])).toThrow(AccessError);
  });

  it('a user with no access at all cannot write', () => {
    expect(() => saveDashboardEdits('dash-edit', 'stranger1', [{ instanceId: 'collab', configuration: {} }])).toThrow(AccessError);
  });

  it('editing an unknown widget id is reported as rejected, not applied', () => {
    const result = saveDashboardEdits('dash-edit', 'owner1', [{ instanceId: 'nope', configuration: {} }]);
    expect(result.applied).toEqual([]);
    expect(result.rejected).toEqual(['nope']);
  });
});

describe('serverDashboards: share management', () => {
  beforeAll(() => {
    publishDashboard('owner1', makeDashboard('dash-shares'), []);
  });

  it('creates a public share with an unguessable token', () => {
    const share = createShare('dash-shares', 'owner1', { isPublic: true, permission: 'view' });
    expect(share.shareToken).toBeTruthy();
    expect(share.shareToken!.length).toBeGreaterThanOrEqual(32);
    expect(share.sharedWithUserId).toBeNull();
  });

  it('a public view-permission share grants viewer access via the token, even to a stranger', () => {
    const share = createShare('dash-shares', 'owner1', { isPublic: true, permission: 'view' });
    const view = getDashboardForViewer('dash-shares', 'stranger1', share.shareToken!);
    expect(view.role).toBe('viewer');
  });

  it('anonymous (no viewerId) access works via a public token for viewing', () => {
    const share = createShare('dash-shares', 'owner1', { isPublic: true, permission: 'view' });
    const view = getDashboardForViewer('dash-shares', null, share.shareToken!);
    expect(view.role).toBe('viewer');
  });

  it('a public edit-permission share does NOT grant editor rights to an anonymous viewer', () => {
    const share = createShare('dash-shares', 'owner1', { isPublic: true, permission: 'edit' });
    const view = getDashboardForViewer('dash-shares', null, share.shareToken!);
    expect(view.role).toBe('viewer'); // downgraded — edits must be attributable to a logged-in user
  });

  it('only the owner can list or revoke shares', () => {
    const share = createShare('dash-shares', 'owner1', { isPublic: true, permission: 'view' });
    expect(() => listShares('dash-shares', 'stranger1')).toThrow(AccessError);
    expect(() => revokeShare(share.id, 'stranger1')).toThrow(AccessError);

    const before = listShares('dash-shares', 'owner1');
    expect(before.map((s) => s.id)).toContain(share.id);
    revokeShare(share.id, 'owner1');
    const after = listShares('dash-shares', 'owner1');
    expect(after.map((s) => s.id)).not.toContain(share.id);
  });

  it('listSharedWithMe surfaces dashboards a friend shared directly with the caller', () => {
    createShare('dash-shares', 'owner1', { sharedWithEmail: 'friend1@example.com', permission: 'edit' });
    const shared = listSharedWithMe('friend1');
    const entry = shared.find((s) => s.dashboard.id === 'dash-shares');
    expect(entry).toBeDefined();
    expect(entry?.owner.id).toBe('owner1');
    expect(entry?.permission).toBe('edit');
  });
});
