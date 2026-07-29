import { randomBytes } from 'crypto';
import { db } from './db';
import { areFriends } from './friendStore';
import { getUserByEmail, getUsersByIds, type User } from './userStore';
import type { Dashboard, WidgetInstance, DashboardTheme, DashboardSettings, WidgetVisibility } from '@/types';

export class AccessError extends Error {}
export class NotFoundError extends Error {}

// ─── Row <-> domain mapping ─────────────────────────────────────────────────

interface DashboardRow {
  id: string;
  owner_id: string;
  name: string;
  icon: string | null;
  theme_json: string | null;
  settings_json: string;
  is_default: number;
  updated_at: number;
}

interface WidgetRow {
  instance_id: string;
  dashboard_id: string;
  widget_type: string;
  layout_json: string;
  configuration_json: string;
  visibility: WidgetVisibility;
  mode: 'readonly' | 'collaborative';
  data_source_id: string | null;
}

function rowToDashboard(row: DashboardRow): Dashboard {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? undefined,
    theme: row.theme_json ? (JSON.parse(row.theme_json) as DashboardTheme) : undefined,
    settings: JSON.parse(row.settings_json) as DashboardSettings,
    isDefault: !!row.is_default,
  };
}

function rowToWidget(row: WidgetRow): WidgetInstance {
  return {
    instanceId: row.instance_id,
    widgetType: row.widget_type,
    dashboardId: row.dashboard_id,
    layout: JSON.parse(row.layout_json),
    configuration: JSON.parse(row.configuration_json),
    visibility: row.visibility,
    mode: row.mode,
    dataSourceId: row.data_source_id ?? undefined,
  };
}

function getDashboardRow(dashboardId: string): DashboardRow | null {
  const row = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(dashboardId) as DashboardRow | undefined;
  return row ?? null;
}

function getWidgetRows(dashboardId: string): WidgetRow[] {
  return db.prepare('SELECT * FROM widget_instances WHERE dashboard_id = ?').all(dashboardId) as WidgetRow[];
}

// ─── Publish (create/update a server copy of a locally-authored dashboard) ──
//
// Reuses the exact shape the client already produces via exportLayout() —
// this doubles as the migration path from local-only to server-backed
// storage: export, then POST the same JSON here.

export function publishDashboard(ownerId: string, dashboard: Dashboard, widgets: WidgetInstance[]): void {
  const existing = getDashboardRow(dashboard.id);
  if (existing && existing.owner_id !== ownerId) {
    throw new AccessError('This dashboard id is already published by another user');
  }

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO dashboards (id, owner_id, name, icon, theme_json, settings_json, is_default, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name, icon = excluded.icon, theme_json = excluded.theme_json,
        settings_json = excluded.settings_json, is_default = excluded.is_default, updated_at = unixepoch()
    `).run(
      dashboard.id,
      ownerId,
      dashboard.name,
      dashboard.icon ?? null,
      dashboard.theme ? JSON.stringify(dashboard.theme) : null,
      JSON.stringify(dashboard.settings ?? {}),
      dashboard.isDefault ? 1 : 0,
    );

    const keepIds = widgets.map((w) => w.instanceId);
    if (keepIds.length > 0) {
      const placeholders = keepIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM widget_instances WHERE dashboard_id = ? AND instance_id NOT IN (${placeholders})`)
        .run(dashboard.id, ...keepIds);
    } else {
      db.prepare('DELETE FROM widget_instances WHERE dashboard_id = ?').run(dashboard.id);
    }

    const upsertWidget = db.prepare(`
      INSERT INTO widget_instances
        (instance_id, dashboard_id, widget_type, layout_json, configuration_json, visibility, mode, data_source_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT (instance_id) DO UPDATE SET
        widget_type = excluded.widget_type, layout_json = excluded.layout_json,
        configuration_json = excluded.configuration_json, visibility = excluded.visibility,
        mode = excluded.mode, data_source_id = excluded.data_source_id, updated_at = unixepoch()
    `);
    for (const w of widgets) {
      upsertWidget.run(
        w.instanceId,
        dashboard.id,
        w.widgetType,
        JSON.stringify(w.layout),
        JSON.stringify(w.configuration ?? {}),
        w.visibility,
        w.mode,
        w.dataSourceId ?? null,
      );
    }
  });
  tx();
}

