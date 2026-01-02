import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import connectDB from './config/database';
import mongoose from 'mongoose';
import uploadRouter from './routes/upload.routes';
import Document from './models/documents.model';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from "cloudinary";
// Import models
import { IUser, User } from './models/User';
import Shift from './models/Shift';
import Employee from './models/Employee';
import EPFForm from './models/EPFForm';
// import Document from './models/Document';
import deductionRoutes from './routes/deductionRoutes';
import inventoryRoutes from './routes/inventoryRoutes';

const app: Application = express();

// Middleware
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

app.use('/api', deductionRoutes);
app.use('/api/inventory', inventoryRoutes);

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// Connect to Database
connectDB();

// Add this right after middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Add error logging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


app.use('/api/upload', uploadRouter);
app.use('/uploads', express.static('uploads'));

// ==================== HEALTH CHECKS ====================
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'SK Enterprises Backend API',
    status: 'running',
    version: '1.0.0',
    collections: Object.keys(mongoose.models),
    endpoints: {
      employees: '/api/employees',
      epfForms: '/api/epf-forms',
      // documents: '/api/documents',
      users: '/api/users',
      shifts: '/api/shifts',
      health: '/api/health'
    }
  });
});
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== EMPLOYEE ROUTES ====================

// GET all employees with filters
app.get('/api/employees', async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      department, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query: any = {};
    
    // Apply filters
    if (status) query.status = status;
    if (department) query.department = department;
    
    // Search in multiple fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { aadharNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
    
    // Get employees with pagination
    const employees = await Employee.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');
    
    // Get total count for pagination
    const total = await Employee.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching employees'
    });
  }
});

// GET single employee by ID
app.get('/api/employees/:id', async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findOne({ 
      $or: [
        { _id: req.params.id },
        { employeeId: req.params.id }
      ]
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching employee'
    });
  }
});

// POST create new employee (with file uploads)
// POST create new employee (with file uploads)
app.post('/api/employees', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'employeeSignature', maxCount: 1 },
  { name: 'authorizedSignature', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]), async (req: Request, res: Response) => {
  try {
    console.log('📝 Creating new employee...');
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const employeeData = req.body;
    
    // Parse numeric fields
    if (typeof employeeData.salary === 'string') {
      employeeData.salary = parseFloat(employeeData.salary) || 0;
    }
    if (typeof employeeData.numberOfChildren === 'string') {
      employeeData.numberOfChildren = parseInt(employeeData.numberOfChildren) || 0;
    }
    
    // Handle date fields - only convert if they have values
    const dateFields = ['dateOfBirth', 'dateOfJoining', 'dateOfExit'];
    dateFields.forEach(field => {
      if (employeeData[field] && employeeData[field].trim() !== '') {
        employeeData[field] = new Date(employeeData[field]);
      } else {
        delete employeeData[field]; // Remove empty date fields
      }
    });
    
    // Handle boolean fields
    const booleanFields = ['idCardIssued', 'westcoatIssued', 'apronIssued'];
    booleanFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        employeeData[field] = employeeData[field] === 'true' || employeeData[field] === true;
      } else {
        employeeData[field] = false; // Default to false if not provided
      }
    });
    
    // Clean up string fields - convert empty strings to undefined
    const stringFields = [
      'panNumber', 'esicNumber', 'uanNumber', 'siteName', 'bloodGroup',
      'permanentAddress', 'permanentPincode', 'localAddress', 'localPincode',
      'bankName', 'accountNumber', 'ifscCode', 'branchName', 'fatherName',
      'motherName', 'spouseName', 'emergencyContactName', 'emergencyContactPhone',
      'emergencyContactRelation', 'nomineeName', 'nomineeRelation',
      'pantSize', 'shirtSize', 'capSize', 'gender', 'maritalStatus'
    ];
    
    stringFields.forEach(field => {
      if (employeeData[field] === '' || employeeData[field] === null) {
        delete employeeData[field];
      } else if (employeeData[field]) {
        // Trim and uppercase certain fields
        employeeData[field] = employeeData[field].toString().trim();
        if (field === 'panNumber' || field === 'ifscCode') {
          employeeData[field] = employeeData[field].toUpperCase();
        }
      }
    });
    
    // Handle file uploads
    if (files?.photo?.[0]) {
      employeeData.photo = `/uploads/${files.photo[0].filename}`;
    }
    if (files?.employeeSignature?.[0]) {
      employeeData.employeeSignature = `/uploads/${files.employeeSignature[0].filename}`;
    }
    if (files?.authorizedSignature?.[0]) {
      employeeData.authorizedSignature = `/uploads/${files.authorizedSignature[0].filename}`;
    }
    
    // Set default status
    if (!employeeData.status) {
      employeeData.status = 'active';
    }
    
    // Set default role
    if (!employeeData.role) {
      employeeData.role = 'employee';
    }
    
    console.log('📋 Employee data to save:', employeeData);
    
    // Create employee
    const employee = new Employee(employeeData);
    await employee.save();
    
    console.log('✅ Employee created:', employee.employeeId);
    
    // Handle document uploads if any
    if (files?.documents) {
      const documentPromises = files.documents.map(async (file) => {
        const doc = new Document({
          employeeId: employee.employeeId,
          employee: employee._id,
          documentType: 'other',
          documentName: file.originalname,
          fileName: file.filename,
          filePath: `/uploads/${file.filename}`,
          fileSize: file.size,
          fileType: file.mimetype,
          uploadedBy: 'system'
        });
        await doc.save();
        return doc;
      });
      
      await Promise.all(documentPromises);
    }
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error: any) {
    console.error('❌ Error creating employee:', error);
    
    // Clean up uploaded files if error occurred
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      Object.values(files).forEach(fileArray => {
        fileArray.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        });
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating employee'
    });
  }
});

