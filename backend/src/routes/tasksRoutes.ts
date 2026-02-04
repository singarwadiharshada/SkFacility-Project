import express from 'express';
import {
  getAllTasks,
  getTaskById,
  createTask,
  createMultipleTasks,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addHourlyUpdate,
  addAttachment,
  deleteAttachment,
  getTaskStats,
  searchTasks,
  getAssignees,
  getTasksByAssignee,
  getTasksByCreator,
  getTasksBySite
} from '../controllers/taskController';

const router = express.Router();

// Task routes
router.get('/', getAllTasks);
router.get('/search', searchTasks);
router.get('/stats', getTaskStats);
router.get('/assignees', getAssignees);
router.get('/assignee/:assigneeId', getTasksByAssignee);
router.get('/creator/:creatorId', getTasksByCreator);
router.get('/site/:siteName', getTasksBySite);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.post('/multiple', createMultipleTasks);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', updateTaskStatus);
router.post('/:id/hourly-updates', addHourlyUpdate);
router.post('/:id/attachments', addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

export default router;