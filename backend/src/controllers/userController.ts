import { Request, Response } from 'express';
import User, { IUser } from '../models/User';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    
    // Group by role
    const groupedByRole = users.reduce((acc: Record<string, IUser[]>, user) => {
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
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = new User(req.body);
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
      { _id: 'admin', count: users.filter(u => u.role === 'admin').length },
      { _id: 'manager', count: users.filter(u => u.role === 'manager').length },
      { _id: 'supervisor', count: users.filter(u => u.role === 'supervisor').length },
      { _id: 'employee', count: users.filter(u => u.role === 'employee').length }
    ];
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};