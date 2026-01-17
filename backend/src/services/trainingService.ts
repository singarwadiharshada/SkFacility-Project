import TrainingSession, { ITrainingSession } from '../models/TrainingSession';
import { v2 as cloudinary } from 'cloudinary';

export class TrainingService {
  // Get all training sessions
  static async getAllTrainings(filters: any = {}) {
    const { department, status, search, page = 1, limit = 10 } = filters;
    
    const query: any = {};
    
    if (department && department !== 'all') {
      query.department = department;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { trainer: { $regex: search, $options: 'i' } },
        { supervisor: { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [trainings, total] = await Promise.all([
      TrainingSession.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TrainingSession.countDocuments(query)
    ]);
    
    return {
      trainings,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get training by ID
  static async getTrainingById(id: string) {
    return await TrainingSession.findById(id);
  }

  // Create new training session
  static async createTraining(trainingData: any, files: any[] = []) {
    console.log('Service: Creating training with data:', trainingData);
    console.log('Service: Number of files:', files.length);
    
    let attachments = [];
    
    // Only process files if they exist and have buffers
    if (files && files.length > 0) {
      console.log('Service: Processing files....');
      
      for (const file of files) {
        try {
          if (file.buffer && file.buffer.length > 0) {
            console.log(`Service: Uploading file: ${file.originalname}`);
            
            const result = await new Promise<any>((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'training-attachments',
                  resource_type: 'auto'
                },
                (error, result) => {
                  if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                  } else {
                    console.log('Cloudinary upload success:', result?.public_id);
                    resolve(result);
                  }
                }
              );
              
              uploadStream.end(file.buffer);
            });

            // Check if result is valid
            if (!result || !result.secure_url) {
              console.error('Service: Cloudinary upload failed, no result returned');
              continue; // Skip this file
            }

            attachments.push({
              name: file.originalname,
              type: file.mimetype.startsWith('image/') ? 'image' : 
                    file.mimetype.startsWith('video/') ? 'video' : 'document',
              url: result.secure_url,
              size: `${(result.bytes / (1024 * 1024)).toFixed(1)} MB`,
              uploadedAt: new Date()
            });
          } else {
            console.warn('Service: File has no buffer:', file.originalname);
          }
        } catch (fileError) {
          console.error('Service: Error processing file:', file.originalname, fileError);
          // Continue with other files even if one fails
        }
      }
    }
    
    console.log('Service: Attachments created:', attachments.length);
    
    // Format date
    let trainingDate;
    try {
      trainingDate = new Date(trainingData.date);
      if (isNaN(trainingDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (dateError) {
      console.error('Service: Invalid date:', trainingData.date, dateError);
      throw new Error('Invalid date format. Please use YYYY-MM-DD');
    }
    
    // Validate required fields
    if (!trainingData.title || !trainingData.trainer) {
      throw new Error('Title and trainer are required fields');
    }
    
    console.log('Service: Creating training document...');
    
    const newTraining = new TrainingSession({
      ...trainingData,
      date: trainingDate,
      attachments,
      status: 'scheduled' // Default status
    });

    const savedTraining = await newTraining.save();
    console.log('Service: Training saved with ID:', savedTraining._id);
    
    return savedTraining;
  }

  // Update training session
  static async updateTraining(id: string, updateData: any) {
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    
    return await TrainingSession.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  // Delete training session
  static async deleteTraining(id: string) {
    return await TrainingSession.findByIdAndDelete(id);
  }

  // Update training status
  static async updateTrainingStatus(id: string, status: string) {
    return await TrainingSession.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
  }

  // Add feedback to training
  static async addFeedback(trainingId: string, feedbackData: any) {
    return await TrainingSession.findByIdAndUpdate(
      trainingId,
      { $push: { feedback: feedbackData } },
      { new: true }
    );
  }

  // Get statistics
  static async getStatistics() {
    const [
      totalTrainings,
      scheduledTrainings,
      ongoingTrainings,
      completedTrainings,
      cancelledTrainings
    ] = await Promise.all([
      TrainingSession.countDocuments(),
      TrainingSession.countDocuments({ status: 'scheduled' }),
      TrainingSession.countDocuments({ status: 'ongoing' }),
      TrainingSession.countDocuments({ status: 'completed' }),
      TrainingSession.countDocuments({ status: 'cancelled' })
    ]);

    const trainingsByType = await TrainingSession.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const trainingsByDepartment = await TrainingSession.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    return {
      totalTrainings,
      scheduledTrainings,
      ongoingTrainings,
      completedTrainings,
      cancelledTrainings,
      trainingsByType,
      trainingsByDepartment
    };
  }
}