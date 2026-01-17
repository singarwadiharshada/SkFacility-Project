import express, { Request, Response } from 'express';
import { TrainingService } from '../services/trainingService';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Get all training sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      department: req.query.department as string || 'all',
      status: req.query.status as string || 'all',
      search: req.query.search as string || '',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10
    };

    const result = await TrainingService.getAllTrainings(filters);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching training sessions'
    });
  }
});

// Get training statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await TrainingService.getStatistics();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching statistics'
    });
  }
});

// Get single training session
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const training = await TrainingService.getTrainingById(req.params.id);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: training
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching training session'
    });
  }
});

// Create new training session
router.post('/', upload.array('attachments'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const trainingData = JSON.parse(req.body.data || '{}');
    
    const training = await TrainingService.createTraining(trainingData, files);
    
    res.status(201).json({
      success: true,
      message: 'Training session created successfully',
      data: training
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating training session'
    });
  }
});

// Update training session
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const training = await TrainingService.updateTraining(req.params.id, req.body);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Training session updated successfully',
      data: training
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating training session'
    });
  }
});

// Delete training session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const training = await TrainingService.deleteTraining(req.params.id);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Training session deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting training session'
    });
  }
});
// Create new training session - add debugging
router.post('/', upload.array('attachments'), async (req: Request, res: Response) => {
  try {
    console.log('=== REQUEST RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body (req.body):', req.body);
    console.log('Files received:', req.files?.length || 0);
    
    const files = req.files as Express.Multer.File[];
    
    // Debug the data field
    let trainingData = {};
    try {
      if (req.body.data) {
        trainingData = JSON.parse(req.body.data);
        console.log('Parsed training data:', trainingData);
      } else {
        console.log('No data field found in request body');
        console.log('Available fields:', Object.keys(req.body));
      }
    } catch (parseError) {
      console.error('Error parsing training data:', parseError);
      console.log('Raw data field:', req.body.data);
      return res.status(400).json({
        success: false,
        message: 'Invalid training data format'
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
    
    const training = await TrainingService.createTraining(trainingData, files);
    
    console.log('Training created successfully:', training._id);
    
    res.status(201).json({
      success: true,
      message: 'Training session created successfully',
      data: training
    });
  } catch (error: any) {
    console.error('Error creating training session:', error);
    console.error('Error stack:', error.stack);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating training session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Update training status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!status || !['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const training = await TrainingService.updateTrainingStatus(req.params.id, status);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Training status updated successfully',
      data: training
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating training status'
    });
  }
});

// Add feedback to training
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const feedbackData = {
      ...req.body,
      submittedAt: new Date()
    };
    
    const training = await TrainingService.addFeedback(req.params.id, feedbackData);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Feedback added successfully',
      data: training
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding feedbacks'
    });
  }
});

export default router;