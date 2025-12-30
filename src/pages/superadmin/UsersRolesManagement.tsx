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
import { Search, Plus, Edit, Trash2, Shield, Briefcase, Users, Mail, Phone, MapPin, UserCog } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import userService from "@/services/userService"; // default import for the service
import type { User, UserRole, CreateUserData } from "@/types/user";

// Utility functions for date handling
const formatDateForDisplay = (dateValue: any): string => {
  if (!dateValue) return 'N/A';
  
  try {
    if (typeof dateValue === 'string') {
      // Try to extract date part from ISO string
      const dateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        return dateMatch[1];
      }
      return dateValue;
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
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
    console.error('Error formatting date for API:', error);
    return new Date().toISOString();
  }
};

// Types
interface FormUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  site: string;
  phone: string;
  status: 'active' | 'inactive';
  joinDate: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

const departments = ['IT', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales', 'Admin'];
const sites = ['Mumbai Office', 'Delhi Branch', 'Bangalore Tech Park', 'Chennai Center', 'Hyderabad Campus'];
const roles: UserRole[] = ['admin', 'manager', 'supervisor', 'employee'];

// User Form Component
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
    site: user?.site || '',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Enter full name"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="Enter email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password {!isEditing && '*'}</Label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="Enter password"
            required={!isEditing}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role *</Label>
          <Select 
            value={formData.role} 
            onValueChange={(value: UserRole) => setFormData({...formData, role: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Department *</Label>
          <Select 
            value={formData.department} 
            onValueChange={(value) => setFormData({...formData, department: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Site *</Label>
          <Select 
            value={formData.site} 
            onValueChange={(value) => setFormData({...formData, site: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(site => (
                <SelectItem key={site} value={site}>{site}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Join Date *</Label>
          <Input
            type="date"
            value={formData.joinDate}
            onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="Enter phone number"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Status *</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value: 'active' | 'inactive') => setFormData({...formData, status: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full">
        {isEditing ? 'Update User' : 'Add User'}
      </Button>
    </form>
  );
};

// Reusable User List Component
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
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async (formData: FormUserData) => {
    try {
      // Split name into firstName and lastName
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
        site: formData.site,
        phone: formData.phone,
        joinDate: formatDateForAPI(formData.joinDate)
      };

      const newUser = await userService.createUser(userData);
      setUsers(prev => [newUser, ...prev]);
      toast.success(`${title.slice(0, -1)} added successfully`);
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleEditUser = async (formData: FormUserData, userId: string) => {
    try {
      // Split name into firstName and lastName
      const [firstName, ...lastNameParts] = formData.name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        site: formData.site,
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
      toast.success(`${title.slice(0, -1)} updated successfully`);
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
      admin: 'destructive',
      manager: 'default',
      supervisor: 'secondary',
      employee: 'outline',
      super_admin: 'destructive'
    };
    return colors[role];
  };

  const getStatusColor = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'default' : 'secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading {title.toLowerCase()}...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icon className="h-6 w-6" />
              {title} ({filteredUsers.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add {title.slice(0, -1)}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New {title.slice(0, -1)}</DialogTitle>
              </DialogHeader>
              <UserForm onSubmit={handleAddUser} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No {title.toLowerCase()} found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div>{user.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {user.id || user._id.slice(-6)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleColor(user.role) as any}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {user.site}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {user.phone}
                    </div>
                  </TableCell>
                  <TableCell>{formatDateForDisplay(user.joinDate)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleStatus(user._id)}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit {title.slice(0, -1)}</DialogTitle>
                          </DialogHeader>
                          <UserForm 
                            user={user} 
                            onSubmit={(data) => handleEditUser(data, user._id)}
                            isEditing={true}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Stats Cards Component
const StatsCards = () => {
  const [stats, setStats] = useState([
    { title: "Total Users", value: 0, icon: Users, description: "All system users", color: "text-blue-600" },
    { title: "Admins", value: 0, icon: UserCog, description: "System administrators", color: "text-red-600" },
    { title: "Managers", value: 0, icon: Briefcase, description: "Department managers", color: "text-green-600" },
    { title: "Supervisors", value: 0, icon: Shield, description: "Team supervisors", color: "text-purple-600" },
    { title: "Employees", value: 0, icon: Users, description: "Regular employees", color: "text-orange-600" },
    { title: "Active Users", value: 0, icon: Users, description: "Currently active", color: "text-green-600" }
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
        { ...stats[4], value: users.filter(u => u.role === 'employee').length },
        { ...stats[5], value: users.filter(u => u.status === 'active').length }
      ];
      
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Main Component
const UsersRolesManagement = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Users & Roles Management" 
        subtitle="Manage all system users, roles and permissions" 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <StatsCards />
        
        <Tabs defaultValue="admins" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="managers" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Managers
            </TabsTrigger>
            <TabsTrigger value="supervisors" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Supervisors
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="admins">
            <UserList 
              title="Admins"
              icon={UserCog}
              roleFilter={['admin']}
              description="System administrators with full access"
            />
          </TabsContent>
          
          <TabsContent value="managers">
            <UserList 
              title="Managers"
              icon={Briefcase}
              roleFilter={['manager']}
              description="Department managers with management privileges"
            />
          </TabsContent>
          
          <TabsContent value="supervisors">
            <UserList 
              title="Supervisors"
              icon={Shield}
              roleFilter={['supervisor']}
              description="Team supervisors with oversight responsibilities"
            />
          </TabsContent>
          
          <TabsContent value="employees">
            <UserList 
              title="Employees"
              icon={Users}
              roleFilter={['employee']}
              description="Regular employees with standard access"
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default UsersRolesManagement;