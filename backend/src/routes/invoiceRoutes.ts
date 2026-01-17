import express, { Request, Response } from 'express';
import Invoice, { IInvoice } from '../models/Invoice';

const router = express.Router();

// Helper function to validate invoice data
const validateInvoiceData = (data: any): string[] => {
  const errors: string[] = [];
  
  if (!data.id) errors.push('Invoice ID is required');
  if (!data.client) errors.push('Client name is required');
  if (!data.date) errors.push('Invoice date is required');
  if (!data.invoiceType || !['perform', 'tax'].includes(data.invoiceType)) {
    errors.push('Valid invoice type is required');
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  }
  if (data.amount === undefined || data.amount <= 0) {
    errors.push('Valid amount is required');
  }
  
  return errors;
};

// Helper function to format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      if (dateString.match(/\d{2}-[A-Za-z]{3}-\d{2}/)) {
        return dateString;
      }
      return dateString;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString;
  }
};

// Helper function to calculate due date
const calculateDueDate = (dateString: string, daysToAdd: number) => {
  try {
    const dateParts = dateString.split('-');
    if (dateParts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(dateParts[0]);
      const monthIndex = months.indexOf(dateParts[1]);
      const year = parseInt('20' + dateParts[2]);
      
      if (!isNaN(day) && monthIndex >= 0 && !isNaN(year)) {
        const invoiceDate = new Date(year, monthIndex, day);
        invoiceDate.setDate(invoiceDate.getDate() + daysToAdd);
        
        const dueDay = invoiceDate.getDate().toString().padStart(2, '0');
        const dueMonth = months[invoiceDate.getMonth()];
        const dueYear = invoiceDate.getFullYear().toString().slice(-2);
        return `${dueDay}-${dueMonth}-${dueYear}`;
      }
    }
    return dateString;
  } catch (error) {
    return dateString;
  }
};

// GET all invoices with optional filtering by user/role
router.get('/', async (req: Request, res: Response) => {
  try {
    const { createdBy, userId, sharedWith } = req.query;
    let query: any = {};
    
    // If user is admin, show only invoices created by admin or shared with this user
    if (userId) {
      query = {
        $or: [
          { userId },
          { sharedWith: userId },
          { createdBy: 'superadmin' } // Superadmin invoices are visible to all
        ]
      };
    }
    
    // If specific role filter is applied
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: invoices,
      total: invoices.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoices'
    });
  }
});

// GET invoice by ID with access control
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findOne({ id: req.params.id });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check access rights
    const { userId } = req.query;
    if (userId && invoice.createdBy !== 'superadmin' && invoice.userId !== userId && !invoice.sharedWith?.includes(userId as string)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoice'
    });
  }
});

// GET invoices by type with access control
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { userId } = req.query;
    
    if (!['perform', 'tax'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice type'
      });
    }
    
    let query: any = { invoiceType: type };
    
    // Add access control for non-superadmin users
    if (userId) {
      query = {
        ...query,
        $or: [
          { userId },
          { sharedWith: userId },
          { createdBy: 'superadmin' }
        ]
      };
    }
    
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: invoices,
      total: invoices.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoices by type'
    });
  }
});

// CREATE new invoice
router.post('/', async (req: Request, res: Response) => {
  try {
    const invoiceData = req.body;
    
    // Validate required fields
    const validationErrors = validateInvoiceData(invoiceData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Check if invoice with same ID already exists
    const existingInvoice = await Invoice.findOne({ id: invoiceData.id });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice with this ID already exists'
      });
    }
    
    // Validate items
    if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must contain at least one item'
      });
    }
    
    // Calculate item amounts if not provided
    invoiceData.items = invoiceData.items.map((item: any) => {
      if (!item.amount && item.quantity !== undefined && item.rate !== undefined) {
        item.amount = item.quantity * item.rate;
      }
      return item;
    });
    
    // Calculate subtotal
    const subtotal = invoiceData.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    invoiceData.subtotal = subtotal;
    
    // Calculate tax if not provided
    if (invoiceData.invoiceType === 'perform' && !invoiceData.tax) {
      invoiceData.tax = subtotal * 0.18;
    } else if (invoiceData.invoiceType === 'tax' && !invoiceData.tax && subtotal && invoiceData.managementFeesAmount) {
      const netTaxableValue = subtotal + invoiceData.managementFeesAmount;
      invoiceData.tax = netTaxableValue * 0.18; // 18% GST (9% SGST + 9% CGST)
    }
    
    // Calculate total amount
    if (!invoiceData.amount) {
      let total = subtotal + (invoiceData.tax || 0);
      
      // Add management fees for tax invoices
      if (invoiceData.invoiceType === 'tax' && invoiceData.managementFeesAmount) {
        total += invoiceData.managementFeesAmount;
      }
      
      // Add round up
      if (invoiceData.roundUp) {
        total += invoiceData.roundUp;
      }
      
      invoiceData.amount = total;
    }
    
    // Format dates
    if (invoiceData.date) {
      invoiceData.date = formatDate(invoiceData.date);
    }
    
    if (invoiceData.dueDate) {
      invoiceData.dueDate = formatDate(invoiceData.dueDate);
    } else if (invoiceData.date) {
      invoiceData.dueDate = calculateDueDate(invoiceData.date, 30);
    }
    
    // Set default createdBy if not provided
    if (!invoiceData.createdBy) {
      invoiceData.createdBy = 'superadmin';
    }
    
    const newInvoice = new Invoice(invoiceData);
    await newInvoice.save();
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: newInvoice
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating invoice'
    });
  }
});

