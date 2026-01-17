import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Download, 
  Filter,
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Users,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  CheckSquare,
  XCircle,
  CalendarDays,
  FileText,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Search,
  User,
  Mail,
  Phone,
  Eye,
  Download as DownloadIcon,
  FileBarChart,
  ClipboardCheck,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  MapPin,
  ClipboardList,
  UserCheck,
  Home,
  Briefcase,
  Lock,
  Wifi,
  WifiOff,
  BarChart3,
  TrendingUp as TrendingUpIcon,
  Loader2,
  RefreshCw,
  Plus,
  AlertTriangle,
  Info,
  Database as DatabaseIcon
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useRole } from "@/context/RoleContext";

// Interface for Attendance Data
interface AttendanceRecord {
  id: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "Half Day" | "Late";
  totalHours: string;
  breaks: number;
  breakDuration: string;
  overtime: string;
  managerId: string;
  managerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  breakTime: number;
  lastCheckInDate: string | null;
  isCheckedIn: boolean;
  isOnBreak: boolean;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  averageHours: string;
  totalOvertime: string;
  attendanceRate: number;
}

interface ApiAttendanceRecord {
  _id: string;
  managerId: string;
  managerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate: string | null;
  isCheckedIn: boolean;
  isOnBreak: boolean;
  dailyActivities: any[];
  createdAt: string;
  updatedAt: string;
}

// Interface for Leave Data
interface LeaveRequest {
  _id: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
  contactNumber: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  isManagerLeave?: boolean;
}

interface ManagerInfo {
  _id: string;
  employeeId?: string;
  name: string;
  department: string;
  contactNumber?: string;
  email?: string;
  role: string;
  phone?: string;
  position?: string;
}

// Dummy Data for Tasks
const dummyTasks = [
  {
    id: "T001",
    title: "Website Redesign",
    assignee: "John Doe",
    department: "IT",
    priority: "high",
    status: "in-progress",
    deadline: "2024-12-15",
    progress: 65,
    site: "Headquarters",
    attachments: 3,
    hoursSpent: 42,
  },
  {
    id: "T002",
    title: "Q4 Marketing Campaign",
    assignee: "Sarah Williams",
    department: "Marketing",
    priority: "medium",
    status: "completed",
    deadline: "2024-11-30",
    progress: 100,
    site: "All Locations",
    attachments: 5,
    hoursSpent: 120,
  },
  {
    id: "T003",
    title: "Inventory Audit",
    assignee: "Mike Johnson",
    department: "Operations",
    priority: "high",
    status: "pending",
    deadline: "2024-12-10",
    progress: 0,
    site: "Warehouse A",
    attachments: 2,
    hoursSpent: 0,
  },
  {
    id: "T004",
    title: "Employee Training Program",
    assignee: "Emily Davis",
    department: "HR",
    priority: "low",
    status: "in-progress",
    deadline: "2024-12-20",
    progress: 40,
    site: "Training Center",
    attachments: 7,
    hoursSpent: 28,
  },
  {
    id: "T005",
    title: "Server Migration",
    assignee: "Robert Chen",
    department: "IT",
    priority: "high",
    status: "completed",
    deadline: "2024-11-25",
    progress: 100,
    site: "Data Center",
    attachments: 4,
    hoursSpent: 96,
  },
];

// Departments and Statuses
const departments = ["All Departments", "IT", "Marketing", "Operations", "HR", "Sales", "Finance", "Product"];
const taskStatuses = ["All Status", "pending", "in-progress", "completed"];
const taskPriorities = ["All Priority", "high", "medium", "low"];
const leaveStatuses = ["All Status", "pending", "approved", "rejected"];
const leaveTypes = ["All Types", "Annual Leave", "Sick Leave", "Casual Leave", "Emergency Leave", "Maternity Leave", "Study Leave"];
const attendanceStatuses = ["All Status", "present", "absent", "late", "half-day"];

