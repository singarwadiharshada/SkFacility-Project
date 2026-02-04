import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Attendance, { IAttendance } from '../models/attendance';

// Helper function to calculate time difference in hours
const calculateHours = (startTime: string, endTime: string | null): number => {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return (end - start) / (1000 * 60 * 60);
};

// Check in
export const checkIn = async (req: Request, res: Response) => {
  try {
    const { employeeId, employeeName, supervisorId } = req.body;
    
    if (!employeeId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and name are required',
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (existingAttendance?.isCheckedIn) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in for today',
      });
    }

    const checkInTime = new Date().toISOString();

    let attendance: IAttendance | null;
    
    if (existingAttendance) {
      // Update existing record
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          checkInTime,
          isCheckedIn: true,
          status: 'present',
          updatedAt: new Date(),
        },
        { new: true }
      );
      
      if (!attendance) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update attendance record',
        });
      }
    } else {
      // Create new attendance record
      attendance = await Attendance.create({
        employeeId,
        employeeName,
        date: today,
        checkInTime,
        checkOutTime: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: 'present',
        isCheckedIn: true,
        isOnBreak: false,
        supervisorId: supervisorId || null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Checked in successfully',
      data: attendance,
    });
  } catch (error: any) {
    console.error('❌ Check-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error checking in',
      error: error.message,
    });
  }
};

// Check out
export const checkOut = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const checkOutTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active check-in found',
      });
    }

    // Calculate total hours
    const totalHours = calculateHours(attendance.checkInTime, checkOutTime);
    
    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        checkOutTime,
        isCheckedIn: false,
        isOnBreak: false,
        totalHours,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update attendance record',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: updatedAttendance,
      totalHours: totalHours.toFixed(2),
    });
  } catch (error: any) {
    console.error('❌ Check-out error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error checking out',
      error: error.message,
    });
  }
};

// Break in
export const breakIn = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const breakStartTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
      isOnBreak: false,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active check-in found or already on break',
      });
    }

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        breakStartTime,
        isOnBreak: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update break status',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Break started successfully',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('❌ Break-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error starting break',
      error: error.message,
    });
  }
};

// Break out
export const breakOut = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const breakEndTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
      isOnBreak: true,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active break found',
      });
    }

    // Calculate break duration
    const breakDuration = calculateHours(attendance.breakStartTime!, breakEndTime);
    const totalBreakTime = (attendance.breakTime || 0) + breakDuration;

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        breakEndTime,
        isOnBreak: false,
        breakTime: totalBreakTime,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update break status',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Break ended successfully',
      data: updatedAttendance,
      breakDuration: breakDuration.toFixed(2),
    });
  } catch (error: any) {
    console.error('❌ Break-out error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error ending break',
      error: error.message,
    });
  }
};

// Get today's attendance status
export const getTodayStatus = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        message: 'No attendance record found for today',
        data: {
          isCheckedIn: false,
          isOnBreak: false,
          checkInTime: null,
          checkOutTime: null,
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 0,
          breakTime: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance status retrieved',
      data: attendance,
    });
  } catch (error: any) {
    console.error('❌ Get status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance status',
      error: error.message,
    });
  }
};

// Get attendance history
export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const query: any = { employeeId: employeeId.toString() };
    
    if (startDate && endDate) {
      query.date = {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      };
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    const [attendanceHistory, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: 'Attendance history retrieved',
      data: attendanceHistory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Get history error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance history',
      error: error.message,
    });
  }
};

// Get team attendance
export const getTeamAttendance = async (req: Request, res: Response) => {
  try {
    const { supervisorId, date } = req.query;
    
    if (!supervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Supervisor ID is required',
      });
    }

    const queryDate = date ? date.toString() : new Date().toISOString().split('T')[0];
    
    const teamAttendance = await Attendance.find({
      date: queryDate,
      supervisorId: supervisorId.toString(),
    }).sort({ checkInTime: -1 });

    res.status(200).json({
      success: true,
      message: 'Team attendance retrieved',
      data: teamAttendance,
      date: queryDate,
      total: teamAttendance.length,
    });
  } catch (error: any) {
    console.error('❌ Get team attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving team attendance',
      error: error.message,
    });
  }
};