export function unpublishDashboard(dashboardId: string, ownerId: string): void {
  const row = getDashboardRow(dashboardId);
  if (!row) return;
  if (row.owner_id !== ownerId) throw new AccessError('Not the owner of this dashboard');
  db.prepare('DELETE FROM dashboards WHERE id = ?').run(dashboardId); // cascades to widgets + shares
}

export interface OwnedDashboardSummary {
  id: string;
  name: string;
  icon?: string;
  updatedAt: number;
}

export function listOwnedDashboards(ownerId: string): OwnedDashboardSummary[] {
  const rows = db
    .prepare('SELECT id, name, icon, updated_at FROM dashboards WHERE owner_id = ? ORDER BY updated_at DESC')
    .all(ownerId) as { id: string; name: string; icon: string | null; updated_at: number }[];
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon ?? undefined, updatedAt: r.updated_at }));
}

// ─── Access resolution ───────────────────────────────────────────────────────

export type AccessRole = 'owner' | 'editor' | 'viewer' | 'none';

interface ShareRow {
  id: string;
  dashboard_id: string;
  shared_with_user_id: string | null;
  share_token: string | null;
  permission: 'view' | 'edit';
}

function findShareForViewer(dashboardId: string, viewerId: string | null, shareToken?: string): ShareRow | null {
  if (viewerId) {
    const row = db
      .prepare(`SELECT * FROM dashboard_shares WHERE dashboard_id = ? AND shared_with_user_id = ?`)
      .get(dashboardId, viewerId) as ShareRow | undefined;
    if (row) return row;
  }
  if (shareToken) {
    const row = db
      .prepare(`SELECT * FROM dashboard_shares WHERE dashboard_id = ? AND share_token = ?`)
      .get(dashboardId, shareToken) as ShareRow | undefined;
    if (row) return row;
  }
  return null;
}

function resolveAccess(row: DashboardRow, viewerId: string | null, shareToken?: string): AccessRole {
  if (viewerId && row.owner_id === viewerId) return 'owner';
  const share = findShareForViewer(row.id, viewerId, shareToken);
  if (!share) return 'none';
  // A public-link edit permission still requires the viewer to be logged in,
  // so edits can be attributed to a real user.
  if (share.permission === 'edit' && viewerId) return 'editor';
  return 'viewer';
}

// ─── Read (with visibility filtering for non-owners) ────────────────────────

export interface DashboardView {
  dashboard: Dashboard;
  widgets: WidgetInstance[];
  role: AccessRole;
  owner: User | null;
}

export function getDashboardForViewer(dashboardId: string, viewerId: string | null, shareToken?: string): DashboardView {
  const row = getDashboardRow(dashboardId);
  if (!row) throw new NotFoundError('Dashboard not found');

  const role = resolveAccess(row, viewerId, shareToken);
  if (role === 'none') throw new AccessError('No access to this dashboard');

  const allWidgets = getWidgetRows(dashboardId).map(rowToWidget);
  const widgets = role === 'owner'
    ? allWidgets
    : allWidgets.filter((w) => {
        if (w.visibility === 'public') return true;
        if (w.visibility === 'friends') return !!viewerId && areFriends(viewerId, row.owner_id);
        return false; // private
      });

  return { dashboard: rowToDashboard(row), widgets, role, owner: getUsersByIds([row.owner_id])[0] ?? null };
}

export function listSharedWithMe(userId: string): { dashboard: Dashboard; owner: User; permission: 'view' | 'edit' }[] {
  const rows = db
    .prepare(`SELECT dashboard_id, permission FROM dashboard_shares WHERE shared_with_user_id = ?`)
    .all(userId) as { dashboard_id: string; permission: 'view' | 'edit' }[];

  return rows
    .map((r) => {
      const dashRow = getDashboardRow(r.dashboard_id);
      if (!dashRow) return null;
      const owner = getUsersByIds([dashRow.owner_id])[0];
      if (!owner) return null;
      return { dashboard: rowToDashboard(dashRow), owner, permission: r.permission };
    })
    .filter((x): x is { dashboard: Dashboard; owner: User; permission: 'view' | 'edit' } => x !== null);
}

// ─── Write (collaborative edits from non-owners) ─────────────────────────────
//
// Scoped deliberately narrow: only widget `configuration` can be edited this
// way, and only on widgets whose mode is 'collaborative'. Layout, add/remove,
// and dashboard settings remain owner-only, changed via re-publishing from
// the owner's local dashboard. This keeps a friend's editing rights limited
// to "fill in the kanban board", not "rearrange your dashboard".

