import { Request, Response } from "express";
import Roster, { IRoster } from "../models/Roster";

// Get all roster entries with filtering
export const getRosterEntries = async (req: Request, res: Response) => {
  try {
    console.log("GET /api/roster called with query:", req.query);

    const {
      startDate,
      endDate,
      type,
      employeeId,
      page = "1",
      limit = "50",
      createdBy, // Add createdBy filter
    } = req.query;

    const filter: any = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: startDate as string,
        $lte: endDate as string,
      };
    } else if (startDate) {
      filter.date = { $gte: startDate as string };
    } else if (endDate) {
      filter.date = { $lte: endDate as string };
    }

    if (type) {
      filter.type = type;
    }

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (createdBy) {
      filter.createdBy = createdBy; // Add createdBy to filter
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    console.log("MongoDB filter:", filter);

    const [roster, total] = await Promise.all([
      Roster.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Roster.countDocuments(filter),
    ]);

    console.log(`Found ${roster.length} roster entries`);

    // Calculate statistics
    const totalHours = roster.reduce((sum, entry) => sum + entry.hours, 0);
    const uniqueEmployees = new Set(roster.map((entry) => entry.employeeId))
      .size;

    // Transform roster data for response
    const transformedRoster = roster.map((entry) => ({
      id: entry._id.toString(),
      _id: entry._id.toString(),
      date: entry.date,
      employeeName: entry.employeeName,
      employeeId: entry.employeeId,
      department: entry.department,
      designation: entry.designation,
      shift: entry.shift,
      shiftTiming: entry.shiftTiming,
      assignedTask: entry.assignedTask,
      hours: entry.hours,
      remark: entry.remark,
      type: entry.type,
      siteClient: entry.siteClient,
      supervisor: entry.supervisor,
      createdBy: entry.createdBy || "superadmin", // Add createdBy with default
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    res.status(200).json({
      success: true,
      roster: transformedRoster,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      stats: {
        totalEntries: roster.length,
        totalHours,
        uniqueEmployees,
      },
      filters: {
        startDate,
        endDate,
        type,
        employeeId,
        createdBy,
      },
    });
  } catch (error: any) {
    console.error("Error fetching roster:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching roster entries",
      error: error.message,
    });
  }
};

// Get roster by ID
export const getRosterById = async (req: Request, res: Response) => {
  try {
    console.log(`GET /api/roster/${req.params.id} called`);

    const roster = await Roster.findById(req.params.id);

    if (!roster) {
      return res.status(404).json({
        success: false,
        message: "Roster entry not found",
      });
    }

    const transformedRoster = {
      id: roster._id.toString(),
      _id: roster._id.toString(),
      date: roster.date,
      employeeName: roster.employeeName,
      employeeId: roster.employeeId,
      department: roster.department,
      designation: roster.designation,
      shift: roster.shift,
      shiftTiming: roster.shiftTiming,
      assignedTask: roster.assignedTask,
      hours: roster.hours,
      remark: roster.remark,
      type: roster.type,
      siteClient: roster.siteClient,
      supervisor: roster.supervisor,
      createdBy: roster.createdBy || "superadmin", // Add createdBy with default
      createdAt: roster.createdAt,
      updatedAt: roster.updatedAt,
    };

    res.status(200).json({
      success: true,
      roster: transformedRoster,
    });
  } catch (error: any) {
    console.error("Error fetching roster by ID:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching roster entry",
      error: error.message,
    });
  }
};

