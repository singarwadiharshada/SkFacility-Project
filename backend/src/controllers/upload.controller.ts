// src/controllers/upload.controller.ts
import type { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import Document from '../models/documents.model';
import { IUser } from '../models/User';

const streamifier = require('streamifier');

// Custom Request interface with user property
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class UploadController {
  // ============ GET ALL DOCUMENTS ============
  static async getAllDocuments(req: Request, res: Response): Promise<void> {
    try {
      const documents = await Document.find({ isArchived: false })
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        count: documents.length,
        data: documents
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching documents',
        error: error.message
      });
    }
  }

  // ============ GET DOCUMENTS BY CATEGORY ============
  static async getDocumentsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const documents = await Document.find({ 
        category,
        isArchived: false 
      }).sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        count: documents.length,
        data: documents
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching documents by category',
        error: error.message
      });
    }
  }

  // ============ GET DOCUMENT BY ID ============
  static async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const document = await Document.findById(id).populate('uploadedBy', 'name email');
      
      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: document
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching document',
        error: error.message
      });
    }
  }

  // ============ CREATE DOCUMENT (Your existing uploadSingle) ============
  static async createDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      if (!process.env.CLOUDINARY_CLOUD_NAME || 
          !process.env.CLOUDINARY_API_KEY || 
          !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary configuration is missing');
      }

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: req.body.folder || 'documents',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        const bufferStream = streamifier.createReadStream(req.file!.buffer);
        bufferStream.pipe(uploadStream);
      });

      const documentData: any = {
        url: result.secure_url,
        public_id: result.public_id,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        folder: req.body.folder || 'documents',
      };

      if (req.body.description) {
        documentData.description = req.body.description;
      }
      
      if (req.body.category) {
        documentData.category = req.body.category;
      }
      
      if (req.body.tags) {
        documentData.tags = Array.isArray(req.body.tags) 
          ? req.body.tags 
          : req.body.tags.split(',').map((tag: string) => tag.trim());
      }

      if (req.user && req.user._id) {
        documentData.uploadedBy = req.user._id;
      }

      const document = new Document(documentData);
      const savedDocument = await document.save();
      
      res.status(201).json({
        success: true,
        message: 'Document created successfully',
        data: savedDocument
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error creating document',
        error: error.message
      });
    }
  }

  // ============ UPDATE DOCUMENT ============
  static async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, category, tags } = req.body;

      const updateData: any = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (category) updateData.category = category;
      if (tags) {
        updateData.tags = Array.isArray(tags) 
          ? tags 
          : tags.split(',').map((tag: string) => tag.trim());
      }

      const updatedDocument = await Document.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedDocument) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Document updated successfully',
        data: updatedDocument
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error updating document',
        error: error.message
      });
    }
  }

  // ============ DELETE DOCUMENT ============
  static async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Find the document first
      const document = await Document.findById(id);
      
      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      // Delete from Cloudinary if public_id exists
      if (document.public_id) {
        try {
          await cloudinary.uploader.destroy(document.public_id);
        } catch (cloudinaryError: any) {
          console.warn('Cloudinary deletion failed:', cloudinaryError.message);
          // Continue with database deletion even if Cloudinary fails
        }
      }

      // Delete from database
      await Document.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
        data: {
          id: document._id,
          filename: document.originalname
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error deleting document',
        error: error.message
      });
    }
  }

  // ============ SEARCH DOCUMENTS ============
  static async searchDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      const documents = await Document.find({
        $or: [
          { originalname: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
          { tags: { $regex: q, $options: 'i' } }
        ],
        isArchived: false
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: documents.length,
        data: documents
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error searching documents',
        error: error.message
      });
    }
  }

  // ============ YOUR EXISTING METHODS ============
  static async uploadSingle(req: AuthenticatedRequest, res: Response) {
    // Keep your existing uploadSingle implementation
    // This is the same as createDocument but kept for backward compatibility
    return this.createDocument(req, res);
  }

  static async uploadMultiple(req: AuthenticatedRequest, res: Response) {
    // Keep your existing uploadMultiple implementation
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // ... rest of your existing uploadMultiple code
      // Keep it as is
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
      });
    }
  }

  static async deleteFile(req: Request, res: Response) {
    // Keep your existing deleteFile implementation
    try {
      const { publicId } = req.params;
      
      // ... rest of your existing deleteFile code
      // Keep it as is
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Delete failed'
      });
    }
  }
}

export default UploadController;