import { Request, Response } from 'express';
import Site from '../models/Site';

// Helper function to clean object
const cleanObject = (obj: any) => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Get all sites
export const getAllSites = async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching all sites');
    const sites = await Site.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${sites.length} sites`);
    res.status(200).json(sites);
  } catch (error: any) {
    console.error('❌ Error fetching sites:', error);
    res.status(500).json({ 
      message: 'Error fetching sites', 
      error: error.message 
    });
  }
};

// Get site by ID
export const getSiteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching site with ID: ${id}`);
    
    const site = await Site.findById(id);
    
    if (!site) {
      console.log(`❌ Site not found: ${id}`);
      return res.status(404).json({ message: 'Site not found' });
    }
    
    console.log(`✅ Found site: ${site.name}`);
    res.status(200).json(site);
  } catch (error: any) {
    console.error('❌ Error fetching site:', error);
    res.status(500).json({ 
      message: 'Error fetching site', 
      error: error.message 
    });
  }
};

// Create new site - UPDATED VERSION
export const createSite = async (req: Request, res: Response) => {
  try {
    console.log('📝 CREATE SITE REQUEST START ============');
    console.log('📦 Request body received:', JSON.stringify(req.body, null, 2));
    
    // Remove ALL id-related fields from request body including version fields
    const { _id, id, __v, ...requestData } = req.body;
    console.log('🧹 After removing id fields:', JSON.stringify(requestData, null, 2));
    
    // Check for any remaining id fields
    Object.keys(requestData).forEach(key => {
      if (key.toLowerCase().includes('id') && key !== 'clientId') {
        console.warn(`⚠️ Warning: Found potential id field: ${key} with value: ${requestData[key]}`);
      }
    });
    
    // Clean the data (remove empty values)
    const cleanedData = cleanObject(requestData);
    console.log('🧽 After cleaning empty values:', JSON.stringify(cleanedData, null, 2));
    
    // Validate required fields
    const requiredFields = ['name', 'clientName', 'location', 'areaSqft', 'contractValue', 'contractEndDate'];
    const missingFields = requiredFields.filter(field => !cleanedData[field]);
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields,
        receivedData: cleanedData
      });
    }
    
    // Prepare site data - create with type any to allow dynamic properties
    const siteData: any = {
      name: String(cleanedData.name).trim(),
      clientName: String(cleanedData.clientName).trim(),
      location: String(cleanedData.location).trim(),
      areaSqft: Number(cleanedData.areaSqft) || 0,
      contractValue: Number(cleanedData.contractValue) || 0,
      contractEndDate: new Date(cleanedData.contractEndDate),
      services: Array.isArray(cleanedData.services) ? cleanedData.services : [],
      staffDeployment: Array.isArray(cleanedData.staffDeployment) 
        ? cleanedData.staffDeployment.filter((item: any) => item && item.role && typeof item.count === 'number')
        : [],
      status: cleanedData.status === 'inactive' ? 'inactive' : 'active'
    };
    
    // Only include clientId if it exists and is not empty
    if (cleanedData.clientId && cleanedData.clientId.trim() !== '') {
      siteData.clientId = String(cleanedData.clientId).trim();
    }
    
    console.log('📊 Final site data to save:', JSON.stringify(siteData, null, 2));
    
    // Create new site instance
    const site = new Site(siteData);
    console.log('🏗️ Site instance created');
    
    // Validate the site data before saving
    const validationError = site.validateSync();
    if (validationError) {
      console.log('❌ Validation error:', validationError.errors);
      return res.status(400).json({ 
        message: 'Validation error',
        errors: validationError.errors 
      });
    }
    
    console.log('💾 Attempting to save site to database...');
    
    // Save to database
    await site.save();
    
    console.log(`✅ Site created successfully! ID: ${site._id}, Name: ${site.name}`);
    console.log('📝 CREATE SITE REQUEST END ============\n');
    
    res.status(201).json({
      success: true,
      message: 'Site created successfully',
      site
    });
    
  } catch (error: any) {
    console.error('❌ CREATE SITE ERROR ============');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      console.error('Validation errors:', messages);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error', 
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      console.error('Duplicate key error pattern:', error.keyPattern);
      console.error('Duplicate key error value:', error.keyValue);
      
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];
      
      // Handle the case where value is null
      if (duplicateValue === null) {
        return res.status(400).json({ 
          success: false,
          message: 'Database constraint error',
          details: 'There is an issue with the database unique constraint. Please contact support.'
        });
      }
      
      return res.status(400).json({ 
        success: false,
        message: `Duplicate entry for ${duplicateField}`,
        field: duplicateField,
        value: duplicateValue,
        suggestion: `A site with ${duplicateField} "${duplicateValue}" already exists. Please use a different value.`
      });
    }
    
    console.error('❌ CREATE SITE ERROR END ============\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating site', 
      error: error.message
    });
  }
};

