import express from 'express';
import { workQueryController } from '../controllers/workQuery.controller';
import {
  workQueryFileUpload,
  handleFileUploadErrors
} from '../middleware/workQueryMulter.middleware';

const router = express.Router();

// Static data routes
router.get('/categories', (req: express.Request, res: express.Response) => 
  workQueryController.getCategories(req, res)
);

router.get('/priorities', (req: express.Request, res: express.Response) => 
  workQueryController.getPriorities(req, res)
);

router.get('/statuses', (req: express.Request, res: express.Response) => 
  workQueryController.getStatuses(req, res)
);

router.get('/service-types', (req: express.Request, res: express.Response) => 
  workQueryController.getServiceTypes(req, res)
);

// Statistics and recent queries
router.get('/statistics', (req: express.Request, res: express.Response) => 
  workQueryController.getStatistics(req, res)
);

router.get('/recent', (req: express.Request, res: express.Response) => 
  workQueryController.getRecentWorkQueries(req, res)
);

// Get work query by queryId
router.get('/query/:queryId', (req: express.Request, res: express.Response) => 
  workQueryController.getWorkQueryByQueryId(req, res)
);

// Main CRUD routes
router.get('/', (req: express.Request, res: express.Response) => 
  workQueryController.getAllWorkQueries(req, res)
);

router.get('/:id', (req: express.Request, res: express.Response) => 
  workQueryController.getWorkQueryById(req, res)
);

// Create work query with file upload
router.post(
  '/',
  workQueryFileUpload.array('proofFiles', 10),
  handleFileUploadErrors,
  (req: express.Request, res: express.Response) => 
    workQueryController.createWorkQuery(req, res)
);

// Update status
router.patch('/:id/status', (req: express.Request, res: express.Response) => 
  workQueryController.updateWorkQueryStatus(req, res)
);

// Add files
router.post(
  '/:id/files',
  workQueryFileUpload.array('files', 10),
  handleFileUploadErrors,
  (req: express.Request, res: express.Response) => 
    workQueryController.addFilesToWorkQuery(req, res)
);

// Add comment
router.post('/:id/comments', (req: express.Request, res: express.Response) => 
  workQueryController.addComment(req, res)
);

// Delete work query
router.delete('/:id', (req: express.Request, res: express.Response) => 
  workQueryController.deleteWorkQuery(req, res)
);

export default router;