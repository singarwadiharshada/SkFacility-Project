"use client";

import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Shield, Briefcase, Users, Mail, Phone, MapPin, UserCog, Filter, Calendar, ChevronDown, UserPlus, TrendingUp, CheckCircle, XCircle, Clock, MoreVertical, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import userService from "@/services/userService"; 
import type { User, UserRole, CreateUserData } from "@/types/user";

// Particle Background Component with theme support
const ParticleBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20"></div>
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
  </div>
);

// Subtle gradient backgrounds for cards
const CARD_GRADIENTS = {
  admin: {
    light: "bg-gradient-to-br from-white to-red-50/50 dark:from-gray-900 dark:to-red-950/20",
    border: "border-red-100 dark:border-red-900/30",
    icon: "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40"
  },
  manager: {
    light: "bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-900 dark:to-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/30",
    icon: "bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40"
  },
  supervisor: {
    light: "bg-gradient-to-br from-white to-amber-50/50 dark:from-gray-900 dark:to-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/30",
    icon: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40"
  },
  employee: {
    light: "bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/20",
    border: "border-indigo-100 dark:border-indigo-900/30",
    icon: "bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40"
  },
  stats: {
    total: {
      light: "bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20",
      border: "border-blue-100 dark:border-blue-900/30",
      icon: "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40"
    },
    active: {
      light: "bg-gradient-to-br from-white to-green-50/50 dark:from-gray-900 dark:to-green-950/20",
      border: "border-green-100 dark:border-green-900/30",
      icon: "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40"
    }
  }
};

// Utility functions for date formatting
const formatDateForDisplay = (dateValue: any): string => {
  if (!dateValue) return 'N/A';
  try {
    if (typeof dateValue === 'string') {
      const dateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) return dateMatch[1];
      return dateValue;
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toISOString().split('T')[0];
  } catch (error) {
    return 'N/A';
  }
};

const formatDateForAPI = (dateValue: any): string => {
  if (!dateValue) return new Date().toISOString();
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
};

// Enhanced User Avatar with animation and theme support
const UserAvatar = ({ name, role, size = "md" }: { name: string; role: UserRole; size?: "sm" | "md" | "lg" }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base"
  };
  
  const gradients = {
    admin: "bg-gradient-to-br from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-700",
    manager: "bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700",
    supervisor: "bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700",
    employee: "bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-600 dark:to-violet-700"
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`${sizeClasses[size]} ${gradients[role]} rounded-xl flex items-center justify-center text-white font-semibold shadow-lg relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 group-hover:bg-white/20 dark:group-hover:bg-white/10 transition-colors"></div>
      <span className="relative z-10">{initials}</span>
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-white dark:bg-gray-100"
      />
    </motion.div>
  );
};

// Types for form data
interface FormUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  phone: string;
  status: 'active' | 'inactive';
  joinDate: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

const departments = ['IT', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales', 'Admin', 'Engineering', 'Support'];
const roles: UserRole[] = ['admin', 'manager', 'supervisor', 'employee'];

// Enhanced User Form with theme support
const UserForm = ({ 
  onSubmit, 
  isEditing = false, 
  user = null 
}: { 
  onSubmit: (data: FormUserData) => void;
  isEditing?: boolean;
  user?: User | null;
}) => {
  const [formData, setFormData] = useState<FormUserData>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    department: user?.department || '',
    phone: user?.phone || '',
    status: user?.status || 'active',
    joinDate: user?.joinDate ? 
      (typeof user.joinDate === 'string' ? 
        user.joinDate.split('T')[0] : 
        new Date(user.joinDate).toISOString().split('T')[0]
      ) : 
      new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit} 
      className="space-y-6 p-1"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
          <div className="relative">
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              required
              className="pl-10 h-11 rounded-lg"
            />
            <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@company.com"
                required
                className="pl-10 h-11 rounded-lg"
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password {!isEditing && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={isEditing ? "Leave blank to keep current" : "••••••••"}
              required={!isEditing}
              className="h-11 rounded-lg"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: UserRole) => setFormData({...formData, role: value})}
            >
              <SelectTrigger className="h-11 rounded-lg">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {roles.map(role => (
                  <SelectItem key={role} value={role} className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        role === 'admin' ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                        role === 'manager' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                        role === 'supervisor' ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 
                        'bg-gradient-to-r from-indigo-500 to-violet-600'
                      }`} />
                      <span className="font-medium">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Department</Label>
            <Select 
              value={formData.department} 
              onValueChange={(value) => setFormData({...formData, department: value})}
            >
              <SelectTrigger className="h-11 rounded-lg">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="rounded-lg max-h-60">
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept} className="py-3">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      {dept}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Join Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                required
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
                required
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setFormData({...formData, status: 'active'})}
              className={`flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all ${
                formData.status === 'active' 
                  ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-sm' 
                  : 'border-input hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              Active
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setFormData({...formData, status: 'inactive'})}
              className={`flex items-center justify-center gap-2 h-11 rounded-lg border-2 transition-all ${
                formData.status === 'inactive' 
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm' 
                  : 'border-input hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <XCircle className="h-4 w-4" />
              Inactive
            </motion.button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Main form button with blue-500 color */}
          <Button 
            type="submit" 
            className="w-full h-12 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isEditing ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Update User
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.form>
  );
};

