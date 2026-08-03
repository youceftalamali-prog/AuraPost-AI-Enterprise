/**
 * Asset Routes
 * REST API endpoints for all asset-related operations
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import multer from 'multer';
import { AssetController } from '../controllers/AssetController';
import { AssetUploadController } from '../controllers/AssetUploadController';
import { FolderController } from '../controllers/FolderController';
import { CollectionController } from '../controllers/CollectionController';
import { AssetSearchController } from '../controllers/AssetSearchController';
import { AssetVersionController } from '../controllers/AssetVersionController';

const router = Router();

// Memory storage: AssetUploadController/AssetUploadService read `.buffer`
// directly and stream it through the Storage Abstraction Layer (see
// server/storage) rather than touching disk themselves — matches the
// original design intent, no route previously wired this middleware in at
// all (req.file/req.files were always undefined at runtime before this).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB — generous ceiling for video/large images; AssetUploadService applies its own per-type validation
});

// ============================================
// ASSET CRUD & LIFECYCLE
// ============================================

/**
 * @swagger
 * /api/assets:
 *   post:
 *     summary: Create a new asset record
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', AssetController.createAsset);

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: List assets with filters and pagination
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', AssetController.listAssets);

/**
 * @swagger
 * /api/assets/bulk:
 *   post:
 *     summary: Execute bulk action on multiple assets
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/bulk', AssetController.executeBulkAction);

/**
 * @swagger
 * /api/assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', AssetController.getAsset);

/**
 * @swagger
 * /api/assets/{id}:
 *   put:
 *     summary: Update asset
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', AssetController.updateAsset);

/**
 * @swagger
 * /api/assets/{id}:
 *   delete:
 *     summary: Soft delete asset (move to trash)
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', AssetController.deleteAsset);

/**
 * @swagger
 * /api/assets/{id}/restore:
 *   post:
 *     summary: Restore asset from trash
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/restore', AssetController.restoreAsset);

/**
 * @swagger
 * /api/assets/{id}/archive:
 *   post:
 *     summary: Archive asset
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/archive', AssetController.archiveAsset);

/**
 * @swagger
 * /api/assets/{id}/favorite:
 *   post:
 *     summary: Toggle favorite
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/favorite', AssetController.toggleFavorite);

/**
 * @swagger
 * /api/assets/{id}/pin:
 *   post:
 *     summary: Toggle pin
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/pin', AssetController.togglePin);

/**
 * @swagger
 * /api/assets/{id}/statistics:
 *   get:
 *     summary: Get asset statistics
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/statistics', AssetController.getAssetStatistics);

// ============================================
// ASSET LISTS & FILTERS
// ============================================

router.get('/favorites', AssetController.getFavoriteAssets);
router.get('/pinned', AssetController.getPinnedAssets);
router.get('/recent', AssetController.getRecentAssets);
router.get('/most-used', AssetController.getMostUsedAssets);
router.get('/ai-generated', AssetController.getAIGeneratedAssets);
router.get('/trash', AssetController.getTrashedAssets);
router.get('/archived', AssetController.getArchivedAssets);
router.get('/duplicates', AssetController.findDuplicateAssets);
router.get('/workspace/statistics', AssetController.getWorkspaceStatistics);

// ============================================
// ASSET UPLOAD
// ============================================

/**
 * @swagger
 * /api/assets/upload:
 *   post:
 *     summary: Upload a single file
 *     tags: [Asset Upload]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/upload', upload.single('file'), AssetUploadController.uploadFile);

/**
 * @swagger
 * /api/assets/upload-multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Asset Upload]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/upload-multiple', upload.array('files', 20), AssetUploadController.uploadMultipleFiles);

/**
 * @swagger
 * /api/assets/upload/base64:
 *   post:
 *     summary: Upload file from base64 string
 *     tags: [Asset Upload]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/upload/base64', AssetUploadController.uploadBase64);

/**
 * @swagger
 * /api/assets/upload/url:
 *   post:
 *     summary: Upload file from URL
 *     tags: [Asset Upload]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/upload/url', AssetUploadController.uploadFromUrl);

// ============================================
// FOLDERS
// ============================================

/**
 * @swagger
 * /api/assets/folders:
 *   post:
 *     summary: Create a new folder
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/folders', FolderController.createFolder);

/**
 * @swagger
 * /api/assets/folders:
 *   get:
 *     summary: Get all folders for workspace
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/folders', FolderController.getFolders);

/**
 * @swagger
 * /api/assets/folders/root:
 *   get:
 *     summary: Get root folders
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/folders/root', FolderController.getRootFolders);

/**
 * @swagger
 * /api/assets/folders/tree:
 *   get:
 *     summary: Get folder tree
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/folders/tree', FolderController.getFolderTree);

/**
 * @swagger
 * /api/assets/folders/{id}:
 *   get:
 *     summary: Get folder by ID
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/folders/:id', FolderController.getFolder);

/**
 * @swagger
 * /api/assets/folders/{id}:
 *   put:
 *     summary: Update folder
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/folders/:id', FolderController.updateFolder);

/**
 * @swagger
 * /api/assets/folders/{id}:
 *   delete:
 *     summary: Delete folder
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/folders/:id', FolderController.deleteFolder);

/**
 * @swagger
 * /api/assets/folders/{id}/restore:
 *   post:
 *     summary: Restore folder
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/folders/:id/restore', FolderController.restoreFolder);

/**
 * @swagger
 * /api/assets/folders/{id}/subfolders:
 *   get:
 *     summary: Get subfolders
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/folders/:id/subfolders', FolderController.getSubfolders);

/**
 * @swagger
 * /api/assets/folders/{id}/path:
 *   get:
 *     summary: Get folder path (breadcrumb)
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/folders/:id/path', FolderController.getFolderPath);

/**
 * @swagger
 * /api/assets/folders/{id}/move:
 *   post:
 *     summary: Move folder to new parent
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/folders/:id/move', FolderController.moveFolder);

/**
 * @swagger
 * /api/assets/folders/{id}/statistics:
 *   get:
 *     summary: Get folder statistics
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/folders/:id/statistics', FolderController.getFolderStatistics);

/**
 * @swagger
 * /api/assets/move-to-folder:
 *   post:
 *     summary: Move assets to folder
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/move-to-folder', FolderController.moveAssetsToFolder);

// ============================================
// COLLECTIONS
// ============================================

/**
 * @swagger
 * /api/assets/collections:
 *   post:
 *     summary: Create a new collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/collections', CollectionController.createCollection);

/**
 * @swagger
 * /api/assets/collections:
 *   get:
 *     summary: Get all collections for workspace
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/collections', CollectionController.getCollections);

/**
 * @swagger
 * /api/assets/collections/public:
 *   get:
 *     summary: Get public collections
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/collections/public', CollectionController.getPublicCollections);

/**
 * @swagger
 * /api/assets/collections/smart:
 *   get:
 *     summary: Get smart collections
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/collections/smart', CollectionController.getSmartCollections);

/**
 * @swagger
 * /api/assets/collections/{id}:
 *   get:
 *     summary: Get collection by ID
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/collections/:id', CollectionController.getCollection);

/**
 * @swagger
 * /api/assets/collections/{id}/with-assets:
 *   get:
 *     summary: Get collection with assets
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/collections/:id/with-assets', CollectionController.getCollectionWithAssets);

/**
 * @swagger
 * /api/assets/collections/{id}:
 *   put:
 *     summary: Update collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/collections/:id', CollectionController.updateCollection);

/**
 * @swagger
 * /api/assets/collections/{id}:
 *   delete:
 *     summary: Delete collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/collections/:id', CollectionController.deleteCollection);

/**
 * @swagger
 * /api/assets/collections/{id}/restore:
 *   post:
 *     summary: Restore collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/collections/:id/restore', CollectionController.restoreCollection);

/**
 * @swagger
 * /api/assets/collections/{id}/assets:
 *   post:
 *     summary: Add assets to collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/collections/:id/assets', CollectionController.addAssetsToCollection);

/**
 * @swagger
 * /api/assets/collections/{id}/assets:
 *   delete:
 *     summary: Remove assets from collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/collections/:id/assets', CollectionController.removeAssetsFromCollection);

/**
 * @swagger
 * /api/assets/collections/{id}/cover:
 *   post:
 *     summary: Set collection cover
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/collections/:id/cover', CollectionController.setCollectionCover);

/**
 * @swagger
 * /api/assets/collections/{id}/refresh:
 *   post:
 *     summary: Refresh smart collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/collections/:id/refresh', CollectionController.refreshSmartCollection);

/**
 * @swagger
 * /api/assets/collections/{id}/duplicate:
 *   post:
 *     summary: Duplicate collection
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/collections/:id/duplicate', CollectionController.duplicateCollection);

/**
 * @swagger
 * /api/assets/collections/{id}/statistics:
 *   get:
 *     summary: Get collection statistics
 *     tags: [Collections]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/collections/:id/statistics', CollectionController.getCollectionStatistics);

// ============================================
// SEARCH
// ============================================

/**
 * @swagger
 * /api/assets/search:
 *   get:
 *     summary: Advanced search with filters
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search', AssetSearchController.search);

/**
 * @swagger
 * /api/assets/search/fulltext:
 *   get:
 *     summary: Full text search
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/fulltext', AssetSearchController.fullTextSearch);

/**
 * @swagger
 * /api/assets/search/by-tags:
 *   get:
 *     summary: Search by tags
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-tags', AssetSearchController.searchByTags);

/**
 * @swagger
 * /api/assets/search/by-color:
 *   get:
 *     summary: Search by color
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-color', AssetSearchController.searchByColor);

/**
 * @swagger
 * /api/assets/search/by-date:
 *   get:
 *     summary: Search by date range
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-date', AssetSearchController.searchByDate);

/**
 * @swagger
 * /api/assets/search/by-size:
 *   get:
 *     summary: Search by file size range
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-size', AssetSearchController.searchBySize);

/**
 * @swagger
 * /api/assets/search/by-dimensions:
 *   get:
 *     summary: Search by dimensions
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-dimensions', AssetSearchController.searchByDimensions);

/**
 * @swagger
 * /api/assets/search/by-type/{type}:
 *   get:
 *     summary: Get assets by type
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-type/:type', AssetSearchController.getByType);

/**
 * @swagger
 * /api/assets/search/suggestions:
 *   get:
 *     summary: Get search suggestions (autocomplete)
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/suggestions', AssetSearchController.getSearchSuggestions);

/**
 * @swagger
 * /api/assets/search/facets:
 *   get:
 *     summary: Get search facets (for filtering UI)
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/facets', AssetSearchController.getSearchFacets);

/**
 * @swagger
 * /api/assets/search/similar/{id}:
 *   get:
 *     summary: Find similar assets
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/similar/:id', AssetSearchController.findSimilarAssets);

/**
 * @swagger
 * /api/assets/search/count-by-type:
 *   get:
 *     summary: Get asset count by type
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/count-by-type', AssetSearchController.getCountByType);

// ============================================
// VERSIONS
// ============================================

/**
 * @swagger
 * /api/assets/{id}/versions:
 *   get:
 *     summary: List version history for an asset
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/versions', AssetVersionController.listVersions);

/**
 * @swagger
 * /api/assets/{id}/versions:
 *   post:
 *     summary: Create a new version snapshot
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/versions', AssetVersionController.createVersion);

/**
 * @swagger
 * /api/assets/{id}/versions/latest:
 *   get:
 *     summary: Get latest version
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/versions/latest', AssetVersionController.getLatestVersion);

/**
 * @swagger
 * /api/assets/{id}/versions/count:
 *   get:
 *     summary: Get version count
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/versions/count', AssetVersionController.getVersionCount);

/**
 * @swagger
 * /api/assets/{id}/versions/cleanup:
 *   post:
 *     summary: Delete old versions (keep last N)
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/versions/cleanup', AssetVersionController.cleanupVersions);

/**
 * @swagger
 * /api/assets/{id}/versions/all:
 *   delete:
 *     summary: Delete all versions for an asset
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id/versions/all', AssetVersionController.deleteAllVersions);

/**
 * @swagger
 * /api/assets/versions/{versionId}:
 *   get:
 *     summary: Get a specific version
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/versions/:versionId', AssetVersionController.getVersion);

/**
 * @swagger
 * /api/assets/versions/{versionId}/restore:
 *   post:
 *     summary: Restore a version
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/versions/:versionId/restore', AssetVersionController.restoreVersion);

/**
 * @swagger
 * /api/assets/versions/{versionId}:
 *   delete:
 *     summary: Delete a version
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/versions/:versionId', AssetVersionController.deleteVersion);

/**
 * @swagger
 * /api/assets/{id}/versions/compare:
 *   post:
 *     summary: Compare two versions
 *     tags: [Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/versions/compare', AssetVersionController.compareVersions);

export default router;