import express from 'express';
import {
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  toggleSiteStatus,
  getSiteStats,
  searchSites
} from '../controllers/siteController';

const router = express.Router();

// Site routes
router.get('/', getAllSites);
router.get('/search', searchSites);
router.get('/stats', getSiteStats);
router.get('/:id', getSiteById);
router.post('/', createSite);
router.put('/:id', updateSite);
router.delete('/:id', deleteSite);
router.patch('/:id/toggle-status', toggleSiteStatus);

export default router;