// Create new roster entry
export const createRosterEntry = async (req: Request, res: Response) => {
  try {
    console.log("POST /api/roster called with body:", req.body);

    const rosterData = req.body;
    
    // Get user type from headers (default to superadmin for backward compatibility)
    const userType = req.headers['x-user-type'] as string || 'superadmin';

    // Validate required fields
    const requiredFields = [
      "date",
      "employeeName",
      "employeeId",
      "department",
      "designation",
      "shift",
      "shiftTiming",
      "assignedTask",
      "hours",
      "type",
      "siteClient",
      "supervisor",
    ];

    const missingFields = requiredFields.filter((field) => !rosterData[field]);

    if (missingFields.length > 0) {
      console.log("Missing fields:", missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Check if entry already exists for same employee on same date and shift
    // For admin users, we allow same entry if created by different users
    // For superadmin, we maintain strict duplicate check
    let existingEntry;
    if (userType === 'superadmin') {
      existingEntry = await Roster.findOne({
        employeeId: rosterData.employeeId,
        date: rosterData.date,
        shift: rosterData.shift,
      });
    } else {
      // For admin, only check if they themselves have created a duplicate
      existingEntry = await Roster.findOne({
        employeeId: rosterData.employeeId,
        date: rosterData.date,
        shift: rosterData.shift,
        createdBy: userType,
      });
    }

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: "Roster entry already exists for this employee on selected date and shift",
        existingEntry: {
          id: existingEntry._id,
          employeeName: existingEntry.employeeName,
          date: existingEntry.date,
          shift: existingEntry.shift,
          createdBy: existingEntry.createdBy,
        }
      });
    }

    // Add createdBy field to roster data
    const rosterWithCreator = {
      ...rosterData,
      createdBy: userType
    };

    const roster = new Roster(rosterWithCreator);
    await roster.save();

    const transformedRoster = {
      id: roster._id.toString(),
      _id: roster._id.toString(),
      date: roster.date,
      employeeName: roster.employeeName,
      employeeId: roster.employeeId,
      department: roster.department,
      designation: roster.designation,
      shift: roster.shift,
      shiftTiming: roster.shiftTiming,
      assignedTask: roster.assignedTask,
      hours: roster.hours,
      remark: roster.remark,
      type: roster.type,
      siteClient: roster.siteClient,
      supervisor: roster.supervisor,
      createdBy: roster.createdBy,
      createdAt: roster.createdAt,
      updatedAt: roster.updatedAt,
    };

    console.log("Roster entry created successfully by", userType, ":", transformedRoster.id);

    res.status(201).json({
      success: true,
      message: "Roster entry created successfully",
      roster: transformedRoster,
    });
  } catch (error: any) {
    console.error("Error creating roster:", error);
    
    // Check for MongoDB duplicate key error
    if (error.code === 11000 || error.message.includes("duplicate")) {
      return res.status(400).json({
        success: false,
        message: "Roster entry already exists for this employee on selected date and shift",
        error: "Duplicate entry detected"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Error creating roster entry",
      error: error.message,
    });
  }
};

// Add this new endpoint for duplicate check (optional)
export const checkDuplicateEntry = async (req: Request, res: Response) => {
  try {
    const { employeeId, date, shift, userType = 'superadmin' } = req.query;

    if (!employeeId || !date || !shift) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: employeeId, date, shift"
      });
    }

    let filter: any = {
      employeeId: employeeId as string,
      date: date as string,
      shift: shift as string,
    };

    // If userType is provided, add it to filter
    if (userType === 'admin') {
      filter.createdBy = userType;
    }

    const existingEntry = await Roster.findOne(filter);

    res.status(200).json({
      success: true,
      exists: !!existingEntry,
      entry: existingEntry ? {
        id: existingEntry._id,
        employeeName: existingEntry.employeeName,
        date: existingEntry.date,
        shift: existingEntry.shift,
        createdBy: existingEntry.createdBy,
      } : null
    });
  } catch (error: any) {
    console.error("Error checking duplicate:", error);
    res.status(500).json({
      success: false,
      message: "Error checking duplicate entry",
      error: error.message,
    });
  }
};