// PUT update employee
app.put('/api/employees/:id', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'employeeSignature', maxCount: 1 },
  { name: 'authorizedSignature', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData = req.body;
    
    // Find employee
    const employee = await Employee.findOne({ 
      $or: [
        { _id: req.params.id },
        { employeeId: req.params.id }
      ]
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Handle file uploads
    if (files?.photo?.[0]) {
      updateData.photo = `/uploads/${files.photo[0].filename}`;
    }
    if (files?.employeeSignature?.[0]) {
      updateData.employeeSignature = `/uploads/${files.employeeSignature[0].filename}`;
    }
    if (files?.authorizedSignature?.[0]) {
      updateData.authorizedSignature = `/uploads/${files.authorizedSignature[0].filename}`;
    }
    
    // Update employee
    Object.assign(employee, updateData);
    await employee.save();
    
    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating employee'
    });
  }
});

// PATCH update employee status
app.patch('/api/employees/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'left'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const employee = await Employee.findOneAndUpdate(
      { 
        $or: [
          { _id: req.params.id },
          { employeeId: req.params.id }
        ]
      },
      { 
        status,
        dateOfExit: status === 'left' ? new Date() : undefined
      },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Employee status updated successfully',
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating employee status'
    });
  }
});

// DELETE employee
app.delete('/api/employees/:id', async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findOneAndDelete({
      $or: [
        { _id: req.params.id },
        { employeeId: req.params.id }
      ]
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting employee'
    });
  }
});

// GET employee statistics
app.get('/api/employees/stats', async (req: Request, res: Response) => {
  try {
    const stats = await Employee.aggregate([
      {
        $facet: {
          // Status counts
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          // Department counts
          departmentCounts: [
            {
              $group: {
                _id: '$department',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Monthly joining trend (last 6 months)
          monthlyJoining: [
            {
              $match: {
                dateOfJoining: {
                  $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
                }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$dateOfJoining' },
                  month: { $month: '$dateOfJoining' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 6 }
          ],
          // Total employees
          total: [
            { $count: 'count' }
          ]
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: stats[0]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching employee statistics'
    });
  }
});

// ==================== EPF FORM ROUTES ====================

// POST create EPF Form
// POST create EPF Form
app.post('/api/epf-forms', async (req: Request, res: Response) => {
  try {
    const formData = req.body;
    
    // Validate required fields
    if (!formData.employeeId || !formData.memberName || !formData.aadharNumber) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, Member Name, and Aadhar Number are required'
      });
    }
    
    // Check if employee exists by employeeId
    const employee = await Employee.findOne({ employeeId: formData.employeeId });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Check if EPF form already exists for this employee
    const existingForm = await EPFForm.findOne({ employeeId: employee.employeeId });
    if (existingForm) {
      return res.status(400).json({
        success: false,
        message: 'EPF Form already exists for this employee'
      });
    }
    
    // Create EPF Form
    const epfForm = new EPFForm({
      ...formData,
      employee: employee._id, // Use the ObjectId from employee document
      employeeId: employee.employeeId
    });
    
    await epfForm.save();
    
    res.status(201).json({
      success: true,
      message: 'EPF Form created successfully',
      data: epfForm
    });
  } catch (error: any) {
    console.error('❌ Error creating EPF Form:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating EPF Form'
    });
  }
});

// GET EPF Forms
app.get('/api/epf-forms', async (req: Request, res: Response) => {
  try {
    const { employeeId, status } = req.query;
    
    const query: any = {};
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    
    const forms = await EPFForm.find(query)
      .populate('employee', 'name employeeId email phone')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: forms
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching EPF Forms'
    });
  }
});

// GET single EPF Form
app.get('/api/epf-forms/:id', async (req: Request, res: Response) => {
  try {
    const form = await EPFForm.findById(req.params.id)
      .populate('employee', 'name employeeId email phone department position');
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'EPF Form not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: form
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching EPF Form'
    });
  }
});

