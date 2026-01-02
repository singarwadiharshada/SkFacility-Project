import { Router } from 'express';
import multer from 'multer';
import UploadController from '../controllers/upload.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/// GET all documents
router.get('/', UploadController.getAllDocuments);

// GET documents by category
router.get('/category/:category', UploadController.getDocumentsByCategory);

// GET document by ID
router.get('/:id', UploadController.getDocumentById);

// POST create document metadata
router.post('/', UploadController.createDocument);

// PATCH update document
router.patch('/:id', UploadController.updateDocument);

// DELETE document (with Cloudinary cleanup)
router.delete('/:id', UploadController.deleteDocument);

// Search documents
router.get('/search/all', UploadController.searchDocuments);

export default router;