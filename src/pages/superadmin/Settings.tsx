'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, User, Lock, Shield, Loader2, Key, Eye, EyeOff,
  Mail, Phone, KeyRound, CheckCircle, AlertCircle, Bell,
  Search, LogOut, ShieldCheck
} from "lucide-react";

const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5001/api';
  }
  return `http://${window.location.hostname}:5001/api`;
};

const API_BASE = getApiUrl();
const SETTINGS_BASE = `${API_BASE}/settings`;

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sk_token') || 
         localStorage.getItem('token') ||
         sessionStorage.getItem('sk_token');
};

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  return await fetch(url, { ...options, headers });
};

const Settings = () => {
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    permissions: false,
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [profileData, setProfileData] = useState({
    name: 'Super Admin',
    email: 'admin@skproject.com',
    phone: '+1234567890',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [permissions, setPermissions] = useState({
    canCreateAdmins: true,
    canManageManagers: true,
    canViewReports: true,
    canDeleteUsers: true,
  });
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profileRes = await authFetch(`${SETTINGS_BASE}/profile`);
      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.success && data.data) {
          setProfileData({
            name: data.data.name || 'Super Admin',
            email: data.data.email || 'admin@skproject.com',
            phone: data.data.phone || '+1234567890',
          });
        }
      }

      const permRes = await authFetch(`${SETTINGS_BASE}/permissions`);
      if (permRes.ok) {
        const data = await permRes.json();
        if (data.success && data.data) {
          setPermissions(data.data);
        }
      }
    } catch (error: any) {
      // Use mock data if API fails
      setProfileData({
        name: 'Super Admin',
        email: 'admin@skproject.com',
        phone: '+1234567890',
      });
      setPermissions({
        canCreateAdmins: true,
        canManageManagers: true,
        canViewReports: true,
        canDeleteUsers: true,
      });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading({ ...loading, profile: true });

    try {
      const response = await authFetch(`${SETTINGS_BASE}/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Profile updated successfully!');
      } else if (response.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading({ ...loading, profile: false });
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading({ ...loading, password: true });

    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match!");
      setLoading({ ...loading, password: false });
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters!");
      setLoading({ ...loading, password: false });
      return;
    }

    try {
      const response = await authFetch(`${SETTINGS_BASE}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {}

      if (response.ok) {
        toast.success(responseData?.message || 'Password updated successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPassword({ current: false, new: false, confirm: false });
      } else if (response.status === 400) {
        const errorMessage = responseData?.error || 'Invalid current password or password requirements not met';
        toast.error(errorMessage);
      } else if (response.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else {
        const errorMessage = responseData?.error || 'Failed to update password';
        toast.error(errorMessage);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading({ ...loading, password: false });
    }
  };

  const handlePermissionsUpdate = async () => {
    setLoading({ ...loading, permissions: true });

    try {
      const response = await authFetch(`${SETTINGS_BASE}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(permissions),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Permissions updated successfully!');
      } else if (response.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else {
        toast.error('Failed to update permissions');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading({ ...loading, permissions: false });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sk_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('sk_user');
    sessionStorage.removeItem('sk_token');
    sessionStorage.removeItem('token');
    toast.success('Logged out successfully');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - CRM Style */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Settings & Configuration
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search settings..."
                className="pl-10 w-64 rounded-full border-gray-300 bg-gray-100 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Settings Menu</h2>
                </div>
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "profile" ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Profile Settings</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "security" ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-medium">Security</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("permissions")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "permissions" ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Permissions</span>
                  </button>
                </div>
                
                <Separator className="my-4" />
                
                <div className="p-4">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
                            <p className="text-sm text-gray-500 mt-1">Manage your personal information and preferences</p>
                          </div>
                          <Badge variant="secondary" className="px-3 py-1">
                            Super Admin
                          </Badge>
                        </div>
                      </div>
                      <div className="p-6">
                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Full Name
                              </Label>
                              <Input 
                                value={profileData.name}
                                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                disabled={loading.profile}
                                placeholder="Enter your full name"
                                className="h-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email Address
                              </Label>
                              <Input 
                                value={profileData.email}
                                disabled
                                className="h-11 rounded-lg border-gray-300 bg-gray-50"
                                readOnly
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Phone Number
                              </Label>
                              <Input 
                                value={profileData.phone}
                                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                disabled={loading.profile}
                                placeholder="Enter phone number"
                                className="h-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end pt-4">
                            <Button 
                              type="submit" 
                              disabled={loading.profile} 
                              className="gap-2 h-11 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg"
                            >
                              {loading.profile ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Security Tab */}
                {activeTab === "security" && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
                            <p className="text-sm text-gray-500 mt-1">Manage your password and security preferences</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <form onSubmit={handlePasswordUpdate} className="space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <KeyRound className="h-4 w-4" />
                                Current Password
                              </Label>
                              <div className="relative">
                                <Input 
                                  name="currentPassword" 
                                  type={showPassword.current ? "text" : "password"} 
                                  value={passwordData.currentPassword}
                                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                  disabled={loading.password}
                                  placeholder="Enter current password"
                                  required
                                  className="h-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-11 pr-11"
                                />
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8"
                                  onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                                >
                                  {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                New Password
                              </Label>
                              <div className="relative">
                                <Input 
                                  name="newPassword" 
                                  type={showPassword.new ? "text" : "password"} 
                                  value={passwordData.newPassword}
                                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                  disabled={loading.password}
                                  placeholder="Enter new password"
                                  required
                                  className="h-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-11 pr-11"
                                />
                                <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8"
                                  onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                                >
                                  {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <KeyRound className="h-4 w-4" />
                                Confirm Password
                              </Label>
                              <div className="relative">
                                <Input 
                                  name="confirmPassword" 
                                  type={showPassword.confirm ? "text" : "password"} 
                                  value={passwordData.confirmPassword}
                                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                  disabled={loading.password}
                                  placeholder="Confirm new password"
                                  required
                                  className="h-11 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-11 pr-11"
                                />
                                <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8"
                                  onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                                >
                                  {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-amber-800 mb-2">Password Requirements</p>
                                <ul className="text-sm text-amber-700 space-y-1">
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                    Minimum 6 characters
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                    Avoid common passwords
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                    Update regularly for security
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 pt-4">
                            <Button 
                              type="submit" 
                              disabled={loading.password} 
                              className="gap-2 h-11 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg flex-1"
                            >
                              {loading.password ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-4 w-4" />
                                  Update Password
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Permissions Tab */}
                {activeTab === "permissions" && (
                  <motion.div
                    key="permissions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Permission Settings</h2>
                            <p className="text-sm text-gray-500 mt-1">Configure access controls and system permissions</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="space-y-6">
                          <div className="space-y-4">
                            {Object.entries(permissions).map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg ${value ? 'bg-green-100' : 'bg-gray-100'}`}>
                                    {value ? (
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <AlertCircle className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div>
                                    <Label className="font-medium text-gray-900 cursor-pointer capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </Label>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {getPermissionDescription(key)}
                                    </p>
                                  </div>
                                </div>
                                <Switch 
                                  checked={value}
                                  onCheckedChange={(checked) => 
                                    setPermissions({...permissions, [key]: checked})
                                  }
                                  disabled={loading.permissions}
                                />
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-between pt-6 border-t">
                            <div className="text-sm text-gray-500">
                              <p>Super Admin has full system access.</p>
                              <p>Toggle switches to restrict specific actions.</p>
                            </div>
                            <Button 
                              onClick={handlePermissionsUpdate} 
                              disabled={loading.permissions} 
                              className="gap-2 h-11 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg"
                            >
                              {loading.permissions ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  Save Permissions
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for permission descriptions
const getPermissionDescription = (key: string) => {
  const descriptions: { [key: string]: string } = {
    canCreateAdmins: 'Allow creating new admin accounts',
    canManageManagers: 'Allow managing manager accounts',
    canViewReports: 'Allow accessing system reports',
    canDeleteUsers: 'Allow deleting user accounts',
  };
  return descriptions[key] || 'Manage system access';
};

export default Settings;