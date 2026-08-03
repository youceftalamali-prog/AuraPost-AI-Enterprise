import { projectService } from './services/ProjectService';
import { projectPageService } from './services/ProjectPageService';
import { projectRepository } from './repositories/ProjectRepository';
import { projectPageRepository } from './repositories/ProjectPageRepository';
import { instrumentLegacyAdapter } from '../core/telemetry/legacyAdapterTelemetry';

/**
 * Backward-compatibility layer for the legacy `/api/images/projects*`
 * endpoints (server.ts), which previously read/wrote the flat
 * `image_studio_projects` table directly via server/db.ts. That table has
 * been retired in favor of the shared projects/project_pages schema (see
 * AUDIT_REPORT.md Issue #1 and scripts/migrate-image-studio-projects.ts).
 *
 * This adapter preserves the exact JSON shape the existing
 * `src/components/ImageStudio.tsx` frontend already expects
 * (`{id, workspaceId, name, aspectRatio, canvasWidth, canvasHeight, layers,
 * createdAt, updatedAt}`), so no frontend changes are required — every
 * "graphics" project is now, under the hood, a `projects` row (type=
 * 'design') with a single `project_pages` row holding the layer data.
 */

interface LegacyProjectShape {
  id: string;
  workspaceId: string;
  name: string;
  aspectRatio: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: string;
  createdAt: string;
  updatedAt: string;
}

async function toLegacyShape(projectId: string, workspaceId: string): Promise<LegacyProjectShape | null> {
  const project = await projectRepository.findById(projectId, workspaceId);
  if (!project) return null;
  const pages = await projectPageRepository.findByProject(projectId);
  const firstPage = pages[0];
  const metadata = (project.metadata as Record<string, any>) || {};

  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    aspectRatio: metadata.aspectRatio || '1:1',
    canvasWidth: firstPage?.width ?? project.canvasWidth ?? 800,
    canvasHeight: firstPage?.height ?? project.canvasHeight ?? 800,
    layers: JSON.stringify(firstPage?.layersSnapshot ?? []),
    createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : String(project.createdAt),
    updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : String(project.updatedAt),
  };
}

async function listLegacyImageStudioProjectsImpl(
  workspaceId: string,
  userId: string
): Promise<LegacyProjectShape[]> {
  const { projects: items } = await projectService.listProjects(workspaceId, { type: 'design' as any }, {
    page: 1,
    pageSize: 500,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  } as any);

  const results: LegacyProjectShape[] = [];
  for (const project of items) {
    const shaped = await toLegacyShape(project.id, workspaceId);
    if (shaped) results.push(shaped);
  }
  return results;
}

async function saveLegacyImageStudioProjectImpl(input: {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  aspectRatio: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: string;
}): Promise<void> {
  const existing = await projectRepository.findById(input.id, input.workspaceId);
  const layersSnapshot = (() => {
    try {
      return JSON.parse(input.layers);
    } catch {
      return [];
    }
  })();

  let projectId = input.id;
  if (!existing) {
    const created = await projectService.createProject({
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name,
      type: 'design',
      canvasWidth: input.canvasWidth,
      canvasHeight: input.canvasHeight,
    });
    // Preserve the client-supplied legacy id so subsequent saves/deletes
    // (keyed on that same id) keep resolving to this project.
    await projectRepository.update(created.id, { id: input.id } as any);
    projectId = input.id;
  } else {
    await projectRepository.update(projectId, {
      name: input.name,
      canvasWidth: input.canvasWidth,
      canvasHeight: input.canvasHeight,
      metadata: { ...(existing.metadata as object), aspectRatio: input.aspectRatio },
      updatedAt: new Date(),
    } as any);
  }

  const pages = await projectPageRepository.findByProject(projectId);
  const firstPage = pages[0];
  if (firstPage) {
    await projectPageService.saveLayersSnapshot(firstPage.id, projectId, input.userId, input.workspaceId, layersSnapshot);
  } else {
    await projectPageService.createPage(projectId, input.userId, input.workspaceId, {
      name: 'Page 1',
      width: input.canvasWidth,
      height: input.canvasHeight,
      layersSnapshot,
    });
  }
}

async function deleteLegacyImageStudioProjectImpl(projectId: string, workspaceId: string, userId: string): Promise<void> {
  await projectService.deleteProject(projectId, userId, workspaceId);
}

async function duplicateLegacyImageStudioProjectImpl(
  projectId: string,
  workspaceId: string,
  userId: string,
  newId: string,
  newName: string
): Promise<void> {
  const source = await toLegacyShape(projectId, workspaceId);
  if (!source) return;
  await saveLegacyImageStudioProject({
    id: newId,
    workspaceId,
    userId,
    name: newName,
    aspectRatio: source.aspectRatio,
    canvasWidth: source.canvasWidth,
    canvasHeight: source.canvasHeight,
    layers: source.layers,
  });
}

/**
 * Instrumented exports — every call is logged and persisted to
 * `legacy_adapter_usage` per policy (see server/core/telemetry/legacyAdapterTelemetry.ts).
 * Signatures are unchanged from the *Impl functions above, so no caller
 * (server.ts, server/db.ts's deprecated pass-throughs) needs to change.
 */
export const listLegacyImageStudioProjects = instrumentLegacyAdapter(
  { adapterName: 'legacyImageStudioAdapter', endpoint: 'GET /api/images/projects' },
  listLegacyImageStudioProjectsImpl
);

export const saveLegacyImageStudioProject = instrumentLegacyAdapter(
  { adapterName: 'legacyImageStudioAdapter', endpoint: 'POST /api/images/projects' },
  saveLegacyImageStudioProjectImpl
);

export const deleteLegacyImageStudioProject = instrumentLegacyAdapter(
  { adapterName: 'legacyImageStudioAdapter', endpoint: 'DELETE /api/images/projects/:id' },
  deleteLegacyImageStudioProjectImpl
);

export const duplicateLegacyImageStudioProject = instrumentLegacyAdapter(
  { adapterName: 'legacyImageStudioAdapter', endpoint: 'POST /api/images/projects/:id/duplicate' },
  duplicateLegacyImageStudioProjectImpl
);