// Update roster entry
export const updateRosterEntry = async (req: Request, res: Response) => {
  try {
    console.log(`PUT /api/roster/${req.params.id} called with body:`, req.body);

    const { id } = req.params;
    const updates = req.body;
    const userType = req.headers['x-user-type'] as string || 'superadmin';

    // First get the existing roster
    const existingRoster = await Roster.findById(id);

    if (!existingRoster) {
      return res.status(404).json({
        success: false,
        message: "Roster entry not found",
      });
    }

    // Check if user has permission to update
    // Superadmin can update any entry, admin can only update their own entries
    if (userType === 'admin' && existingRoster.createdBy !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You can only update entries created by you",
      });
    }

    const roster = await Roster.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!roster) {
      return res.status(404).json({
        success: false,
        message: "Roster entry not found after update",
      });
    }

    const transformedRoster = {
      id: roster._id.toString(),
      _id: roster._id.toString(),
      date: roster.date,
      employeeName: roster.employeeName,
      employeeId: roster.employeeId,
      department: roster.department,
      designation: roster.designation,
      shift: roster.shift,
      shiftTiming: roster.shiftTiming,
      assignedTask: roster.assignedTask,
      hours: roster.hours,
      remark: roster.remark,
      type: roster.type,
      siteClient: roster.siteClient,
      supervisor: roster.supervisor,
      createdBy: roster.createdBy,
      createdAt: roster.createdAt,
      updatedAt: roster.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Roster entry updated successfully",
      roster: transformedRoster,
    });
  } catch (error: any) {
    console.error("Error updating roster:", error);
    res.status(500).json({
      success: false,
      message: "Error updating roster entry",
      error: error.message,
    });
  }
};

// Delete roster entry
export const deleteRosterEntry = async (req: Request, res: Response) => {
  try {
    console.log(`DELETE /api/roster/${req.params.id} called`);

    const userType = req.headers['x-user-type'] as string || 'superadmin';

    // First get the existing roster
    const existingRoster = await Roster.findById(req.params.id);

    if (!existingRoster) {
      return res.status(404).json({
        success: false,
        message: "Roster entry not found",
      });
    }

    // Check if user has permission to delete
    // Superadmin can delete any entry, admin can only delete their own entries
    if (userType === 'admin' && existingRoster.createdBy !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You can only delete entries created by you",
      });
    }

    const roster = await Roster.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Roster entry deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting roster:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting roster entry",
      error: error.message,
    });
  }
};

