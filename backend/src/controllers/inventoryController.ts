// backend/controllers/inventoryController.ts
import { Request, Response } from 'express';
import InventoryItem from '../models/InventoryItem';

// Helper function for API response
const sendResponse = <T>(res: Response, data: T, success = true, message = '', statusCode = 200) => {
  res.status(statusCode).json({
    success,
    data,
    message
  });
};

export const getInventoryItems = async (req: Request, res: Response) => {
  try {
    const items = await InventoryItem.find();
    sendResponse(res, items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    sendResponse(res, [], false, 'Failed to fetch items', 500);
  }
};

export const getInventoryItem = async (req: Request, res: Response) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return sendResponse(res, null, false, 'Item not found', 404);
    }
    sendResponse(res, item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    sendResponse(res, null, false, 'Failed to fetch item', 500);
  }
};

export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const item = new InventoryItem(req.body);
    await item.save();
    sendResponse(res, item, true, 'Item created successfully', 201);
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    
    if (error.code === 11000) {
      sendResponse(res, null, false, 'SKU already exists', 400);
    } else {
      sendResponse(res, null, false, 'Failed to create item', 500);
    }
  }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return sendResponse(res, null, false, 'Item not found', 404);
    }
    
    sendResponse(res, item, true, 'Item updated successfully');
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    
    if (error.code === 11000) {
      sendResponse(res, null, false, 'SKU already exists', 400);
    } else {
      sendResponse(res, null, false, 'Failed to update item', 500);
    }
  }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return sendResponse(res, null, false, 'Item not found', 404);
    }
    
    sendResponse(res, { id: req.params.id }, true, 'Item deleted successfully');
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    sendResponse(res, null, false, 'Failed to delete item', 500);
  }
};

export const getInventoryStats = async (req: Request, res: Response) => {
  try {
    const totalItems = await InventoryItem.countDocuments();
    
    const items = await InventoryItem.find();
    const lowStockItems = items.filter(item => item.quantity <= item.reorderLevel).length;
    
    const totalValue = items.reduce((sum, item) => {
      return sum + (item.quantity * item.costPrice);
    }, 0);
    
    sendResponse(res, {
      totalItems,
      lowStockItems,
      totalValue
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    sendResponse(res, {
      totalItems: 0,
      lowStockItems: 0,
      totalValue: 0
    }, false, 'Failed to fetch stats', 500);
  }
};