const ManagerReports = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user: authUser, isAuthenticated } = useRole();
  
  // API Base URL
  const API_URL = `http://${window.location.hostname}:5001/api`;
  
  // Manager ID and Name
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [managerInfo, setManagerInfo] = useState<ManagerInfo>({
    _id: "",
    name: "",
    department: "",
    contactNumber: "",
    email: "",
    role: "manager",
    phone: "",
    position: "Manager"
  });
  
  // State for API connection
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // State for Tasks
  const [taskSearch, setTaskSearch] = useState("");
  const [taskDeptFilter, setTaskDeptFilter] = useState("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");

  // State for Attendance
  const [attendanceDate, setAttendanceDate] = useState("2024-11-25");
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState("all");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    averageHours: "0.0",
    totalOvertime: "0.0",
    attendanceRate: 0
  });
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");

  // State for Leaves
  const [leaveDeptFilter, setLeaveDeptFilter] = useState("all");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [managerDepartment, setManagerDepartment] = useState<string>("");
  const [leaveApiStatus, setLeaveApiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [isLoadingMyLeaves, setIsLoadingMyLeaves] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isFetchingFromAPI, setIsFetchingFromAPI] = useState(false);

  // Initialize manager info from localStorage and auth context
  useEffect(() => {
    const storedUser = localStorage.getItem("sk_user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const id = user._id || user.id || `manager-${Date.now()}`;
        const name = user.name || user.firstName || 'Manager';
        setManagerId(id);
        setManagerName(name);
        
        // Set manager info
        const managerData: ManagerInfo = {
          _id: user._id || user.id || `mgr_${Date.now()}`,
          employeeId: user.employeeId || user.id || `MGR${Date.now().toString().slice(-6)}`,
          name: user.name || user.firstName + " " + user.lastName || "Manager",
          department: user.department || "",
          contactNumber: user.phone || user.contactNumber || "0000000000",
          email: user.email || "",
          role: user.role || "manager",
          phone: user.phone || user.contactNumber || "",
          position: user.position || "Manager"
        };
        
        setManagerInfo(managerData);
        setManagerDepartment(user.department || "");
        
        console.log('Current Manager Info:', managerData);
      } catch (e) {
        console.error('Error parsing user:', e);
        const randomId = `manager-${Date.now()}`;
        setManagerId(randomId);
        setManagerName('Demo Manager');
        setManagerDepartment("Operations");
      }
    } else if (authUser && isAuthenticated) {
      const managerData: ManagerInfo = {
        _id: authUser._id || authUser.id || `mgr_${Date.now()}`,
        employeeId: authUser.employeeId || authUser.id || `MGR${Date.now().toString().slice(-6)}`,
        name: authUser.name || authUser.firstName + " " + authUser.lastName || "Manager",
        department: authUser.department || "",
        contactNumber: authUser.phone || authUser.contactNumber || "0000000000",
        email: authUser.email || "",
        role: authUser.role || "manager",
        phone: authUser.phone || authUser.contactNumber || "",
        position: authUser.position || "Manager"
      };
      
      setManagerInfo(managerData);
      setManagerId(managerData._id);
      setManagerName(managerData.name);
      setManagerDepartment(managerData.department || "");
    } else {
      const randomId = `manager-${Date.now()}`;
      setManagerId(randomId);
      setManagerName('Demo Manager');
      setManagerDepartment("Operations");
      console.log('No user found, using demo manager ID:', randomId);
    }
  }, [authUser, isAuthenticated]);

  // Load data when managerId is available
  useEffect(() => {
    if (managerId) {
      checkBackendConnection();
      fetchAttendanceData();
      checkLeaveApiConnection();
      fetchDepartments();
    }
  }, [selectedMonth, managerId]);

  // Fetch leaves when department changes
  useEffect(() => {
    if (managerDepartment && leaveApiStatus === 'connected') {
      fetchTeamLeaves();
      fetchManagerLeaves();
    }
  }, [managerDepartment, leaveApiStatus]);

  // Check backend connection for attendance
  const checkBackendConnection = async () => {
    try {
      setIsCheckingConnection(true);
      console.log('Checking backend connection at:', `${API_URL}/health`);
      
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Health check response:', data);
        
        if (data.status === 'OK') {
          setIsBackendConnected(true);
          console.log('✅ Backend connected successfully');
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
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Check API connection for leaves
  const checkLeaveApiConnection = async () => {
    try {
      setLeaveApiStatus('checking');
      const response = await fetch(`${API_URL}/test`);
      
      if (response.ok) {
        setLeaveApiStatus('connected');
        console.log("✅ Leave API connection successful");
      } else {
        setLeaveApiStatus('error');
        console.error("❌ Leave API connection failed");
      }
    } catch (error) {
      setLeaveApiStatus('error');
      console.error("❌ Leave API connection error:", error);
    }
  };

  // Fetch attendance data from MongoDB API
  const fetchAttendanceData = async () => {
    setIsLoading(true);
    setIsFetchingFromAPI(false);
    
    try {
      if (isBackendConnected && managerId) {
        setIsFetchingFromAPI(true);
        await fetchAttendanceFromAPI();
      } else {
        generateSampleAttendanceData();
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      generateSampleAttendanceData();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch attendance data from MongoDB API
  const fetchAttendanceFromAPI = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log('Fetching attendance from API for manager:', managerId);
      
      const response = await fetch(
        `${API_URL}/api/manager-attendance/history/${managerId}?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('API response for manager attendance:', data);
        
        if (data.success && data.data) {
          const apiRecords: ApiAttendanceRecord[] = data.data.history || data.data;
          const formattedRecords = transformApiDataToRecords(apiRecords, year, month);
          
          setAttendanceRecords(formattedRecords);
          calculateAttendanceStats(formattedRecords);
          toast.success(`Attendance data loaded for ${managerName}`);
          return;
        }
      }
      
      console.warn('No valid data from API, generating sample data');
      throw new Error('No data from API');
      
    } catch (error) {
      console.error('Error fetching from API:', error);
      generateSampleAttendanceData();
    }
  };

  // Transform API data to UI format
  const transformApiDataToRecords = (apiRecords: ApiAttendanceRecord[], year: number, month: number): AttendanceRecord[] => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const records: AttendanceRecord[] = [];
    
    const recordsByDate = new Map<string, ApiAttendanceRecord>();
    apiRecords.forEach(record => {
      if (record.managerId === managerId) {
        if (record.lastCheckInDate) {
          const recordDate = new Date(record.lastCheckInDate).toISOString().split('T')[0];
          recordsByDate.set(recordDate, record);
        } else if (record.createdAt) {
          const recordDate = new Date(record.createdAt).toISOString().split('T')[0];
          recordsByDate.set(recordDate, record);
        }
      }
    });
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const existingRecord = recordsByDate.get(dateString);
      
      if (existingRecord) {
        const status = determineStatus(existingRecord);
        const totalHours = existingRecord.totalHours || 0;
        const breakTime = existingRecord.breakTime || 0;
        const overtime = Math.max(0, totalHours - 8);
        
        records.push({
          id: existingRecord._id || `api-${dateString}`,
          date: dateString,
          day: dayOfWeek,
          checkIn: existingRecord.checkInTime ? formatTimeForDisplay(existingRecord.checkInTime) : "-",
          checkOut: existingRecord.checkOutTime ? formatTimeForDisplay(existingRecord.checkOutTime) : "-",
          status: status,
          totalHours: totalHours.toFixed(1),
          breaks: existingRecord.breakStartTime && existingRecord.breakEndTime ? 1 : 0,
          breakDuration: formatDuration(breakTime),
          overtime: overtime.toFixed(1),
          managerId: existingRecord.managerId,
          managerName: existingRecord.managerName,
          checkInTime: existingRecord.checkInTime,
          checkOutTime: existingRecord.checkOutTime,
          breakStartTime: existingRecord.breakStartTime,
          breakEndTime: existingRecord.breakEndTime,
          breakTime: existingRecord.breakTime,
          lastCheckInDate: existingRecord.lastCheckInDate,
          isCheckedIn: existingRecord.isCheckedIn,
          isOnBreak: existingRecord.isOnBreak
        });
      } else {
        records.push({
          id: `gen-${dateString}`,
          date: dateString,
          day: dayOfWeek,
          checkIn: "-",
          checkOut: "-",
          status: "Absent",
          totalHours: "0.0",
          breaks: 0,
          breakDuration: "0m",
          overtime: "0.0",
          managerId: managerId,
          managerName: managerName,
          checkInTime: null,
          checkOutTime: null,
          breakStartTime: null,
          breakEndTime: null,
          breakTime: 0,
          lastCheckInDate: null,
          isCheckedIn: false,
          isOnBreak: false
        });
      }
    }
    
    return records;
  };

  // Determine status based on record data
  const determineStatus = (record: ApiAttendanceRecord): "Present" | "Absent" | "Half Day" | "Late" => {
    if (!record.checkInTime) return "Absent";
    
    const checkInTime = new Date(record.checkInTime);
    const expectedStart = new Date(checkInTime);
    expectedStart.setHours(9, 0, 0, 0);
    
    const lateThreshold = new Date(checkInTime);
    lateThreshold.setHours(9, 30, 0, 0);
    
    if (checkInTime > lateThreshold) {
      return "Late";
    }
    
    if (record.totalHours < 4) {
      return "Half Day";
    }
    
    return "Present";
  };

  // Format time for display
  const formatTimeForDisplay = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format duration in hours to Xh Ym format
  const formatDuration = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    if (hoursPart > 0 && minutesPart > 0) {
      return `${hoursPart}h ${minutesPart}m`;
    } else if (hoursPart > 0) {
      return `${hoursPart}h`;
    } else {
      return `${minutesPart}m`;
    }
  };

  // Generate sample attendance data
  const generateSampleAttendanceData = () => {
    if (!managerId) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const records: AttendanceRecord[] = [];
      const currentDate = new Date(selectedMonth + "-01");
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let presentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;
      let totalHours = 0;
      let totalOvertime = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        
        if (date.getDay() === 0 || date.getDay() === 6 || Math.random() < 0.2) {
          if (Math.random() < 0.3) {
            const status = Math.random() < 0.7 ? "Present" : "Late";
            const hours = status === "Present" ? 8.0 + (Math.random() * 0.5) : 7.5 + (Math.random() * 0.5);
            const overtime = Math.max(0, hours - 8.0);
            
            records.push({
              id: `sample-${managerId}-${day}`,
              date: date.toISOString().split('T')[0],
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              checkIn: generateTime(8, 30, 9, 30),
              checkOut: generateTime(16, 30, 18, 0),
              status: status as any,
              totalHours: hours.toFixed(1),
              breaks: Math.floor(Math.random() * 2) + 1,
              breakDuration: "45m",
              overtime: overtime.toFixed(1),
              managerId: managerId,
              managerName: managerName,
              checkInTime: null,
              checkOutTime: null,
              breakStartTime: null,
              breakEndTime: null,
              breakTime: 0,
              lastCheckInDate: date.toISOString().split('T')[0],
              isCheckedIn: false,
              isOnBreak: false
            });

            if (status === "Present") presentCount++;
            if (status === "Late") lateCount++;
            totalHours += hours;
            totalOvertime += overtime;
          } else {
            records.push({
              id: `sample-${managerId}-${day}`,
              date: date.toISOString().split('T')[0],
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              checkIn: "-",
              checkOut: "-",
              status: "Absent",
              totalHours: "0.0",
              breaks: 0,
              breakDuration: "0m",
              overtime: "0.0",
              managerId: managerId,
              managerName: managerName,
              checkInTime: null,
              checkOutTime: null,
              breakStartTime: null,
              breakEndTime: null,
              breakTime: 0,
              lastCheckInDate: null,
              isCheckedIn: false,
              isOnBreak: false
            });
          }
        } else {
          const rand = Math.random();
          let status: string;
          let hours: number;

          if (rand < 0.7) {
            status = "Present";
            hours = 8.0 + (Math.random() * 0.5);
            presentCount++;
          } else if (rand < 0.85) {
            status = "Late";
            hours = 7.5 + (Math.random() * 0.5);
            lateCount++;
          } else if (rand < 0.95) {
            status = "Half Day";
            hours = 4.0 + (Math.random() * 1.0);
            halfDayCount++;
          } else {
            status = "Absent";
            hours = 0;
          }

          const overtime = Math.max(0, hours - 8.0);
          
          records.push({
            id: `sample-${managerId}-${day}`,
            date: date.toISOString().split('T')[0],
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            checkIn: status !== "Absent" ? generateTime(8, 30, 9, 30) : "-",
            checkOut: status !== "Absent" ? generateTime(16, 30, 18, 0) : "-",
            status: status as any,
            totalHours: hours.toFixed(1),
            breaks: status !== "Absent" ? Math.floor(Math.random() * 2) + 1 : 0,
            breakDuration: status !== "Absent" ? "45m" : "0m",
            overtime: overtime.toFixed(1),
            managerId: managerId,
            managerName: managerName,
            checkInTime: null,
            checkOutTime: null,
            breakStartTime: null,
            breakEndTime: null,
            breakTime: 0,
            lastCheckInDate: status !== "Absent" ? date.toISOString().split('T')[0] : null,
            isCheckedIn: false,
            isOnBreak: false
          });

          totalHours += hours;
          totalOvertime += overtime;
        }
      }

      const totalDays = records.length;
      const absentCount = records.filter(r => r.status === "Absent").length;
      const attendanceRate = ((presentCount + lateCount * 0.8 + halfDayCount * 0.5) / totalDays) * 100;

      setAttendanceRecords(records);
      setAttendanceStats({
        totalDays,
        presentDays: presentCount,
        absentDays: absentCount,
        lateDays: lateCount,
        halfDays: halfDayCount,
        averageHours: (totalHours / (presentCount + lateCount + halfDayCount) || 0).toFixed(1),
        totalOvertime: totalOvertime.toFixed(1),
        attendanceRate: Math.round(attendanceRate)
      });
      setIsLoading(false);
    }, 1000);
  };

  const generateTime = (startHour: number, startMin: number, endHour: number, endMin: number) => {
    const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
    const minute = Math.floor(Math.random() * (endMin - startMin)) + startMin;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate statistics from attendance records
  const calculateAttendanceStats = (records: AttendanceRecord[]) => {
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === "Present").length;
    const absentDays = records.filter(r => r.status === "Absent").length;
    const lateDays = records.filter(r => r.status === "Late").length;
    const halfDays = records.filter(r => r.status === "Half Day").length;
    
    const totalHours = records.reduce((sum, record) => sum + parseFloat(record.totalHours || "0"), 0);
    const totalOvertime = records.reduce((sum, record) => sum + parseFloat(record.overtime || "0"), 0);
    
    const workingDays = presentDays + lateDays + halfDays;
    const averageHours = workingDays > 0 ? totalHours / workingDays : 0;
    const attendanceRate = totalDays > 0 ? ((presentDays + lateDays * 0.8 + halfDays * 0.5) / totalDays) * 100 : 0;

    setAttendanceStats({
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      averageHours: averageHours.toFixed(1),
      totalOvertime: totalOvertime.toFixed(1),
      attendanceRate: Math.round(attendanceRate)
    });
  };

  // Fetch departments for leaves
  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves/departments`);
      if (response.ok) {
        const departments = await response.json();
        console.log("📋 Available departments:", departments);
        
        if (departments && departments.length > 0) {
          setAvailableDepartments(departments);
          if (!managerDepartment && departments.length > 0) {
            setManagerDepartment(departments[0]);
          }
        } else {
          const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
          setAvailableDepartments(defaultDepartments);
          if (!managerDepartment) {
            setManagerDepartment(defaultDepartments[0]);
          }
        }
      } else {
        throw new Error("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
      setAvailableDepartments(defaultDepartments);
      if (!managerDepartment) {
        setManagerDepartment(defaultDepartments[0]);
      }
    }
  };

  // Fetch team leaves
  const fetchTeamLeaves = async () => {
    if (leaveApiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    if (!managerDepartment) {
      return;
    }

    try {
      setIsLoadingLeaves(true);
      const response = await fetch(
        `${API_URL}/leaves/supervisor?department=${encodeURIComponent(managerDepartment)}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        let errorMessage = 'Failed to fetch leaves';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Team leaves data received:", data);
      
      const formattedData = data.map((leave: any) => ({
        ...leave,
        id: leave._id || leave.id,
        isManagerLeave: false
      }));
      
      setLeaveRequests(formattedData);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      toast.error(error.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setIsLoadingLeaves(false);
    }
  };

  // Fetch manager's personal leaves
  const fetchManagerLeaves = async () => {
    if (leaveApiStatus !== 'connected') {
      return;
    }

    if (!managerInfo._id) {
      console.log("Manager info not available yet");
      return;
    }

    try {
      setIsLoadingMyLeaves(true);
      
      const response = await fetch(
        `${API_URL}/manager-leaves?managerId=${encodeURIComponent(managerInfo._id)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manager leaves: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const formattedData = data.leaves.map((leave: any) => ({
          ...leave,
          id: leave._id || leave.id,
          _id: leave._id || leave.id,
          isManagerLeave: true,
          employeeId: leave.managerId,
          employeeName: leave.managerName,
          department: leave.managerDepartment,
          contactNumber: leave.managerContact,
          appliedDate: leave.appliedDate || leave.createdAt
        }));
        
        setMyLeaves(formattedData);
      }
    } catch (error) {
      console.error("Error fetching manager's leaves:", error);
      setMyLeaves([]);
    } finally {
      setIsLoadingMyLeaves(false);
    }
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return dummyTasks.filter(task => {
      const matchesSearch = taskSearch === "" || 
        task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        task.assignee.toLowerCase().includes(taskSearch.toLowerCase());
      
      const matchesDept = taskDeptFilter === "all" || task.department.toLowerCase() === taskDeptFilter.toLowerCase();
      const matchesStatus = taskStatusFilter === "all" || task.status === taskStatusFilter;
      const matchesPriority = taskPriorityFilter === "all" || task.priority === taskPriorityFilter;
      
      return matchesSearch && matchesDept && matchesStatus && matchesPriority;
    });
  }, [taskSearch, taskDeptFilter, taskStatusFilter, taskPriorityFilter]);

  // Filter Attendance
  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(record => {
      const matchesDept = attendanceDeptFilter === "all" || "Operations" === attendanceDeptFilter;
      const matchesStatus = attendanceStatusFilter === "all" || record.status.toLowerCase() === attendanceStatusFilter.toLowerCase();
      const matchesDate = record.date === attendanceDate;
      
      return matchesDept && matchesStatus && matchesDate;
    });
  }, [attendanceDate, attendanceDeptFilter, attendanceStatusFilter, attendanceRecords]);

  // Filter Leaves
  const filteredLeaves = useMemo(() => {
    const allLeaves = [...leaveRequests, ...myLeaves];
    return allLeaves.filter(leave => {
      const matchesDept = leaveDeptFilter === "all" || leave.department.toLowerCase() === leaveDeptFilter.toLowerCase();
      const matchesStatus = leaveStatusFilter === "all" || leave.status === leaveStatusFilter;
      const matchesType = leaveTypeFilter === "all" || leave.leaveType === leaveTypeFilter;
      
      return matchesDept && matchesStatus && matchesType;
    });
  }, [leaveDeptFilter, leaveStatusFilter, leaveTypeFilter, leaveRequests, myLeaves]);

  // Task Statistics
  const taskStats = useMemo(() => {
    const total = dummyTasks.length;
    const completed = dummyTasks.filter(t => t.status === 'completed').length;
    const inProgress = dummyTasks.filter(t => t.status === 'in-progress').length;
    const pending = dummyTasks.filter(t => t.status === 'pending').length;
    const highPriority = dummyTasks.filter(t => t.priority === 'high').length;
    
    return {
      total,
      completed,
      inProgress,
      pending,
      highPriority,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : "0"
    };
  }, []);

  // Attendance Statistics
  const attendanceStatsMemo = useMemo(() => attendanceStats, [attendanceStats]);

  // Leave Statistics
  const leaveStats = useMemo(() => {
    const allLeaves = [...leaveRequests, ...myLeaves];
    const approved = allLeaves.filter(l => l.status === 'approved').length;
    const pending = allLeaves.filter(l => l.status === 'pending').length;
    const rejected = allLeaves.filter(l => l.status === 'rejected').length;
    const cancelled = allLeaves.filter(l => l.status === 'cancelled').length;
    const total = allLeaves.length;
    const totalDays = allLeaves.reduce((sum, l) => sum + l.totalDays, 0);
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0";
    
    return { 
      total, 
      approved, 
      pending, 
      rejected, 
      cancelled,
      totalDays, 
      approvalRate,
      teamLeaves: leaveRequests.length,
      myLeaves: myLeaves.length
    };
  }, [leaveRequests, myLeaves]);

  // Task Chart Data
  const taskChartData = [
    { name: "Completed", value: taskStats.completed, color: "#10b981" },
    { name: "In Progress", value: taskStats.inProgress, color: "#3b82f6" },
    { name: "Pending", value: taskStats.pending, color: "#f59e0b" },
  ];

  // Attendance Chart Data
  const attendanceChartData = [
    { status: "Present", count: attendanceStatsMemo.presentDays, color: "#10b981" },
    { status: "Late", count: attendanceStatsMemo.lateDays, color: "#f59e0b" },
    { status: "Absent", count: attendanceStatsMemo.absentDays, color: "#ef4444" },
  ];

  // Leave Chart Data
  const leaveChartData = [
    { status: "Approved", count: leaveStats.approved, color: "#10b981" },
    { status: "Pending", count: leaveStats.pending, color: "#f59e0b" },
    { status: "Rejected", count: leaveStats.rejected, color: "#ef4444" },
    { status: "Cancelled", count: leaveStats.cancelled, color: "#6b7280" },
  ];

  // Department-wise Task Data
  const departmentTaskData = useMemo(() => {
    const deptMap = new Map();
    dummyTasks.forEach(task => {
      if (!deptMap.has(task.department)) {
        deptMap.set(task.department, { department: task.department, total: 0, completed: 0 });
      }
      const deptData = deptMap.get(task.department);
      deptData.total++;
      if (task.status === 'completed') deptData.completed++;
    });
    
    return Array.from(deptMap.values()).map(dept => ({
      department: dept.department,
      completed: dept.completed,
      total: dept.total,
      completionRate: dept.total > 0 ? ((dept.completed / dept.total) * 100).toFixed(1) : "0"
    }));
  }, []);

  // Filter attendance records based on filter
  const filteredAttendanceRecords = attendanceRecords.filter(record => {
    if (attendanceFilter === "all") return true;
    if (attendanceFilter === "present") return record.status === "Present";
    if (attendanceFilter === "absent") return record.status === "Absent";
    if (attendanceFilter === "late") return record.status === "Late";
    if (attendanceFilter === "halfday") return record.status === "Half Day";
    return true;
  });

  const handleDownloadReport = (type: string) => {
    toast.success(`${type} report download started!`);
    setTimeout(() => {
      toast.success(`${type} report downloaded successfully!`);
    }, 2000);
  };

  const handleExportData = (type: string) => {
    toast.success(`${type} data exported as CSV!`);
  };

  const handleRetryConnection = () => {
    checkBackendConnection().then(() => {
      if (isBackendConnected) {
        fetchAttendanceData();
      }
    });
    checkLeaveApiConnection().then(() => {
      if (leaveApiStatus === 'connected') {
        fetchTeamLeaves();
        fetchManagerLeaves();
      }
    });
  };

  const getCurrentMonthName = () => {
    return new Date(selectedMonth + "-01").toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Present: "bg-green-100 text-green-800 border-green-200",
      Absent: "bg-red-100 text-red-800 border-red-200",
      Late: "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Half Day": "bg-blue-100 text-blue-800 border-blue-200"
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getLeaveStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      Present: <CheckCircle className="h-4 w-4" />,
      Absent: <XCircle className="h-4 w-4" />,
      Late: <Clock className="h-4 w-4" />,
      "Half Day": <AlertCircle className="h-4 w-4" />
    };
    return icons[status as keyof typeof icons];
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getApiStatusBadge = () => {
    if (isBackendConnected && leaveApiStatus === 'connected') {
      return <Badge variant="default" className="bg-green-500">Both APIs Connected</Badge>;
    } else if (isBackendConnected) {
      return <Badge variant="default" className="bg-green-500">Attendance API Connected</Badge>;
    } else if (leaveApiStatus === 'connected') {
      return <Badge variant="default" className="bg-green-500">Leaves API Connected</Badge>;
    } else if (leaveApiStatus === 'checking' || isCheckingConnection) {
      return <Badge variant="secondary">Checking APIs...</Badge>;
    } else {
      return <Badge variant="destructive">API Error</Badge>;
    }
  };

  const handleTestDatabase = async () => {
    try {
      setIsLoading(true);
      toast.info("Testing database connections...");
      
      // Test attendance API
      const attendanceResponse = await fetch(`${API_URL}/health`);
      // Test leaves API
      const leavesResponse = await fetch(`${API_URL}/test`);
      
      if (attendanceResponse.ok && leavesResponse.ok) {
        toast.success("Both database connections successful!");
        setIsBackendConnected(true);
        setLeaveApiStatus('connected');
        
        // Fetch all data
        fetchAttendanceData();
        fetchTeamLeaves();
        fetchManagerLeaves();
      } else {
        toast.error("Some database connections failed");
      }
    } catch (error) {
      console.error("Database test error:", error);
      toast.error("Failed to connect to databases");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <DashboardHeader 
        title="Manager Reports" 
        subtitle="Comprehensive analytics for tasks, attendance, and leaves"
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 space-y-6"
      >
        {/* Connection Status Banner */}
        {(!isBackendConnected || leaveApiStatus !== 'connected') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  API Connections Issue
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  {!isBackendConnected && "Attendance API not connected. "}
                  {leaveApiStatus !== 'connected' && "Leaves API not connected. "}
                  Some features may not work properly.
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-yellow-600">
                    Server URLs: Attendance: {API_URL} | Leaves: {API_URL}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryConnection}
                disabled={isCheckingConnection}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                {isCheckingConnection ? "Checking..." : "Retry Connection"}
              </Button>
            </div>
          </div>
        )}


        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Task Summary */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                Task Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{taskStats.total}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-gray-600">
                  {taskStats.completed} completed • {taskStats.inProgress} in progress
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {taskStats.completionRate}% completion
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-green-600" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{attendanceStatsMemo.presentDays}/{attendanceStatsMemo.totalDays}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-gray-600">
                  {attendanceStatsMemo.lateDays} late • {attendanceStatsMemo.absentDays} absent
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {attendanceStatsMemo.attendanceRate}% present
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Leave Summary */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                Leave Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{leaveStats.total}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-gray-600">
                  {leaveStats.approved} approved • {leaveStats.pending} pending
                </div>
                <Badge className="bg-purple-100 text-purple-800">
                  {leaveStats.totalDays} total days
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Manager Stats */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-amber-600" />
                Manager Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{leaveStats.myLeaves}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-gray-600">
                  {leaveStats.teamLeaves} team leaves • {availableDepartments.length} depts
                </div>
                <Badge className="bg-amber-100 text-amber-800">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Department Selection
            </CardTitle>
            <CardDescription>
              Select department to view team leaves and data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2 w-96">
                <Select
                  value={managerDepartment}
                  onValueChange={setManagerDepartment}
                  disabled={availableDepartments.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.length > 0 ? (
                      availableDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          <div className="flex items-center">
                            <Building className="mr-2 h-4 w-4" />
                            {dept}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        Loading departments...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Users className="mr-1 h-3 w-3" />
                    {leaveRequests.length} team leaves
                  </span>
                  <span className="flex items-center">
                    <Building className="mr-1 h-3 w-3" />
                    {availableDepartments.length} departments available
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    fetchAttendanceData();
                    fetchTeamLeaves();
                    fetchManagerLeaves();
                  }}
                  className="h-9"
                  disabled={isLoading || isLoadingLeaves || isLoadingMyLeaves}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh All
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportData}
                  disabled={filteredLeaves.length === 0}
                >
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Task Reports
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Attendance Reports
            </TabsTrigger>
            <TabsTrigger value="leaves" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Leave Reports
            </TabsTrigger>
          </TabsList>

          {/* Task Reports Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Task Performance Analytics
                  </CardTitle>
                  <CardDescription>Track task completion and productivity metrics</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportData("tasks")}>
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadReport("tasks")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Task Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Tasks</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search tasks..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select value={taskDeptFilter} onValueChange={setTaskDeptFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskStatuses.map(status => (
                          <SelectItem key={status} value={status === "All Status" ? "all" : status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskPriorities.map(priority => (
                          <SelectItem key={priority} value={priority === "All Priority" ? "all" : priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Task Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Task Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4" />
                        Task Status Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={taskChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {taskChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Department Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChartIcon className="h-4 w-4" />
                        Department Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {departmentTaskData.map((dept, index) => (
                          <div key={dept.department} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{dept.department}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-semibold">{dept.completed}/{dept.total}</span>
                                <span className="text-gray-500 ml-2">({dept.completionRate}%)</span>
                              </div>
                            </div>
                            <Progress value={parseFloat(dept.completionRate)} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Task Table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Task Details ({filteredTasks.length} tasks)</h3>
                    <Badge variant="outline">
                      {filteredTasks.filter(t => t.priority === 'high').length} High Priority
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Deadline</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="font-medium">{task.title}</div>
                                  <div className="text-sm text-gray-500">{task.site}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                {task.assignee}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{task.department}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="w-full max-w-32">
                                <Progress value={task.progress} className="h-2" />
                                <div className="text-xs text-gray-500 mt-1">{task.progress}%</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                {task.deadline}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Reports Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5" />
                    Attendance Analytics
                  </CardTitle>
                  <CardDescription>
                    {isBackendConnected && isFetchingFromAPI 
                      ? "Real attendance data from database" 
                      : "Sample attendance data"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportData("attendance")}>
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadReport("attendance")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Attendance Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{attendanceStatsMemo.totalDays}</div>
                      <p className="text-xs text-muted-foreground">{getCurrentMonthName()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Present Days</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{attendanceStatsMemo.presentDays}</div>
                      <p className="text-xs text-muted-foreground">
                        +{attendanceStatsMemo.lateDays} late, +{attendanceStatsMemo.halfDays} half day
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
                      <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{attendanceStatsMemo.absentDays}</div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round((attendanceStatsMemo.absentDays / attendanceStatsMemo.totalDays) * 100)}% of total
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                      <TrendingUpIcon className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{attendanceStatsMemo.attendanceRate}%</div>
                      <p className="text-xs text-muted-foreground">
                        Avg. {attendanceStatsMemo.averageHours}h/day
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attendance Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChartIcon className="h-4 w-4" />
                        Attendance Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={attendanceChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="status" />
                            <YAxis />
                            <Tooltip />
                            <Bar 
                              dataKey="count" 
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Overtime Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Overtime Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span>Total Overtime Hours</span>
                          </div>
                          <span className="font-bold text-blue-700">{attendanceStatsMemo.totalOvertime} hrs</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-sm text-green-600">Average Daily</div>
                            <div className="text-lg font-bold text-green-700">
                              {attendanceStatsMemo.presentDays > 0 ? 
                                (parseFloat(attendanceStatsMemo.totalOvertime) / attendanceStatsMemo.presentDays).toFixed(1) : "0.0"} hrs
                            </div>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="text-sm text-purple-600">Total Working Days</div>
                            <div className="text-lg font-bold text-purple-700">
                              {attendanceStatsMemo.presentDays + attendanceStatsMemo.lateDays + attendanceStatsMemo.halfDays}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status Filter</label>
                    <select
                      value={attendanceFilter}
                      onChange={(e) => setAttendanceFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm w-full"
                    >
                      <option value="all">All Status</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="halfday">Half Day</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Actions</label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="w-full" onClick={handleRetryConnection}>
                        <Wifi className="h-4 w-4 mr-2" />
                        Refresh Data
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Attendance Table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Attendance Records ({filteredAttendanceRecords.length} days)</h3>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {attendanceStatsMemo.presentDays} Present
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {attendanceStatsMemo.absentDays} Absent
                      </Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                            </div>
                            <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Day</TableHead>
                            <TableHead>Check In</TableHead>
                            <TableHead>Check Out</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Overtime</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAttendanceRecords.slice(0, 10).map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {new Date(record.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              <TableCell>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                  record.day === 'Sat' || record.day === 'Sun' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {record.day}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  {record.checkIn}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  {record.checkOut}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getStatusBadge(record.status)}>
                                  <span className="flex items-center gap-1">
                                    {getStatusIcon(record.status)}
                                    {record.status}
                                  </span>
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{record.totalHours}h</span>
                                  {parseFloat(record.totalHours) >= 8 && (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    parseFloat(record.overtime) > 0 
                                      ? "bg-orange-100 text-orange-800 border-orange-200" 
                                      : "bg-gray-100 text-gray-800 border-gray-200"
                                  }
                                >
                                  {record.overtime}h
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {!isLoading && filteredAttendanceRecords.length === 0 && (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No attendance records found</h3>
                        <p className="text-gray-500 mt-2">
                          No attendance records for the selected month.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Reports Tab */}
          <TabsContent value="leaves" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Leave Management Analytics
                  </CardTitle>
                  <CardDescription>
                    {leaveApiStatus === 'connected' 
                      ? "Real leave data from database (Team + Manager leaves)" 
                      : "Sample leave data"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportData("leaves")}>
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadReport("leaves")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Leave Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{leaveStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total Leaves</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Team: {leaveStats.teamLeaves} • Personal: {leaveStats.myLeaves}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{leaveStats.pending}</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{leaveStats.approved}</div>
                      <div className="text-sm text-muted-foreground">Approved</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{leaveStats.rejected}</div>
                      <div className="text-sm text-muted-foreground">Rejected</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{leaveStats.totalDays}</div>
                      <div className="text-sm text-muted-foreground">Total Days</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Leave Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select value={leaveDeptFilter} onValueChange={setLeaveDeptFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        {["All Departments", ...availableDepartments].map(dept => (
                          <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveStatuses.map(status => (
                          <SelectItem key={status} value={status === "All Status" ? "all" : status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Leave Type</label>
                    <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map(type => (
                          <SelectItem key={type} value={type === "All Types" ? "all" : type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Leave Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Leave Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4" />
                        Leave Status Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={leaveChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {leaveChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Leave Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileBarChart className="h-4 w-4" />
                        Leave Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: "Total Leave Days", value: leaveStats.totalDays, icon: CalendarDays, color: "text-blue-600" },
                          { label: "Approval Rate", value: `${leaveStats.approvalRate}%`, icon: CheckCircle, color: "text-green-600" },
                          { label: "Pending Requests", value: leaveStats.pending, icon: Clock, color: "text-amber-600" },
                          { label: "Rejected Requests", value: leaveStats.rejected, icon: XCircle, color: "text-red-600" },
                        ].map((stat, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <stat.icon className={`h-5 w-5 ${stat.color}`} />
                              <span className="font-medium">{stat.label}</span>
                            </div>
                            <span className="font-bold text-lg">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Leaves Table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Leave Requests ({filteredLeaves.length} records)</h3>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {leaveStats.approved} Approved
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        {leaveStats.pending} Pending
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {leaveStats.myLeaves} Personal
                      </Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    {isLoadingLeaves || isLoadingMyLeaves ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredLeaves.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No Leave Requests Found</h3>
                        <p className="text-gray-500 mt-2">
                          No leave requests match your current filters.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Date Range</TableHead>
                            <TableHead>Total Days</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLeaves.slice(0, 10).map((leave) => (
                            <TableRow key={leave._id || leave.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <div className="font-medium">{leave.employeeName}</div>
                                    <div className="text-sm text-gray-500">{leave.employeeId}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{leave.department}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                  {leave.leaveType}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-sm">From: {formatDate(leave.fromDate)}</div>
                                  <div className="text-sm">To: {formatDate(leave.toDate)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-bold text-center">{leave.totalDays}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getLeaveStatusBadgeVariant(leave.status)}>
                                  {leave.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {leave.isManagerLeave ? (
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                                    Manager
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                    Team
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Handle view leave details
                                    toast.info(`Viewing leave: ${leave.employeeName}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
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

export default ManagerReports;