// Update site
export const updateSite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Updating site with ID: ${id}`);
    
    // Find site
    const site = await Site.findById(id);
    if (!site) {
      console.log(`❌ Site not found for update: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Site not found' 
      });
    }
    
    // Remove any id fields from update data
    const { _id, id: reqId, ...updateData } = req.body;
    
    // Update site fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        (site as any)[key] = updateData[key];
      }
    });
    
    await site.save();
    
    console.log(`✅ Site updated successfully: ${site.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Site updated successfully',
      site
    });
  } catch (error: any) {
    console.error('Error updating site:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Duplicate entry error' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error updating site', 
      error: error.message 
    });
  }
};

// Delete site
export const deleteSite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting site with ID: ${id}`);
    
    const site = await Site.findByIdAndDelete(id);
    
    if (!site) {
      console.log(`❌ Site not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Site not found' 
      });
    }
    
    console.log(`✅ Site deleted successfully: ${site.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Site deleted successfully',
      site
    });
  } catch (error: any) {
    console.error('Error deleting site:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting site', 
      error: error.message 
    });
  }
};

// Toggle site status
export const toggleSiteStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Toggling status for site ID: ${id}`);
    
    const site = await Site.findById(id);
    if (!site) {
      console.log(`❌ Site not found for status toggle: ${id}`);
      return res.status(404).json({ message: 'Site not found' });
    }
    
    site.status = site.status === 'active' ? 'inactive' : 'active';
    await site.save();
    
    console.log(`✅ Site status toggled: ${site.name} is now ${site.status}`);
    
    res.status(200).json({
      message: `Site ${site.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      site
    });
  } catch (error: any) {
    console.error('Error toggling site status:', error);
    res.status(500).json({ 
      message: 'Error toggling site status', 
      error: error.message 
    });
  }
};

// Get site statistics
export const getSiteStats = async (req: Request, res: Response) => {
  try {
    console.log('📊 Getting site statistics');
    
    const stats = await Site.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalContractValue: { $sum: '$contractValue' },
          totalArea: { $sum: '$areaSqft' }
        }
      }
    ]);
    
    // Get total staff across all sites
    const allSites = await Site.find();
    const totalStaff = allSites.reduce((total, site) => {
      return total + site.staffDeployment.reduce((sum, item) => sum + item.count, 0);
    }, 0);
    
    console.log(`📊 Statistics: ${allSites.length} sites, ${totalStaff} total staff`);
    
    res.status(200).json({
      stats,
      totalStaff,
      totalSites: allSites.length
    });
  } catch (error: any) {
    console.error('Error fetching site statistics:', error);
    res.status(500).json({ 
      message: 'Error fetching site statistics', 
      error: error.message 
    });
  }
};

// Search sites
export const searchSites = async (req: Request, res: Response) => {
  try {
    const { query, status } = req.query;
    console.log(`🔍 Searching sites with query: "${query}", status: "${status}"`);
    
    let filter: any = {};
    
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { clientName: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    }
    
    const sites = await Site.find(filter).sort({ createdAt: -1 });
    
    console.log(`🔍 Found ${sites.length} sites matching search`);
    
    res.status(200).json(sites);
  } catch (error: any) {
    console.error('Error searching sites:', error);
    res.status(500).json({ 
      message: 'Error searching sites', 
      error: error.message 
    });
  }
};