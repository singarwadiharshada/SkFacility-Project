import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Define Payment interface
interface IPayment {
  _id?: mongoose.Types.ObjectId;
  invoiceId: string;
  client: string;
  amount: number;
  date: Date;
  method: string;
  result: string;
  status: 'completed' | 'failed' | 'pending';
  createdAt?: Date;
  updatedAt?: Date;
}

// Define Payment schema
const paymentSchema = new mongoose.Schema<IPayment>({
  invoiceId: { type: String, required: true },
  client: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  method: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['completed', 'failed', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Create Payment model
const Payment = mongoose.model<IPayment>('Payment', paymentSchema);

// Type for filter object
interface PaymentFilter {
  status?: string;
  method?: string;
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

// GET /api/payments - Get all payments
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, method, startDate, endDate, page = '1', limit = '50' } = req.query;
    
    const filter: PaymentFilter = {};
    if (status) filter.status = status as string;
    if (method) filter.method = method as string;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const payments = await Payment.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));
    
    const total = await Payment.countDocuments(filter);
    
    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/payments/methods/distribution - Get payment methods distribution
router.get('/methods/distribution', async (req: Request, res: Response) => {
  try {
    const distribution = await Payment.aggregate([
      {
        $group: {
          _id: '$method',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          method: '$_id',
          amount: 1,
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { amount: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: distribution
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Type for payment stats
interface PaymentStats {
  _id: string;
  totalAmount: number;
  count: number;
}

// GET /api/payments/stats - Get payment statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let groupByFormat: string;
    switch (period) {
      case 'daily':
        groupByFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        groupByFormat = '%Y-%U';
        break;
      case 'monthly':
        groupByFormat = '%Y-%m';
        break;
      case 'yearly':
        groupByFormat = '%Y';
        break;
      default:
        groupByFormat = '%Y-%m';
    }
    
    const stats: PaymentStats[] = await Payment.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$date' } },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Additional useful endpoints:

// GET /api/payments/:id - Get single payment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    res.json({
      success: true,
      data: payment
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payments - Create a new payment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { invoiceId, client, amount, date, method, status } = req.body;
    
    // Validate required fields
    if (!invoiceId || !client || !amount || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: invoiceId, client, amount, method' 
      });
    }
    
    const payment = new Payment({
      invoiceId,
      client,
      amount: parseFloat(amount),
      date: date ? new Date(date) : new Date(),
      method,
      status: status || 'pending'
    });
    
    await payment.save();
    
    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  
}});

// PUT /api/payments/:id - Update a payment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { invoiceId, client, amount, date, method, status } = req.body;
    
    const updateData: Partial<IPayment> = {};
    if (invoiceId) updateData.invoiceId = invoiceId;
    if (client) updateData.client = client;
    if (amount) updateData.amount = parseFloat(amount);
    if (date) updateData.date = new Date(date);
    if (method) updateData.method = method;
    if (status) updateData.status = status;
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    res.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/payments/:id - Delete a payment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;