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
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import userService from "@/services/userService";
import { useRole } from "@/context/RoleContext";
import { User as UserType } from "@/types/user";

const Profile = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  
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
      setDebugInfo("Starting to fetch user...");
      
      // Get the current user's ID from auth context
      const userId = authUser?._id || authUser?.id;
      
      console.log("Auth User from context:", authUser);
      console.log("User ID to fetch:", userId);
      
      if (!userId) {
        const errorMsg = "No user ID found in auth context";
        setDebugInfo(errorMsg);
        throw new Error(errorMsg);
      }
      
      setDebugInfo(`Fetching user with ID: ${userId}`);
      
      // Use getAllUsers and find the current user
      const allUsersResponse = await userService.getAllUsers();
      const allUsers = allUsersResponse.allUsers;
      
      // Try to find the user in the list
      const foundUser = allUsers.find(user => 
        user._id === userId || user.id === userId
      );
      
      if (foundUser) {
        console.log("Found user in getAllUsers:", foundUser);
        setDebugInfo("Found user in getAllUsers list");
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
          console.log("Falling back to localStorage user:", parsedUser);
          setDebugInfo("Using localStorage fallback");
          
          setCurrentUser(parsedUser);
          setFormData({
            name: parsedUser.name || "",
            email: parsedUser.email || "",
            phone: parsedUser.phone || "",
            department: parsedUser.department || "",
            site: parsedUser.site || "",
          });
          
          toast.warning("Using cached user data from localStorage");
        } else {
          throw new Error("User not found");
        }
      }
      
    } catch (error: any) {
      console.error("Error fetching user:", error);
      setDebugInfo(`Error: ${error.message}`);
      toast.error("Failed to load user data");
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

      // Try to update user
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
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
            {debugInfo && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Debug: {debugInfo}
              </div>
            )}
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
        {/* Debug panel - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed border-2 border-yellow-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-yellow-700">Debug Info</h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchCurrentUser}
                  className="h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
              <div className="text-xs space-y-1">
                <p>Auth User ID: {authUser?._id || authUser?.id || 'None'}</p>
                <p>Current User ID: {currentUser?._id || 'None'}</p>
                <p>Status: {debugInfo}</p>
                <p className="truncate">Token exists: {localStorage.getItem('sk_token') ? 'Yes' : 'No'}</p>
              </div>
            </CardContent>
          </Card>
        )}

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
                    {currentUser?.role?.toUpperCase() || 'USER'}
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <UserIcon className="h-4 w-4" />
              Profile Information
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Settings className="h-4 w-4" />
              Account Details
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
                        {currentUser?.role?.toUpperCase() || 'N/A'}
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
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Profile;