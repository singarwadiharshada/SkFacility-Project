import { Request, Response } from "express";
import Supervisor from "../models/Supervisor";
import User from "../models/User"; // Import User model to sync

interface CreateSupervisorData {
  name: string;
  email: string;
  phone: string;
  password: string;
  department?: string;
  site?: string;
  reportsTo?: string;
}

// Get all supervisors (from Supervisor collection only)
export const getAllSupervisors = async (req: Request, res: Response) => {
  try {
    const supervisors = await Supervisor.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: supervisors.length,
      supervisors
    });
  } catch (error) {
    console.error("Error fetching supervisors:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching supervisors"
    });
  }
};

// Create new supervisor
export const createSupervisor = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      department = "Operations",
      // site = "Mumbai Office",
      reportsTo
    }: CreateSupervisorData = req.body;

    // Check if supervisor already exists in Supervisor collection
    const existingSupervisor = await Supervisor.findOne({ email });
    if (existingSupervisor) {
      return res.status(400).json({
        success: false,
        message: "Supervisor with this email already exists"
      });
    }

    // Create supervisor in Supervisor collection
    const supervisor = new Supervisor({
      name,
      email,
      phone,
      department,
      // site,
      reportsTo,
      isActive: true,
      employees: 0,
      tasks: 0,
      assignedProjects: []
    });

    await supervisor.save();

    // 🔥 SYNC TO USER MANAGEMENT: Create user with supervisor role
    try {
      const username = email.split('@')[0];
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');

      const user = new User({
        username,
        email,
        phone,
        password, // This will be hashed automatically by User model's pre-save hook
        role: "supervisor",
        firstName,
        lastName,
        name,
        department,
        // site,
        reportsTo,
        isActive: true
      });

      await user.save();
      console.log("✅ Supervisor synced to User Management");
    } catch (syncError) {
      console.error("❌ Error syncing to User Management:", syncError);
      // Continue anyway - don't fail the main request
    }

    res.status(201).json({
      success: true,
      message: "Supervisor created successfully and synced to User Management",
      supervisor
    });
  } catch (error) {
    console.error("Error creating supervisor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating supervisor"
    });
  }
};

// Get supervisor by ID
export const getSupervisorById = async (req: Request, res: Response) => {
  try {
    const supervisor = await Supervisor.findById(req.params.id);

    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found"
      });
    }

    res.status(200).json({
      success: true,
      supervisor
    });
  } catch (error) {
    console.error("Error fetching supervisor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching supervisor"
    });
  }
};

// Update supervisor
export const updateSupervisor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find and update supervisor
    const supervisor = await Supervisor.findByIdAndUpdate(
      id,
      { ...updateData },
      { new: true, runValidators: true }
    );

    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found"
      });
    }

    // 🔥 SYNC TO USER MANAGEMENT: Update corresponding user
    try {
      await User.findOneAndUpdate(
        { email: supervisor.email, role: "supervisor" },
        {
          name: supervisor.name,
          phone: supervisor.phone,
          department: supervisor.department,
          site: supervisor.site,
          reportsTo: supervisor.reportsTo,
          isActive: supervisor.isActive
        },
        { new: true }
      );
      console.log("✅ Supervisor update synced to User Management");
    } catch (syncError) {
      console.error("❌ Error syncing update to User Management:", syncError);
    }

    res.status(200).json({
      success: true,
      message: "Supervisor updated successfully",
      supervisor
    });
  } catch (error) {
    console.error("Error updating supervisor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating supervisor"
    });
  }
};

// Delete supervisor
export const deleteSupervisor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First get the supervisor to get email
    const supervisor = await Supervisor.findById(id);
    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found"
      });
    }

    // Delete from Supervisor collection
    await Supervisor.findByIdAndDelete(id);

    // 🔥 SYNC TO USER MANAGEMENT: Delete corresponding user
    try {
      await User.findOneAndDelete({ 
        email: supervisor.email, 
        role: "supervisor" 
      });
      console.log("✅ Supervisor deletion synced to User Management");
    } catch (syncError) {
      console.error("❌ Error syncing deletion to User Management:", syncError);
    }

    res.status(200).json({
      success: true,
      message: "Supervisor deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting supervisor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting supervisor"
    });
  }
};

// Toggle supervisor status
export const toggleSupervisorStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supervisor = await Supervisor.findById(id);
    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: "Supervisor not found"
      });
    }

    supervisor.isActive = !supervisor.isActive;
    await supervisor.save();

    // 🔥 SYNC TO USER MANAGEMENT: Update status
    try {
      await User.findOneAndUpdate(
        { email: supervisor.email, role: "supervisor" },
        { isActive: supervisor.isActive },
        { new: true }
      );
      console.log("✅ Supervisor status synced to User Management");
    } catch (syncError) {
      console.error("❌ Error syncing status to User Management:", syncError);
    }

    res.status(200).json({
      success: true,
      message: `Supervisor ${supervisor.isActive ? 'activated' : 'deactivated'} successfully`,
      supervisor
    });
  } catch (error) {
    console.error("Error toggling supervisor status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while toggling supervisor status"
    });
  }
};

// Search supervisors
export const searchSupervisors = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const searchRegex = new RegExp(query, 'i');

    const supervisors = await Supervisor.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { department: searchRegex },
        { site: searchRegex }
      ]
    });

    res.status(200).json({
      success: true,
      count: supervisors.length,
      supervisors
    });
  } catch (error) {
    console.error("Error searching supervisors:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching supervisors"
    });
  }
};

// Get supervisor statistics
export const getSupervisorStats = async (req: Request, res: Response) => {
  try {
    const totalSupervisors = await Supervisor.countDocuments();
    const activeSupervisors = await Supervisor.countDocuments({ isActive: true });
    const inactiveSupervisors = totalSupervisors - activeSupervisors;

    res.status(200).json({
      success: true,
      stats: {
        total: totalSupervisors,
        active: activeSupervisors,
        inactive: inactiveSupervisors
      }
    });
  } catch (error) {
    console.error("Error fetching supervisor stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching supervisor statistics"
    });
  }
};