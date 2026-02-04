'use client';

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Save, User, Lock, Shield, Loader2, LogIn, Key, AlertCircle, Eye, EyeOff, Bug, Database } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5001/api';
  }
  return `http://${window.location.hostname}:5001/api`;
};

const API_BASE = getApiUrl();
const SETTINGS_BASE = `${API_BASE}/settings`;

// Enhanced token getter with debugging
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  
  // Check all possible token locations
  const token = localStorage.getItem('sk_token') || 
                localStorage.getItem('token') ||
                localStorage.getItem('auth_token') ||
                sessionStorage.getItem('sk_token') ||
                sessionStorage.getItem('token');
  
  return token;
};

// Enhanced authFetch with detailed debugging
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  if (!token) {
    console.error('❌ No authentication token found in any storage');
    throw new Error('No authentication token found. Please log in.');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  console.log(`📤 Making request to: ${url}`);
  console.log(`📤 Method: ${options.method || 'GET'}`);
  console.log(`📤 Headers:`, { 
    Authorization: `Bearer ${token.substring(0, 30)}...`,
    'Content-Type': 'application/json'
  });
  
  if (options.body) {
    console.log(`📤 Body:`, JSON.parse(options.body as string));
  }

  const startTime = Date.now();
  const response = await fetch(url, { ...options, headers });
  const endTime = Date.now();
  
  console.log(`📥 Response: ${response.status} ${response.statusText} (${endTime - startTime}ms)`);
  console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));
  
  return response;
};

