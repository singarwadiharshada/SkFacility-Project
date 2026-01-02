// src/services/document.service.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    publicId: string;
    format: string;
    width: number;
    height: number;
  };
}

export interface DocumentData {
  id: string;
  url: string;
  publicId: string;
  format: string;
  name: string;
  size: string;
  uploadedBy: string;
  date: string;
  category: "uploaded" | "generated" | "template";
  description?: string;
}

export interface GetDocumentsResponse {
  success: boolean;
  message: string;
  data: DocumentData[];
  total?: number;
}

class DocumentService {
  // Upload single document
  async uploadDocument(file: File, folder?: string): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await axios.post(`${API_BASE_URL}/upload/single`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }
  
  // Upload multiple documents
  async uploadMultipleDocuments(files: File[], folder?: string): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await axios.post(`${API_BASE_URL}/upload/multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  // Delete document
async deleteDocument(publicIdOrDbId: string, fromCloudinary: boolean = true): Promise<any> {
  try {
    if (fromCloudinary) {
      // Delete from Cloudinary
      const response = await axios.delete(`${API_BASE_URL}/upload/${publicIdOrDbId}`);
      return response.data;
    } else {
      // Delete from database only
      const response = await axios.delete(`${API_BASE_URL}/documents/${publicIdOrDbId}`);
      return response.data;
    }
  } catch (error: any) {
    console.error('Error deleting document:', error);
    // Try to delete from database even if Cloudinary deletion fails
    if (fromCloudinary) {
      try {
        await axios.delete(`${API_BASE_URL}/documents/${publicIdOrDbId}`);
      } catch (dbError) {
        // Log but continue
        console.error('Also failed to delete from database:', dbError);
      }
    }
    throw error;
  }
}

  // Get all documents
  async getDocuments(category?: string): Promise<GetDocumentsResponse> {
    try {
      const params = category ? { category } : {};
      const response = await axios.get(`${API_BASE_URL}/documents`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch documents',
        data: []
      };
    }
  }

  // Get document by ID
  async getDocumentById(id: string): Promise<GetDocumentsResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/${id}`);
      return {
        success: true,
        message: 'Document fetched successfully',
        data: response.data.data ? [response.data.data] : []
      };
    } catch (error: any) {
      console.error('Error fetching document:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch document',
        data: []
      };
    }
  }

  // Save document metadata to database (call this after upload)
  async saveDocumentMetadata(documentData: {
    name: string;
    url: string;
    publicId: string;
    format: string;
    size: string;
    category: "uploaded" | "generated" | "template";
    description?: string;
    folder?: string;
  }): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/documents`, documentData);
      return response.data;
    } catch (error: any) {
      console.error('Error saving document metadata:', error);
      throw error;
    }
  }

  // Update document metadata
  async updateDocumentMetadata(id: string, updates: Partial<DocumentData>): Promise<any> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/documents/${id}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Error updating document metadata:', error);
      throw error;
    }
  }

  // Search documents
  async searchDocuments(query: string): Promise<GetDocumentsResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/search`, {
        params: { q: query }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error searching documents:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to search documents',
        data: []
      };
    }
  }
  
  // Get file extension
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  }

  // Get file type
  getFileType(extension: string): "PDF" | "XLSX" | "DOCX" | "JPG" | "PNG" | "OTHER" {
    const imageTypes = ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'SVG', 'WEBP'];
    const docTypes = ['DOC', 'DOCX', 'TXT', 'RTF'];
    const excelTypes = ['XLS', 'XLSX', 'CSV'];
    const pdfTypes = ['PDF'];
    
    const ext = extension.toUpperCase();
    if (imageTypes.includes(ext)) return 'JPG';
    if (docTypes.includes(ext)) return 'DOCX';
    if (excelTypes.includes(ext)) return 'XLSX';
    if (pdfTypes.includes(ext)) return 'PDF';
    
    return 'OTHER';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new DocumentService();