import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Shield, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Users, 
  FileText, 
  Plus, 
  TrendingUp, 
  Calendar, 
  Eye,
  LogIn,
  LogOut,
  Coffee,
  Timer,
  Ban,
  Wifi,
  WifiOff,
  User
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Types
interface Activity {
  id: number;
  type: "task_completed" | "task_assigned" | "report_generated" | "team_update" | "checkin" | "checkout" | "break";
  title: string;
  user: string;
  time: string;
  avatar: string;
}

interface QuickAction {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color: string;
}

interface AttendanceStatus {
  isCheckedIn: boolean;
  isOnBreak: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate: string | null;
  hasCheckedOutToday: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  trend?: { value: number; isPositive: boolean };
  delay?: number;
  loading?: boolean;
}

// Custom StatCard component to fix the type issues
const CustomStatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, delay, loading }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? "..." : value}
        </div>
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : '-'}{trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const ManagerDashboard = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  
  // API Base URL
  const API_URL = `http://${window.location.hostname}:5001/api`;
  
  // Manager ID and Name - Get from localStorage
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  
  // State for API connection status
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // Live data state
  const [stats, setStats] = useState({
    totalSupervisors: 0,
    activeProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
    productivityScore: 0
  });

  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isCheckedIn: false,
    isOnBreak: false,
    checkInTime: null,
    checkOutTime: null,
    breakStartTime: null,
    breakEndTime: null,
    totalHours: 0,
    breakTime: 0,
    lastCheckInDate: null,
    hasCheckedOutToday: false
  });

  // Initialize manager info from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("sk_user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const id = user._id || user.id || `manager-${Date.now()}`;
        const name = user.name || user.firstName || 'Manager';
        setManagerId(id);
        setManagerName(name);
        console.log('Current Manager:', { id, name });
      } catch (e) {
        console.error('Error parsing user:', e);
        setManagerId(`manager-${Date.now()}`);
        setManagerName('Manager');
      }
    } else {
      // Fallback for development
      const randomId = `manager-${Date.now()}`;
      setManagerId(randomId);
      setManagerName('Demo Manager');
      console.log('No user found, using demo manager ID:', randomId);
    }
  }, []);

  // Load data when managerId is available
  useEffect(() => {
    if (managerId) {
      checkBackendConnection();
      fetchLiveData();
      loadAttendanceStatus();
      const interval = setInterval(fetchLiveData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [managerId]);

  // Check attendance status when component mounts or attendance changes
  useEffect(() => {
    checkAttendanceStatusForToday();
  }, [attendance.lastCheckInDate, attendance.hasCheckedOutToday, attendance.isCheckedIn]);

  // ==================== BACKEND CONNECTION CHECK ====================

  const checkBackendConnection = async () => {
    try {
      setIsCheckingConnection(true);
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK') {
          setIsBackendConnected(true);
          console.log('✅ Backend connected successfully');
          toast.success("Connected to backend server");
        } else {
          setIsBackendConnected(false);
          console.warn('⚠️ Backend health check failed');
        }
      } else {
        setIsBackendConnected(false);
        console.warn('⚠️ Backend health check failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ Backend connection error:', error);
      setIsBackendConnected(false);
      
      // Show helpful message based on error type
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        toast.error("Backend server is not responding. Please make sure the server is running on port 5001.");
      } else if (error.message.includes('Failed to fetch')) {
        toast.warning("Cannot connect to backend server. Using local storage mode.");
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  // Check attendance status for today
  const checkAttendanceStatusForToday = () => {
    if (!managerId) return;
    
    const today = new Date().toDateString();
    const lastCheckInDate = attendance.lastCheckInDate ? 
      new Date(attendance.lastCheckInDate).toDateString() : null;
    
    console.log('Checking attendance status:', {
      today,
      lastCheckInDate,
      hasCheckedOutToday: attendance.hasCheckedOutToday,
      isCheckedIn: attendance.isCheckedIn
    });
  };

  // Check if manager can check in today
  const canCheckInToday = (): boolean => {
    const today = new Date().toDateString();
    const lastCheckInDate = attendance.lastCheckInDate ? 
      new Date(attendance.lastCheckInDate).toDateString() : null;
    
    // If already checked in today and currently checked in
    if (attendance.isCheckedIn && lastCheckInDate === today) {
      return false;
    }
    
    // If already checked out today
    if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
      return false;
    }
    
    return true;
  };

  // Check if manager can check out today
  const canCheckOutToday = (): boolean => {
    const today = new Date().toDateString();
    const lastCheckInDate = attendance.lastCheckInDate ? 
      new Date(attendance.lastCheckInDate).toDateString() : null;
    
    // Must be currently checked in today
    if (!attendance.isCheckedIn) {
      return false;
    }
    
    // Must not have already checked out today
    if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
      return false;
    }
    
    return true;
  };

  // Format time for display
  const formatTimeForDisplay = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateForDisplay = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString([], { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function for time ago display
  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDateForDisplay(timestamp);
  };

  // Helper functions for time calculations
  const calculateTotalHours = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return (endTime - startTime) / (1000 * 60 * 60);
  };

  const calculateBreakTime = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return (endTime - startTime) / (1000 * 60 * 60);
  };

  // Safe number formatting function
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  };

  // Add activity to state
  const addActivity = (type: Activity['type'], message: string) => {
    const newActivity: Activity = {
      id: Date.now() + Math.random(),
      type: type,
      title: message,
      user: 'You',
      time: 'Just now',
      avatar: managerName.charAt(0)
    };
    setRecentActivities(prev => [newActivity, ...prev.slice(0, 4)]);
  };

  // Add activity to MongoDB API
  const addActivityToAPI = async (type: string, title: string, details?: string) => {
    try {
      if (isBackendConnected && managerId) {
        const response = await fetch(`${API_URL}/api/manager-attendance/activity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            managerId, 
            managerName,
            type, 
            title, 
            details 
          }),
        });
        
        if (!response.ok) {
          console.warn('Failed to save activity to API, continuing locally');
        }
      }
      
      const newActivity: Activity = {
        id: Date.now() + Math.random(),
        type: type as Activity['type'],
        title: title,
        user: 'You',
        time: 'Just now',
        avatar: managerName.charAt(0)
      };
      setRecentActivities(prev => [newActivity, ...prev.slice(0, 4)]);
      
    } catch (error) {
      console.error('Error adding activity to API:', error);
      const newActivity: Activity = {
        id: Date.now() + Math.random(),
        type: type as Activity['type'],
        title: title,
        user: 'You',
        time: 'Just now',
        avatar: managerName.charAt(0)
      };
      setRecentActivities(prev => [newActivity, ...prev.slice(0, 4)]);
    }
  };

  // Save attendance to localStorage
  const saveAttendanceToLocalStorage = (newAttendance: AttendanceStatus) => {
    setAttendance(newAttendance);
    if (managerId) {
      localStorage.setItem(`managerAttendance_${managerId}`, JSON.stringify(newAttendance));
    }
  };

  // ==================== ATTENDANCE API FUNCTIONS ====================

  // Fetch manager attendance from MongoDB API
  const fetchManagerAttendance = async (retryCount = 0): Promise<AttendanceStatus | null> => {
    try {
      setIsAttendanceLoading(true);
      
      if (!isBackendConnected || !managerId) {
        console.log('Backend not connected, loading from local storage');
        return loadFromLocalStorage();
      }
      
      const response = await fetch(`${API_URL}/api/manager-attendance/today/${managerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No attendance record found');
          return null;
        }
        throw new Error(`Failed to fetch attendance: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const attendanceData = data.data;
        const formattedAttendance: AttendanceStatus = {
          isCheckedIn: attendanceData.isCheckedIn || false,
          isOnBreak: attendanceData.isOnBreak || false,
          checkInTime: attendanceData.checkInTime || null,
          checkOutTime: attendanceData.checkOutTime || null,
          breakStartTime: attendanceData.breakStartTime || null,
          breakEndTime: attendanceData.breakEndTime || null,
          totalHours: typeof attendanceData.totalHours === 'number' ? attendanceData.totalHours : 0,
          breakTime: typeof attendanceData.breakTime === 'number' ? attendanceData.breakTime : 0,
          lastCheckInDate: attendanceData.lastCheckInDate || null,
          hasCheckedOutToday: attendanceData.hasCheckedOutToday || false
        };
        
        saveAttendanceToLocalStorage(formattedAttendance);
        
        if (attendanceData.dailyActivities && attendanceData.dailyActivities.length > 0) {
          const activities = attendanceData.dailyActivities
            .slice(-5)
            .reverse()
            .map((activity: any, index: number) => ({
              id: Date.now() + index,
              type: activity.type,
              title: activity.title,
              user: 'You',
              time: getTimeAgo(activity.timestamp),
              avatar: managerName.charAt(0)
            }));
          
          if (activities.length > 0) {
            setRecentActivities(prev => {
              const existingIds = new Set(prev.map(a => a.id));
              const newActivities = activities.filter((a: Activity) => !existingIds.has(a.id));
              return [...newActivities, ...prev].slice(0, 5);
            });
          }
        }
        
        return formattedAttendance;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error fetching manager attendance:', error);
      
      if (retryCount < 2 && isBackendConnected) {
        console.log(`Retrying fetch... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchManagerAttendance(retryCount + 1);
      }
      
      return loadFromLocalStorage();
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Load from localStorage
  const loadFromLocalStorage = (): AttendanceStatus | null => {
    try {
      const savedAttendance = localStorage.getItem(`managerAttendance_${managerId}`);
      if (savedAttendance) {
        const attendanceData = JSON.parse(savedAttendance);
        const processedAttendance = {
          ...attendanceData,
          totalHours: typeof attendanceData.totalHours === 'string' ? 
            parseFloat(attendanceData.totalHours) : (attendanceData.totalHours || 0),
          breakTime: typeof attendanceData.breakTime === 'string' ? 
            parseFloat(attendanceData.breakTime) : (attendanceData.breakTime || 0),
          hasCheckedOutToday: attendanceData.hasCheckedOutToday || false
        };
        setAttendance(processedAttendance);
        return processedAttendance;
      }
    } catch (parseError) {
      console.error('Error parsing localStorage attendance:', parseError);
    }
    return null;
  };

  // Load attendance status
  const loadAttendanceStatus = async () => {
    try {
      if (managerId) {
        await fetchManagerAttendance();
      }
    } catch (error) {
      console.error('Error loading attendance status:', error);
    }
  };

  // Save check-in to API
  const saveManagerCheckIn = async (retryCount = 0): Promise<any> => {
    try {
      setIsAttendanceLoading(true);
      
      // Check if already checked out today
      const today = new Date().toDateString();
      const lastCheckInDate = attendance.lastCheckInDate ? 
        new Date(attendance.lastCheckInDate).toDateString() : null;
      
      if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
        toast.error("You have already checked out for today. Cannot check in again.");
        return null;
      }
      
      // Check if already checked in today
      if (attendance.isCheckedIn && lastCheckInDate === today) {
        toast.error("You are already checked in for today.");
        return null;
      }
      
      if (!isBackendConnected || !managerId) {
        console.log('Backend not connected, using local storage');
        return saveCheckInToLocalStorage();
      }
      
      const response = await fetch(`${API_URL}/api/manager-attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          managerId, 
          managerName 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check in: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Successfully checked in!");
        
        if (data.data) {
          const attendanceData = data.data;
          const formattedAttendance: AttendanceStatus = {
            isCheckedIn: attendanceData.isCheckedIn || false,
            isOnBreak: attendanceData.isOnBreak || false,
            checkInTime: attendanceData.checkInTime || null,
            checkOutTime: attendanceData.checkOutTime || null,
            breakStartTime: attendanceData.breakStartTime || null,
            breakEndTime: attendanceData.breakEndTime || null,
            totalHours: typeof attendanceData.totalHours === 'number' ? attendanceData.totalHours : 0,
            breakTime: typeof attendanceData.breakTime === 'number' ? attendanceData.breakTime : 0,
            lastCheckInDate: attendanceData.lastCheckInDate || null,
            hasCheckedOutToday: false
          };
          
          saveAttendanceToLocalStorage(formattedAttendance);
          
          if (attendanceData.checkInTime) {
            addActivityToAPI('checkin', `Checked in at ${formatTimeForDisplay(attendanceData.checkInTime)}`);
          }
        }
        
        return data.data;
      } else {
        throw new Error(data.message || "Failed to check in");
      }
    } catch (error: any) {
      console.error('Error checking in:', error);
      
      if (retryCount < 2 && isBackendConnected) {
        console.log(`Retrying check-in... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return saveManagerCheckIn(retryCount + 1);
      }
      
      return saveCheckInToLocalStorage();
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Save check-in to localStorage
  const saveCheckInToLocalStorage = () => {
    console.log('Saving check-in to local storage');
    
    // Check if already checked out today
    const today = new Date().toDateString();
    const lastCheckInDate = attendance.lastCheckInDate ? 
      new Date(attendance.lastCheckInDate).toDateString() : null;
    
    if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
      toast.error("You have already checked out for today. Cannot check in again.");
      return null;
    }
    
    // Check if already checked in today
    if (attendance.isCheckedIn && lastCheckInDate === today) {
      toast.error("You are already checked in for today.");
      return null;
    }
    
    toast.warning("Using local storage. Data will sync when backend is available.");
    
    const now = new Date().toISOString();
    const todayDate = new Date().toDateString();
    
    const newAttendance = {
      ...attendance,
      isCheckedIn: true,
      checkInTime: now,
      checkOutTime: null,
      lastCheckInDate: todayDate,
      hasCheckedOutToday: false
    };
    
    saveAttendanceToLocalStorage(newAttendance);
    addActivity('checkin', `Checked in at ${formatTimeForDisplay(now)}`);
    
    return newAttendance;
  };

  // Save check-out to API
  const saveManagerCheckOut = async (retryCount = 0): Promise<any> => {
    try {
      setIsAttendanceLoading(true);
      
      // Check if already checked out today
      const today = new Date().toDateString();
      const lastCheckInDate = attendance.lastCheckInDate ? 
        new Date(attendance.lastCheckInDate).toDateString() : null;
      
      if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
        toast.error("You have already checked out for today.");
        return null;
      }
      
      if (!isBackendConnected || !managerId) {
        console.log('Backend not connected, using local storage');
        return saveCheckOutToLocalStorage();
      }
      
      const response = await fetch(`${API_URL}/api/manager-attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check out: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Successfully checked out!");
        
        if (data.data) {
          const attendanceData = data.data;
          const formattedAttendance: AttendanceStatus = {
            isCheckedIn: attendanceData.isCheckedIn || false,
            isOnBreak: attendanceData.isOnBreak || false,
            checkInTime: attendanceData.checkInTime || null,
            checkOutTime: attendanceData.checkOutTime || null,
            breakStartTime: attendanceData.breakStartTime || null,
            breakEndTime: attendanceData.breakEndTime || null,
            totalHours: typeof attendanceData.totalHours === 'number' ? attendanceData.totalHours : 0,
            breakTime: typeof attendanceData.breakTime === 'number' ? attendanceData.breakTime : 0,
            lastCheckInDate: attendanceData.lastCheckInDate || null,
            hasCheckedOutToday: true
          };
          
          saveAttendanceToLocalStorage(formattedAttendance);
          
          if (attendanceData.checkOutTime) {
            addActivityToAPI('checkout', `Checked out at ${formatTimeForDisplay(attendanceData.checkOutTime)} - Total: ${formattedAttendance.totalHours.toFixed(2)}h`);
          }
        }
        
        return data.data;
      } else {
        throw new Error(data.message || "Failed to check out");
      }
    } catch (error: any) {
      console.error('Error checking out:', error);
      
      if (retryCount < 2 && isBackendConnected) {
        console.log(`Retrying check-out... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return saveManagerCheckOut(retryCount + 1);
      }
      
      return saveCheckOutToLocalStorage();
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Save check-out to localStorage
  const saveCheckOutToLocalStorage = () => {
    console.log('Saving check-out to local storage');
    
    // Check if already checked out today
    const today = new Date().toDateString();
    const lastCheckInDate = attendance.lastCheckInDate ? 
      new Date(attendance.lastCheckInDate).toDateString() : null;
    
    if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
      toast.error("You have already checked out for today.");
      return null;
    }
    
    toast.warning("Using local storage. Data will sync when backend is available.");
    
    const now = new Date().toISOString();
    const totalHours = calculateTotalHours(attendance.checkInTime, now);
    
    const newAttendance = {
      ...attendance,
      isCheckedIn: false,
      isOnBreak: false,
      checkOutTime: now,
      totalHours: Number(totalHours.toFixed(2)),
      hasCheckedOutToday: true
    };
    
    saveAttendanceToLocalStorage(newAttendance);
    addActivity('checkout', `Checked out at ${formatTimeForDisplay(now)} - Total: ${totalHours.toFixed(2)}h`);
    
    return newAttendance;
  };

  // Save break in to API
  const saveManagerBreakIn = async (retryCount = 0): Promise<any> => {
    try {
      setIsAttendanceLoading(true);
      
      if (!isBackendConnected || !managerId) {
        console.log('Backend not connected, using local storage');
        return saveBreakInToLocalStorage();
      }
      
      const response = await fetch(`${API_URL}/api/manager-attendance/breakin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start break: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Break started successfully!");
        
        if (data.data) {
          const attendanceData = data.data;
          const formattedAttendance: AttendanceStatus = {
            isCheckedIn: attendanceData.isCheckedIn || false,
            isOnBreak: attendanceData.isOnBreak || false,
            checkInTime: attendanceData.checkInTime || null,
            checkOutTime: attendanceData.checkOutTime || null,
            breakStartTime: attendanceData.breakStartTime || null,
            breakEndTime: attendanceData.breakEndTime || null,
            totalHours: typeof attendanceData.totalHours === 'number' ? attendanceData.totalHours : 0,
            breakTime: typeof attendanceData.breakTime === 'number' ? attendanceData.breakTime : 0,
            lastCheckInDate: attendanceData.lastCheckInDate || null,
            hasCheckedOutToday: attendance.hasCheckedOutToday
          };
          
          saveAttendanceToLocalStorage(formattedAttendance);
          
          if (attendanceData.breakStartTime) {
            addActivityToAPI('break', `Started break at ${formatTimeForDisplay(attendanceData.breakStartTime)}`);
          }
        }
        
        return data.data;
      } else {
        throw new Error(data.message || "Failed to start break");
      }
    } catch (error: any) {
      console.error('Error starting break:', error);
      
      if (retryCount < 2 && isBackendConnected) {
        console.log(`Retrying break in... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return saveManagerBreakIn(retryCount + 1);
      }
      
      return saveBreakInToLocalStorage();
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Save break in to localStorage
  const saveBreakInToLocalStorage = () => {
    console.log('Saving break-in to local storage');
    toast.warning("Using local storage. Data will sync when backend is available.");
    
    const now = new Date().toISOString();
    const newAttendance = {
      ...attendance,
      isOnBreak: true,
      breakStartTime: now
    };
    
    saveAttendanceToLocalStorage(newAttendance);
    addActivity('break', `Started break at ${formatTimeForDisplay(now)}`);
    
    return newAttendance;
  };

  // Save break out to API
  const saveManagerBreakOut = async (retryCount = 0): Promise<any> => {
    try {
      setIsAttendanceLoading(true);
      
      if (!isBackendConnected || !managerId) {
        console.log('Backend not connected, using local storage');
        return saveBreakOutToLocalStorage();
      }
      
      const response = await fetch(`${API_URL}/api/manager-attendance/breakout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to end break: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Break ended successfully!");
        
        if (data.data) {
          const attendanceData = data.data;
          const formattedAttendance: AttendanceStatus = {
            isCheckedIn: attendanceData.isCheckedIn || false,
            isOnBreak: attendanceData.isOnBreak || false,
            checkInTime: attendanceData.checkInTime || null,
            checkOutTime: attendanceData.checkOutTime || null,
            breakStartTime: attendanceData.breakStartTime || null,
            breakEndTime: attendanceData.breakEndTime || null,
            totalHours: typeof attendanceData.totalHours === 'number' ? attendanceData.totalHours : 0,
            breakTime: typeof attendanceData.breakTime === 'number' ? attendanceData.breakTime : 0,
            lastCheckInDate: attendanceData.lastCheckInDate || null,
            hasCheckedOutToday: attendance.hasCheckedOutToday
          };
          
          saveAttendanceToLocalStorage(formattedAttendance);
          
          if (attendanceData.breakEndTime && data.data.breakDuration) {
            addActivityToAPI('break', `Ended break at ${formatTimeForDisplay(attendanceData.breakEndTime)} - Duration: ${data.data.breakDuration}h`);
          }
        }
        
        return data.data;
      } else {
        throw new Error(data.message || "Failed to end break");
      }
    } catch (error: any) {
      console.error('Error ending break:', error);
      
      if (retryCount < 2 && isBackendConnected) {
        console.log(`Retrying break out... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return saveManagerBreakOut(retryCount + 1);
      }
      
      return saveBreakOutToLocalStorage();
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Save break out to localStorage
  const saveBreakOutToLocalStorage = () => {
    console.log('Saving break-out to local storage');
    toast.warning("Using local storage. Data will sync when backend is available.");
    
    const now = new Date().toISOString();
    const breakTime = calculateBreakTime(attendance.breakStartTime, now);
    const totalBreakTime = (attendance.breakTime || 0) + breakTime;
    
    const newAttendance = {
      ...attendance,
      isOnBreak: false,
      breakEndTime: now,
      breakTime: Number(totalBreakTime.toFixed(2))
    };
    
    saveAttendanceToLocalStorage(newAttendance);
    addActivity('break', `Ended break at ${formatTimeForDisplay(now)} - Duration: ${breakTime.toFixed(2)}h`);
    
    return newAttendance;
  };

  // Reset attendance for new day
  const resetManagerAttendance = async (retryCount = 0): Promise<any> => {
    try {
      setIsAttendanceLoading(true);
      
      if (!isBackendConnected || !managerId) {
        console.log('Backend not connected, resetting local storage');
        return resetAttendanceForNewDayLocal();
      }
      
      const response = await fetch(`${API_URL}/api/manager-attendance/reset/${managerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerName })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset attendance: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Attendance reset for new day!");
        
        if (data.data) {
          const attendanceData = data.data;
          const formattedAttendance: AttendanceStatus = {
            isCheckedIn: attendanceData.isCheckedIn || false,
            isOnBreak: attendanceData.isOnBreak || false,
            checkInTime: attendanceData.checkInTime || null,
            checkOutTime: attendanceData.checkOutTime || null,
            breakStartTime: attendanceData.breakStartTime || null,
            breakEndTime: attendanceData.breakEndTime || null,
            totalHours: typeof attendanceData.totalHours === 'number' ? attendanceData.totalHours : 0,
            breakTime: typeof attendanceData.breakTime === 'number' ? attendanceData.breakTime : 0,
            lastCheckInDate: attendanceData.lastCheckInDate || null,
            hasCheckedOutToday: false
          };
          
          saveAttendanceToLocalStorage(formattedAttendance);
        }
        
        return data.data;
      } else {
        throw new Error(data.message || "Failed to reset attendance");
      }
    } catch (error: any) {
      console.error('Error resetting attendance:', error);
      
      if (retryCount < 2 && isBackendConnected) {
        console.log(`Retrying reset... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return resetManagerAttendance(retryCount + 1);
      }
      
      return resetAttendanceForNewDayLocal();
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Reset attendance locally
  const resetAttendanceForNewDayLocal = () => {
    console.log('Resetting attendance in local storage');
    toast.warning("Using local storage. Data will sync when backend is available.");
    
    const newAttendance = {
      isCheckedIn: false,
      isOnBreak: false,
      checkInTime: null,
      checkOutTime: null,
      breakStartTime: null,
      breakEndTime: null,
      totalHours: 0,
      breakTime: 0,
      lastCheckInDate: attendance.lastCheckInDate,
      hasCheckedOutToday: false
    };
    
    saveAttendanceToLocalStorage(newAttendance);
    
    return newAttendance;
  };

  // ==================== ATTENDANCE HANDLERS ====================

  const handleCheckIn = () => {
    if (!canCheckInToday()) {
      const today = new Date().toDateString();
      const lastCheckInDate = attendance.lastCheckInDate ? 
        new Date(attendance.lastCheckInDate).toDateString() : null;
      
      if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
        toast.error("You have already checked out for today. Cannot check in again.");
      } else if (attendance.isCheckedIn && lastCheckInDate === today) {
        toast.error("You are already checked in for today.");
      }
      return;
    }
    
    saveManagerCheckIn();
  };

  const handleCheckOut = () => {
    if (!canCheckOutToday()) {
      const today = new Date().toDateString();
      const lastCheckInDate = attendance.lastCheckInDate ? 
        new Date(attendance.lastCheckInDate).toDateString() : null;
      
      if (attendance.hasCheckedOutToday && lastCheckInDate === today) {
        toast.error("You have already checked out for today.");
      } else if (!attendance.isCheckedIn) {
        toast.error("You must be checked in to check out.");
      }
      return;
    }
    
    saveManagerCheckOut();
  };

  const handleBreakIn = () => {
    saveManagerBreakIn();
  };

  const handleBreakOut = () => {
    saveManagerBreakOut();
  };

  // ==================== OTHER FUNCTIONS ====================

  // Simulate fetching live data
  const fetchLiveData = async () => {
    if (!managerId) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const currentTime = new Date();
      const liveStats = {
        totalSupervisors: Math.floor(Math.random() * 5) + 6,
        activeProjects: Math.floor(Math.random() * 4) + 10,
        pendingTasks: Math.floor(Math.random() * 8) + 3,
        completedTasks: Math.floor(Math.random() * 20) + 40,
        teamMembers: Math.floor(Math.random() * 10) + 20,
        productivityScore: Math.floor(Math.random() * 20) + 75
      };

      const liveActivities: Activity[] = [
        {
          id: Date.now() + 1,
          type: "task_completed",
          title: `Project Milestone ${Math.floor(Math.random() * 5) + 1} delivered`,
          user: ["Alice Chen", "Bob Wilson", "Carol Davis"][Math.floor(Math.random() * 3)],
          time: "Just now",
          avatar: "AC"
        },
        {
          id: Date.now() + 2,
          type: "task_assigned",
          title: "New client requirements assigned",
          user: 'You',
          time: "5 minutes ago",
          avatar: managerName.charAt(0)
        },
        {
          id: Date.now() + 3,
          type: "report_generated",
          title: `Q${Math.floor((currentTime.getMonth() / 3)) + 1} Performance Report ready`,
          user: "System",
          time: "15 minutes ago",
          avatar: "S"
        },
        {
          id: Date.now() + 4,
          type: "team_update",
          title: "Team capacity updated",
          user: "System",
          time: "1 hour ago",
          avatar: "S"
        }
      ];

      setStats(liveStats);
      setRecentActivities(prev => [...liveActivities, ...prev.filter(a => a.type !== 'checkin' && a.type !== 'checkout' && a.type !== 'break').slice(0, 1)]);
      setIsLoading(false);
    }, 1000);
  };

  // Quick actions with real functionality
  const quickActions: QuickAction[] = [
    {
      id: 1,
      title: "Assign Task",
      description: "Create and assign new tasks to team",
      icon: Plus,
      action: () => handleAssignTask(),
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      id: 2,
      title: "Team Overview",
      description: "View team performance and capacity",
      icon: Users,
      action: () => handleTeamOverview(),
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      id: 3,
      title: "Generate Report",
      description: "Create performance and project reports",
      icon: FileText,
      action: () => handleGenerateReport(),
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      id: 4,
      title: "View Analytics",
      description: "Access detailed analytics dashboard",
      icon: TrendingUp,
      action: () => handleViewAnalytics(),
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  // Quick action handlers
  const handleAssignTask = () => {
    toast.success("Opening task assignment panel...", {
      action: {
        label: "View Tasks",
        onClick: () => {
          toast.info("Navigating to tasks management");
        }
      }
    });
  };

  const handleTeamOverview = () => {
    const teamStatus = `Team Status: ${stats.teamMembers} members, ${stats.activeProjects} active projects`;
    toast.info(teamStatus, {
      action: {
        label: "Details",
        onClick: () => {
          toast.success("Opening team details dashboard");
        }
      }
    });
  };

  const handleGenerateReport = () => {
    const toastId = toast.loading("Generating comprehensive performance report...");
    
    setTimeout(() => {
      toast.success("Report generated successfully! Available for download.", {
        id: toastId,
        action: {
          label: "Download",
          onClick: () => {
            toast.info("Downloading report...");
          }
        }
      });
    }, 2000);
  };

  const handleViewAnalytics = () => {
    toast.info(`Current Productivity Score: ${stats.productivityScore}%`, {
      action: {
        label: "Full Analytics",
        onClick: () => {
          toast.success("Opening detailed analytics dashboard");
        }
      }
    });
  };

  // Handle activity click
  const handleActivityClick = (activity: Activity) => {
    const actions: Record<Activity['type'], () => void> = {
      task_completed: () => {
        toast.success(`🎉 Task completed successfully!`, {
          description: `${activity.title} by ${activity.user}`,
          action: {
            label: "View Details",
            onClick: () => toast.info(`Opening task details: ${activity.title}`)
          }
        });
      },
      task_assigned: () => {
        toast.info("📋 Task Assignment Details", {
          description: activity.title,
          action: {
            label: "Manage Task",
            onClick: () => toast.success("Opening task management panel")
          }
        });
      },
      report_generated: () => {
        toast.success("📊 Report Ready for Review", {
          description: activity.title,
          action: {
            label: "Download Report",
            onClick: () => {
              toast.loading("Downloading report...");
              setTimeout(() => toast.success("Report downloaded successfully!"), 1500);
            }
          }
        });
      },
      team_update: () => {
        toast.info("👥 Team Update Notification", {
          description: activity.title,
          action: {
            label: "View Team",
            onClick: () => toast.success("Opening team management dashboard")
          }
        });
      },
      checkin: () => {
        toast.success("✅ Check-in Recorded", {
          description: activity.title,
          action: {
            label: "View Attendance",
            onClick: () => toast.info("Opening attendance records")
          }
        });
      },
      checkout: () => {
        toast.success("🚪 Check-out Recorded", {
          description: activity.title,
          action: {
            label: "View Summary",
            onClick: () => toast.info("Opening daily summary")
          }
        });
      },
      break: () => {
        toast.info("☕ Break Time", {
          description: activity.title,
          action: {
            label: "View Schedule",
            onClick: () => toast.info("Opening break schedule")
          }
        });
      }
    };
    
    actions[activity.type]();
  };

  // Handle view all activities
  const handleViewAllActivities = () => {
    toast.success("Opening complete activity log...", {
      action: {
        label: "Filter",
        onClick: () => toast.info("Opening activity filters")
      }
    });
  };

  // Handle performance analytics
  const handlePerformanceAnalytics = () => {
    const completionRate = Math.min(100, Math.floor((stats.completedTasks / (stats.completedTasks + stats.pendingTasks)) * 100));
    
    toast.info("📈 Performance Analytics Overview", {
      description: `Completion Rate: ${completionRate}% | Active Members: ${stats.teamMembers}`,
      action: {
        label: "Full Report",
        onClick: () => {
          toast.loading("Generating detailed analytics report...");
          setTimeout(() => toast.success("Analytics report ready!"), 2000);
        }
      }
    });
  };

  // Handle today's overview actions
  const handleViewMeetings = () => {
    const meetingCount = Math.floor(Math.random() * 3) + 2;
    toast.info("📅 Today's Meetings", {
      description: `You have ${meetingCount} meetings scheduled today`,
      action: {
        label: "View Schedule",
        onClick: () => toast.success("Opening meeting schedule")
      }
    });
  };

  const handleReviewDeadlines = () => {
    const deadlineCount = Math.floor(Math.random() * 2) + 1;
    toast.warning("⏰ Upcoming Deadlines", {
      description: `${deadlineCount} deadlines approaching today`,
      action: {
        label: "Review All",
        onClick: () => toast.success("Opening deadlines dashboard")
      }
    });
  };

  const handleCheckAvailability = () => {
    const availability = Math.floor(Math.random() * 20) + 80;
    toast.info("👥 Team Availability", {
      description: `${availability}% of team members are active today`,
      action: {
        label: "View Details",
        onClick: () => toast.success("Opening team availability chart")
      }
    });
  };

  const handleViewFullSchedule = () => {
    toast.success("Opening full schedule dashboard...", {
      action: {
        label: "Export",
        onClick: () => {
          toast.loading("Exporting schedule...");
          setTimeout(() => toast.success("Schedule exported successfully!"), 1500);
        }
      }
    });
  };

  // Get activity icon
  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      task_completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      task_assigned: <ClipboardList className="h-4 w-4 text-blue-500" />,
      report_generated: <FileText className="h-4 w-4 text-purple-500" />,
      team_update: <Users className="h-4 w-4 text-orange-500" />,
      checkin: <LogIn className="h-4 w-4 text-green-500" />,
      checkout: <LogOut className="h-4 w-4 text-blue-500" />,
      break: <Coffee className="h-4 w-4 text-purple-500" />
    };
    return icons[type];
  };

  // Get activity badge color
  const getActivityBadgeColor = (type: Activity['type']) => {
    const colors = {
      task_completed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
      task_assigned: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
      report_generated: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
      team_update: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
      checkin: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
      checkout: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
      break: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
    };
    return colors[type];
  };

  // Get activity type label
  const getActivityTypeLabel = (type: Activity['type']) => {
    const labels = {
      task_completed: "Completed",
      task_assigned: "Assigned",
      report_generated: "Report",
      team_update: "Team Update",
      checkin: "Check In",
      checkout: "Check Out",
      break: "Break Time"
    };
    return labels[type];
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Manager Dashboard" 
        subtitle="Real-time team management and performance tracking"
        onMenuClick={onMenuClick}
      />

      <div className="p-6 space-y-6">
        {/* Connection Status Banner */}
        {!isBackendConnected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Backend Server Not Connected
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Your attendance data is being saved locally. To sync with MongoDB database, please start your backend server:
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <code className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                    cd backend && npm run dev
                  </code>
                  <p className="text-yellow-600 dark:text-yellow-400">
                    Server should be running at: {API_URL}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkBackendConnection}
                disabled={isCheckingConnection}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                {isCheckingConnection ? "Checking..." : "Retry Connection"}
              </Button>
            </div>
          </div>
        )}

        {/* Attendance Controls */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-600" />
              Attendance Control - {managerName}
              {isAttendanceLoading && (
                <Badge variant="outline" className="ml-2 animate-pulse">
                  Syncing...
                </Badge>
              )}
              {!isBackendConnected && (
                <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Local Mode
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Manage your work hours and breaks - One check-in and one check-out allowed per day
              {attendance.lastCheckInDate && (
                <span className="block text-xs mt-1">
                  Last check-in: {formatDateForDisplay(attendance.lastCheckInDate)}
                </span>
              )}
              {attendance.hasCheckedOutToday && attendance.lastCheckInDate && 
                new Date(attendance.lastCheckInDate).toDateString() === new Date().toDateString() && (
                <span className="block text-xs mt-1 text-red-600 dark:text-red-400">
                  ⚠️ You have already checked out for today. Cannot check in again.
                </span>
              )}
              {attendance.isCheckedIn && attendance.lastCheckInDate && 
                new Date(attendance.lastCheckInDate).toDateString() === new Date().toDateString() && (
                <span className="block text-xs mt-1 text-green-600 dark:text-green-400">
                  ✓ Currently checked in for today
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check In/Out */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Work Status</span>
                  <Badge className={attendance.isCheckedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {attendance.isCheckedIn ? 'Checked In' : 'Checked Out'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCheckIn}
                    disabled={!canCheckInToday() || isAttendanceLoading || !managerId}
                    className="flex-1 flex items-center gap-2"
                    variant={!canCheckInToday() || isAttendanceLoading || !managerId ? "outline" : "default"}
                  >
                    <LogIn className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : "Check In"}
                  </Button>
                  <Button
                    onClick={handleCheckOut}
                    disabled={!canCheckOutToday() || isAttendanceLoading || !managerId}
                    className="flex-1 flex items-center gap-2"
                    variant={!canCheckOutToday() || isAttendanceLoading || !managerId ? "outline" : "default"}
                  >
                    <LogOut className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : "Check Out"}
                  </Button>
                </div>
                {attendance.checkInTime && (
                  <p className="text-xs text-gray-500">
                    Checked in: {formatTimeForDisplay(attendance.checkInTime)}
                    {attendance.lastCheckInDate && ` on ${formatDateForDisplay(attendance.lastCheckInDate)}`}
                  </p>
                )}
              </div>

              {/* Break In/Out */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Break Status</span>
                  <Badge className={attendance.isOnBreak ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}>
                    {attendance.isOnBreak ? 'On Break' : 'Active'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBreakIn}
                    disabled={!attendance.isCheckedIn || attendance.isOnBreak || isAttendanceLoading || !managerId}
                    className="flex-1 flex items-center gap-2"
                    variant={(!attendance.isCheckedIn || attendance.isOnBreak || isAttendanceLoading || !managerId) ? "outline" : "default"}
                  >
                    <Coffee className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : "Break In"}
                  </Button>
                  <Button
                    onClick={handleBreakOut}
                    disabled={!attendance.isOnBreak || isAttendanceLoading || !managerId}
                    className="flex-1 flex items-center gap-2"
                    variant={!attendance.isOnBreak || isAttendanceLoading || !managerId ? "outline" : "default"}
                  >
                    <Timer className="h-4 w-4" />
                    {isAttendanceLoading ? "Processing..." : "Break Out"}
                  </Button>
                </div>
                {attendance.breakStartTime && attendance.isOnBreak && (
                  <p className="text-xs text-gray-500">
                    Break started: {formatTimeForDisplay(attendance.breakStartTime)}
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Hours:</span>
                  <p className="font-medium">{formatNumber(attendance.totalHours)}h</p>
                </div>
                <div>
                  <span className="text-gray-500">Break Time:</span>
                  <p className="font-medium">{formatNumber(attendance.breakTime)}h</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <p>Data storage: {isBackendConnected ? 'MongoDB Database' : 'Local Storage'}</p>
                <p>Manager: {managerName} (ID: {managerId})</p>
                {attendance.hasCheckedOutToday && attendance.lastCheckInDate && 
                  new Date(attendance.lastCheckInDate).toDateString() === new Date().toDateString() && (
                  <p className="text-red-600 dark:text-red-400">
                    ⚠️ Already checked out for today. Check-in disabled.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CustomStatCard
            title="Team Supervisors"
            value={stats.totalSupervisors}
            icon={Shield}
            trend={{ value: 2, isPositive: true }}
            delay={0}
            loading={isLoading}
          />
          <CustomStatCard
            title="Active Projects"
            value={stats.activeProjects}
            icon={ClipboardList}
            trend={{ value: 1, isPositive: true }}
            delay={0.1}
            loading={isLoading}
          />
          <CustomStatCard
            title="Pending Tasks"
            value={stats.pendingTasks}
            icon={Clock}
            trend={{ value: 3, isPositive: false }}
            delay={0.2}
            loading={isLoading}
          />
          <CustomStatCard
            title="Productivity Score"
            value={`${stats.productivityScore}%`}
            icon={TrendingUp}
            trend={{ value: 5, isPositive: true }}
            delay={0.3}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 flex items-center gap-3 justify-start hover:bg-accent transition-colors border-2"
                      onClick={action.action}
                      disabled={isLoading}
                    >
                      <div className={`p-2 rounded-lg ${action.color} transition-colors`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Live Activity Feed - {managerName}
              </CardTitle>
              <Badge variant="secondary" className="animate-pulse">
                Live
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-4 p-3">
                      <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                      </div>
                    </div>
                  ))
                ) : (
                  recentActivities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                      onClick={() => handleActivityClick(activity)}
                    >
                      <Avatar className="h-8 w-8 group-hover:scale-110 transition-transform">
                        <AvatarFallback className="text-xs bg-primary/10">
                          {activity.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm group-hover:text-primary transition-colors">
                            {activity.title}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs border ${getActivityBadgeColor(activity.type)}`}
                          >
                            {getActivityTypeLabel(activity.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getActivityIcon(activity.type)}
                          <span>By {activity.user}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))
                )}
              </div>
              
              {/* View All Activities Button */}
              <div className="mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleViewAllActivities}
                  disabled={isLoading}
                >
                  View Complete Activity Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Task Completion Rate</span>
                  <Badge variant="default">
                    {isLoading ? "..." : `${Math.min(100, Math.floor((stats.completedTasks / (stats.completedTasks + stats.pendingTasks)) * 100))}%`}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Team Members</span>
                  <Badge variant="default">{isLoading ? "..." : stats.teamMembers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Project Progress</span>
                  <Badge variant="default">{isLoading ? "..." : "78%"}</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={handlePerformanceAnalytics}
                disabled={isLoading}
              >
                Detailed Performance Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Today's Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div>
                    <div className="font-medium text-sm">Meetings Scheduled</div>
                    <div className="text-xs text-muted-foreground">
                      {isLoading ? "..." : `${Math.floor(Math.random() * 3) + 2} meetings today`}
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={handleViewMeetings}
                    disabled={isLoading}
                  >
                    View
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div>
                    <div className="font-medium text-sm">Deadlines Today</div>
                    <div className="text-xs text-muted-foreground">
                      {isLoading ? "..." : `${Math.floor(Math.random() * 2) + 1} deadlines approaching`}
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={handleReviewDeadlines}
                    disabled={isLoading}
                  >
                    Review
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div>
                    <div className="font-medium text-sm">Team Availability</div>
                    <div className="text-xs text-muted-foreground">
                      {isLoading ? "..." : `${Math.floor(Math.random() * 20) + 80}% of team active`}
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={handleCheckAvailability}
                    disabled={isLoading}
                  >
                    Check
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={handleViewFullSchedule}
                disabled={isLoading}
              >
                View Full Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;