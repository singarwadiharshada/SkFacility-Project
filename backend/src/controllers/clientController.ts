import { Request, Response } from 'express';
import Client from '../models/Client';

// Get all clients
export const getAllClients = async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    
    let filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'active'; // Default to active only
    }
    
    const clients = await Client.find(filter)
      .select('name company email phone city state status')
      .sort('name');
    
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching clients', 
      error: error.message 
    });
  }
};

// Get client by ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching client', 
      error: error.message 
    });
  }
};

// Create new client
export const createClient = async (req: Request, res: Response) => {
  try {
    const {
      name,
      company,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gstNumber,
      contactPerson,
      contactPersonPhone,
      notes,
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!name || !company || !email || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, company, email and phone are required fields' 
      });
    }

    // Check if client with same email already exists
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Client with this email already exists'
      });
    }

    // Create new client
    const client = new Client({
      name,
      company,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gstNumber,
      contactPerson,
      contactPersonPhone,
      notes,
      status
    });

    await client.save();

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Client with this email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating client', 
      error: error.message 
    });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove _id from update data if present
    delete updateData._id;

    const client = await Client.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: client
    });
  } catch (error: any) {
    console.error('Error updating client:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Client with this email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error updating client', 
      error: error.message 
    });
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findByIdAndDelete(id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting client', 
      error: error.message 
    });
  }
};

// Search clients
export const searchClients = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    const filter = {
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { company: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    };
    
    const clients = await Client.find(filter)
      .select('name company email phone city state')
      .sort('name')
      .limit(20);
    
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error searching clients', 
      error: error.message 
    });
  }
};

// Toggle client status
export const toggleClientStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    client.status = client.status === 'active' ? 'inactive' : 'active';
    await client.save();
    
    res.status(200).json({
      success: true,
      message: `Client ${client.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: client
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error toggling client status', 
      error: error.message 
    });
  }
};

// Get client statistics
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const stats = await Client.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalClients = await Client.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        stats,
        totalClients
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching client statistics', 
      error: error.message 
    });
  }
};