import { Request, Response } from 'express';
import Task from '../models/Task';
import Site from '../models/Site';
import User from '../models/User';

// Helper function to clean object
const cleanObject = (obj: any) => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Get all tasks
export const getAllTasks = async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching all tasks');
    
    const { 
      status, 
      priority, 
      siteId, 
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let filter: any = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (siteId) filter.siteId = siteId;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    
    const tasks = await Task.find(filter)
      .sort(sort)
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks', 
      error: error.message 
    });
  }
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching task with ID: ${id}`);
    
    const task = await Task.findById(id).lean();
    
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ message: 'Task not found' });
    }
    
    console.log(`✅ Found task: ${task.title}`);
    res.status(200).json(task);
  } catch (error: any) {
    console.error('❌ Error fetching task:', error);
    res.status(500).json({ 
      message: 'Error fetching task', 
      error: error.message 
    });
  }
};

// Create new task - UPDATED VERSION
export const createTask = async (req: Request, res: Response) => {
  try {
    console.log('📝 CREATE TASK REQUEST START ============');
    console.log('📦 Request body received:', JSON.stringify(req.body, null, 2));
    
    // Remove id fields
    const { _id, id, __v, ...requestData } = req.body;
    console.log('🧹 After removing id fields:', JSON.stringify(requestData, null, 2));
    
    // Clean the data - keep all fields including empty strings
    const cleanedData = requestData;
    
    // Validate required fields
    const requiredFields = [
      'title', 
      'description', 
      'assignedTo', 
      'assignedToName', 
      'priority', 
      'deadline', 
      'dueDateTime',
      'siteId',
      'siteName',
      'clientName',
      'createdBy'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const value = cleanedData[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }
    
    // Prepare task data
    const taskData: any = {
      title: String(cleanedData.title).trim(),
      description: String(cleanedData.description).trim(),
      assignedTo: String(cleanedData.assignedTo).trim(),
      assignedToName: String(cleanedData.assignedToName).trim(),
      priority: cleanedData.priority,
      status: cleanedData.status || 'pending',
      deadline: new Date(cleanedData.deadline),
      dueDateTime: new Date(cleanedData.dueDateTime),
      siteId: String(cleanedData.siteId).trim(),
      siteName: String(cleanedData.siteName).trim(),
      clientName: String(cleanedData.clientName).trim(),
      taskType: cleanedData.taskType || 'general',
      createdBy: String(cleanedData.createdBy).trim(),
      attachments: Array.isArray(cleanedData.attachments) ? cleanedData.attachments : [],
      hourlyUpdates: Array.isArray(cleanedData.hourlyUpdates) ? cleanedData.hourlyUpdates : []
    };
    
    console.log('📊 Final task data to save:', JSON.stringify(taskData, null, 2));
    
    // Validate dates
    if (isNaN(taskData.deadline.getTime()) || isNaN(taskData.dueDateTime.getTime())) {
      console.log('❌ Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    // Create new task instance
    const task = new Task(taskData);
    console.log('🏗️ Task instance created');
    
    // Save to database
    console.log('💾 Attempting to save task to database...');
    await task.save();
    
    console.log(`✅ Task created successfully! ID: ${task._id}, Title: ${task.title}`);
    console.log('📝 CREATE TASK REQUEST END ============\n');
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
    
  } catch (error: any) {
    console.error('❌ CREATE TASK ERROR ============');
    console.error('Error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error', 
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating task', 
      error: error.message
    });
  }
};

// Create multiple tasks (for bulk assignment)
export const createMultipleTasks = async (req: Request, res: Response) => {
  try {
    console.log('📝 CREATE MULTIPLE TASKS REQUEST START ============');
    console.log('📦 Request body received:', JSON.stringify(req.body, null, 2));
    
    const { tasks, createdBy } = req.body;
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tasks provided'
      });
    }
    
    console.log(`📦 Creating ${tasks.length} tasks`);
    
    const tasksToCreate = tasks.map((taskData: any, index: number) => {
      // Remove id fields from each task
      const { _id, id, __v, ...cleanTask } = taskData;
      
      return {
        ...cleanTask,
        deadline: new Date(cleanTask.deadline),
        dueDateTime: new Date(cleanTask.dueDateTime),
        status: 'pending',
        createdBy: createdBy || 'system'
      };
    });
    
    // Create tasks in database
    const createdTasks = await Task.insertMany(tasksToCreate);
    
    console.log(`✅ Successfully created ${createdTasks.length} tasks`);
    console.log('📝 CREATE MULTIPLE TASKS REQUEST END ============\n');
    
    res.status(201).json({
      success: true,
      message: `Successfully created ${createdTasks.length} tasks`,
      tasks: createdTasks
    });
    
  } catch (error: any) {
    console.error('❌ CREATE MULTIPLE TASKS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating tasks',
      error: error.message
    });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Updating task with ID: ${id}`);
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found for update: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    // Remove id fields
    const { _id, id: reqId, ...updateData } = req.body;
    
    // Update task fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        (task as any)[key] = updateData[key];
      }
    });
    
    await task.save();
    
    console.log(`✅ Task updated successfully: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating task', 
      error: error.message 
    });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting task with ID: ${id}`);
    
    const task = await Task.findByIdAndDelete(id);
    
    if (!task) {
      console.log(`❌ Task not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    console.log(`✅ Task deleted successfully: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      task
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting task', 
      error: error.message 
    });
  }
};