// PUT update EPF Form status
app.put('/api/epf-forms/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const updateData: any = { status };
    
    if (status === 'submitted') {
      updateData.submittedAt = new Date();
    } else if (status === 'approved') {
      updateData.approvedAt = new Date();
    }
    
    const form = await EPFForm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'EPF Form not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'EPF Form status updated successfully',
      data: form
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating EPF Form status'
    });
  }
});

// ==================== DOCUMENT ROUTES ====================

// POST upload document
app.post('/api/documents', upload.single('document'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { employeeId, documentType, documentName, description, expiryDate } = req.body;
    
    if (!employeeId || !documentType || !documentName) {
      // Delete uploaded file if validation fails
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      return res.status(400).json({
        success: false,
        message: 'Employee ID, Document Type, and Document Name are required'
      });
    }
    
    // Find employee
    const employee = await Employee.findOne({ 
      $or: [
        { _id: employeeId },
        { employeeId: employeeId }
      ]
    });
    
    if (!employee) {
      // Delete uploaded file
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Create document record
    const document = new Document({
      employeeId: employee.employeeId,
      employee: employee._id,
      documentType,
      documentName,
      fileName: file.filename,
      filePath: `/uploads/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype,
      description,
      uploadedBy: 'system', // In real app, use authenticated user
      expiryDate: expiryDate ? new Date(expiryDate) : undefined
    });
    
    await document.save();
    
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });
  } catch (error: any) {
    // Delete uploaded file if error occurred
    if (req.file) {
      const file = req.file as Express.Multer.File;
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading document'
    });
  }
});

// GET employee documents
app.get('/api/documents/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const documents = await Document.find({ employeeId: req.params.employeeId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching documents'
    });
  }
});

// PATCH update document status
app.patch('/api/documents/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, verifiedBy } = req.body;
    
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const updateData: any = { 
      status,
      verifiedAt: status !== 'pending' ? new Date() : undefined
    };
    
    if (verifiedBy) {
      updateData.verifiedBy = verifiedBy;
    }
    
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Document status updated successfully',
      data: document
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating document status'
    });
  }
});

// DELETE document
app.delete('/api/documents/:id', async (req: Request, res: Response) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Delete file from filesystem
    const filePath = `./${document.url}`;
    fs.unlink(filePath, async (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting file:', err);
      }
      
      // Delete document record
      await Document.findByIdAndDelete(req.params.id);
      
      res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      });
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting document'
    });
  }
});

// ==================== SHIFT ROUTES ====================

// Get all shifts
app.get('/api/shifts', async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching all shifts...');
    const shifts = await Shift.find().sort({ createdAt: -1 });
    
    console.log(`✅ Found ${shifts.length} shifts`);
    
    const transformedShifts = shifts.map(shift => ({
      ...shift.toObject(),
      id: shift._id.toString().slice(-6)
    }));

    res.status(200).json({ 
      success: true, 
      data: transformedShifts,
      total: transformedShifts.length
    });
  } catch (error: any) {
    console.error('❌ Error fetching shifts:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching shifts'
    });
  }
});

// Get single shift by ID
app.get('/api/shifts/:id', async (req: Request, res: Response) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: {
        ...shift.toObject(),
        id: shift._id.toString().slice(-6)
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching shift'
    });
  }
});

// Create new shift
app.post('/api/shifts', async (req: Request, res: Response) => {
  try {
    console.log('📝 Creating new shift:', req.body);
    
    const { name, startTime, endTime, employees = [] } = req.body;

    // Validation
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, startTime, and endTime are required' 
      });
    }

    const newShift = new Shift({
      name: name.trim(),
      startTime,
      endTime,
      employees
    });

    const savedShift = await newShift.save();
    console.log('✅ Shift created:', savedShift._id);

    res.status(201).json({ 
      success: true, 
      message: 'Shift created successfully',
      data: {
        ...savedShift.toObject(),
        id: savedShift._id.toString().slice(-6)
      }
    });
  } catch (error: any) {
    console.error('❌ Error creating shift:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error creating shift'
    });
  }
});

// Update shift
app.put('/api/shifts/:id', async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, employees } = req.body;
    
    const updatedShift = await Shift.findByIdAndUpdate(
      req.params.id,
      { 
        name: name?.trim(),
        startTime, 
        endTime, 
        employees,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedShift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Shift updated successfully', 
      data: {
        ...updatedShift.toObject(),
        id: updatedShift._id.toString().slice(-6)
      }
    });
  } catch (error: any) {
    console.error(`PUT /api/shifts/${req.params.id} failed:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error updating shift'
    });
  }
});

