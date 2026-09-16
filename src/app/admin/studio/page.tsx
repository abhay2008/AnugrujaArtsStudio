'use client';

import React, { useEffect } from 'react';
import { useSite } from '@/context/SiteContext';
import { AdminTopBar, CommitReviewModal, useCommitFlow } from '@/components/admin/AdminShell';
import StudioConsole from '@/components/admin/StudioConsole';

/**
 * "Do not show the preview" workspace.
 *
 * Uploading and metadata work happens here at full width; the site is never
 * rendered, so nothing competes with the forms.
 */
export default function AdminStudioPage() {
  const { content, setWorkspace, setEditMode } = useSite();
  const flow = useCommitFlow();

  useEffect(() => {
    setWorkspace('studio');
    setEditMode(false);
  }, [setEditMode, setWorkspace]);

  return (
    <div className="min-h-dvh pb-24">
      <AdminTopBar
        title="Studio Console"
        subtitle={`${content.brand.name} · no preview`}
        active="studio"
      />
      <StudioConsole flow={flow} />
      <CommitReviewModal flow={flow} />
    </div>
  );
}
