import express, { Request, Response } from 'express';
import { StaffBriefingService } from '../services/staffBriefingService';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|mp4|mov|avi|mp3/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, documents, and videos are allowed'));
    }
  }
});

// Get all briefings
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      department: req.query.department as string || 'all',
      shift: req.query.shift as string || 'all',
      search: req.query.search as string || '',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10
    };

    const result = await StaffBriefingService.getAllBriefings(filters);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('GET /briefings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching staff briefingss'
    });
  }
});

// Get briefing statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await StaffBriefingService.getStatistics();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('GET /briefings/stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching statistics'
    });
  }
});

// Get single briefing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const briefing = await StaffBriefingService.getBriefingById(req.params.id);
    
    if (!briefing) {
      return res.status(404).json({
        success: false,
        message: 'Staff briefing not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: briefing
    });
  } catch (error: any) {
    console.error('GET /briefings/:id error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching staff briefing'
    });
  }
});

// Create new briefing with debugging
router.post('/', upload.array('attachments'), async (req: Request, res: Response) => {
  try {
    console.log('=== BRIEFING ROUTE: POST /briefings ===');
    console.log('Headers:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body));
    console.log('Files received:', req.files?.length || 0);
    
    const files = req.files as Express.Multer.File[];
    
    // Debug the data field
    let briefingData = {};
    try {
      if (req.body.data) {
        console.log('Raw data field:', req.body.data);
        briefingData = JSON.parse(req.body.data);
        console.log('Parsed briefing data:', briefingData);
      } else {
        console.log('No data field found. Available fields:', Object.keys(req.body));
        // Try to get data directly from body
        briefingData = req.body;
        console.log('Using request body as data:', briefingData);
      }
    } catch (parseError: any) {
      console.error('Error parsing briefing data:', parseError);
      console.log('Raw data field (string):', req.body.data?.substring(0, 200));
      return res.status(400).json({
        success: false,
        message: 'Invalid briefing data format: ' + parseError.message
      });
    }
    
    console.log('Files details:');
    files.forEach((file, index) => {
      console.log(`File ${index + 1}:`, {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        buffer: file.buffer ? `Buffer size: ${file.buffer.length}` : 'No buffer'
      });
    });
    
    const briefing = await StaffBriefingService.createBriefing(briefingData, files);
    
    console.log('Briefing created successfully:', briefing._id);
    
    res.status(201).json({
      success: true,
      message: 'Staff briefing created successfully',
      data: briefing
    });
  } catch (error: any) {
    console.error('Error creating staff briefing:', error);
    console.error('Error stack:', error.stack);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating staff briefing',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update briefing
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const briefing = await StaffBriefingService.updateBriefing(req.params.id, req.body);
    
    if (!briefing) {
      return res.status(404).json({
        success: false,
        message: 'Staff briefing not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Staff briefing updated successfully',
      data: briefing
    });
  } catch (error: any) {
    console.error('PUT /briefings/:id error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating staff briefing'
    });
  }
});

// Delete briefing
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const briefing = await StaffBriefingService.deleteBriefing(req.params.id);
    
    if (!briefing) {
      return res.status(404).json({
        success: false,
        message: 'Staff briefing not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Staff briefing deleted successfully'
    });
  } catch (error: any) {
    console.error('DELETE /briefings/:id error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting staff briefing'
    });
  }
});

// Update action item status
router.patch('/:briefingId/action-items/:actionItemId', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const briefing = await StaffBriefingService.updateActionItemStatus(
      req.params.briefingId,
      req.params.actionItemId,
      status
    );
    
    if (!briefing) {
      return res.status(404).json({
        success: false,
        message: 'Staff briefing or action item not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Action item status updated successfully',
      data: briefing
    });
  } catch (error: any) {
    console.error('PATCH action item status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating action item status'
    });
  }
});

// TEST endpoint
router.post('/test', upload.array('attachments'), async (req: Request, res: Response) => {
  try {
    console.log('Test endpoint hit');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    return res.status(200).json({
      success: true,
      message: 'Test successful',
      body: req.body,
      filesCount: req.files?.length || 0
    });
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;