const Settings = () => {
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    permissions: false,
    debug: false,
    reset: false,
    passwordInfo: false
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
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [apiUrl, setApiUrl] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [requestLogs, setRequestLogs] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [passwordInfo, setPasswordInfo] = useState<any>(null);

  const addLog = (message: string) => {
    setRequestLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    const currentApiUrl = getApiUrl();
    setApiUrl(currentApiUrl);
    
    // Enhanced token check
    const token = getAuthToken();
    setAuthToken(token);
    setIsAuthenticated(!!token);
    
    console.log('📡 Settings API URL:', SETTINGS_BASE);
    addLog(`API URL: ${SETTINGS_BASE}`);
    addLog(`Token: ${token ? 'Found' : 'Not found'}`);
    
    checkBackend();
  }, []);

  const checkBackend = async () => {
    addLog('Checking backend connection...');
    try {
      // Test the settings test endpoint first
      const testRes = await authFetch(`${SETTINGS_BASE}/test`).catch(() => null);
      
      if (testRes?.ok) {
        const data = await testRes.json();
        console.log('✅ Backend test successful:', data);
        setBackendStatus('Connected & Authenticated ✅');
        await loadData();
      } else if (testRes?.status === 401) {
        setBackendStatus('Connected but not authenticated 🔒');
        addLog('⚠️ Authentication required');
      } else if (testRes?.status === 404) {
        setBackendStatus('Settings endpoint not found 🔍');
        addLog('❌ Settings endpoint not found');
        // Try to load data anyway
        await loadData();
      } else {
        setBackendStatus('Connection error ❌');
        addLog(`❌ Test failed: ${testRes?.status}`);
      }
    } catch (error) {
      console.error('❌ Backend check failed:', error);
      setBackendStatus('Not Connected ❌');
      addLog(`Error: ${error.message}`);
      toast.error('Cannot connect to backend');
      useMockData();
    }
  };

  const useMockData = () => {
    addLog('Using mock data');
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
  };

  const loadData = async () => {
    addLog('Loading data...');
    try {
      // Try profile endpoint
      try {
        const profileRes = await authFetch(`${SETTINGS_BASE}/profile`);
        addLog(`Profile: ${profileRes.status} ${profileRes.statusText}`);
        
        if (profileRes.ok) {
          const data = await profileRes.json();
          console.log('✅ Profile data:', data);
          if (data.success && data.data) {
            setProfileData({
              name: data.data.name || 'Super Admin',
              email: data.data.email || 'admin@skproject.com',
              phone: data.data.phone || '+1234567890',
            });
            addLog('✅ Profile loaded from backend');
          }
        }
      } catch (error: any) {
        addLog(`❌ Profile error: ${error.message}`);
      }

      // Try permissions endpoint
      try {
        const permRes = await authFetch(`${SETTINGS_BASE}/permissions`);
        addLog(`Permissions: ${permRes.status} ${permRes.statusText}`);
        
        if (permRes.ok) {
          const data = await permRes.json();
          console.log('✅ Permissions data:', data);
          if (data.success && data.data) {
            setPermissions(data.data);
            addLog('✅ Permissions loaded from backend');
          }
        }
      } catch (error: any) {
        addLog(`❌ Permissions error: ${error.message}`);
      }
      
    } catch (error) {
      console.error('❌ Load data error:', error);
      addLog(`Load error: ${error.message}`);
      useMockData();
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading({ ...loading, profile: true });
    addLog('Updating profile...');

    try {
      const response = await authFetch(`${SETTINGS_BASE}/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      addLog(`Profile update: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Profile updated!');
        addLog('✅ Profile updated successfully');
      } else if (response.status === 401) {
        toast.error('Authentication failed. Profile not updated.');
        addLog('❌ Auth failed for profile update');
      } else {
        toast.error(`Failed to update profile: ${response.status}`);
        addLog(`❌ Profile update failed: ${response.status}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      addLog(`❌ Profile update error: ${error.message}`);
      console.error('Profile update error:', error);
    } finally {
      setLoading({ ...loading, profile: false });
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading({ ...loading, password: true });
    addLog('Updating password...');

    const currentPassword = passwordData.currentPassword;
    const newPassword = passwordData.newPassword;
    const confirmPassword = passwordData.confirmPassword;

    console.log('🔧 [FRONTEND] Password update attempt:', {
      currentPasswordLength: currentPassword.length,
      newPasswordLength: newPassword.length,
      confirmPasswordLength: confirmPassword.length,
      passwordsMatch: newPassword === confirmPassword
    });

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match!");
      setLoading({ ...loading, password: false });
      addLog('❌ Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters!");
      setLoading({ ...loading, password: false });
      addLog('❌ Password too short');
      return;
    }

    try {
      const response = await authFetch(`${SETTINGS_BASE}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      addLog(`Password update: ${response.status} ${response.statusText}`);

      // Get the full response for debugging
      const responseText = await response.text();
      console.log('📥 [FRONTEND] Full server response:', responseText);
      
      // Try to parse the response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('📥 [FRONTEND] Parsed response:', responseData);
      } catch (parseError) {
        console.log('📥 [FRONTEND] Could not parse response as JSON:', responseText);
      }

      if (response.ok) {
        toast.success(responseData?.message || 'Password updated successfully!');
        addLog('✅ Password updated successfully');
        
        // Reset password fields
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Also clear the password visibility states
        setShowPassword({
          current: false,
          new: false,
          confirm: false
        });
      } else if (response.status === 400) {
        // Bad Request - show specific error
        const errorMessage = responseData?.error || 'Invalid current password or password requirements not met';
        toast.error(errorMessage);
        addLog(`❌ Password update failed: ${errorMessage}`);
        
        // Log detailed error for debugging
        console.error('❌ [FRONTEND] Password update failed with 400:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData?.error,
          fullResponse: responseData
        });
      } else if (response.status === 401) {
        toast.error('Authentication failed. Password not updated.');
        addLog('❌ Auth failed for password update');
      } else {
        const errorMessage = responseData?.error || `Failed to update password: ${response.status}`;
        toast.error(errorMessage);
        addLog(`❌ Password update failed: ${response.status}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      addLog(`❌ Password update error: ${error.message}`);
      console.error('❌ [FRONTEND] Password update error:', error);
    } finally {
      setLoading({ ...loading, password: false });
    }
  };

  const handlePermissionsUpdate = async () => {
    setLoading({ ...loading, permissions: true });
    addLog('Updating permissions...');

    try {
      const response = await authFetch(`${SETTINGS_BASE}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(permissions),
      });

      addLog(`Permissions update: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Permissions updated!');
        addLog('✅ Permissions updated successfully');
      } else if (response.status === 401) {
        toast.error('Authentication failed. Permissions not updated.');
        addLog('❌ Auth failed for permissions update');
      } else {
        toast.error(`Failed to update permissions: ${response.status}`);
        addLog(`❌ Permissions update failed: ${response.status}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      addLog(`❌ Permissions update error: ${error.message}`);
      console.error('Permissions update error:', error);
    } finally {
      setLoading({ ...loading, permissions: false });
    }
  };

  // Debug password function
  const handleDebugPassword = async () => {
    setLoading({ ...loading, debug: true });
    addLog('Debugging password...');

    try {
      const response = await authFetch(`${SETTINGS_BASE}/debug-password`);
      const responseText = await response.text();
      console.log('🔍 [FRONTEND] Debug response:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        if (response.ok) {
          setDebugInfo(data.data);
          addLog('✅ Password debug info retrieved');
          console.log('🔍 Debug info:', data.data);
          
          // Show which passwords match
          const matchingPasswords = data.data.testResults.filter((r: any) => r.matches);
          if (matchingPasswords.length > 0) {
            toast.info(`Found matching password: ${matchingPasswords[0].password}`);
            // Auto-fill the current password field with the found password
            setPasswordData({
              ...passwordData,
              currentPassword: matchingPasswords[0].password
            });
          } else {
            toast.warning('No matching passwords found in common list');
          }
        } else {
          toast.error(data.error || 'Debug failed');
          addLog(`❌ Debug failed: ${data.error}`);
        }
      } catch (parseError) {
        console.error('❌ Could not parse debug response:', responseText);
        toast.error('Invalid debug response from server');
      }
    } catch (error: any) {
      toast.error(`Debug error: ${error.message}`);
      addLog(`❌ Debug error: ${error.message}`);
    } finally {
      setLoading({ ...loading, debug: false });
    }
  };

  // Get password info function
  const handleGetPasswordInfo = async () => {
    setLoading({ ...loading, passwordInfo: true });
    addLog('Getting password info...');

    try {
      const response = await authFetch(`${SETTINGS_BASE}/password-info`);
      const responseText = await response.text();
      console.log('🔍 [FRONTEND] Password info response:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        if (response.ok) {
          setPasswordInfo(data.data);
          addLog('✅ Password info retrieved');
          console.log('🔍 Password info:', data.data);
          toast.info('Password info retrieved - check console');
        } else {
          toast.error(data.error || 'Failed to get password info');
          addLog(`❌ Password info failed: ${data.error}`);
        }
      } catch (parseError) {
        console.error('❌ Could not parse password info response:', responseText);
        toast.error('Invalid response from server');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      addLog(`❌ Password info error: ${error.message}`);
    } finally {
      setLoading({ ...loading, passwordInfo: false });
    }
  };

  // Reset password for testing
  const handleResetPasswordForTesting = async () => {
    const newPassword = prompt("Enter new password for testing:");
    if (!newPassword) return;
    
    const confirm = window.confirm(`This will reset your password to "${newPassword}". Are you sure?`);
    if (!confirm) return;
    
    setLoading({ ...loading, reset: true });
    addLog(`Resetting password to: ${newPassword}`);

    try {
      const response = await authFetch(`${SETTINGS_BASE}/reset-password-test`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      
      const responseText = await response.text();
      console.log('🔄 [FRONTEND] Reset response:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        
        if (response.ok) {
          toast.success(`Password reset to "${newPassword}"`);
          addLog(`✅ Password reset to ${newPassword}`);
          console.log('✅ Password reset successful:', data);
          
          // Update the password field for easy testing
          setPasswordData({
            currentPassword: newPassword,
            newPassword: '',
            confirmPassword: ''
          });
          
          toast.info(`Your current password is now: ${newPassword}`);
        } else {
          toast.error(data.error || 'Failed to reset password');
          addLog(`❌ Password reset failed: ${data.error}`);
        }
      } catch (parseError) {
        console.error('❌ Could not parse reset response:', responseText);
        toast.error('Invalid response from server');
      }
    } catch (error: any) {
      if (error.message.includes('404')) {
        toast.error('Reset password endpoint not found. Make sure backend is updated.');
        addLog('❌ Reset endpoint not found (404)');
      } else {
        toast.error(`Error: ${error.message}`);
        addLog(`❌ Password reset error: ${error.message}`);
      }
    } finally {
      setLoading({ ...loading, reset: false });
    }
  };

  const handleSetToken = () => {
    const token = prompt("Enter your JWT token:");
    if (token) {
      localStorage.setItem('sk_token', token);
      setAuthToken(token);
      setIsAuthenticated(true);
      toast.success('Token set! Reloading...');
      addLog('🔑 Token set manually');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sk_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('sk_user');
    sessionStorage.removeItem('sk_token');
    sessionStorage.removeItem('token');
    setAuthToken(null);
    setIsAuthenticated(false);
    toast.success('Logged out');
    addLog('🚪 User logged out');
    setTimeout(() => window.location.reload(), 1000);
  };

  const testEndpoint = async (endpoint: string) => {
    addLog(`Testing: ${endpoint}`);
    try {
      const response = await authFetch(endpoint);
      const data = await response.json();
      console.log(`✅ ${endpoint}:`, data);
      addLog(`✅ ${endpoint}: ${response.status} ${response.statusText}`);
      toast.success(`${endpoint} works!`);
    } catch (error: any) {
      console.error(`❌ ${endpoint}:`, error);
      addLog(`❌ ${endpoint}: ${error.message}`);
      toast.error(`${endpoint}: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Settings" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Settings Tabs */}
        {isAuthenticated && (
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" /> Profile Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input 
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        disabled={loading.profile}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        value={profileData.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        disabled={loading.profile}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <Button type="submit" disabled={loading.profile} className="w-full">
                      {loading.profile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" /> Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <div className="relative">
                        <Input 
                          name="currentPassword" 
                          type={showPassword.current ? "text" : "password"} 
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          disabled={loading.password}
                          placeholder="Enter current password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                        >
                          {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input 
                          name="newPassword" 
                          type={showPassword.new ? "text" : "password"} 
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          disabled={loading.password}
                          placeholder="Enter new password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                        >
                          {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <div className="relative">
                        <Input 
                          name="confirmPassword" 
                          type={showPassword.confirm ? "text" : "password"} 
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          disabled={loading.password}
                          placeholder="Confirm new password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                        >
                          {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={loading.password} className="flex-1">
                        {loading.password ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                        ) : 'Update Password'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                          setShowPassword({
                            current: false,
                            new: false,
                            confirm: false
                          });
                          toast.info('Password fields cleared');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                    
                    {/* Debug Info */}
                    {(debugInfo || passwordInfo) && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <div className="text-xs">
                          <p className="font-semibold mb-1">💡 Debug Information:</p>
                          {debugInfo && debugInfo.testResults.some((r: any) => r.matches) ? (
                            <p className="text-green-600">
                              Matching password found! Current Password field has been auto-filled.
                            </p>
                          ) : (
                            <p className="text-yellow-600">
                              No matching password found. Try "Reset Password" or check backend logs.
                            </p>
                          )}
                          {passwordInfo && (
                            <p className="text-xs mt-1">
                              Hash length: {passwordInfo.passwordHashLength} chars
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(permissions).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <div>
                        <Label className="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
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
                  <Button onClick={handlePermissionsUpdate} disabled={loading.permissions} className="w-full">
                    {loading.permissions ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : 'Save Permissions'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </div>
  );
};

export default Settings;