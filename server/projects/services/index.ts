/**
 * Projects Services - Barrel Export
 * Phase: 5.3 Part 5
 */

export { ProjectService, projectService } from './ProjectService';
export type { CreateProjectInput, UpdateProjectInput } from './ProjectService';

export { ProjectPageService, projectPageService } from './ProjectPageService';

export { ProjectVersionService, projectVersionService } from './ProjectVersionService';
export type { CreateVersionInput, RestoreVersionInput, VersionComparison } from './ProjectVersionService';

export { ProjectShareService, projectShareService } from './ProjectShareService';
export type {
  ShareWithUserInput,
  ShareWithWorkspaceInput,
  CreatePublicLinkInput,
  ShareLinkResponse,
} from './ProjectShareService';

export { ProjectSearchService, projectSearchService } from './ProjectSearchService';
export type { SearchQuery } from './ProjectSearchService';

export { ProjectDuplicateService, projectDuplicateService } from './ProjectDuplicateService';