export interface WidgetEdit {
  instanceId: string;
  configuration: Record<string, unknown>;
}

export interface SaveEditsResult {
  applied: string[];
  rejected: string[];
}

export function saveDashboardEdits(dashboardId: string, editorId: string, edits: WidgetEdit[]): SaveEditsResult {
  const row = getDashboardRow(dashboardId);
  if (!row) throw new NotFoundError('Dashboard not found');

  const role = resolveAccess(row, editorId);
  if (role === 'none' || role === 'viewer') throw new AccessError('No write access to this dashboard');

  const widgets = new Map(getWidgetRows(dashboardId).map((w) => [w.instance_id, w]));
  const applied: string[] = [];
  const rejected: string[] = [];

  const update = db.prepare(`UPDATE widget_instances SET configuration_json = ?, updated_at = unixepoch() WHERE instance_id = ?`);

  for (const edit of edits) {
    const widget = widgets.get(edit.instanceId);
    if (!widget) { rejected.push(edit.instanceId); continue; }
    if (role === 'owner' || widget.mode === 'collaborative') {
      update.run(JSON.stringify(edit.configuration), edit.instanceId);
      applied.push(edit.instanceId);
    } else {
      rejected.push(edit.instanceId);
    }
  }

  return { applied, rejected };
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export interface ShareRecord {
  id: string;
  dashboardId: string;
  sharedWithUserId: string | null;
  sharedWithUser: User | null;
  shareToken: string | null;
  permission: 'view' | 'edit';
}

function rowToShareRecord(row: ShareRow): ShareRecord {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    sharedWithUserId: row.shared_with_user_id,
    sharedWithUser: row.shared_with_user_id ? getUsersByIds([row.shared_with_user_id])[0] ?? null : null,
    shareToken: row.share_token,
    permission: row.permission,
  };
}

let idCounter = 0;
const genId = () => `sh_${Date.now().toString(36)}_${(++idCounter).toString(36)}`;

export function createShare(
  dashboardId: string,
  ownerId: string,
  opts: { sharedWithEmail?: string; permission: 'view' | 'edit'; isPublic?: boolean },
): ShareRecord {
  const row = getDashboardRow(dashboardId);
  if (!row) throw new NotFoundError('Dashboard not found');
  if (row.owner_id !== ownerId) throw new AccessError('Only the owner can share this dashboard');

  const id = genId();

  if (opts.isPublic) {
    const token = randomBytes(24).toString('hex');
    db.prepare(`
      INSERT INTO dashboard_shares (id, dashboard_id, shared_with_user_id, share_token, permission)
      VALUES (?, ?, NULL, ?, ?)
    `).run(id, dashboardId, token, opts.permission);
    return rowToShareRecord({ id, dashboard_id: dashboardId, shared_with_user_id: null, share_token: token, permission: opts.permission });
  }

  if (!opts.sharedWithEmail) throw new AccessError('sharedWithEmail or isPublic is required');
  const target = getUserByEmail(opts.sharedWithEmail);
  if (!target) throw new NotFoundError('No user found with that email');
  if (!areFriends(ownerId, target.id)) throw new AccessError('You can only share dashboards with friends');

  db.prepare(`
    INSERT INTO dashboard_shares (id, dashboard_id, shared_with_user_id, share_token, permission)
    VALUES (?, ?, ?, NULL, ?)
  `).run(id, dashboardId, target.id, opts.permission);
  return rowToShareRecord({ id, dashboard_id: dashboardId, shared_with_user_id: target.id, share_token: null, permission: opts.permission });
}

export function listShares(dashboardId: string, ownerId: string): ShareRecord[] {
  const row = getDashboardRow(dashboardId);
  if (!row) throw new NotFoundError('Dashboard not found');
  if (row.owner_id !== ownerId) throw new AccessError('Only the owner can view shares');

  const rows = db.prepare('SELECT * FROM dashboard_shares WHERE dashboard_id = ?').all(dashboardId) as ShareRow[];
  return rows.map(rowToShareRecord);
}

export function revokeShare(shareId: string, ownerId: string): void {
  const share = db.prepare('SELECT * FROM dashboard_shares WHERE id = ?').get(shareId) as ShareRow | undefined;
  if (!share) return;
  const row = getDashboardRow(share.dashboard_id);
  if (!row || row.owner_id !== ownerId) throw new AccessError('Only the owner can revoke shares');
  db.prepare('DELETE FROM dashboard_shares WHERE id = ?').run(shareId);
}
