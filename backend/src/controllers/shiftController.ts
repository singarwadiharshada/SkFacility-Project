import { Request, Response } from 'express';
import Shift from '../models/Shift';

// Get all shifts
export const getShifts = async (req: Request, res: Response) => {
  try {
    const shifts = await Shift.find().sort({ createdAt: -1 });
    
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
    console.error('Error fetching shifts:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching shifts'
    });
  }
};

// Get single shift by ID
export const getShift = async (req: Request, res: Response) => {
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
    console.error('Error fetching shift:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching shift'
    });
  }
};

// Create new shift
export const createShift = async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, employees = [] } = req.body;

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

    res.status(201).json({ 
      success: true, 
      message: 'Shift created successfully',
      data: {
        ...savedShift.toObject(),
        id: savedShift._id.toString().slice(-6)
      }
    });
  } catch (error: any) {
    console.error('Error creating shift:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error creating shift'
    });
  }
};

// Update shift
export const updateShift = async (req: Request, res: Response) => {
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
    console.error('Error updating shift:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error updating shift'
    });
  }
};

// Delete shift
export const deleteShift = async (req: Request, res: Response) => {
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
    console.error('Error deleting shift:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error deleting shift'
    });
  }
};

// Assign employee to shift
export const assignEmployeeToShift = async (req: Request, res: Response) => {
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
    console.error('Error assigning employee:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error assigning employee'
    });
  }
};

// Remove employee from shift
export const removeEmployeeFromShift = async (req: Request, res: Response) => {
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
    console.error('Error removing employee:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error removing employee'
    });
  }
};

// Get shift statistics
export const getShiftStats = async (req: Request, res: Response) => {
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
    console.error('Error fetching shift statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching shift statistics'
    });
  }
};