// Enhanced User List Component (handles Admin, Manager, Supervisor tabs only)
const UserList = ({ 
  title, 
  icon: Icon, 
  roleFilter,
  description 
}: { 
  title: string;
  icon: React.ElementType;
  roleFilter: UserRole[];
  description: string;
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      const filteredUsers = data.allUsers.filter(user => 
        roleFilter.includes(user.role)
      );
      setUsers(filteredUsers);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async (formData: FormUserData) => {
    try {
      const [firstName, ...lastNameParts] = formData.name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const userData: CreateUserData = {
        username: formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
        role: formData.role,
        firstName,
        lastName,
        department: formData.department,
        phone: formData.phone,
        joinDate: formatDateForAPI(formData.joinDate)
      };

      const newUser = await userService.createUser(userData);
      setUsers(prev => [newUser, ...prev]);
      toast.success(`${title.slice(0, -1)} added successfully`, {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleEditUser = async (formData: FormUserData, userId: string) => {
    try {
      const [firstName, ...lastNameParts] = formData.name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        phone: formData.phone,
        isActive: formData.status === 'active',
        firstName,
        lastName,
        joinDate: formatDateForAPI(formData.joinDate)
      };

      const updatedUser = await userService.updateUser(userId, updateData);
      setUsers(prev => prev.map(user =>
        user._id === userId ? { ...user, ...updatedUser } : user
      ));
      toast.success(`${title.slice(0, -1)} updated successfully`, {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user._id !== userId));
      toast.success(`${title.slice(0, -1)} deleted successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const updatedUser = await userService.toggleUserStatus(userId);
      setUsers(prev => prev.map(user =>
        user._id === userId ? updatedUser : user
      ));
      toast.success('Status updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      admin: "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
      manager: "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
      supervisor: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      employee: "bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
      super_admin: "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
    };
    return colors[role];
  };

  const getGradientStyle = () => {
    if (title.includes('Admin')) return CARD_GRADIENTS.admin;
    if (title.includes('Manager')) return CARD_GRADIENTS.manager;
    if (title.includes('Supervisor')) return CARD_GRADIENTS.supervisor;
    return CARD_GRADIENTS.employee;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-[400px] flex items-center justify-center"
      >
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Icon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-muted-foreground font-medium">Loading {title.toLowerCase()}...</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Fetching your team members</p>
        </div>
      </motion.div>
    );
  }

  const gradientStyle = getGradientStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm ${gradientStyle.light} ${gradientStyle.border}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${gradientStyle.icon}`}>
            <Icon className={`h-6 w-6 ${
              title.includes('Admin') ? 'text-red-600 dark:text-red-400' :
              title.includes('Manager') ? 'text-emerald-600 dark:text-emerald-400' :
              title.includes('Supervisor') ? 'text-amber-600 dark:text-amber-400' :
              'text-indigo-600 dark:text-indigo-400'
            }`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              {title}
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 text-sm font-normal bg-white/50 dark:bg-black/30 backdrop-blur-sm text-foreground rounded-full"
              >
                {filteredUsers.length} members
              </motion.span>
            </h3>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        
        {/* Add New Button with blue-500 color */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="h-11 px-6 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border shadow-2xl rounded-2xl p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">Add New {title.slice(0, -1)}</DialogTitle>
                <p className="text-blue-100 mt-2">Invite a new team member to join your organization</p>
              </DialogHeader>
            </div>
            <div className="p-6">
              <UserForm onSubmit={handleAddUser} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()} by name, email, or department...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-xl"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-12 min-w-[140px] rounded-xl">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${gradientStyle.light} ${gradientStyle.border}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-b border-gray-100 dark:border-gray-800">
                <TableHead className="py-4 text-sm font-semibold">Member</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Contact</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Role</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Department</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Joined</TableHead>
                <TableHead className="py-4 text-sm font-semibold">Status</TableHead>
                <TableHead className="py-4 text-sm font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center"
                      >
                        <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 mb-4">
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">No {title.toLowerCase()} found</h3>
                        <p className="text-muted-foreground mt-1">
                          {searchTerm ? 'Try adjusting your search' : `Get started by adding your first ${title.slice(0, -1).toLowerCase()}`}
                        </p>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr 
                      key={user._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-white/30 dark:hover:bg-black/20 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.name} role={user.role} />
                          <div>
                            <div className="font-semibold text-foreground">{user.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Hash className="h-3 w-3" />
                              ID: {user.id || user._id.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4">
                        <Badge className={`px-3 py-1.5 rounded-lg font-medium ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.department}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-foreground">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateForDisplay(user.joinDate)}
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
                          user.status === 'active' 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                            : 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                        }`}>
                          {user.status === 'active' ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </motion.div>
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          <span className="capitalize">{user.status}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-4">
                        <div className="flex justify-end gap-2">
                          {/* Toggle Status Button with blue color */}
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user._id)}
                              className={`h-9 w-9 rounded-lg text-[#3b82f6] hover:bg-[#3b82f6]/10`}
                              title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {user.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                          </motion.div>
                          
                          {/* Edit Button with blue-500 color */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 rounded-lg text-[#3b82f6] hover:bg-[#3b82f6]/10"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl border shadow-2xl rounded-2xl p-0 overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-bold text-white">Edit {title.slice(0, -1)}</DialogTitle>
                                  <p className="text-blue-100 mt-2">Update user information</p>
                                </DialogHeader>
                              </div>
                              <div className="p-6">
                                <UserForm 
                                  user={user} 
                                  onSubmit={(data) => handleEditUser(data, user._id)}
                                  isEditing={true}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {/* Delete Button (kept red for danger action) */}
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user._id)}
                              className="h-9 w-9 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
};

// Hash icon component
const Hash = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

// Enhanced Stats Cards with subtle gradient colors
const StatsCards = () => {
  const [stats, setStats] = useState([
    { 
      title: "Total Users", 
      value: 0, 
      icon: Users, 
      description: "All system users", 
      gradient: CARD_GRADIENTS.stats.total,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: CARD_GRADIENTS.stats.total.icon,
      change: "+12%",
      changeColor: "text-blue-600 dark:text-blue-400"
    },
    { 
      title: "Admins", 
      value: 0, 
      icon: UserCog, 
      description: "System administrators", 
      gradient: CARD_GRADIENTS.admin,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: CARD_GRADIENTS.admin.icon,
      change: "+5%",
      changeColor: "text-red-600 dark:text-red-400"
    },
    { 
      title: "Managers", 
      value: 0, 
      icon: Briefcase, 
      description: "Department managers", 
      gradient: CARD_GRADIENTS.manager,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: CARD_GRADIENTS.manager.icon,
      change: "+8%",
      changeColor: "text-emerald-600 dark:text-emerald-400"
    },
    { 
      title: "Supervisors", 
      value: 0, 
      icon: Shield, 
      description: "Team supervisors", 
      gradient: CARD_GRADIENTS.supervisor,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: CARD_GRADIENTS.supervisor.icon,
      change: "+15%",
      changeColor: "text-amber-600 dark:text-amber-400"
    },
    { 
      title: "Active Users", 
      value: 0, 
      icon: TrendingUp, 
      description: "Currently active", 
      gradient: CARD_GRADIENTS.stats.active,
      iconColor: "text-green-600 dark:text-green-400",
      iconBg: CARD_GRADIENTS.stats.active.icon,
      change: "+18%",
      changeColor: "text-green-600 dark:text-green-400"
    }
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await userService.getAllUsers();
      const users = data.allUsers;
      
      const newStats = [
        { ...stats[0], value: users.length },
        { ...stats[1], value: users.filter(u => u.role === 'admin').length },
        { ...stats[2], value: users.filter(u => u.role === 'manager').length },
        { ...stats[3], value: users.filter(u => u.role === 'supervisor').length },
        { ...stats[4], value: users.filter(u => u.status === 'active').length }
      ];
      
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className={`${stat.gradient.light} ${stat.gradient.border} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative group`}>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20 dark:to-white/5 pointer-events-none" />
            <CardHeader className="pb-2 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, delay: index * 0.5 }}
                  className={`p-2 rounded-lg ${stat.iconBg}`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </motion.div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <motion.p 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-bold text-foreground"
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                  className={`text-xs font-medium px-2 py-1 rounded-full ${stat.iconBg} ${stat.changeColor}`}
                >
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {stat.change}
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Main Component with impressive animations
const UsersRolesManagement = () => {
  const [activeTab, setActiveTab] = useState("admins");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10 relative overflow-hidden">
      <ParticleBackground />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <DashboardHeader 
          title={
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Users & Roles Management
              </span>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-blue-400"
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
            </div>
          }
          subtitle="Manage your team with precision and elegance"
        />
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-6 max-w-7xl mx-auto"
      >
        <StatsCards />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border shadow-xl rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardContent className="p-0">
              <Tabs defaultValue="admins" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 pt-6">
                  <TabsList className="grid w-full grid-cols-3 gap-2 p-1 bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800 dark:to-gray-700/50 rounded-2xl">
                    <TabsTrigger 
                      value="admins" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-red-50/50 data-[state=active]:dark:from-gray-800 data-[state=active]:dark:to-red-950/20 data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600"></div>
                        <UserCog className="h-4 w-4" />
                        Admins
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="managers" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-emerald-50/50 data-[state=active]:dark:from-gray-800 data-[state=active]:dark:to-emerald-950/20 data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                        <Briefcase className="h-4 w-4" />
                        Managers
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="supervisors" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-amber-50/50 data-[state=active]:dark:from-gray-800 data-[state=active]:dark:to-amber-950/20 data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"></div>
                        <Shield className="h-4 w-4" />
                        Supervisors
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-6">
                      <TabsContent value="admins" className="m-0">
                        <UserList 
                          title="Administrators"
                          icon={UserCog}
                          roleFilter={['admin']}
                          description="Full system access and control"
                        />
                      </TabsContent>
                      
                      <TabsContent value="managers" className="m-0">
                        <UserList 
                          title="Managers"
                          icon={Briefcase}
                          roleFilter={['manager']}
                          description="Department leadership and oversight"
                        />
                      </TabsContent>
                      
                      <TabsContent value="supervisors" className="m-0">
                        <UserList 
                          title="Supervisors"
                          icon={Shield}
                          roleFilter={['supervisor']}
                          description="Team coordination and task management"
                        />
                      </TabsContent>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UsersRolesManagement;