// UPDATE invoice with access control
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { userId } = req.query;
    
    // Check if invoice exists and user has access
    const existingInvoice = await Invoice.findOne({ id: id });
    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check access rights (only creator or superadmin can update)
    if (userId && existingInvoice.userId !== userId && existingInvoice.createdBy !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Format dates if provided
    if (updates.date) {
      updates.date = formatDate(updates.date);
    }
    
    if (updates.dueDate) {
      updates.dueDate = formatDate(updates.dueDate);
    }
    
    const invoice = await Invoice.findOneAndUpdate(
      { id: id },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating invoice'
    });
  }
});

// MARK invoice as paid
router.patch('/:id/mark-paid', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findOneAndUpdate(
      { id: id },
      { 
        status: 'paid',
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice marked as paid',
      data: invoice
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error marking invoice as paid'
    });
  }
});

// DELETE invoice with access control
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    // Check if invoice exists and user has access
    const existingInvoice = await Invoice.findOne({ id: id });
    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check access rights (only creator or superadmin can delete)
    if (userId && existingInvoice.userId !== userId && existingInvoice.createdBy !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const invoice = await Invoice.findOneAndDelete({ id: id });
    
    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting invoice'
    });
  }
});

// SEARCH invoices with access control
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const { userId } = req.query;
    
    let baseQuery: any = {
      $or: [
        { id: { $regex: query, $options: 'i' } },
        { client: { $regex: query, $options: 'i' } },
        { voucherNo: { $regex: query, $options: 'i' } },
        { invoiceNumber: { $regex: query, $options: 'i' } },
        { serviceType: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Add access control for non-superadmin users
    if (userId) {
      baseQuery = {
        $and: [
          baseQuery,
          {
            $or: [
              { userId },
              { sharedWith: userId },
              { createdBy: 'superadmin' }
            ]
          }
        ]
      };
    }
    
    const invoices = await Invoice.find(baseQuery).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: invoices,
      total: invoices.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error searching invoices'
    });
  }
});

// GET invoice statistics with access control
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    let query: any = {};
    
    // Add access control for non-superadmin users
    if (userId) {
      query = {
        $or: [
          { userId },
          { sharedWith: userId },
          { createdBy: 'superadmin' }
        ]
      };
    }
    
    const [total, pending, paid, overdue] = await Promise.all([
      Invoice.countDocuments(query),
      Invoice.countDocuments({ ...query, status: 'pending' }),
      Invoice.countDocuments({ ...query, status: 'paid' }),
      Invoice.countDocuments({ ...query, status: 'overdue' })
    ]);
    
    const totalAmountResult = await Invoice.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const amountByType = await Invoice.aggregate([
      { $match: query },
      { $group: { 
        _id: '$invoiceType', 
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      } }
    ]);
    
    const recentInvoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('id client amount status date invoiceType createdBy');
    
    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        paid,
        overdue,
        totalAmount: totalAmountResult[0]?.total || 0,
        amountByType,
        recentInvoices
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoice stats'
    });
  }
});

// SHARE invoice with other users (for superadmin to share with admin)
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // Array of user IDs to share with
    
    const invoice = await Invoice.findOneAndUpdate(
      { id: id },
      { 
        $addToSet: { sharedWith: { $each: userIds } },
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice shared successfully',
      data: invoice
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error sharing invoice'
    });
  }
});

export default router;