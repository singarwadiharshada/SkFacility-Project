"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  User as UserIcon,
  Settings,
  AlertTriangle,
  Loader2,
  Save,
  Download,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import userService from "@/services/userService";
import { useRole } from "@/context/RoleContext";
import { User as UserType } from "@/types/user";

const SupervisorProfile = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    site: "",
  });

  useEffect(() => {
    if (authUser && isAuthenticated) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [authUser, isAuthenticated]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      
      const userId = authUser?._id || authUser?.id;
      
      if (!userId) {
        throw new Error("No user ID found in auth context");
      }
      
      // Use getAllUsers and find the current user
      const allUsersResponse = await userService.getAllUsers();
      const foundUser = allUsersResponse.allUsers.find(user => 
        user._id === userId || user.id === userId
      );
      
      if (foundUser) {
        setCurrentUser(foundUser);
        setFormData({
          name: foundUser.name || "",
          email: foundUser.email || "",
          phone: foundUser.phone || "",
          department: foundUser.department || "",
          site: foundUser.site || "",
        });
      } else {
        // Fallback to localStorage
        const storedUser = localStorage.getItem('sk_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          setFormData({
            name: parsedUser.name || "",
            email: parsedUser.email || "",
            phone: parsedUser.phone || "",
            department: parsedUser.department || "",
            site: parsedUser.site || "",
          });
          toast.warning("Using cached user data");
        } else {
          throw new Error("User not found");
        }
      }
      
    } catch (error: any) {
      console.error("Error fetching user:", error);
      toast.error("Failed to load user data");
      
      // Set default values if fetch fails
      setFormData({
        name: "Supervisor User",
        email: "supervisor@sk.com",
        phone: "+1 234 567 8902",
        department: "Operations",
        site: "Main Office",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !currentUser._id) {
      toast.error("No user data available");
      return;
    }
    
    setSaving(true);
    
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        site: formData.site,
        isActive: currentUser.isActive,
        firstName: formData.name.split(' ')[0] || "",
        lastName: formData.name.split(' ').slice(1).join(' ') || "",
        joinDate: currentUser.joinDate || new Date().toISOString()
      };

      const updatedUser = await userService.updateUser(currentUser._id, updateData);
      
      // Update local state
      setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : null);
      
      // Update localStorage
      const storedUser = localStorage.getItem('sk_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const updatedStoredUser = {
          ...parsedUser,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          site: formData.site
        };
        localStorage.setItem('sk_user', JSON.stringify(updatedStoredUser));
      }
      
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportData = () => {
    try {
      const data = {
        profile: formData,
        accountInfo: {
          userId: currentUser?._id,
          role: currentUser?.role,
          status: currentUser?.isActive ? "Active" : "Inactive",
          joinDate: currentUser?.joinDate,
          lastUpdated: new Date().toISOString()
        }
      };
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `supervisor-profile-${currentUser?._id || 'data'}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      toast.error("Account deletion feature not implemented yet");
      // In a real app, you would call: await userService.deleteUser(currentUser._id);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'supervisor': return 'secondary';
      case 'employee': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="My Profile" subtitle="Manage your account settings" />
        <div className="p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-4">
                Please log in to view your profile.
              </p>
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="My Profile" subtitle="Manage your account settings" />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="My Profile" 
        subtitle="Manage your account settings and preferences" 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 max-w-6xl mx-auto space-y-6"
      >
        {/* User Header Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/70 text-white">
                  {getInitials(formData.name)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{formData.name}</h1>
                  <Badge variant={getRoleColor(currentUser?.role || '')}>
                    <Shield className="h-3 w-3 mr-1" />
                    {currentUser?.role?.toUpperCase() || 'SUPERVISOR'}
                  </Badge>
                  <Badge variant={currentUser?.isActive ? 'default' : 'secondary'}>
                    {getStatusIcon(currentUser?.isActive || false)}
                    <span className="ml-1 capitalize">
                      {currentUser?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </Badge>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {formData.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {formData.department || 'No department'}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {formData.site || 'No site'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <UserIcon className="h-4 w-4" />
              Profile Information
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Settings className="h-4 w-4" />
              Account Details
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Settings className="h-4 w-4" />
              Account Actions
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </Label>
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      <Input 
                        id="phone" 
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="department" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Department
                      </Label>
                      <Input 
                        id="department" 
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        placeholder="Enter your department"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="site" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Site/Location
                      </Label>
                      <Input 
                        id="site" 
                        value={formData.site}
                        onChange={(e) => handleInputChange('site', e.target.value)}
                        placeholder="Enter your site location"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Member Since
                      </Label>
                      <div className="px-3 py-2 border rounded-md bg-muted/50">
                        {formatDate(currentUser?.joinDate || '')}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>
                  Your account information and metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">User ID</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded">
                    {currentUser?._id || 'N/A'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getRoleColor(currentUser?.role || '')}>
                        {currentUser?.role?.toUpperCase() || 'SUPERVISOR'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(currentUser?.isActive || false)}
                      <span className="capitalize">
                        {currentUser?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Join Date</Label>
                    <p className="font-medium">{formatDate(currentUser?.joinDate || '')}</p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">Last Updated</Label>
                    <p className="font-medium">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Just now
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Actions Tab */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>
                  Manage your account data and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Export Data</Label>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm mb-3">
                      Download a copy of your profile data in JSON format. This includes your personal information and account details.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleExportData}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export My Data
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Account Deletion</Label>
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <p className="text-sm mb-3 text-red-600 dark:text-red-400">
                      Warning: This action is permanent and cannot be undone. All your data will be permanently deleted.
                    </p>
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default SupervisorProfile;