// Update task status
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Updating task status for ID: ${id} to ${status}`);
    
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    task.status = status;
    await task.save();
    
    console.log(`✅ Task status updated: ${task.title} is now ${status}`);
    
    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task
    });
  } catch (error: any) {
    console.error('Error updating task status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating task status', 
      error: error.message 
    });
  }
};

// Add hourly update to task
export const addHourlyUpdate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, submittedBy } = req.body;
    
    console.log(`📝 Adding hourly update to task ID: ${id}`);
    
    if (!content || !submittedBy) {
      return res.status(400).json({
        success: false,
        message: 'Content and submittedBy are required'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    const newUpdate = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      content: String(content).trim(),
      submittedBy: String(submittedBy).trim()
    };
    
    task.hourlyUpdates.push(newUpdate);
    await task.save();
    
    console.log(`✅ Hourly update added to task: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Hourly update added successfully',
      update: newUpdate,
      task
    });
  } catch (error: any) {
    console.error('Error adding hourly update:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding hourly update', 
      error: error.message 
    });
  }
};

// Add attachment to task
export const addAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filename, url, size, type } = req.body;
    
    console.log(`📎 Adding attachment to task ID: ${id}`);
    
    if (!filename || !url) {
      return res.status(400).json({
        success: false,
        message: 'Filename and URL are required'
      });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    const newAttachment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      filename: String(filename).trim(),
      url: String(url).trim(),
      uploadedAt: new Date(),
      size: size || 0,
      type: type || 'application/octet-stream'
    };
    
    task.attachments.push(newAttachment);
    await task.save();
    
    console.log(`✅ Attachment added to task: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Attachment added successfully',
      attachment: newAttachment,
      task
    });
  } catch (error: any) {
    console.error('Error adding attachment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding attachment', 
      error: error.message 
    });
  }
};

// Delete attachment from task
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { id, attachmentId } = req.params;
    
    console.log(`🗑️ Deleting attachment ${attachmentId} from task ID: ${id}`);
    
    const task = await Task.findById(id);
    if (!task) {
      console.log(`❌ Task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    
    const initialLength = task.attachments.length;
    task.attachments = task.attachments.filter(att => att.id !== attachmentId);
    
    if (task.attachments.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    await task.save();
    
    console.log(`✅ Attachment deleted from task: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
      task
    });
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting attachment', 
      error: error.message 
    });
  }
};

// Get task statistics
export const getTaskStats = async (req: Request, res: Response) => {
  try {
    console.log('📊 Getting task statistics');
    
    const stats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          highPriority: {
            $sum: {
              $cond: [{ $eq: ['$priority', 'high'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    // Get tasks grouped by assignee
    const tasksByAssignee = await Task.aggregate([
      {
        $group: {
          _id: '$assignedTo',
          count: { $sum: 1 },
          name: { $first: '$assignedToName' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const totalTasks = await Task.countDocuments();
    const totalAssignees = new Set(await Task.distinct('assignedTo')).size;
    
    console.log(`📊 Statistics: ${totalTasks} tasks, ${totalAssignees} assignees`);
    
    res.status(200).json({
      stats,
      tasksByAssignee,
      totalTasks,
      totalAssignees
    });
  } catch (error: any) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({ 
      message: 'Error fetching task statistics', 
      error: error.message 
    });
  }
};

// Search tasks
export const searchTasks = async (req: Request, res: Response) => {
  try {
    const { query, status, priority, siteId, assignedTo } = req.query;
    console.log(`🔍 Searching tasks with query: "${query}"`);
    
    let filter: any = {};
    
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { assignedToName: { $regex: query, $options: 'i' } },
        { siteName: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (siteId) filter.siteId = siteId;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
    
    console.log(`🔍 Found ${tasks.length} tasks matching search`);
    
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('Error searching tasks:', error);
    res.status(500).json({ 
      message: 'Error searching tasks', 
      error: error.message 
    });
  }
};

// Get assignees (managers and supervisors)
export const getAssignees = async (req: Request, res: Response) => {
  try {
    console.log('👥 Fetching assignees (managers and supervisors)');
    
    const { role } = req.query;
    
    let filter: any = { 
      isActive: true,
      role: { $in: ['manager', 'supervisor'] }
    };
    
    if (role) {
      filter.role = role;
    }
    
    const assignees = await User.find(filter)
      .select('_id name email phone role department assignedSites')
      .sort({ name: 1 })
      .lean();
    
    console.log(`✅ Found ${assignees.length} assignees`);
    
    res.status(200).json(assignees);
  } catch (error: any) {
    console.error('❌ Error fetching assignees:', error);
    res.status(500).json({ 
      message: 'Error fetching assignees', 
      error: error.message 
    });
  }
};

// Get tasks by assignee
export const getTasksByAssignee = async (req: Request, res: Response) => {
  try {
    const { assigneeId } = req.params;
    console.log(`📋 Fetching tasks for assignee: ${assigneeId}`);
    
    const tasks = await Task.find({ assignedTo: assigneeId })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks for assignee ${assigneeId}`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks by assignee:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks by assignee', 
      error: error.message 
    });
  }
};

// Get tasks by creator
export const getTasksByCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    console.log(`📋 Fetching tasks created by: ${creatorId}`);
    
    const tasks = await Task.find({ createdBy: creatorId })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks created by ${creatorId}`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks by creator:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks by creator', 
      error: error.message 
    });
  }
};

// Get tasks by site
export const getTasksBySite = async (req: Request, res: Response) => {
  try {
    const { siteName } = req.params;
    console.log(`📋 Fetching tasks for site: ${siteName}`);
    
    const tasks = await Task.find({ siteName: siteName })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Found ${tasks.length} tasks for site ${siteName}`);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('❌ Error fetching tasks by site:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks by site', 
      error: error.message 
    });
  }
};