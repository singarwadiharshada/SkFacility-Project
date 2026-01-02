// backend/models/InventoryItem.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem extends Document {
  sku: string;
  name: string;
  department: string;
  category: string;
  site: string;
  assignedManager: string;
  quantity: number;
  price: number;
  costPrice: number;
  supplier: string;
  reorderLevel: number;
  description?: string;
  changeHistory: Array<{
    date: string;
    change: string;
    user: string;
    quantity: number;
  }>;
}

const InventoryItemSchema: Schema = new Schema({
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  department: { 
    type: String, 
    required: true,
    enum: ['cleaning', 'maintenance', 'office', 'paint', 'tools', 'canteen']
  },
  category: { type: String, required: true },
  site: { type: String, required: true },
  assignedManager: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  supplier: { type: String, required: true },
  reorderLevel: { type: Number, required: true, min: 0, default: 10 },
  description: { type: String },
  changeHistory: [{
    date: { type: String, required: true },
    change: { type: String, required: true },
    user: { type: String, required: true },
    quantity: { type: Number, required: true }
  }]
}, {
  timestamps: true,
  collection: 'inventory'  // Using 'inventory' as collection name
});

export default mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);