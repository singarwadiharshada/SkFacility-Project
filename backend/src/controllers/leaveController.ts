import { Request, Response } from 'express';
import Leave from '../models/Leaves';
import Employee from '../models/Employee';

// Get all leave requests
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const leaves = await Leave.find().sort({ createdAt: -1 });
    res.status(200).json(leaves);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching leaves', error: error.message });
  }
};

// Get leaves for a specific employee
export const getEmployeeLeaves = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const leaves = await Leave.find({ employeeId }).sort({ createdAt: -1 });
    res.status(200).json(leaves);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching employee leaves', error: error.message });
  }
};

// Get all leave requests for supervisor view
export const getSupervisorLeaves = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;
    
    if (!department) {
      return res.status(400).json({ message: 'Department is required' });
    }
    
    const leaves = await Leave.find({ department }).sort({ createdAt: -1 });
    res.status(200).json(leaves);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching supervisor leaves', error: error.message });
  }
};

// Apply for leave
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { 
      employeeId, 
      employeeName, 
      department, 
      contactNumber,
      leaveType, 
      fromDate, 
      toDate, 
      reason,
      appliedBy,
      appliedFor 
    } = req.body;

    // Validate required fields
    if (!employeeId || !employeeName || !department || !contactNumber || 
        !leaveType || !fromDate || !toDate || !reason || !appliedBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Calculate total days
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (from > to) {
      return res.status(400).json({ message: 'From date must be before to date' });
    }
    
    const timeDiff = to.getTime() - from.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Check if employee exists in Employee collection
    const employee = await Employee.findOne({ employeeId, status: 'active' });
    if (!employee) {
      return res.status(404).json({ 
        message: `Employee ${employeeId} not found or inactive in Employee collection`,
        suggestion: 'Check if employee exists and has status: "active"'
      });
    }

    // Create new leave request
    const leave = new Leave({
      employeeId,
      employeeName,
      department,
      contactNumber,
      leaveType,
      fromDate: from,
      toDate: to,
      totalDays,
      reason,
      status: 'pending',
      appliedBy,
      appliedFor: appliedFor || employeeId
    });

    await leave.save();

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leave
    });
  } catch (error: any) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ 
      message: 'Error applying for leave', 
      error: error.message 
    });
  }
};

// Update leave status
export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const leave = await Leave.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.status(200).json({
      message: `Leave request ${status}`,
      leave
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating leave status', error: error.message });
  }
};

// Get all employees for supervisor's department FROM EMPLOYEE COLLECTION
export const getSupervisorEmployees = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;
    
    console.log(`📋 Fetching employees from Employee collection for department: "${department}"`);
    
    if (!department) {
      return res.status(400).json({ 
        message: 'Department is required',
        example: '?department=Operations'
      });
    }
    
    // Check total employees in database
    const totalEmployees = await Employee.countDocuments();
    console.log(`📊 Total employees in Employee collection: ${totalEmployees}`);
    
    if (totalEmployees === 0) {
      return res.status(404).json({ 
        message: 'No employees found in Employee collection',
        suggestion: 'Please add employees to your database first'
      });
    }
    
    // Show all departments available
    const allDepartments = await Employee.distinct('department');
    console.log('🏢 Available departments:', allDepartments);
    
    // Fetch employees FROM EMPLOYEE COLLECTION
    const employees = await Employee.find({ 
      department: department,
      status: 'active'
    })
    .select('employeeId name department phone position email')
    .sort('name');
    
    console.log(`✅ Found ${employees.length} active employees in "${department}" department`);
    
    if (employees.length === 0) {
      return res.status(404).json({ 
        message: `No active employees found in "${department}" department`,
        availableDepartments: allDepartments,
        suggestion: `Try one of these departments: ${allDepartments.join(', ')}`
      });
    }
    
    // Format the response to match expected structure
    const formattedEmployees = employees.map(emp => ({
      _id: emp._id.toString(),
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      email: emp.email,
      contactNumber: emp.phone
    }));
    
    console.log('📤 Sending employees:', formattedEmployees.map(e => `${e.name} (${e.employeeId})`));
    
    res.status(200).json(formattedEmployees);
  } catch (error: any) {
    console.error('❌ Error fetching employees:', error);
    res.status(500).json({ 
      message: 'Error fetching employees from Employee collection', 
      error: error.message,
      details: 'Make sure MongoDB is connected and Employee model exists'
    });
  }
};

// Get leave statistics
export const getLeaveStats = async (req: Request, res: Response) => {
  try {
    const stats = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching leave statistics', error: error.message });
  }
};

// NEW: Get all departments from Employee collection
export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await Employee.distinct('department');
    res.status(200).json(departments);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

// NEW: Get employee count by department
export const getEmployeeCountByDepartment = async (req: Request, res: Response) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          active: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching employee counts', error: error.message });
  }
};