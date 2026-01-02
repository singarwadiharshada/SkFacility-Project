import { Request, Response } from 'express';
import Expense, { IExpense } from '../models/Expense';

// Get all expenses
export const getAllExpenses = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      expenseType,
      status,
      site,
      startDate,
      endDate,
      search
    } = req.query;

    const query: any = {};

    if (expenseType && expenseType !== 'all') {
      query.expenseType = expenseType;
    }

    if (status) {
      query.status = status;
    }

    if (site) {
      query.site = site;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate as string);
      }
    }

    if (search) {
      query.$or = [
        { expenseId: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      success: true,
      data: expenses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching expenses'
    });
  }
};

// Get single expense
export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      data: expense
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching expense'
    });
  }
};

// Create new expense
export const createExpense = async (req: Request, res: Response) => {
  try {
    const {
      category,
      description,
      baseAmount,
      date,
      vendor,
      paymentMethod,
      site,
      expenseType,
      notes,
      createdBy = 'system'
    } = req.body;

    // Calculate GST (18%)
    const gst = baseAmount * 0.18;
    const amount = baseAmount + gst;

    const newExpense = new Expense({
      category,
      description,
      baseAmount,
      gst,
      amount,
      date: date || new Date(),
      status: 'pending',
      vendor,
      paymentMethod,
      site,
      expenseType,
      notes,
      createdBy
    });

    await newExpense.save();

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: newExpense
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating expense'
    });
  }
};

// Update expense
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const {
      category,
      description,
      baseAmount,
      date,
      vendor,
      paymentMethod,
      site,
      expenseType,
      status,
      notes
    } = req.body;

    // Calculate GST if baseAmount is provided
    let gst, amount;
    if (baseAmount !== undefined) {
      gst = baseAmount * 0.18;
      amount = baseAmount + gst;
    }

    const updateData: any = {
      category,
      description,
      date,
      vendor,
      paymentMethod,
      site,
      expenseType,
      status,
      notes,
      updatedAt: new Date()
    };

    if (baseAmount !== undefined) {
      updateData.baseAmount = baseAmount;
      updateData.gst = gst;
      updateData.amount = amount;
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating expense'
    });
  }
};

// Delete expense
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting expense'
    });
  }
};

// Update expense status
export const updateExpenseStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense status updated successfully',
      data: expense
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating expense status'
    });
  }
};

// Get expense statistics
export const getExpenseStats = async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;

    const today = new Date();
    let startDate: Date;

    if (period === 'weekly') {
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    // Get site-wise expenses
    const siteStats = await Expense.aggregate([
      {
        $match: {
          status: 'approved',
          date: { $gte: startDate, $lte: today }
        }
      },
      {
        $group: {
          _id: '$site',
          operational: {
            $sum: {
              $cond: [{ $eq: ['$expenseType', 'operational'] }, '$amount', 0]
            }
          },
          office: {
            $sum: {
              $cond: [{ $eq: ['$expenseType', 'office'] }, '$amount', 0]
            }
          },
          other: {
            $sum: {
              $cond: [{ $eq: ['$expenseType', 'other'] }, '$amount', 0]
            }
          },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get total expenses by type
    const typeStats = await Expense.aggregate([
      {
        $match: {
          status: 'approved',
          date: { $gte: startDate, $lte: today }
        }
      },
      {
        $group: {
          _id: '$expenseType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get status counts
    const statusStats = await Expense.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        siteStats,
        typeStats,
        statusStats,
        period: period as string,
        startDate,
        endDate: today
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching expense statistics'
    });
  }
};

// Get expense summary
export const getExpenseSummary = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Monthly total
    const monthlyTotal = await Expense.aggregate([
      {
        $match: {
          status: 'approved',
          date: { $gte: firstDayOfMonth, $lte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Yearly total
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const yearlyTotal = await Expense.aggregate([
      {
        $match: {
          status: 'approved',
          date: { $gte: firstDayOfYear, $lte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Recent expenses
    const recentExpenses = await Expense.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        monthlyTotal: monthlyTotal[0]?.total || 0,
        yearlyTotal: yearlyTotal[0]?.total || 0,
        pendingCount: await Expense.countDocuments({ status: 'pending' }),
        recentExpenses
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching expense summary'
    });
  }
};