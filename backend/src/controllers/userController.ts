import { Request, Response } from 'express';
import { User } from '../models/User';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    
    // Group by role using any type
    const groupedByRole = (users as any[]).reduce((acc: any, user: any) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {});

    res.json({
      allUsers: users,
      groupedByRole,
      total: users.length,
      active: (users as any[]).filter((u: any) => u.isActive).length,
      inactive: (users as any[]).filter((u: any) => !u.isActive).length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const user = new User(userData);
    await user.save();
    
    res.status(201).json({
      user,
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(400).json({ message: 'Error creating user' });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    const stats = [
      { _id: 'admin', count: (users as any[]).filter((u: any) => u.role === 'admin').length },
      { _id: 'manager', count: (users as any[]).filter((u: any) => u.role === 'manager').length },
      { _id: 'supervisor', count: (users as any[]).filter((u: any) => u.role === 'supervisor').length },
      { _id: 'employee', count: (users as any[]).filter((u: any) => u.role === 'employee').length }
    ];
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};