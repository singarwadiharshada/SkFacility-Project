import { Request, Response } from 'express';
import Lead from '../models/Lead';

// Get all leads
export const getLeads = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    const query = search 
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { source: { $regex: search, $options: 'i' } },
            { assignedTo: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    
    const leads = await Lead.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: leads
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching leads'
    });
  }
};

// Create lead
export const createLead = async (req: Request, res: Response) => {
  try {
    const lead = await Lead.create(req.body);
    
    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating lead'
    });
  }
};

// Bulk create leads (for import)
export const bulkCreateLeads = async (req: Request, res: Response) => {
  try {
    const leads = req.body; // Array of lead objects
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead data'
      });
    }
    
    // Validate each lead
    const validLeads = leads.filter(lead => {
      return lead.name && lead.company && lead.email && lead.phone;
    });
    
    if (validLeads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid leads to import'
      });
    }
    
    // Create all leads
    const createdLeads = await Lead.insertMany(validLeads);
    
    res.status(201).json({
      success: true,
      data: createdLeads,
      message: `Successfully imported ${createdLeads.length} leads`
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error importing leads'
    });
  }
};

// Update lead
export const updateLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const lead = await Lead.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating lead'
    });
  }
};

// Delete lead
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const lead = await Lead.findByIdAndDelete(id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting lead'
    });
  }
};

// Update lead status
export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const lead = await Lead.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: lead,
      message: 'Lead status updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating lead status'
    });
  }
};