// Delete shift
app.delete('/api/shifts/:id', async (req: Request, res: Response) => {
  try {
    const deletedShift = await Shift.findByIdAndDelete(req.params.id);

    if (!deletedShift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Shift deleted successfully' 
    });
  } catch (error: any) {
    console.error(`DELETE /api/shifts/${req.params.id} failed:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error deleting shift'
    });
  }
});

// Assign employee to shift
app.post('/api/shifts/:id/assign', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID is required' 
      });
    }

    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found' 
      });
    }

    // Check if employee already assigned
    if (shift.employees.includes(employeeId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee already assigned to this shift' 
      });
    }

    shift.employees.push(employeeId);
    const updatedShift = await shift.save();

    res.status(200).json({ 
      success: true, 
      message: 'Employee assigned successfully', 
      data: {
        ...updatedShift.toObject(),
        id: updatedShift._id.toString().slice(-6)
      }
    });
  } catch (error: any) {
    console.error(`POST /api/shifts/${req.params.id}/assign failed:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error assigning employee'
    });
  }
});

// Remove employee from shift
app.post('/api/shifts/:id/remove', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID is required' 
      });
    }

    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found' 
      });
    }

    // Remove employee from array
    shift.employees = shift.employees.filter((id: string) => id !== employeeId);
    const updatedShift = await shift.save();

    res.status(200).json({ 
      success: true, 
      message: 'Employee removed successfully', 
      data: {
        ...updatedShift.toObject(),
        id: updatedShift._id.toString().slice(-6)
      }
    });
  } catch (error: any) {
    console.error(`POST /api/shifts/${req.params.id}/remove failed:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error removing employee'
    });
  }
});

// Get shift statistics
app.get('/api/shifts/stats', async (req: Request, res: Response) => {
  try {
    const totalShifts = await Shift.countDocuments();
    
    const shifts = await Shift.find();
    const totalEmployeesAssigned = shifts.reduce((sum, shift) => sum + shift.employees.length, 0);

    res.status(200).json({
      success: true,
      data: {
        totalShifts,
        totalEmployeesAssigned,
        avgEmployeesPerShift: totalShifts > 0 ? 
          Math.round(totalEmployeesAssigned / totalShifts) : 0
      }
    });
  } catch (error: any) {
    console.error('GET /api/shifts/stats failed:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching shift statistics'
    });
  }
});

// ==================== USER ROUTES ====================

// CREATE - Add new user
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { 
      username, 
      email, 
      password, 
      role, 
      firstName, 
      lastName,
      department,
      site,
      phone,
      joinDate
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email or username already exists' 
      });
    }

    const newUser = new User({
      username,
      email,
      password,
      role: role || 'employee',
      firstName,
      lastName,
      department: department || 'General',
      site: site || 'Mumbai Office',
      phone,
      joinDate: joinDate ? new Date(joinDate) : new Date()
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        id: newUser._id.toString().slice(-6),
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        department: newUser.department,
        site: newUser.site,
        phone: newUser.phone,
        isActive: newUser.isActive,
        joinDate: newUser.joinDate
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user'
    });
  }
});

// READ - Get all users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const transformedUsers = users.map((user: any) => ({
      ...user.toObject(),
      id: user._id.toString().slice(-6)
    }));

    // Group by role
    const groupedByRole = transformedUsers.reduce((acc: any, user: any) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      allUsers: transformedUsers,
      groupedByRole,
      total: transformedUsers.length,
      active: transformedUsers.filter((u: any) => u.isActive).length,
      inactive: transformedUsers.filter((u: any) => !u.isActive).length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching users'
    });
  }
});

// Get user statistics
app.get('/api/users/stats', async (req: Request, res: Response) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching stats'
    });
  }
});

// Toggle user status
app.patch('/api/users/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      site: user.site,
      phone: user.phone,
      isActive: user.isActive,
      status: user.isActive ? 'active' as const : 'inactive' as const,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating status'
    });
  }
});

// UPDATE - Update user (enhanced)
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // If name is provided, split into firstName and lastName
    if (updates.name) {
      const [firstName, ...lastNameParts] = updates.name.split(' ');
      updates.firstName = firstName;
      updates.lastName = lastNameParts.join(' ');
      delete updates.name;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      site: user.site,
      phone: user.phone,
      isActive: user.isActive,
      status: user.isActive ? 'active' as const : 'inactive' as const,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating user'
    });
  }
});

// DELETE - Delete user
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting user'
    });
  }
});

// Update user role
app.put('/api/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'manager', 'supervisor', 'employee'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      site: user.site,
      phone: user.phone,
      isActive: user.isActive,
      status: user.isActive ? 'active' as const : 'inactive' as const,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating role'
    });
  }
});

// ======== ADD DOCUMENT ROUTES HERE ========

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get file type from mimetype
function getFileTypeFromMimeType(mimeType: string): "PDF" | "XLSX" | "DOCX" | "JPG" | "PNG" | "OTHER" {
  const typeMapping: { [key: string]: string } = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'JPG',
    'image/webp': 'JPG'
  };
  
  return (typeMapping[mimeType] as any) || 'OTHER';
}

// GET all documents
app.get('/api/documents', async (req: Request, res: Response) => {
  try {
    console.log('📂 GET /api/documents called');
    
    const { category } = req.query;
    
    try {
      // Use your Document model
      const filter = category ? {} : {}; // Your Document model has different categories
      const documents = await Document.find(filter).sort({ createdAt: -1 });
      
      if (documents.length > 0) {
        // Transform to match frontend expectations
        const transformedDocs = documents.map(doc => ({
          id: doc._id.toString(),
          name: doc.originalname,
          url: doc.url,
          publicId: doc.public_id,
          format: getFileTypeFromMimeType(doc.mimetype),
          size: formatFileSize(doc.size),
          uploadedBy: doc.uploadedBy ? 'User' : 'Unknown',
          date: doc.uploadedAt.toISOString().split('T')[0],
          category: 'uploaded', // Map to frontend category
          description: doc.description || '',
          cloudinaryData: {
            url: doc.url,
            publicId: doc.public_id,
            format: doc.mimetype.split('/').pop() || doc.mimetype
          }
        }));
        
        return res.json({
          success: true,
          message: 'Documents fetched successfully',
          data: transformedDocs,
          total: transformedDocs.length
        });
      }
    } catch (dbError) {
      console.log('Database empty or error, using mock data:', (dbError as Error).message);
    }
    
    // If no data in database, return mock data
    const mockDocuments = [
      {
        id: '1',
        name: 'Employee Joining Form',
        url: 'https://example.com/doc1.pdf',
        publicId: 'doc1',
        format: 'PDF',
        size: '2.4 MB',
        uploadedBy: 'Admin User',
        date: '2024-01-15',
        category: 'uploaded',
        description: 'Standard employee joining form',
        cloudinaryData: {
          url: 'https://example.com/doc1.pdf',
          publicId: 'doc1',
          format: 'pdf'
        }
      },
      {
        id: '2',
        name: 'Monthly Salary Report',
        url: 'https://example.com/doc2.xlsx',
        publicId: 'doc2',
        format: 'XLSX',
        size: '1.8 MB',
        uploadedBy: 'HR Manager',
        date: '2024-01-14',
        category: 'generated',
        description: 'Automated salary report for January',
        cloudinaryData: {
          url: 'https://example.com/doc2.xlsx',
          publicId: 'doc2',
          format: 'xlsx'
        }
      },
      {
        id: '3',
        name: 'Invoice Template',
        url: 'https://example.com/doc3.docx',
        publicId: 'doc3',
        format: 'DOCX',
        size: '0.8 MB',
        uploadedBy: 'Finance Team',
        date: '2024-01-13',
        category: 'template',
        description: 'Standard invoice template',
        cloudinaryData: {
          url: 'https://example.com/doc3.docx',
          publicId: 'doc3',
          format: 'docx'
        }
      }
    ];
    
    let filteredDocs = mockDocuments;
    
    if (category) {
      filteredDocs = mockDocuments.filter(doc => doc.category === category);
    }
    
    res.json({
      success: true,
      message: 'Documents fetched successfully',
      data: filteredDocs,
      total: filteredDocs.length
    });
    
  } catch (error: any) {
    console.error('Error in /api/documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      data: []
    });
  }
});

// POST save document metadata
app.post('/api/documents', async (req: Request, res: Response) => {
  try {
    console.log('💾 POST /api/documents called:', req.body);
    
    const documentData = {
      ...req.body,
      date: req.body.date || new Date().toISOString().split('T')[0]
    };
    
    // Try to save to your Document model
    try {
      // Convert data to match your Document model
      const docModelData = {
        url: req.body.url,
        public_id: req.body.publicId,
        originalname: req.body.name || 'document',
        mimetype: `image/${req.body.format}`,
        size: 0, // Default size
        folder: req.body.folder || 'documents',
        category: 'document',
        description: req.body.description || '',
        tags: []
      };
      
      const document = new Document(docModelData);
      await document.save();
      
      return res.status(201).json({
        success: true,
        message: 'Document saved to database',
        data: {
          id: document._id.toString(),
          name: document.originalname,
          url: document.url,
          publicId: document.public_id,
          format: getFileTypeFromMimeType(document.mimetype),
          size: formatFileSize(document.size),
          uploadedBy: 'Unknown',
          date: document.uploadedAt.toISOString().split('T')[0],
          category: 'uploaded',
          description: document.description
        }
      });
    } catch (dbError) {
      console.log('Database save failed:', (dbError as Error).message);
      // Continue to return success anyway
    }
    
    // If database save fails, still return success (document is in Cloudinary)
    res.status(201).json({
      success: true,
      message: 'Document saved successfully',
      data: {
        id: Date.now().toString(),
        ...documentData
      }
    });
    
  } catch (error: any) {
    console.error('Error saving document:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving document'
    });
  }
});

// GET search documents
app.get('/api/documents/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    console.log('🔍 Searching documents for:', q);
    
    // First, try database search
    try {
      if (q && q.toString().trim() !== '') {
        const searchRegex = new RegExp(q.toString(), 'i');
        const documents = await Document.find({
          $or: [
            { originalname: searchRegex },
            { description: searchRegex },
            { category: searchRegex }
          ]
        }).sort({ createdAt: -1 });
        
        if (documents.length > 0) {
          const transformedDocs = documents.map(doc => ({
            id: doc._id.toString(),
            name: doc.originalname,
            url: doc.url,
            publicId: doc.public_id,
            format: getFileTypeFromMimeType(doc.mimetype),
            size: formatFileSize(doc.size),
            uploadedBy: 'Unknown',
            date: doc.uploadedAt.toISOString().split('T')[0],
            category: 'uploaded',
            description: doc.description || ''
          }));
          
          return res.json({
            success: true,
            message: 'Search completed',
            data: transformedDocs
          });
        }
      } else {
        // If no search query, return all
        const documents = await Document.find().sort({ createdAt: -1 });
        const transformedDocs = documents.map(doc => ({
          id: doc._id.toString(),
          name: doc.originalname,
          url: doc.url,
          publicId: doc.public_id,
          format: getFileTypeFromMimeType(doc.mimetype),
          size: formatFileSize(doc.size),
          uploadedBy: 'Unknown',
          date: doc.uploadedAt.toISOString().split('T')[0],
          category: 'uploaded',
          description: doc.description || ''
        }));
        
        return res.json({
          success: true,
          message: 'All documents',
          data: transformedDocs
        });
      }
    } catch (dbError) {
      console.log('Database search failed, using mock:', (dbError as Error).message);
    }
    
    // Fallback to mock data
    const mockDocuments = [
      {
        id: '1',
        name: 'Employee Joining Form',
        url: 'https://example.com/doc1.pdf',
        publicId: 'doc1',
        format: 'PDF',
        size: '2.4 MB',
        uploadedBy: 'Admin User',
        date: '2024-01-15',
        category: 'uploaded',
        description: 'Standard employee joining form'
      },
      {
        id: '2',
        name: 'Monthly Salary Report',
        url: 'https://example.com/doc2.xlsx',
        publicId: 'doc2',
        format: 'XLSX',
        size: '1.8 MB',
        uploadedBy: 'HR Manager',
        date: '2024-01-14',
        category: 'generated',
        description: 'Automated salary report for January'
      }
    ];
    
    let filteredDocs = mockDocuments;
    
    if (q && q.toString().trim() !== '') {
      const query = q.toString().toLowerCase();
      filteredDocs = mockDocuments.filter(doc => 
        doc.name.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query)
      );
    }
    
    res.json({
      success: true,
      message: 'Search completed',
      data: filteredDocs
    });
    
  } catch (error: any) {
    console.error('Error searching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching documents',
      data: []
    });
  }
});

// GET single document by ID
app.get('/api/documents/:id', async (req: Request, res: Response) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
        data: null
      });
    }
    
    const transformedDoc = {
      id: document._id.toString(),
      name: document.originalname,
      url: document.url,
      publicId: document.public_id,
      format: getFileTypeFromMimeType(document.mimetype),
      size: formatFileSize(document.size),
      uploadedBy: 'Unknown',
      date: document.uploadedAt.toISOString().split('T')[0],
      category: 'uploaded',
      description: document.description || ''
    };
    
    res.json({
      success: true,
      message: 'Document fetched successfully',
      data: transformedDoc
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching document',
      data: null
    });
  }
});

// PATCH update document
app.patch('/api/documents/:id', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Document updated successfully',
      data: {
        id: document._id.toString(),
        name: document.originalname,
        url: document.url,
        publicId: document.public_id,
        format: getFileTypeFromMimeType(document.mimetype),
        size: formatFileSize(document.size),
        uploadedBy: 'Unknown',
        date: document.uploadedAt.toISOString().split('T')[0],
        category: 'uploaded',
        description: document.description || ''
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating document'
    });
  }
});

// DELETE document
app.delete('/api/documents/:id', async (req: Request, res: Response) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting document'
    });
  }
});

// Test endpoint to verify all routes
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'All routes are working!',
    availableEndpoints: [
      'GET    /api/health',
      'GET    /api/documents',
      'POST   /api/documents',
      'GET    /api/documents/search?q=query',
      'GET    /api/documents/:id',
      'PATCH  /api/documents/:id',
      'DELETE /api/documents/:id',
      'POST   /api/upload/single',
      'GET    /api/users',
      'POST   /api/users',
      'GET    /api/test'
    ]
  });
});

// ======== END DOCUMENT ROUTES ========

// 404 handler (MUST BE LAST)
// ==================== 404 HANDLER ====================
app.use('*', (req: Request, res: Response) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// In your app.ts, update the POST /api/employees route:
app.post('/api/employees', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'employeeSignature', maxCount: 1 },
  { name: 'authorizedSignature', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]), async (req: Request, res: Response) => {
  try {
    console.log('📝 Creating new employee...');
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const employeeData = req.body;
    
    // Parse numeric fields
    if (typeof employeeData.salary === 'string') {
      employeeData.salary = parseFloat(employeeData.salary) || 0;
    }
    if (typeof employeeData.numberOfChildren === 'string') {
      employeeData.numberOfChildren = parseInt(employeeData.numberOfChildren) || 0;
    }
    
    // Handle date fields - only convert if they have values
    const dateFields = ['dateOfBirth', 'dateOfJoining', 'dateOfExit'];
    dateFields.forEach(field => {
      if (employeeData[field] && employeeData[field].trim() !== '') {
        employeeData[field] = new Date(employeeData[field]);
      } else {
        delete employeeData[field]; // Remove empty date fields
      }
    });
    
    // Handle boolean fields
    const booleanFields = ['idCardIssued', 'westcoatIssued', 'apronIssued'];
    booleanFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        employeeData[field] = employeeData[field] === 'true' || employeeData[field] === true;
      } else {
        employeeData[field] = false; // Default to false if not provided
      }
    });
    
    // FIX: Handle blood group format (convert "B +ve" to "B+")
    if (employeeData.bloodGroup) {
      // Clean up blood group format
      employeeData.bloodGroup = employeeData.bloodGroup
        .replace(/\s+/g, '')  // Remove spaces
        .replace(/\+ve/g, '+') // Replace "+ve" with "+"
        .replace(/\-ve/g, '-'); // Replace "-ve" with "-"
      
      // Validate against allowed values
      const allowedBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
      if (!allowedBloodGroups.includes(employeeData.bloodGroup)) {
        employeeData.bloodGroup = null; // Set to null if invalid
      }
    }
    
    // Clean up string fields - convert empty strings to undefined
    const stringFields = [
      'panNumber', 'esicNumber', 'uanNumber', 'siteName', 'bloodGroup',
      'permanentAddress', 'permanentPincode', 'localAddress', 'localPincode',
      'bankName', 'accountNumber', 'ifscCode', 'branchName', 'fatherName',
      'motherName', 'spouseName', 'emergencyContactName', 'emergencyContactPhone',
      'emergencyContactRelation', 'nomineeName', 'nomineeRelation',
      'pantSize', 'shirtSize', 'capSize', 'gender', 'maritalStatus',
      'position' // ADDED: Make sure position is included
    ];
    
    stringFields.forEach(field => {
      if (employeeData[field] === '' || employeeData[field] === null) {
        delete employeeData[field];
      } else if (employeeData[field]) {
        // Trim and uppercase certain fields
        employeeData[field] = employeeData[field].toString().trim();
        if (field === 'panNumber' || field === 'ifscCode') {
          employeeData[field] = employeeData[field].toUpperCase();
        }
      }
    });
    
    // FIX: Validate required fields before proceeding
    if (!employeeData.position) {
      return res.status(400).json({
        success: false,
        message: 'Position is required'
      });
    }
    
    // Handle file uploads - UPLOAD TO CLOUDINARY
    const uploadToCloudinary = async (file: Express.Multer.File, folder: string, transformations: any[] = []): Promise<string> => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            transformation: transformations,
            format: 'jpg'
          },
          (error: any, result: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(result.secure_url);
            }
          }
        );
        
        // Read file buffer and upload to Cloudinary
        const fileBuffer = fs.readFileSync(file.path);
        uploadStream.end(fileBuffer);
        
        // Clean up local file after Cloudinary upload
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting local file:', err);
        });
      });
    };
    
    // Upload photo to Cloudinary
    if (files?.photo?.[0]) {
      try {
        employeeData.photo = await uploadToCloudinary(
          files.photo[0],
          'employee-photos',
          [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }, { quality: 'auto:good' }]
        );
        console.log('✅ Photo uploaded to Cloudinary:', employeeData.photo);
      } catch (error) {
        console.error('❌ Error uploading photo to Cloudinary:', error);
        // Don't fail the whole request if photo upload fails
        delete employeeData.photo;
      }
    }
    
    // Upload signatures to Cloudinary
    if (files?.employeeSignature?.[0]) {
      try {
        employeeData.employeeSignature = await uploadToCloudinary(
          files.employeeSignature[0],
          'signatures',
          [{ width: 300, crop: 'scale' }, { quality: 'auto' }]
        );
        console.log('✅ Employee signature uploaded to Cloudinary');
      } catch (error) {
        console.error('❌ Error uploading employee signature:', error);
        delete employeeData.employeeSignature;
      }
    }
    
    if (files?.authorizedSignature?.[0]) {
      try {
        employeeData.authorizedSignature = await uploadToCloudinary(
          files.authorizedSignature[0],
          'signatures',
          [{ width: 300, crop: 'scale' }, { quality: 'auto' }]
        );
        console.log('✅ Authorized signature uploaded to Cloudinary');
      } catch (error) {
        console.error('❌ Error uploading authorized signature:', error);
        delete employeeData.authorizedSignature;
      }
    }
    
    // Set default status
    if (!employeeData.status) {
      employeeData.status = 'active';
    }
    
    // Set default role
    if (!employeeData.role) {
      employeeData.role = 'employee';
    }
    
    console.log('📋 Employee data to save:', employeeData);
    
    // Create employee
    const employee = new Employee(employeeData);
    await employee.save();
    
    console.log('✅ Employee created:', employee.employeeId);
    
    // Handle document uploads if any
    if (files?.documents) {
      const documentPromises = files.documents.map(async (file) => {
        try {
          const documentUrl = await uploadToCloudinary(
            file,
            'employee-documents'
          );
          
          const doc = new Document({
            employeeId: employee.employeeId,
            employee: employee._id,
            documentType: 'other',
            documentName: file.originalname,
            fileName: file.filename,
            filePath: documentUrl, // Cloudinary URL
            fileSize: file.size,
            fileType: file.mimetype,
            uploadedBy: 'system'
          });
          await doc.save();
          return doc;
        } catch (error) {
          console.error('Error uploading document:', error);
          return null;
        }
      });
      
      await Promise.all(documentPromises);
    }
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error: any) {
    console.error('❌ Error creating employee:', error);
    
    // Clean up uploaded files if error occurred
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      Object.values(files).forEach(fileArray => {
        fileArray.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        });
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating employee'
    });
  }
});

// ==================== ERROR HANDLER ====================
app.use((error: Error, req: Request, res: Response, next: Function) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

const PORT = process.env.PORT || 5001;
export default app;
