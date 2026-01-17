import StaffBriefing from '../models/StaffBriefing';
import { v2 as cloudinary } from 'cloudinary';

export class StaffBriefingService {
  // Get all briefings
  static async getAllBriefings(filters: any = {}) {
    const { department, shift, search, page = 1, limit = 10 } = filters;
    
    const query: any = {};
    
    if (department && department !== 'all') {
      query.department = department;
    }
    
    if (shift && shift !== 'all') {
      query.shift = shift;
    }
    
    if (search) {
      query.$or = [
        { conductedBy: { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } },
        { topics: { $regex: search, $options: 'i' } },
        { keyPoints: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [briefings, total] = await Promise.all([
      StaffBriefing.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StaffBriefing.countDocuments(query)
    ]);
    
    return {
      briefings,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get briefing by ID
  static async getBriefingById(id: string) {
    return await StaffBriefing.findById(id);
  }

  // Create new briefing with debugging
  static async createBriefing(briefingData: any, files: any[] = []) {
    console.log('=== StaffBriefingService.createBriefing ===');
    console.log('Briefing data received:', briefingData);
    console.log('Number of files:', files.length);
    
    // Handle file uploads to Cloudinary
    const attachments = [];
    
    if (files && files.length > 0) {
      console.log('Processing files...');
      
      for (const file of files) {
        try {
          if (file.buffer && file.buffer.length > 0) {
            console.log(`Uploading file: ${file.originalname}`);
            
            const result = await new Promise<any>((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'briefing-attachments',
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
              console.error('Cloudinary upload failed, no result returned');
              continue;
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
            console.warn('File has no buffer:', file.originalname);
          }
        } catch (fileError) {
          console.error('Error processing file:', file.originalname, fileError);
          // Continue with other files even if one fails
        }
      }
    }
    
    console.log('Attachments created:', attachments.length);
    
    // Format action items dates
    let actionItems = [];
    if (briefingData.actionItems && briefingData.actionItems.length > 0) {
      console.log('Processing action items:', briefingData.actionItems);
      actionItems = briefingData.actionItems.map((item: any) => {
        try {
          const dueDate = new Date(item.dueDate);
          if (isNaN(dueDate.getTime())) {
            console.error('Invalid due date:', item.dueDate);
            throw new Error(`Invalid due date: ${item.dueDate}`);
          }
          
          return {
            ...item,
            dueDate: dueDate
          };
        } catch (error) {
          console.error('Error processing action item:', item, error);
          throw new Error(`Invalid action item date format: ${item.dueDate}`);
        }
      });
    }
    
    // Format briefing date
    let briefingDate;
    try {
      briefingDate = new Date(briefingData.date);
      if (isNaN(briefingDate.getTime())) {
        throw new Error('Invalid briefing date format');
      }
    } catch (dateError) {
      console.error('Invalid briefing date:', briefingData.date, dateError);
      throw new Error('Invalid briefing date format. Please use YYYY-MM-DD');
    }
    
    // Validate required fields
    if (!briefingData.conductedBy || !briefingData.site) {
      throw new Error('Conducted By and Site are required fields');
    }
    
    console.log('Creating briefing document...');
    console.log('Action items to save:', actionItems);
    
    const newBriefing = new StaffBriefing({
      ...briefingData,
      date: briefingDate,
      actionItems,
      attachments,
      // Ensure these arrays exist even if empty
      topics: briefingData.topics || [],
      keyPoints: briefingData.keyPoints || []
    });

    console.log('Saving briefing to database....');
    const savedBriefing = await newBriefing.save();
    console.log('Briefing saved with ID:', savedBriefing._id);
    
    return savedBriefing;
  }

  // Update briefing
  static async updateBriefing(id: string, updateData: any) {
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    
    if (updateData.actionItems) {
      updateData.actionItems = updateData.actionItems.map((item: any) => ({
        ...item,
        dueDate: new Date(item.dueDate)
      }));
    }
    
    return await StaffBriefing.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  // Delete briefing
  static async deleteBriefing(id: string) {
    return await StaffBriefing.findByIdAndDelete(id);
  }

  // Update action item status
  static async updateActionItemStatus(
    briefingId: string, 
    actionItemId: string, 
    status: string
  ) {
    return await StaffBriefing.findByIdAndUpdate(
      briefingId,
      { $set: { "actionItems.$[item].status": status } },
      { 
        new: true,
        arrayFilters: [{ "item._id": actionItemId }]
      }
    );
  }

  // Get statistics
  static async getStatistics() {
    const [
      totalBriefings,
      morningBriefings,
      eveningBriefings,
      nightBriefings
    ] = await Promise.all([
      StaffBriefing.countDocuments(),
      StaffBriefing.countDocuments({ shift: 'morning' }),
      StaffBriefing.countDocuments({ shift: 'evening' }),
      StaffBriefing.countDocuments({ shift: 'night' })
    ]);

    const briefingsByDepartment = await StaffBriefing.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    const pendingActions = await StaffBriefing.aggregate([
      { $unwind: '$actionItems' },
      { $match: { 'actionItems.status': 'pending' } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);

    return {
      totalBriefings,
      morningBriefings,
      eveningBriefings,
      nightBriefings,
      briefingsByDepartment,
      pendingActions: pendingActions[0]?.count || 0
    };
  }
}