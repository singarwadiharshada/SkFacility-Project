import express from 'express';
import { workQueryController } from '../controllers/workQuery.controller';
import {
  workQueryFileUpload,
  handleFileUploadErrors
} from '../middleware/workQueryMulter.middleware';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

const router = express.Router();

// ========== STATIC DATA ROUTES ==========

/**
 * GET all categories
 * GET /api/work-queries/categories
 */
router.get('/categories', (req, res) => {
  console.log('📋 GET /categories called');
  workQueryController.getCategories(req, res);
});

/**
 * GET all priorities
 * GET /api/work-queries/priorities
 */
router.get('/priorities', (req, res) => {
  console.log('⚡ GET /priorities called');
  workQueryController.getPriorities(req, res);
});

/**
 * GET all statuses
 * GET /api/work-queries/statuses
 */
router.get('/statuses', (req, res) => {
  console.log('📈 GET /statuses called');
  workQueryController.getStatuses(req, res);
});

/**
 * GET all service types
 * GET /api/work-queries/service-types
 */
router.get('/service-types', (req, res) => {
  console.log('🔧 GET /service-types called');
  workQueryController.getServiceTypes(req, res);
});

/**
 * GET statistics
 * GET /api/work-queries/statistics
 */
router.get('/statistics', (req, res) => {
  console.log('📊 GET /statistics called');
  workQueryController.getStatistics(req, res);
});

/**
 * GET recent work queries
 * GET /api/work-queries/recent
 */
router.get('/recent', (req, res) => {
  console.log('🕐 GET /recent called');
  workQueryController.getRecentWorkQueries(req, res);
});

// ========== PARAMETERIZED ROUTES ==========

/**
 * GET services for supervisor
 * GET /api/work-queries/supervisor/:supervisorId/services
 */
router.get('/supervisor/:supervisorId/services', (req, res) => {
  console.log('👨‍💼 GET /supervisor/:supervisorId/services called');
  workQueryController.getServicesForSupervisor(req, res);
});

/**
 * GET work query by queryId
 * GET /api/work-queries/query/:queryId
 */
router.get('/query/:queryId', (req, res) => {
  console.log('🔍 GET /query/:queryId called');
  workQueryController.getWorkQueryByQueryId(req, res);
});

// ========== DYNAMIC ID ROUTES (MUST BE LAST) ==========

/**
 * GET work query by ID
 * GET /api/work-queries/:id
 */
router.get('/:id', (req, res) => {
  console.log(`🔍 GET /:id called - ${req.params.id}`);
  workQueryController.getWorkQueryById(req, res);
});

// ========== OTHER ROUTES ==========

/**
 * GET all work queries
 * GET /api/work-queries
 */
router.get('/', (req, res) => {
  console.log('📋 GET / called');
  workQueryController.getAllWorkQueries(req, res);
});

/**
 * CREATE work query
 * POST /api/work-queries
 */
router.post(
  '/',
  workQueryFileUpload.array('proofFiles', 10),
  handleFileUploadErrors,
  (req: express.Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: express.Response<any, Record<string, any>>) => {
    console.log('➕ POST / called');
    workQueryController.createWorkQuery(req, res);
  }
);

/**
 * UPDATE work query status
 * PATCH /api/work-queries/:id/status
 */
router.patch('/:id/status', (req, res) => {
  console.log(`🔄 PATCH /:id/status called - ${req.params.id}`);
  workQueryController.updateWorkQueryStatus(req, res);
});

/**
 * ADD comment to work query
 * POST /api/work-queries/:id/comments
 */
router.post('/:id/comments', (req, res) => {
  console.log(`💬 POST /:id/comments called - ${req.params.id}`);
  workQueryController.addComment(req, res);
});

/**
 * ASSIGN work query
 * PATCH /api/work-queries/:id/assign
 */
router.patch('/:id/assign', (req, res) => {
  console.log(`👤 PATCH /:id/assign called - ${req.params.id}`);
  workQueryController.assignQuery(req, res);
});

/**
 * ADD files to work query
 * POST /api/work-queries/:id/files
 */
router.post(
  '/:id/files',
  workQueryFileUpload.array('files', 10),
  handleFileUploadErrors,
  (req: express.Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: express.Response<any, Record<string, any>>) => {
    console.log(`📎 POST /:id/files called - ${req.params.id}`);
    workQueryController.addFilesToWorkQuery(req, res);
  }
);

/**
 * REMOVE files from work query
 * DELETE /api/work-queries/:id/files
 */
router.delete('/:id/files', (req, res) => {
  console.log(`🗑️ DELETE /:id/files called - ${req.params.id}`);
  workQueryController.removeFilesFromWorkQuery(req, res);
});

/**
 * DELETE work query
 * DELETE /api/work-queries/:id
 */
router.delete('/:id', (req, res) => {
  console.log(`❌ DELETE /:id called - ${req.params.id}`);
  workQueryController.deleteWorkQuery(req, res);
});

export default router;