// Get roster statistics
export const getRosterStats = async (req: Request, res: Response) => {
  try {
    console.log("GET /api/roster/stats called with query:", req.query);

    const { startDate, endDate, createdBy } = req.query;

    const filter: any = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: startDate as string,
        $lte: endDate as string,
      };
    }

    if (createdBy) {
      filter.createdBy = createdBy;
    }

    const [totalEntries, totalHours, entriesByType, entriesByDepartment, entriesByCreator] =
      await Promise.all([
        Roster.countDocuments(filter),
        Roster.aggregate([
          { $match: filter },
          { $group: { _id: null, total: { $sum: "$hours" } } },
        ]),
        Roster.aggregate([
          { $match: filter },
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
        Roster.aggregate([
          { $match: filter },
          { $group: { _id: "$department", count: { $sum: 1 } } },
        ]),
        Roster.aggregate([
          { $match: filter },
          { $group: { _id: "$createdBy", count: { $sum: 1 } } },
        ]),
      ]);

    res.status(200).json({
      success: true,
      stats: {
        totalEntries,
        totalHours: totalHours[0]?.total || 0,
        entriesByType: entriesByType.reduce((acc: any, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        entriesByDepartment: entriesByDepartment.reduce((acc: any, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        entriesByCreator: entriesByCreator.reduce((acc: any, curr) => {
          acc[curr._id || 'superadmin'] = curr.count;
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    console.error("Error fetching roster statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching roster statistics",
      error: error.message,
    });
  }
};

// Get calendar view data
export const getCalendarView = async (req: Request, res: Response) => {
  try {
    console.log("GET /api/roster/calendar called with query:", req.query);

    const { month, year, createdBy } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (month && year) {
      const monthNum = parseInt(month as string) - 1;
      const yearNum = parseInt(year as string);
      startDate = new Date(yearNum, monthNum, 1);
      endDate = new Date(yearNum, monthNum + 1, 0);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const filter: any = {
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
    };

    if (createdBy) {
      filter.createdBy = createdBy;
    }

    console.log("Calendar filter:", filter);

    const roster = await Roster.find(filter);

    // Group by date
    const groupedByDate = roster.reduce((acc: any, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push({
        id: entry._id.toString(),
        employeeName: entry.employeeName,
        shift: entry.shift,
        hours: entry.hours,
        createdBy: entry.createdBy || 'superadmin',
      });
      return acc;
    }, {});

    // Calculate total hours per date
    const hoursByDate = roster.reduce((acc: any, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = 0;
      }
      acc[entry.date] += entry.hours;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      groupedByDate,
      hoursByDate,
      totalEntries: roster.length,
      totalHours: roster.reduce((sum, entry) => sum + entry.hours, 0),
      entriesByCreator: roster.reduce((acc: any, entry) => {
        const creator = entry.createdBy || 'superadmin';
        acc[creator] = (acc[creator] || 0) + 1;
        return acc;
      }, {}),
    });
  } catch (error: any) {
    console.error("Error fetching calendar view:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching calendar view",
      error: error.message,
    });
  }
};

// Bulk create roster entries
export const bulkCreateRosterEntries = async (req: Request, res: Response) => {
  try {
    console.log(
      "POST /api/roster/bulk called with entries count:",
      req.body.entries?.length
    );

    const { entries } = req.body;
    const userType = req.headers['x-user-type'] as string || 'superadmin';

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid entries data",
      });
    }

    // Validate each entry
    const validatedEntries = [];
    const duplicateEntries = [];

    for (const entry of entries) {
      // Check for duplicates based on user type
      let filter: any = {
        employeeId: entry.employeeId,
        date: entry.date,
        shift: entry.shift,
      };

      if (userType === 'admin') {
        filter.createdBy = userType;
      }

      const existing = await Roster.findOne(filter);

      if (!existing) {
        // Add createdBy to each entry
        validatedEntries.push({
          ...entry,
          createdBy: userType
        });
      } else {
        duplicateEntries.push(entry);
      }
    }

    if (validatedEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All entries already exist",
        duplicates: duplicateEntries.length,
      });
    }

    const result = await Roster.insertMany(validatedEntries);

    // Transform results
    const transformedResults = result.map((roster) => ({
      id: roster._id.toString(),
      _id: roster._id.toString(),
      date: roster.date,
      employeeName: roster.employeeName,
      employeeId: roster.employeeId,
      department: roster.department,
      designation: roster.designation,
      shift: roster.shift,
      shiftTiming: roster.shiftTiming,
      assignedTask: roster.assignedTask,
      hours: roster.hours,
      remark: roster.remark,
      type: roster.type,
      siteClient: roster.siteClient,
      supervisor: roster.supervisor,
      createdBy: roster.createdBy,
      createdAt: roster.createdAt,
      updatedAt: roster.updatedAt,
    }));

    res.status(201).json({
      success: true,
      message: `${result.length} roster entries created successfully`,
      created: result.length,
      duplicates: duplicateEntries.length,
      entries: transformedResults,
    });
  } catch (error: any) {
    console.error("Error creating bulk roster entries:", error);
    res.status(500).json({
      success: false,
      message: "Error creating bulk roster entries",
      error: error.message,
    });
  }
};

// Get roster summary by creator
export const getRosterSummary = async (req: Request, res: Response) => {
  try {
    console.log("GET /api/roster/summary called with query:", req.query);

    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: startDate as string,
        $lte: endDate as string,
      };
    }

    const summary = await Roster.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: "$date",
            createdBy: { $ifNull: ["$createdBy", "superadmin"] }
          },
          totalEntries: { $sum: 1 },
          totalHours: { $sum: "$hours" },
          employees: { $addToSet: "$employeeId" }
        }
      },
      {
        $group: {
          _id: "$_id.createdBy",
          totalEntries: { $sum: "$totalEntries" },
          totalHours: { $sum: "$totalHours" },
          uniqueEmployees: { $sum: { $size: "$employees" } },
          dates: { $addToSet: "$_id.date" }
        }
      },
      {
        $project: {
          createdBy: "$_id",
          totalEntries: 1,
          totalHours: 1,
          uniqueEmployees: 1,
          totalDates: { $size: "$dates" },
          _id: 0
        }
      },
      { $sort: { createdBy: 1 } }
    ]);

    res.status(200).json({
      success: true,
      summary,
      totalEntries: summary.reduce((sum, item) => sum + item.totalEntries, 0),
      totalHours: summary.reduce((sum, item) => sum + item.totalHours, 0),
    });
  } catch (error: any) {
    console.error("Error fetching roster summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching roster summary",
      error: error.message,
    });
  }
};