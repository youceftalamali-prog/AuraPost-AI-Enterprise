/**
 * Assets Services - Barrel Export
 * Phase: 5.3 Part 5
 */

export { AssetService, assetService } from './AssetService';
export type { CreateAssetInput, UpdateAssetInput } from './AssetService';

export { AssetUploadService, assetUploadService } from './AssetUploadService';
export type { UploadFile, UploadOptions } from './AssetUploadService';

export { AssetFolderService, assetFolderService } from './AssetFolderService';
export type {
  CreateFolderInput,
  UpdateFolderInput,
  FolderTree,
} from './AssetFolderService';

export { AssetCollectionService, assetCollectionService } from './AssetCollectionService';
export type {
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionWithAssets,
} from './AssetCollectionService';

export { AssetSearchService, assetSearchService } from './AssetSearchService';
export type { SearchQuery, SearchSuggestion, SearchFacets } from './AssetSearchService';

export { AssetVersionService, assetVersionService } from './AssetVersionService';
export type {
  CreateVersionInput,
  RestoreVersionInput,
  VersionComparison,
} from './AssetVersionService';