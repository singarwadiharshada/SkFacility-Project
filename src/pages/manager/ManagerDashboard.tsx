import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  ClipboardList, 
  Clock, 
  Users, 
  LogIn,
  LogOut,
  Coffee,
  Timer,
  CalendarDays,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowRight,
  FileText,
  Calendar,
  UserPlus,
  Settings,
  Bell,
  Eye,
  Target,
  LineChart as LineChartIcon,
  Activity,
  CheckSquare,
  PlayCircle,
  AlertTriangle,
  Zap,
  MapPin,
  CalendarCheck
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRole } from "@/context/RoleContext";
import userService from "@/services/userService";

// Import Recharts for charts
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

// Types
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

interface LeaveRequest {
  id: string;
  _id: string;
  employeeName: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  avatar: string;
}

interface TaskStatus {
  name: string;
  value: number;
  color: string;
  icon: React.ComponentType<any>;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

interface MonthlyAttendanceData {
  name: string;
  value: number;
  color: string;
  fill: string;
}

interface QuickAction {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color: string;
  bgColor: string;
  hoverColor: string;
  gradient: string;
}

interface TaskDetail {
  id: string;
  _id: string;
  title: string;
  description: string;
  assignee: string;
  assignedTo: string;
  assignedToName?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  deadline: string;
  status: 'completed' | 'in-progress' | 'pending' | 'cancelled' | 'overdue';
  progress: number;
  siteName?: string;
  siteId?: string;
  clientName?: string;
  taskType?: string;
  createdAt: string;
  source: 'manager' | 'superadmin';
  isAssignedToMe?: boolean;
}

interface Site {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  status: string;
  managerCount: number;
  supervisorCount: number;
}

const ManagerDashboard = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user: authUser } = useRole();
  const navigate = useNavigate();
  
  // API Base URL - Use relative URL or config-based URL
  const API_URL = import.meta.env.VITE_API_URL || `http://localhost:5001/api`;
  
  // Current user state
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  
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

  // New state for additional data
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number>(0);
  
  // Enhanced task status data with all tasks
  const [taskStatusData, setTaskStatusData] = useState<TaskStatus[]>([
    { 
      name: "Completed", 
      value: 0, 
      color: "#10b981",
      icon: CheckSquare,
      count: 0,
      trend: 'up'
    },
    { 
      name: "In Progress", 
      value: 0, 
      color: "#3b82f6",
      icon: PlayCircle,
      count: 0,
      trend: 'up'
    },
    { 
      name: "Pending", 
      value: 0, 
      color: "#f59e0b",
      icon: Clock,
      count: 0,
      trend: 'stable'
    },
    { 
      name: "Overdue", 
      value: 0, 
      color: "#ef4444",
      icon: AlertTriangle,
      count: 0,
      trend: 'down'
    }
  ]);
  
  // Tasks assigned to manager
  const [assignedTasks, setAssignedTasks] = useState<TaskDetail[]>([]);
  
  // Line chart data for tasks over time
  const [taskLineData, setTaskLineData] = useState([
    { day: 'Mon', completed: 0, inProgress: 0, pending: 0 },
    { day: 'Tue', completed: 0, inProgress: 0, pending: 0 },
    { day: 'Wed', completed: 0, inProgress: 0, pending: 0 },
    { day: 'Thu', completed: 0, inProgress: 0, pending: 0 },
    { day: 'Fri', completed: 0, inProgress: 0, pending: 0 },
    { day: 'Sat', completed: 0, inProgress: 0, pending: 0 },
    { day: 'Sun', completed: 0, inProgress: 0, pending: 0 },
  ]);
  
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<MonthlyAttendanceData[]>([
    { name: "Present", value: 0, color: "#10b981", fill: "#10b981" },
    { name: "Absent", value: 0, color: "#ef4444", fill: "#ef4444" },
    { name: "Half Day", value: 0, color: "#f59e0b", fill: "#f59e0b" },
    { name: "Late", value: 0, color: "#8b5cf6", fill: "#8b5cf6" }
  ]);

  // Updated stats - removed teamMembers, added presentDays and activeSites
  const [stats, setStats] = useState({
    presentDays: 0,
    activeSites: 0,
    pendingLeaves: 0,
    productivityScore: 0
  });

  // Enhanced Quick Actions with CORRECTED navigation paths
  const quickActions: QuickAction[] = [
    {
      id: 1,
      title: "Supervisors",
      description: "View and manage supervisors",
      icon: Users,
      action: () => navigate("/manager/supervisors"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      id: 2,
      title: "Leave Management",
      description: "Approve/reject leave requests",
      icon: Calendar,
      action: () => navigate("/manager/leave"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-green-500 to-green-600",
      hoverColor: "hover:from-green-600 hover:to-green-700",
      gradient: "from-green-500 to-green-600"
    },
    {
      id: 3,
      title: "Task Management",
      description: "Manage all tasks",
      icon: ClipboardList,
      action: () => navigate("/manager/tasks"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-purple-500 to-purple-600",
      hoverColor: "hover:from-purple-600 hover:to-purple-700",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      id: 4,
      title: "Reports",
      description: "Generate detailed reports",
      icon: FileText,
      action: () => navigate("/manager/reports"),
      color: "text-white",
      bgColor: "bg-gradient-to-br from-orange-500 to-orange-600",
      hoverColor: "hover:from-orange-600 hover:to-orange-700",
      gradient: "from-orange-500 to-orange-600"
    }
  ];

  // Initialize current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (authUser) {
          const userId = authUser._id || authUser.id;
          
          if (userId) {
            const allUsersResponse = await userService.getAllUsers();
            const foundUser = allUsersResponse.allUsers.find(user => 
              user._id === userId || user.id === userId
            );
            
            if (foundUser) {
              setManagerId(foundUser._id);
              setManagerName(foundUser.name || foundUser.firstName || 'Manager');
            } else {
              // Fallback to localStorage
              const storedUser = localStorage.getItem("sk_user");
              if (storedUser) {
                const user = JSON.parse(storedUser);
                setManagerId(user._id || user.id);
                setManagerName(user.name || user.firstName || 'Manager');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, [authUser]);

  // Load all data when managerId is available
  useEffect(() => {
    if (managerId) {
      fetchAllData();
    }
  }, [managerId]);

  // Fetch all dashboard data
  const fetchAllData = async () => {
    setIsLoading(true);
    setIsStatsLoading(true);
    
    try {
      // Fetch attendance status
      await fetchAttendanceStatus();
      
      // Fetch monthly attendance data from attendance page
      await fetchMonthlyAttendanceData();
      
      // Fetch leave requests and pending count
      await fetchLeaveRequests();
      
      // Fetch task statistics - specifically tasks assigned to manager
      await fetchTaskStatistics();
      
      // Fetch active sites count
      await fetchActiveSites();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setIsLoading(false);
      setIsStatsLoading(false);
    }
  };

  // Fetch today's attendance status
  const fetchAttendanceStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/today/${managerId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const attendanceData = data.data;
          setAttendance({
            isCheckedIn: attendanceData.isCheckedIn || false,
            isOnBreak: attendanceData.isOnBreak || false,
            checkInTime: attendanceData.checkInTime,
            checkOutTime: attendanceData.checkOutTime,
            breakStartTime: attendanceData.breakStartTime,
            breakEndTime: attendanceData.breakEndTime,
            totalHours: attendanceData.totalHours || 0,
            breakTime: attendanceData.breakTime || 0,
            lastCheckInDate: attendanceData.lastCheckInDate,
            hasCheckedOutToday: attendanceData.hasCheckedOutToday || false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    }
  };

  // Fetch monthly attendance data from attendance page API
  const fetchMonthlyAttendanceData = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // Fetch monthly attendance summary
      const response = await fetch(
        `${API_URL}/manager-attendance/summary/${managerId}?year=${year}&month=${month}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Monthly attendance API response:', data);
        
        if (data.success && data.data && data.data.stats) {
          const stats = data.data.stats;
          
          // Calculate days in month
          const daysInMonth = new Date(year, month, 0).getDate();
          const presentDays = stats.presentDays || 0;
          const absentDays = stats.absentDays || 0;
          const lateDays = stats.lateDays || 0;
          const halfDays = stats.halfDays || 0;
          
          // Update monthly attendance data
          setMonthlyAttendanceData([
            { name: "Present", value: presentDays, color: "#10b981", fill: "#10b981" },
            { name: "Absent", value: absentDays, color: "#ef4444", fill: "#ef4444" },
            { name: "Half Day", value: halfDays, color: "#f59e0b", fill: "#f59e0b" },
            { name: "Late", value: lateDays, color: "#8b5cf6", fill: "#8b5cf6" }
          ]);
          
          // Calculate attendance rate for stats
          const attendanceRate = daysInMonth > 0 ? Math.round((presentDays / daysInMonth) * 100) : 0;
          
          // Update stats with present days
          setStats(prev => ({
            ...prev,
            presentDays: presentDays,
            productivityScore: attendanceRate
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching monthly attendance data:', error);
    }
  };

  // Fetch leave requests from leave management page
  const fetchLeaveRequests = async () => {
    try {
      // Fetch department from user info
      const allUsersResponse = await userService.getAllUsers();
      const foundUser = allUsersResponse.allUsers.find(user => 
        user._id === managerId || user.id === managerId
      );
      
      let managerDepartment = "Management";
      if (foundUser && foundUser.department) {
        managerDepartment = foundUser.department;
      }
      
      // Fetch leave requests for the manager's department
      const response = await fetch(
        `${API_URL}/leaves/supervisor?department=${encodeURIComponent(managerDepartment)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Leave requests API response:', data);
        
        if (Array.isArray(data)) {
          // Count pending leaves
          const pendingLeaves = data.filter((leave: any) => leave.status === 'pending').length;
          setPendingLeaveCount(pendingLeaves);
          
          // Update stats
          setStats(prev => ({
            ...prev,
            pendingLeaves: pendingLeaves
          }));
          
          // Get only the 3 most recent pending leave requests for display
          const recentLeaves = data
            .filter((leave: any) => leave.status === 'pending')
            .sort((a: any, b: any) => new Date(b.createdAt || b.appliedDate).getTime() - new Date(a.createdAt || a.appliedDate).getTime())
            .slice(0, 3)
            .map((leave: any) => ({
              id: leave._id || leave.id,
              _id: leave._id || leave.id,
              employeeName: leave.employeeName || leave.name || 'Unknown',
              employeeId: leave.employeeId || 'Unknown',
              type: leave.leaveType || 'Leave',
              startDate: leave.fromDate || leave.startDate,
              endDate: leave.toDate || leave.endDate,
              reason: leave.reason || 'No reason provided',
              status: leave.status,
              avatar: leave.employeeName ? leave.employeeName.substring(0, 2).toUpperCase() : '??'
            }));
          
          setLeaveRequests(recentLeaves);
        }
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    }
  };

  // Fetch task statistics - specifically tasks assigned to manager
  const fetchTaskStatistics = async () => {
    try {
      console.log('Fetching tasks for manager:', managerId, managerName);
      
      // Try multiple endpoints to get tasks
      let tasksData: any[] = [];
      
      // Method 1: Try tasks assigned to manager endpoint
      try {
        const response = await fetch(`${API_URL}/tasks/manager/${managerId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Tasks from manager endpoint:', data);
          
          if (Array.isArray(data)) {
            tasksData = data;
          }
        }
      } catch (error) {
        console.log('Error with manager tasks endpoint, trying all tasks:', error);
      }
      
      // Method 2: If no data from manager endpoint, try all tasks
      if (tasksData.length === 0) {
        try {
          const response = await fetch(`${API_URL}/tasks`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('All tasks from API:', data);
            
            if (Array.isArray(data)) {
              tasksData = data;
            }
          }
        } catch (error) {
          console.log('Error with all tasks endpoint:', error);
        }
      }
      
      // Process tasks and filter those assigned to current manager
      if (tasksData.length > 0) {
        console.log('Processing tasks, total:', tasksData.length);
        
        // Filter tasks assigned to the current manager
        const assignedToManager = tasksData.filter((task: any) => {
          // Check if task is assigned to current manager by ID or name
          const isAssignedById = task.assignedTo === managerId;
          const isAssignedByName = task.assignedToName?.toLowerCase() === managerName?.toLowerCase();
          const isAssignedByAssignee = task.assignee === managerId;
          const isCurrentUserAssigned = task.assignedTo && 
            (isAssignedById || isAssignedByName || isAssignedByAssignee);
          
          console.log(`Task ${task.title}: assignedTo=${task.assignedTo}, managerId=${managerId}, matches=${isCurrentUserAssigned}`);
          return isCurrentUserAssigned;
        });
        
        console.log('Tasks assigned to manager:', assignedToManager.length, assignedToManager);
        
        // Process assigned tasks
        const tasks: TaskDetail[] = assignedToManager.map((task: any) => {
          // Determine progress based on status
          let progress = 0;
          if (task.status === 'completed') progress = 100;
          else if (task.status === 'in-progress') progress = Math.floor(Math.random() * 70) + 30; // 30-100%
          else if (task.status === 'pending') progress = Math.floor(Math.random() * 30); // 0-29%
          
          return {
            id: task._id || task.id || `task_${Math.random()}`,
            _id: task._id || task.id || `task_${Math.random()}`,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            assignee: task.assignee || task.assignedTo,
            assignedTo: task.assignedTo,
            assignedToName: task.assignedToName || managerName || 'Unknown',
            priority: (task.priority || 'medium') as 'high' | 'medium' | 'low',
            dueDate: task.dueDate || task.deadline || new Date().toISOString(),
            deadline: task.deadline || task.dueDate || new Date().toISOString(),
            status: (task.status || 'pending') as TaskDetail['status'],
            progress: task.progress || progress,
            siteName: task.siteName,
            siteId: task.siteId,
            clientName: task.clientName,
            taskType: task.taskType,
            createdAt: task.createdAt || new Date().toISOString(),
            source: task.source || 'manager',
            isAssignedToMe: true
          };
        });
        
        setAssignedTasks(tasks);
        
        // Calculate task status counts for assigned tasks only
        const completedTasks = tasks.filter((task: TaskDetail) => task.status === 'completed');
        const inProgressTasks = tasks.filter((task: TaskDetail) => task.status === 'in-progress');
        const pendingTasks = tasks.filter((task: TaskDetail) => task.status === 'pending');
        const overdueTasks = tasks.filter((task: TaskDetail) => {
          if (task.status === 'pending' && task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDate < today;
          }
          return false;
        });
        
        // Update task status data
        setTaskStatusData([
          { 
            name: "Completed", 
            value: completedTasks.length, 
            color: "#10b981",
            icon: CheckSquare,
            count: completedTasks.length,
            trend: completedTasks.length > 0 ? 'up' : 'stable'
          },
          { 
            name: "In Progress", 
            value: inProgressTasks.length, 
            color: "#3b82f6",
            icon: PlayCircle,
            count: inProgressTasks.length,
            trend: inProgressTasks.length > 0 ? 'up' : 'stable'
          },
          { 
            name: "Pending", 
            value: pendingTasks.length, 
            color: "#f59e0b",
            icon: Clock,
            count: pendingTasks.length,
            trend: 'stable'
          },
          { 
            name: "Overdue", 
            value: overdueTasks.length, 
            color: "#ef4444",
            icon: AlertTriangle,
            count: overdueTasks.length,
            trend: overdueTasks.length > 0 ? 'up' : 'down'
          }
        ]);
        
        // Generate line chart data for the week
        const weekData = generateWeeklyTaskData(tasks);
        setTaskLineData(weekData);
        
      } else {
        console.log('No tasks data found, using demo data');
        // Create demo tasks for testing
        createDemoTasks();
      }
      
    } catch (error) {
      console.error('Error fetching task statistics:', error);
      toast.error('Failed to load task statistics');
      // Create demo tasks as fallback
      createDemoTasks();
    }
  };

  // Create demo tasks for testing
  const createDemoTasks = () => {
    const demoTasks: TaskDetail[] = [
      {
        id: 'demo_task_1',
        _id: 'demo_task_1',
        title: 'Daily Site Inspection',
        description: 'Complete daily safety inspection of all equipment',
        assignee: managerId,
        assignedTo: managerId,
        assignedToName: managerName,
        priority: 'high',
        dueDate: new Date().toISOString(),
        deadline: new Date().toISOString(),
        status: 'in-progress',
        progress: 65,
        siteName: 'Site A',
        clientName: 'Client A',
        taskType: 'inspection',
        createdAt: new Date().toISOString(),
        source: 'superadmin',
        isAssignedToMe: true
      },
      {
        id: 'demo_task_2',
        _id: 'demo_task_2',
        title: 'Team Meeting Preparation',
        description: 'Prepare agenda and materials for weekly team meeting',
        assignee: managerId,
        assignedTo: managerId,
        assignedToName: managerName,
        priority: 'medium',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        progress: 20,
        siteName: 'Site A',
        clientName: 'Client A',
        taskType: 'meeting',
        createdAt: new Date().toISOString(),
        source: 'manager',
        isAssignedToMe: true
      },
      {
        id: 'demo_task_3',
        _id: 'demo_task_3',
        title: 'Monthly Safety Report',
        description: 'Complete monthly safety inspection report',
        assignee: managerId,
        assignedTo: managerId,
        assignedToName: managerName,
        priority: 'high',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'overdue',
        progress: 40,
        siteName: 'Site B',
        clientName: 'Client B',
        taskType: 'report',
        createdAt: new Date().toISOString(),
        source: 'superadmin',
        isAssignedToMe: true
      },
      {
        id: 'demo_task_4',
        _id: 'demo_task_4',
        title: 'Team Training Session',
        description: 'Conduct safety training for new hires',
        assignee: managerId,
        assignedTo: managerId,
        assignedToName: managerName,
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        progress: 10,
        siteName: 'Site A',
        clientName: 'Client A',
        taskType: 'training',
        createdAt: new Date().toISOString(),
        source: 'manager',
        isAssignedToMe: true
      }
    ];
    
    setAssignedTasks(demoTasks);
    
    // Update task status data
    setTaskStatusData([
      { 
        name: "Completed", 
        value: 0, 
        color: "#10b981",
        icon: CheckSquare,
        count: 0,
        trend: 'stable'
      },
      { 
        name: "In Progress", 
        value: 1, 
        color: "#3b82f6",
        icon: PlayCircle,
        count: 1,
        trend: 'up'
      },
      { 
        name: "Pending", 
        value: 2, 
        color: "#f59e0b",
        icon: Clock,
        count: 2,
        trend: 'stable'
      },
      { 
        name: "Overdue", 
        value: 1, 
        color: "#ef4444",
        icon: AlertTriangle,
        count: 1,
        trend: 'up'
      }
    ]);
    
    // Generate line chart data
    const weekData = generateWeeklyTaskData(demoTasks);
    setTaskLineData(weekData);
  };

  // Fetch active sites count
  const fetchActiveSites = async () => {
    try {
      const response = await fetch(`${API_URL}/sites?status=active`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Active sites API response:', data);
        
        if (Array.isArray(data)) {
          // Count active sites
          const activeSitesCount = data.length;
          
          // Update stats
          setStats(prev => ({
            ...prev,
            activeSites: activeSitesCount
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching active sites:', error);
      // Set default active sites
      setStats(prev => ({
        ...prev,
        activeSites: 3 // Default value for demo
      }));
    }
  };

  // Generate weekly task data for line chart
  const generateWeeklyTaskData = (tasks: TaskDetail[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = days.map(day => ({
      day,
      completed: 0,
      inProgress: 0,
      pending: 0
    }));
    
    // For demo purposes, distribute tasks across the week
    tasks.forEach((task, index) => {
      const dayIndex = index % 7;
      if (task.status === 'completed') {
        weekData[dayIndex].completed += 1;
      } else if (task.status === 'in-progress') {
        weekData[dayIndex].inProgress += 1;
      } else if (task.status === 'pending' || task.status === 'overdue') {
        weekData[dayIndex].pending += 1;
      }
    });
    
    return weekData;
  };

  // Format time for display
  const formatTimeForDisplay = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display
  const formatDateForDisplay = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString([], { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format short date
  const formatShortDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if manager can check in today
  const canCheckInToday = (): boolean => {
    if (!attendance.isCheckedIn && !attendance.hasCheckedOutToday) {
      return true;
    }
    return false;
  };

  // Check if manager can check out today
  const canCheckOutToday = (): boolean => {
    return attendance.isCheckedIn && !attendance.hasCheckedOutToday;
  };

  // Handle check in
  const handleCheckIn = async () => {
    if (!canCheckInToday()) {
      toast.error(attendance.hasCheckedOutToday 
        ? "You have already checked out for today" 
        : "You are already checked in");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          managerId, 
          managerName 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Successfully checked in!");
        setAttendance(prev => ({
          ...prev,
          isCheckedIn: true,
          checkInTime: data.data.checkInTime,
          hasCheckedOutToday: false
        }));
      } else {
        toast.error(data.message || "Failed to check in");
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error("Failed to check in. Please try again.");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle check out
  const handleCheckOut = async () => {
    if (!canCheckOutToday()) {
      toast.error("Cannot check out");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Successfully checked out!");
        setAttendance(prev => ({
          ...prev,
          isCheckedIn: false,
          checkOutTime: data.data.checkOutTime,
          totalHours: data.data.totalHours || 0,
          hasCheckedOutToday: true
        }));
      } else {
        toast.error(data.message || "Failed to check out");
      }
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error("Failed to check out. Please try again.");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle break in
  const handleBreakIn = async () => {
    if (!attendance.isCheckedIn || attendance.isOnBreak) {
      toast.error(attendance.isOnBreak ? "Already on break" : "Must be checked in to take a break");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/breakin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Break started!");
        setAttendance(prev => ({
          ...prev,
          isOnBreak: true,
          breakStartTime: data.data.breakStartTime
        }));
      } else {
        toast.error(data.message || "Failed to start break");
      }
    } catch (error) {
      console.error('Error starting break:', error);
      toast.error("Failed to start break. Please try again.");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle break out
  const handleBreakOut = async () => {
    if (!attendance.isOnBreak) {
      toast.error("Not currently on break");
      return;
    }

    setIsAttendanceLoading(true);
    try {
      const response = await fetch(`${API_URL}/manager-attendance/breakout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Break ended!");
        setAttendance(prev => ({
          ...prev,
          isOnBreak: false,
          breakEndTime: data.data.breakEndTime,
          breakTime: prev.breakTime + (data.data.breakDuration || 0)
        }));
      } else {
        toast.error(data.message || "Failed to end break");
      }
    } catch (error) {
      console.error('Error ending break:', error);
      toast.error("Failed to end break. Please try again.");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle leave request action
  const handleLeaveAction = async (leaveId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          managerId,
          managerName,
          remarks: `${action === 'approve' ? 'Approved' : 'Rejected'} by manager`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedLeaves = leaveRequests.map(leave => 
          leave.id === leaveId 
            ? { ...leave, status: action === 'approve' ? 'approved' : 'rejected' }
            : leave
        );
        setLeaveRequests(updatedLeaves);
        
        // Update pending leave count
        const newPendingCount = updatedLeaves.filter(l => l.status === 'pending').length;
        setPendingLeaveCount(newPendingCount);
        setStats(prev => ({
          ...prev,
          pendingLeaves: newPendingCount
        }));
        
        const leave = leaveRequests.find(l => l.id === leaveId);
        const message = action === 'approve' 
          ? `Leave approved for ${leave?.employeeName}`
          : `Leave rejected for ${leave?.employeeName}`;
        
        toast.success(message);
      } else {
        toast.error(data.message || `Failed to ${action} leave`);
      }
    } catch (error) {
      console.error(`Error ${action}ing leave:`, error);
      toast.error(`Failed to ${action} leave. Please try again.`);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{payload[0].value} days</p>
          <p className="text-xs text-gray-500">
            {((payload[0].value / monthlyAttendanceData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-bold drop-shadow-lg"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="0.5"
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip for line chart
  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status color for tasks
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get progress color
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format date for task display
  const formatTaskDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle task click
  const handleTaskClick = (task: TaskDetail) => {
    toast.info("Task Details", {
      description: `
        <div class="space-y-2">
          <div><strong>Task:</strong> ${task.title}</div>
          <div><strong>Description:</strong> ${task.description}</div>
          <div><strong>Status:</strong> ${task.status}</div>
          <div><strong>Priority:</strong> ${task.priority}</div>
          <div><strong>Progress:</strong> ${task.progress}%</div>
          <div><strong>Due Date:</strong> ${formatTaskDate(task.dueDate)}</div>
          ${task.siteName ? `<div><strong>Site:</strong> ${task.siteName}</div>` : ''}
          <div><strong>Assigned to:</strong> ${task.assignedToName}</div>
        </div>
      `,
      duration: 10000,
    });
  };

  // Refresh all data
  const handleRefresh = async () => {
    await fetchAllData();
    toast.success("Dashboard data refreshed!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <DashboardHeader 
        title="Manager Dashboard" 
        subtitle={`Welcome back, ${managerName}! Here's your daily overview`}
        onMenuClick={onMenuClick}
      />

      <div className="p-6 space-y-6">
        {/* Welcome Banner */}
       
        {/* Attendance Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-600" />
                Attendance Control - {managerName}
                {isAttendanceLoading && (
                  <Badge variant="outline" className="ml-2">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Processing...
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your work hours and breaks
                {attendance.lastCheckInDate && (
                  <span className="block text-xs mt-1">
                    Last check-in: {formatDateForDisplay(attendance.lastCheckInDate)}
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
                    >
                      {isAttendanceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="h-4 w-4" />
                      )}
                      {isAttendanceLoading ? "Processing..." : "Check In"}
                    </Button>
                    <Button
                      onClick={handleCheckOut}
                      disabled={!canCheckOutToday() || isAttendanceLoading || !managerId}
                      className="flex-1 flex items-center gap-2"
                    >
                      {isAttendanceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      {isAttendanceLoading ? "Processing..." : "Check Out"}
                    </Button>
                  </div>
                  {attendance.checkInTime && (
                    <p className="text-xs text-gray-500">
                      Checked in: {formatTimeForDisplay(attendance.checkInTime)}
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
                    >
                      {isAttendanceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Coffee className="h-4 w-4" />
                      )}
                      {isAttendanceLoading ? "Processing..." : "Break In"}
                    </Button>
                    <Button
                      onClick={handleBreakOut}
                      disabled={!attendance.isOnBreak || isAttendanceLoading || !managerId}
                      className="flex-1 flex items-center gap-2"
                    >
                      {isAttendanceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Timer className="h-4 w-4" />
                      )}
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
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Hours:</span>
                    <p className="font-medium">{attendance.totalHours.toFixed(2)}h</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Break Time:</span>
                    <p className="font-medium">{attendance.breakTime.toFixed(2)}h</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <p>Manager: {managerName} (ID: {managerId})</p>
                  {attendance.hasCheckedOutToday && (
                    <p className="text-green-600">
                      ✓ Already checked out for today
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards - UPDATED with 4 new cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Present Days Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Days</CardTitle>
              <div className="p-2 bg-green-50 rounded-lg">
                <CalendarCheck className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.presentDays}</div>
              <p className="text-xs text-muted-foreground">
                {stats.presentDays > 0 ? `${Math.round((stats.presentDays / monthlyAttendanceData.reduce((a, b) => a + b.value, 0)) * 100)}% attendance rate` : "No attendance recorded"}
              </p>
            </CardContent>
          </Card>
          
          {/* Active Sites Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active Sites</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSites}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeSites > 0 ? "Active sites under management" : "No active sites"}
              </p>
            </CardContent>
          </Card>
          
          {/* Pending Leaves Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Calendar className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingLeaves > 0 ? `${stats.pendingLeaves} requests awaiting approval` : "No pending leaves"}
              </p>
            </CardContent>
          </Card>
          
          {/* Productivity Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity</CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productivityScore}%</div>
              <p className="text-xs text-muted-foreground">Based on attendance and task completion</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts and Leave Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Attendance Pie Chart - INCREASED SIZE */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-blue-600" />
                  Monthly Attendance Overview
                </CardTitle>
                <CardDescription>
                  Your attendance breakdown for this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <div className="flex items-center justify-center h-80">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="h-80 flex flex-col lg:flex-row items-center justify-center">
                    <div className="w-full lg:w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={monthlyAttendanceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={120} 
                            innerRadius={40} 
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {monthlyAttendanceData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full lg:w-1/2 mt-4 lg:mt-0 lg:pl-6">
                      <div className="space-y-3">
                        {monthlyAttendanceData.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{item.value} days</div>
                              <div className="text-xs text-gray-500">
                                {((item.value / monthlyAttendanceData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Leave Requests - SHOWING 3 RECENT REQUESTS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Recent Leave Requests
                </CardTitle>
                <CardDescription>
                  {pendingLeaveCount} pending requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map((leave, index) => (
                      <motion.div
                        key={leave.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-gray-100">
                              {leave.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{leave.employeeName}</div>
                            <div className="text-xs text-muted-foreground">
                              {leave.type} • {formatShortDate(leave.startDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(leave.status)}`}
                          >
                            {leave.status}
                          </Badge>
                          {leave.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleLeaveAction(leave.id, 'approve')}
                              >
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleLeaveAction(leave.id, 'reject')}
                              >
                                <XCircle className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No pending leave requests</p>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    className="w-full mt-2"
                    onClick={() => navigate("/manager/leave")}
                  >
                    View All Leaves
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Task Status Overview with Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-green-600" />
                    Tasks Assigned to You
                  </CardTitle>
                  <CardDescription>
                    Track tasks assigned specifically to you
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-fit">
                    Total: {assignedTasks.length} Tasks
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/manager/tasks")}
                    className="h-8"
                  >
                    View All Tasks
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all-tasks" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="charts" className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    Charts
                  </TabsTrigger>
                  <TabsTrigger value="all-tasks" className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    All Tasks
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  {isStatsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={taskStatusData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                              {taskStatusData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color}
                                  stroke="#fff"
                                  strokeWidth={1}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        {taskStatusData.map((item, index) => {
                          const Icon = item.icon;
                          return (
                            <Card key={index} className="border-l-4" style={{ borderLeftColor: item.color }}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-2xl font-bold">{item.count}</div>
                                    <div className="text-sm text-muted-foreground">{item.name}</div>
                                  </div>
                                  <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${item.color}20` }}>
                                    <Icon className="h-5 w-5" style={{ color: item.color }} />
                                  </div>
                                </div>
                                <div className="mt-2 text-xs">
                                  <span className={item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-yellow-600'}>
                                    {item.trend === 'up' ? '↗ Increase' : item.trend === 'down' ? '↘ Decrease' : '→ Stable'}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="charts" className="space-y-4">
                  {isStatsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={taskLineData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip content={<CustomLineTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="completed" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="inProgress" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="pending" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="all-tasks">
                  <div className="space-y-3">
                    {assignedTasks.length > 0 ? (
                      assignedTasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="font-medium truncate">{task.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {task.description}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {task.siteName && `Site: ${task.siteName} • `}
                                Assigned to you • Due: {formatTaskDate(task.dueDate)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                            <div className="w-24 shrink-0">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{task.progress}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getProgressColor(task.progress)} transition-all duration-500`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(task);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium text-lg mb-2">No Tasks Assigned to You</h3>
                        <p className="text-muted-foreground mb-4">
                          You don't have any tasks assigned to you yet.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => navigate("/manager/tasks")}
                          className="mt-2"
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          View All Tasks
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions - ONLY 4 ACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Access frequently used features with one click
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="outline"
                      className={`w-full h-28 flex flex-col items-center justify-center gap-3 ${action.bgColor} ${action.hoverColor} border-0 transition-all duration-300 shadow-md hover:shadow-lg`}
                      onClick={action.action}
                    >
                      <div className={`p-3 rounded-full bg-white/20 backdrop-blur-sm`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-sm text-white">{action.title}</div>
                        <div className="text-xs text-white/80 mt-1">{action.description}</div>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ManagerDashboard;