// Get all attendance
export const getAllAttendance = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, date, employeeId } = req.query;
    
    const query: any = {};
    
    if (date) {
      query.date = date.toString();
    }
    
    if (employeeId) {
      query.employeeId = employeeId.toString();
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    const [attendanceRecords, total] = await Promise.all([
      Attendance.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved',
      data: attendanceRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Get all attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance records',
      error: error.message,
    });
  }
};

// Update attendance
export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID',
      });
    }

    // Calculate total hours if both check-in and check-out times are provided
    if (updateData.checkInTime && updateData.checkOutTime) {
      updateData.totalHours = calculateHours(
        updateData.checkInTime,
        updateData.checkOutTime
      );
    }

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('❌ Update attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance',
      error: error.message,
    });
  }
};

// Manual attendance entry
export const manualAttendance = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      employeeName,
      date,
      checkInTime,
      checkOutTime,
      breakStartTime,
      breakEndTime,
      status,
      remarks,
      totalHours = 0,
      isCheckedIn = false
    } = req.body;

    if (!employeeId || !employeeName || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, name, and date are required',
      });
    }

    // Check if record already exists
    const existingRecord = await Attendance.findOne({
      employeeId,
      date,
    });

    let attendance;
    
    if (existingRecord) {
      // Update existing record
      attendance = await Attendance.findByIdAndUpdate(
        existingRecord._id,
        {
          checkInTime,
          checkOutTime,
          breakStartTime,
          breakEndTime,
          status,
          remarks,
          totalHours,
          isCheckedIn: isCheckedIn && !checkOutTime,
          isOnBreak: !!breakStartTime && !breakEndTime,
          updatedAt: new Date(),
        },
        { new: true }
      );
    } else {
      // Create new record
      attendance = await Attendance.create({
        employeeId,
        employeeName,
        date,
        checkInTime,
        checkOutTime,
        breakStartTime,
        breakEndTime,
        status,
        remarks,
        totalHours,
        isCheckedIn: isCheckedIn && !checkOutTime,
        isOnBreak: !!breakStartTime && !breakEndTime,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: attendance,
    });
  } catch (error: any) {
    console.error('Manual attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error recording attendance',
      error: error.message,
    });
  }
};

// Get weekly summary
export const getWeeklySummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    // Get all attendance records for the week
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      },
    });

    // Group by employee
    const employeeMap = new Map();
    
    attendanceRecords.forEach(record => {
      if (!employeeMap.has(record.employeeId)) {
        employeeMap.set(record.employeeId, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department || 'Unknown',
          weekStartDate: startDate,
          weekEndDate: endDate,
          daysPresent: 0,
          daysAbsent: 0,
          daysHalfDay: 0,
          daysLeave: 0,
          weeklyOffDays: 0,
          totalHours: 0,
          totalBreakTime: 0,
        });
      }
      
      const employeeData = employeeMap.get(record.employeeId);
      
      switch (record.status) {
        case 'present':
          employeeData.daysPresent++;
          employeeData.totalHours += record.totalHours || 0;
          break;
        case 'absent':
          employeeData.daysAbsent++;
          break;
        case 'half-day':
          employeeData.daysHalfDay++;
          employeeData.totalHours += record.totalHours || 0;
          break;
        case 'leave':
          employeeData.daysLeave++;
          break;
      }
      
      employeeData.totalBreakTime += record.breakTime || 0;
      
      // Determine overall status for the week
      if (employeeData.daysPresent >= 5) {
        employeeData.overallStatus = 'present';
      } else if (employeeData.daysAbsent >= 5) {
        employeeData.overallStatus = 'absent';
      } else {
        employeeData.overallStatus = 'mixed';
      }
    });

    // Convert map to array
    const weeklySummaries = Array.from(employeeMap.values());

    res.status(200).json({
      success: true,
      message: 'Weekly summary retrieved',
      data: weeklySummaries,
    });
  } catch (error: any) {
    console.error('Weekly summary error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving weekly summary',
      error: error.message,
    });
  }
};
