'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil as PencilIcon, LayoutDashboard } from 'lucide-react';
import Providers from '@/lib/Providers';
import { useSharedDashboard } from '@/hooks/useSharedDashboard';
import { apiPatch } from '@/lib/apiClient';
import SharedWidgetPreview from '@/components/SharedWidgetPreview';

function SharedDashboardContent() {
  const params = useParams<{ dashboardId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? undefined;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useSharedDashboard(params.dashboardId, token);

  const handleSave = async (instanceId: string, configuration: Record<string, unknown>) => {
    await apiPatch(`/api/dashboards/${params.dashboardId}`, { edits: [{ instanceId, configuration }] });
    await queryClient.invalidateQueries({ queryKey: ['shared-dashboard', params.dashboardId, token] });
  };

  if (isLoading) {
    return (
      <div className="shared-page">
        <div className="shared-page-status">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="shared-page">
        <div className="shared-page-status">You don&apos;t have access to this dashboard, or it doesn&apos;t exist.</div>
      </div>
    );
  }

  const { dashboard, widgets, role, owner } = data;
  const sorted = [...widgets].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
  const RoleIcon = role === 'viewer' ? Eye : PencilIcon;

  return (
    <div className="shared-page">
      <header className="shared-page-header">
        <div className="shared-page-heading">
          <LayoutDashboard size={16} color="var(--accent)" />
          <div>
            <h1 className="shared-page-title">{dashboard.name}</h1>
            {owner && <span className="shared-page-owner">shared by {owner.name}</span>}
          </div>
        </div>
        <span className={`shared-role-badge shared-role-badge--${role}`}>
          <RoleIcon size={12} />
          {role}
        </span>
      </header>

      {sorted.length === 0 ? (
        <p className="shared-page-empty">Nothing to see here — no widgets on this dashboard are visible to you.</p>
      ) : (
        <div className="shared-widgets-grid">
          {sorted.map((w) => (
            <SharedWidgetPreview
              key={w.instanceId}
              widget={w}
              editable={(role === 'owner' || role === 'editor') && w.mode === 'collaborative'}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SharedDashboardPage() {
  return (
    <Providers>
      <SharedDashboardContent />
    </Providers>
  );
}
