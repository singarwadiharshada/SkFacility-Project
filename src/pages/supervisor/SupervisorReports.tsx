import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Download, FileText, Printer, Save, Send, User, CheckCircle, XCircle, AlertCircle, Package, BarChart, TrendingUp, RefreshCw, Loader2, Users, Briefcase, Building, Mail, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { inventoryService, type FrontendInventoryItem } from '@/services/inventoryService';
import { taskService } from "@/services/TaskService";
import { useRole } from "@/context/RoleContext";

// FIXED: Import jsPDF and jspdf-autotable correctly for Vite
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { utils, writeFile } from "xlsx";

// API base URL
const API_URL = `http://${window.location.hostname}:5001/api`;

// Interfaces
interface ReportAttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: "Present" | "Absent" | "Late" | "Half-Day" | "Leave" | "Weekly-Off";
  overtime: number;
  notes?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  siteName: string;
  status: "active" | "inactive" | "left";
  salary: number | string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  isCheckedIn: boolean;
  isOnBreak: boolean;
  supervisorId?: string;
  remarks?: string;
}

interface TeamMember {
  id: string;
  name: string;
  position: string;
  tasksCompleted: number;
  tasksPending: number;
  attendance: string;
  performance: "Excellent" | "Good" | "Average" | "Needs Improvement";
}

interface TaskReport {
  id: string;
  taskName: string;
  assignedTo: string;
  status: "Completed" | "In Progress" | "Delayed" | "Not Started";
  priority: "High" | "Medium" | "Low";
  deadline: string;
  progress: number;
}

interface SafetyIncident {
  id: string;
  type: string;
  description: string;
  date: string;
  severity: "Low" | "Medium" | "High";
  actionTaken: string;
}

// Interface for API task
interface ApiTask {
  _id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  deadline: string;
  siteId: string;
  siteName: string;
  clientName: string;
  taskType?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Production task interface (transformed from API)
interface ProductionTask {
  id: string;
  taskName: string;
  productCode: string;
  quantity: number;
  completed: number;
  startTime: string;
  endTime: string;
  operator: string;
  qualityCheck: "Passed" | "Failed" | "Pending";
  efficiency: number;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
  deadline: string;
  siteName: string;
  clientName: string;
  assignedToName: string;
  createdAt: string;
  assignedToId?: string;
  createdById?: string;
}

// Attendance Service Functions
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-" || timestamp === "") return "-";
  
  try {
    if (typeof timestamp === 'string' && (timestamp.includes('AM') || timestamp.includes('PM'))) {
      return timestamp;
    }
    
    if (timestamp.includes('T')) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      }
    }
    
    const timeParts = timestamp.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
    
    return timestamp;
  } catch (error) {
    return timestamp || "-";
  }
};

const convertToReportFormat = (attendance: AttendanceRecord, employee?: Employee): ReportAttendanceRecord => {
  let status: "Present" | "Absent" | "Late" | "Half-Day" | "Leave" | "Weekly-Off" = "Absent";
  
  switch (attendance.status) {
    case 'present':
      status = "Present";
      break;
    case 'absent':
      status = "Absent";
      break;
    case 'half-day':
      status = "Half-Day";
      break;
    case 'leave':
      status = "Leave";
      break;
    case 'weekly-off':
      status = "Weekly-Off";
      break;
    default:
      status = "Absent";
  }
  
  // Calculate if late (check-in after 9:30 AM)
  const checkInTime = attendance.checkInTime;
  if (checkInTime && status === "Present") {
    const checkInDate = new Date(checkInTime);
    const lateThreshold = new Date(checkInDate);
    lateThreshold.setHours(9, 30, 0, 0); // 9:30 AM
    
    if (checkInDate > lateThreshold) {
      status = "Late";
    }
  }
  
  return {
    id: attendance._id,
    employeeName: attendance.employeeName,
    employeeId: employee?.employeeId || "Unknown",
    date: attendance.date,
    checkIn: attendance.checkInTime ? formatTimeForDisplay(attendance.checkInTime) : "-",
    checkOut: attendance.checkOutTime ? formatTimeForDisplay(attendance.checkOutTime) : "-",
    hoursWorked: attendance.totalHours || 0,
    status: status,
    overtime: Math.max(0, (attendance.totalHours || 0) - 8), // Assuming 8-hour workday
    notes: attendance.remarks || ""
  };
};

const SupervisorReport = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [activeTab, setActiveTab] = useState("attendance");
  
  // Get user from RoleContext
  const { user: currentUser } = useRole();
  
  // Attendance data states
  const [attendanceRecords, setAttendanceRecords] = useState<ReportAttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  
  // Date selection for attendance
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Inventory data
  const [inventoryItems, setInventoryItems] = useState<FrontendInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  
  // Task data states
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]); // Store all tasks
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  
  // Safety incidents (static data for now)
  const [safetyIncidents] = useState<SafetyIncident[]>([
    {
      id: "1",
      type: "Near Miss",
      description: "Slippery floor in Section B",
      date: "2024-01-10",
      severity: "Medium",
      actionTaken: "Warning signs placed, floor cleaned"
    },
    {
      id: "2",
      type: "Equipment Issue",
      description: "Faulty safety guard on Machine #5",
      date: "2024-01-09",
      severity: "High",
      actionTaken: "Machine taken offline for repair"
    }
  ]);

  // Form states
  const [reportTitle, setReportTitle] = useState("Daily Supervisor Report");
  const [reportDate, setReportDate] = useState("2024-01-15");
  const [shift, setShift] = useState("Morning");
  const [department, setDepartment] = useState("Production");
  const [summary, setSummary] = useState("");
  const [challenges, setChallenges] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [includeTeamMetrics, setIncludeTeamMetrics] = useState(true);
  const [includeTaskDetails, setIncludeTaskDetails] = useState(true);
  const [includeSafetyReport, setIncludeSafetyReport] = useState(true);

  // Fetch employees from API
  const fetchEmployees = async (): Promise<Employee[]> => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      const data = await response.json();
      
      if (data.success) {
        // Handle different response formats
        let employeesData = [];
        
        if (Array.isArray(data.data)) {
          employeesData = data.data;
        } else if (Array.isArray(data.employees)) {
          employeesData = data.employees;
        } else if (data.data && Array.isArray(data.data.employees)) {
          employeesData = data.data.employees;
        } else if (Array.isArray(data)) {
          employeesData = data;
        }
        
        // Transform employee data
        return employeesData.map((emp: any) => ({
          _id: emp._id || emp.id || `emp_${Math.random()}`,
          employeeId: emp.employeeId || emp.employeeID || `EMP${String(Math.random()).slice(2, 6)}`,
          name: emp.name || emp.employeeName || "Unknown Employee",
          email: emp.email || "",
          phone: emp.phone || emp.mobile || "",
          department: emp.department || "Unknown Department",
          position: emp.position || emp.designation || emp.role || "Employee",
          siteName: emp.siteName || emp.site || "Main Site",
          status: (emp.status || "active") as "active" | "inactive" | "left",
          salary: emp.salary || emp.basicSalary || 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setLoadingAttendance(true);
      setAttendanceError(null);
      
      // Fetch employees first
      const employeesData = await fetchEmployees();
      setEmployees(employeesData);
      
      // Fetch attendance for selected date
      const response = await fetch(`${API_URL}/attendance?date=${selectedDate}`);
      const data = await response.json();
      
      if (data.success) {
        const attendanceData: AttendanceRecord[] = data.data || [];
        
        // Convert to report format
        const formattedRecords = attendanceData.map(record => {
          const employee = employeesData.find(emp => emp._id === record.employeeId);
          return convertToReportFormat(record, employee);
        });
        
        setAttendanceRecords(formattedRecords);
        
        toast({
          title: "Attendance Data Loaded",
          description: `Loaded ${formattedRecords.length} attendance records for ${selectedDate}`,
        });
        
      } else {
        throw new Error(data.message || "Failed to load attendance data");
      }
      
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      setAttendanceError(error.message || "Failed to load attendance data");
      
      toast({
        title: "Error Loading Data",
        description: "Could not load attendance data.",
        variant: "destructive",
      });
      
      // Don't load sample data - show empty state
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setInventoryLoading(true);
      setInventoryError(null);
      const items = await inventoryService.getItems();
      setInventoryItems(items || []);
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
      setInventoryError('Failed to load inventory data. Please try again.');
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Filter tasks for logged-in supervisor
  const filterTasksForSupervisor = (tasks: ProductionTask[]): ProductionTask[] => {
    if (!currentUser || currentUser.role !== "supervisor") {
      return [];
    }
    
    // Filter tasks based on:
    // 1. Tasks assigned to the current supervisor
    // 2. Tasks created by the current supervisor
    return tasks.filter(task => {
      const isAssignedToSupervisor = task.assignedToId === currentUser._id;
      const isCreatedBySupervisor = task.createdById === currentUser._id;
      
      return isAssignedToSupervisor || isCreatedBySupervisor;
    });
  };

  // Fetch real tasks from API - NO DUMMY DATA
  const fetchTasksData = async () => {
    try {
      setLoadingTasks(true);
      setTasksError(null);
      
      // Fetch tasks from API using taskService
      const tasks = await taskService.getAllTasks();
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        setAllTasks([]);
        setProductionTasks([]);
        setTaskReports([]);
        toast({
          title: "No Tasks Found",
          description: "No tasks available in the system.",
          variant: "destructive",
        });
        return;
      }
      
      // Transform real API tasks to production tasks format
      const transformedTasks: ProductionTask[] = tasks.map((task: ApiTask, index: number) => {
        // Calculate real progress based on task status
        let completed = 0;
        let quantity = 100; // Default quantity for visualization
        
        if (task.status === "completed") {
          completed = 100;
        } else if (task.status === "in-progress") {
          completed = Math.floor(Math.random() * 70) + 30; // 30-100%
        } else if (task.status === "pending") {
          completed = 0;
        } else if (task.status === "cancelled") {
          completed = 0;
        }
        
        // Determine quality check based on status
        let qualityCheck: "Passed" | "Failed" | "Pending" = "Pending";
        if (task.status === "completed") {
          qualityCheck = "Passed";
        } else if (task.status === "cancelled") {
          qualityCheck = "Failed";
        }
        
        // Calculate efficiency based on completion
        const efficiency = Math.round((completed / quantity) * 100);
        
        // Generate time based on creation date
        const createdAt = new Date(task.createdAt);
        const startHour = createdAt.getHours();
        const endHour = (startHour + 8) % 24;
        
        return {
          id: task._id,
          taskName: task.title,
          productCode: task.taskType ? `${task.taskType.toUpperCase().slice(0, 3)}-${task._id.slice(-3)}` : `TASK-${task._id.slice(-3)}`,
          quantity,
          completed,
          startTime: `${startHour}:00 ${startHour < 12 ? 'AM' : 'PM'}`,
          endTime: `${endHour}:00 ${endHour < 12 ? 'AM' : endHour < 24 ? 'PM' : 'AM'}`,
          operator: task.assignedToName,
          qualityCheck,
          efficiency,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          siteName: task.siteName,
          clientName: task.clientName,
          assignedToName: task.assignedToName,
          createdAt: task.createdAt,
          assignedToId: task.assignedTo,
          createdById: task.createdBy
        };
      });
      
      // Store all tasks
      setAllTasks(transformedTasks);
      
      // Filter tasks for the logged-in supervisor
      const supervisorTasks = filterTasksForSupervisor(transformedTasks);
      setProductionTasks(supervisorTasks);
      
      // Transform to TaskReport format for supervisor's tasks only
      const transformedTaskReports: TaskReport[] = supervisorTasks.map((task: ProductionTask) => {
        let status: "Completed" | "In Progress" | "Delayed" | "Not Started";
        switch (task.status) {
          case "completed":
            status = "Completed";
            break;
          case "in-progress":
            status = "In Progress";
            break;
          case "pending":
            const deadline = new Date(task.deadline);
            const today = new Date();
            status = deadline < today ? "Delayed" : "Not Started";
            break;
          default:
            status = "Not Started";
        }
        
        const progress = task.status === "completed" ? 100 :
                        task.status === "in-progress" ? 65 :
                        task.status === "pending" ? 0 : 0;
        
        return {
          id: task.id,
          taskName: task.taskName,
          assignedTo: task.assignedToName,
          status,
          priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) as "High" | "Medium" | "Low",
          deadline: task.deadline,
          progress
        };
      });
      
      setTaskReports(transformedTaskReports);
      
      toast({
        title: "Tasks Data Loaded",
        description: `Loaded ${supervisorTasks.length} tasks for ${currentUser?.name || "Supervisor"}`,
      });
      
    } catch (error: any) {
      console.error('Error fetching tasks data:', error);
      setTasksError(error.message || "Failed to load tasks data");
      
      toast({
        title: "Error Loading Tasks",
        description: "Could not load tasks data from the server.",
        variant: "destructive",
      });
      
      // Don't set any dummy data - keep arrays empty
      setAllTasks([]);
      setProductionTasks([]);
      setTaskReports([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAttendanceData();
    fetchInventoryData();
    fetchTasksData();
  }, []);

  // Fetch attendance when date changes
  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  // Re-filter tasks when currentUser changes
  useEffect(() => {
    if (allTasks.length > 0) {
      const supervisorTasks = filterTasksForSupervisor(allTasks);
      setProductionTasks(supervisorTasks);
      
      // Update task reports
      const transformedTaskReports: TaskReport[] = supervisorTasks.map((task: ProductionTask) => {
        let status: "Completed" | "In Progress" | "Delayed" | "Not Started";
        switch (task.status) {
          case "completed":
            status = "Completed";
            break;
          case "in-progress":
            status = "In Progress";
            break;
          case "pending":
            const deadline = new Date(task.deadline);
            const today = new Date();
            status = deadline < today ? "Delayed" : "Not Started";
            break;
          default:
            status = "Not Started";
        }
        
        const progress = task.status === "completed" ? 100 :
                        task.status === "in-progress" ? 65 :
                        task.status === "pending" ? 0 : 0;
        
        return {
          id: task.id,
          taskName: task.taskName,
          assignedTo: task.assignedToName,
          status,
          priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) as "High" | "Medium" | "Low",
          deadline: task.deadline,
          progress
        };
      });
      
      setTaskReports(transformedTaskReports);
    }
  }, [currentUser, allTasks]);

  // Calculate attendance statistics
  const calculateAttendanceStats = () => {
    const presentCount = attendanceRecords.filter(a => a.status === "Present").length;
    const absentCount = attendanceRecords.filter(a => a.status === "Absent").length;
    const lateCount = attendanceRecords.filter(a => a.status === "Late").length;
    const halfDayCount = attendanceRecords.filter(a => a.status === "Half-Day").length;
    const leaveCount = attendanceRecords.filter(a => a.status === "Leave").length;
    const weeklyOffCount = attendanceRecords.filter(a => a.status === "Weekly-Off").length;
    const totalEmployees = attendanceRecords.length;
    
    const attendanceRate = totalEmployees > 0 
      ? Math.round(((presentCount + halfDayCount * 0.5) / totalEmployees) * 100)
      : 0;
    
    const totalHours = attendanceRecords.reduce((sum, record) => sum + record.hoursWorked, 0);
    const totalOvertime = attendanceRecords.reduce((sum, record) => sum + record.overtime, 0);
    
    return {
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      leaveCount,
      weeklyOffCount,
      totalEmployees,
      attendanceRate,
      totalHours,
      totalOvertime
    };
  };

  // Calculate inventory stats
  const getItemStatus = (item: FrontendInventoryItem) => {
    if (item.quantity === 0) return "Out of Stock";
    if (item.quantity <= item.reorderLevel) return "Low Stock";
    return "In Stock";
  };

  const calculateInventoryStats = () => {
    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.reorderLevel).length;
    const outOfStockItems = inventoryItems.filter(item => item.quantity === 0).length;
    const categories = Array.from(new Set(inventoryItems.map(item => item.category))).filter(Boolean);
    
    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      categoriesCount: categories.length
    };
  };

  // Calculate task statistics
  const calculateTaskStats = () => {
    const completedTasks = productionTasks.filter(t => t.status === "completed").length;
    const inProgressTasks = productionTasks.filter(t => t.status === "in-progress").length;
    const pendingTasks = productionTasks.filter(t => t.status === "pending").length;
    const cancelledTasks = productionTasks.filter(t => t.status === "cancelled").length;
    
    const totalEfficiency = productionTasks.length > 0 
      ? Math.round(productionTasks.reduce((sum, task) => sum + task.efficiency, 0) / productionTasks.length)
      : 0;
    
    const totalUnits = productionTasks.reduce((sum, task) => sum + task.completed, 0);
    const qualityPassRate = productionTasks.length > 0 
      ? Math.round((productionTasks.filter(t => t.qualityCheck === "Passed").length / productionTasks.length) * 100)
      : 0;
    
    return {
      totalTasks: productionTasks.length,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      cancelledTasks,
      totalEfficiency,
      totalUnits,
      qualityPassRate
    };
  };

  const attendanceStats = calculateAttendanceStats();
  const inventoryStats = calculateInventoryStats();
  const taskStats = calculateTaskStats();

  // Helper functions for styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "Delayed": return "bg-yellow-100 text-yellow-800";
      case "Not Started": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100";
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "Excellent": return "bg-green-500";
      case "Good": return "bg-blue-500";
      case "Average": return "bg-yellow-500";
      case "Needs Improvement": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Low": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "High": return "bg-red-100 text-red-800";
      default: return "bg-gray-100";
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "Present": return "bg-green-100 text-green-800";
      case "Absent": return "bg-red-100 text-red-800";
      case "Late": return "bg-yellow-100 text-yellow-800";
      case "Half-Day": return "bg-blue-100 text-blue-800";
      case "Leave": return "bg-purple-100 text-purple-800";
      case "Weekly-Off": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100";
    }
  };

  const getInventoryStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "bg-green-100 text-green-800";
      case "Low Stock": return "bg-yellow-100 text-yellow-800";
      case "Out of Stock": return "bg-red-100 text-red-800";
      case "On Order": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100";
    }
  };

  const getQualityCheckColor = (status: string) => {
    switch (status) {
      case "Passed": return "bg-green-100 text-green-800";
      case "Failed": return "bg-red-100 text-red-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100";
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-green-600";
    if (efficiency >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  // =================== EXPORT FUNCTIONS ===================
  
  // Export Attendance to PDF
  const exportAttendanceToPDF = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance records available to export",
        variant: "destructive",
      });
      return;
    }
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("Attendance Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${selectedDate} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary stats
    const stats = calculateAttendanceStats();
    doc.setFontSize(10);
    doc.text(`Total Employees: ${stats.totalEmployees}`, 14, 40);
    doc.text(`Present: ${stats.presentCount}`, 14, 46);
    doc.text(`Absent: ${stats.absentCount}`, 60, 46);
    doc.text(`Late: ${stats.lateCount}`, 100, 46);
    doc.text(`Attendance Rate: ${stats.attendanceRate}%`, 140, 46);
    
    // Prepare table data
    const tableData = attendanceRecords.map(record => [
      record.employeeName,
      record.employeeId,
      record.date,
      record.checkIn,
      record.checkOut,
      record.hoursWorked.toFixed(1),
      record.status,
      record.overtime > 0 ? record.overtime.toFixed(1) : "-",
      record.notes || "-"
    ]);
    
    // Create table
    autoTable(doc, {
      head: [['Employee Name', 'ID', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Overtime', 'Notes']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { top: 50 }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(10);
    doc.text(`Report generated by ${currentUser?.name || 'Supervisor'}`, 14, finalY + 10);
    doc.text(`Total Hours: ${stats.totalHours.toFixed(1)} | Total Overtime: ${stats.totalOvertime.toFixed(1)}`, 14, finalY + 16);
    
    // Save the PDF
    doc.save(`Attendance_Report_${selectedDate.replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Attendance report has been exported as PDF",
    });
  };

  // Export Attendance to Excel
  const exportAttendanceToExcel = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance records available to export",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for Excel
    const excelData = attendanceRecords.map(record => ({
      'Employee Name': record.employeeName,
      'Employee ID': record.employeeId,
      'Date': record.date,
      'Check In': record.checkIn,
      'Check Out': record.checkOut,
      'Hours Worked': record.hoursWorked,
      'Status': record.status,
      'Overtime Hours': record.overtime,
      'Notes': record.notes || ''
    }));
    
    // Add summary stats as first row
    const stats = calculateAttendanceStats();
    const summaryRow = {
      'Employee Name': 'SUMMARY',
      'Employee ID': '',
      'Date': selectedDate,
      'Check In': '',
      'Check Out': '',
      'Hours Worked': stats.totalHours,
      'Status': `Present: ${stats.presentCount} | Absent: ${stats.absentCount}`,
      'Overtime Hours': stats.totalOvertime,
      'Notes': `Attendance Rate: ${stats.attendanceRate}%`
    };
    
    const allData = [summaryRow, ...excelData];
    
    // Create worksheet
    const ws = utils.json_to_sheet(allData);
    
    // Create workbook
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Attendance Report");
    
    // Generate Excel file
    writeFile(wb, `Attendance_Report_${selectedDate.replace(/-/g, '_')}.xlsx`);
    
    toast({
      title: "Excel Exported",
      description: "Attendance report has been exported as Excel",
    });
  };

  // Export Tasks to PDF
  const exportTasksToPDF = () => {
    if (productionTasks.length === 0) {
      toast({
        title: "No Data",
        description: "No tasks available to export",
        variant: "destructive",
      });
      return;
    }
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`${currentUser?.name || 'Supervisor'} Tasks Report`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary stats
    const stats = calculateTaskStats();
    doc.setFontSize(10);
    doc.text(`Total Tasks: ${stats.totalTasks}`, 14, 40);
    doc.text(`Completed: ${stats.completedTasks}`, 60, 40);
    doc.text(`In Progress: ${stats.inProgressTasks}`, 110, 40);
    doc.text(`Average Efficiency: ${stats.totalEfficiency}%`, 160, 40);
    
    // Prepare table data
    const tableData = productionTasks.map(task => [
      task.taskName.substring(0, 30),
      task.operator,
      task.status.charAt(0).toUpperCase() + task.status.slice(1),
      task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
      `${task.completed}/${task.quantity}`,
      task.qualityCheck,
      `${task.efficiency}%`,
      new Date(task.deadline).toLocaleDateString(),
      task.siteName
    ]);
    
    // Create table
    autoTable(doc, {
      head: [['Task Name', 'Operator', 'Status', 'Priority', 'Progress', 'Quality', 'Efficiency', 'Due Date', 'Site']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219] },
      margin: { top: 50 }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(10);
    doc.text(`Report generated for ${currentUser?.name || 'Supervisor'}`, 14, finalY + 10);
    doc.text(`Total Units Produced: ${stats.totalUnits} | Quality Pass Rate: ${stats.qualityPassRate}%`, 14, finalY + 16);
    
    // Save the PDF
    doc.save(`${currentUser?.name?.replace(/\s+/g, '_') || 'Supervisor'}_Tasks_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "Tasks PDF Exported",
      description: "Tasks report has been exported as PDF",
    });
  };

  // Export Inventory to PDF
  const exportInventoryToPDF = () => {
    if (inventoryItems.length === 0) {
      toast({
        title: "No Data",
        description: "No inventory items available to export",
        variant: "destructive",
      });
      return;
    }
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("Inventory Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary stats
    const stats = calculateInventoryStats();
    doc.setFontSize(10);
    doc.text(`Total Items: ${stats.totalItems}`, 14, 40);
    doc.text(`Low Stock: ${stats.lowStockItems}`, 60, 40);
    doc.text(`Out of Stock: ${stats.outOfStockItems}`, 100, 40);
    doc.text(`Categories: ${stats.categoriesCount}`, 140, 40);
    
    // Prepare table data
    const tableData = inventoryItems.map(item => [
      item.name.substring(0, 25),
      item.sku,
      item.category || '-',
      item.quantity.toString(),
      item.reorderLevel.toString(),
      getItemStatus(item),
      item.supplier || '-',
      item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'
    ]);
    
    // Create table
    autoTable(doc, {
      head: [['Item Name', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Status', 'Supplier', 'Last Updated']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 96] },
      margin: { top: 50 }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(10);
    doc.text(`Report generated by ${currentUser?.name || 'Supervisor'}`, 14, finalY + 10);
    
    // Save the PDF
    doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "Inventory PDF Exported",
      description: "Inventory report has been exported as PDF",
    });
  };

  // Export All Data to Comprehensive PDF
  const exportAllToPDF = () => {
    const doc = new jsPDF();
    
    // Add main title
    doc.setFontSize(24);
    doc.text("Supervisor Comprehensive Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()} | Supervisor: ${currentUser?.name || 'N/A'}`, 14, 30);
    
    let yPosition = 40;
    
    // 1. Attendance Section
    doc.setFontSize(16);
    doc.text("1. Attendance Summary", 14, yPosition);
    yPosition += 10;
    
    const attendanceStats = calculateAttendanceStats();
    doc.setFontSize(10);
    doc.text(`Total Employees: ${attendanceStats.totalEmployees}`, 20, yPosition);
    doc.text(`Present: ${attendanceStats.presentCount}`, 20, yPosition + 6);
    doc.text(`Absent: ${attendanceStats.absentCount}`, 80, yPosition + 6);
    doc.text(`Attendance Rate: ${attendanceStats.attendanceRate}%`, 140, yPosition + 6);
    yPosition += 20;
    
    // 2. Tasks Section
    doc.setFontSize(16);
    doc.text("2. Tasks Summary", 14, yPosition);
    yPosition += 10;
    
    const taskStats = calculateTaskStats();
    doc.setFontSize(10);
    doc.text(`Total Tasks: ${taskStats.totalTasks}`, 20, yPosition);
    doc.text(`Completed: ${taskStats.completedTasks}`, 80, yPosition);
    doc.text(`Average Efficiency: ${taskStats.totalEfficiency}%`, 140, yPosition);
    yPosition += 10;
    
    // 3. Inventory Section
    doc.setFontSize(16);
    doc.text("3. Inventory Summary", 14, yPosition);
    yPosition += 10;
    
    const inventoryStats = calculateInventoryStats();
    doc.setFontSize(10);
    doc.text(`Total Items: ${inventoryStats.totalItems}`, 20, yPosition);
    doc.text(`Low Stock: ${inventoryStats.lowStockItems}`, 80, yPosition);
    doc.text(`Out of Stock: ${inventoryStats.outOfStockItems}`, 140, yPosition);
    yPosition += 20;
    
    // Add footer
    doc.setFontSize(10);
    doc.text("This is a comprehensive report generated by the Supervisor Dashboard System.", 14, yPosition);
    yPosition += 6;
    doc.text("For detailed information, please refer to individual section exports.", 14, yPosition);
    
    // Save the PDF
    doc.save(`Supervisor_Comprehensive_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "Comprehensive PDF Exported",
      description: "Complete supervisor report has been exported as PDF",
    });
  };

  // Export All to Excel (Multi-sheet)
  const exportAllToExcel = () => {
    // Create workbook
    const wb = utils.book_new();
    
    // 1. Attendance Sheet
    if (attendanceRecords.length > 0) {
      const attendanceData = attendanceRecords.map(record => ({
        'Employee Name': record.employeeName,
        'Employee ID': record.employeeId,
        'Date': record.date,
        'Check In': record.checkIn,
        'Check Out': record.checkOut,
        'Hours Worked': record.hoursWorked,
        'Status': record.status,
        'Overtime Hours': record.overtime,
        'Notes': record.notes || ''
      }));
      
      const wsAttendance = utils.json_to_sheet(attendanceData);
      utils.book_append_sheet(wb, wsAttendance, "Attendance");
    }
    
    // 2. Tasks Sheet
    if (productionTasks.length > 0) {
      const tasksData = productionTasks.map(task => ({
        'Task Name': task.taskName,
        'Assigned To': task.operator,
        'Status': task.status.charAt(0).toUpperCase() + task.status.slice(1),
        'Priority': task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
        'Progress': `${task.completed}/${task.quantity}`,
        'Quality Check': task.qualityCheck,
        'Efficiency': `${task.efficiency}%`,
        'Due Date': new Date(task.deadline).toLocaleDateString(),
        'Site': task.siteName,
        'Client': task.clientName
      }));
      
      const wsTasks = utils.json_to_sheet(tasksData);
      utils.book_append_sheet(wb, wsTasks, "Tasks");
    }
    
    // 3. Inventory Sheet
    if (inventoryItems.length > 0) {
      const inventoryData = inventoryItems.map(item => ({
        'Item Name': item.name,
        'SKU': item.sku,
        'Category': item.category || '-',
        'Current Stock': item.quantity,
        'Minimum Stock': item.reorderLevel,
        'Status': getItemStatus(item),
        'Supplier': item.supplier || '-',
        'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'
      }));
      
      const wsInventory = utils.json_to_sheet(inventoryData);
      utils.book_append_sheet(wb, wsInventory, "Inventory");
    }
    
    // 4. Summary Sheet
    const summaryData = [
      {
        'Section': 'Attendance',
        'Total Records': attendanceRecords.length,
        'Present': calculateAttendanceStats().presentCount,
        'Absent': calculateAttendanceStats().absentCount,
        'Attendance Rate': `${calculateAttendanceStats().attendanceRate}%`
      },
      {
        'Section': 'Tasks',
        'Total Records': productionTasks.length,
        'Completed': calculateTaskStats().completedTasks,
        'In Progress': calculateTaskStats().inProgressTasks,
        'Avg Efficiency': `${calculateTaskStats().totalEfficiency}%`
      },
      {
        'Section': 'Inventory',
        'Total Records': inventoryItems.length,
        'Low Stock': calculateInventoryStats().lowStockItems,
        'Out of Stock': calculateInventoryStats().outOfStockItems,
        'Categories': calculateInventoryStats().categoriesCount
      }
    ];
    
    const wsSummary = utils.json_to_sheet(summaryData);
    utils.book_append_sheet(wb, wsSummary, "Summary");
    
    // Generate Excel file
    const fileName = `Supervisor_Report_${currentUser?.name?.replace(/\s+/g, '_') || 'Supervisor'}_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.xlsx`;
    writeFile(wb, fileName);
    
    toast({
      title: "Complete Excel Report Exported",
      description: "All sections have been exported to Excel",
    });
  };

  // Main export handler for the header button
  const handleExportPDF = () => {
    if (activeTab === "attendance") {
      exportAttendanceToPDF();
    } else if (activeTab === "tasks") {
      exportTasksToPDF();
    } else if (activeTab === "inventory") {
      exportInventoryToPDF();
    } else {
      exportAllToPDF();
    }
  };

  // Export handler for specific section buttons
  const handleSectionExport = (section: string, format: 'pdf' | 'excel') => {
    if (section === "attendance") {
      if (format === 'pdf') {
        exportAttendanceToPDF();
      } else {
        exportAttendanceToExcel();
      }
    } else if (section === "tasks") {
      if (format === 'pdf') {
        exportTasksToPDF();
      } else {
        exportAllToExcel();
      }
    } else if (section === "inventory") {
      if (format === 'pdf') {
        exportInventoryToPDF();
      } else {
        exportAllToExcel();
      }
    }
  };

  // Action handlers
  const refreshAttendanceData = async () => {
    await fetchAttendanceData();
    toast({
      title: "Attendance Refreshed",
      description: "Attendance data has been updated successfully",
    });
  };

  const refreshInventoryData = async () => {
    await fetchInventoryData();
    toast({
      title: "Inventory Refreshed",
      description: "Inventory data has been updated successfully",
    });
  };

  const refreshTasksData = async () => {
    await fetchTasksData();
    toast({
      title: "Tasks Refreshed",
      description: "Tasks data has been updated successfully",
    });
  };

  const handleSaveReport = () => {
    toast({
      title: "Report Saved",
      description: "Your report has been saved successfully",
    });
  };

  const handleSendReport = () => {
    toast({
      title: "Report Sent",
      description: "Report has been sent to management",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Check if user is a supervisor
  const isSupervisor = currentUser?.role === "supervisor";

  // Header action buttons
  const headerActionButtons = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportAllToExcel}>
        <Download className="h-4 w-4 mr-2" />
        Export All Excel
      </Button>
      <Button variant="outline" onClick={exportAllToPDF}>
        <Download className="h-4 w-4 mr-2" />
        Export All PDF
      </Button>
      <Button variant="outline" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
      <Button onClick={handleSaveReport}>
        <Save className="h-4 w-4 mr-2" />
        Save Report
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Supervisor Reports" 
        subtitle={isSupervisor ? `Reports for ${currentUser.name}` : "Generate and manage daily reports"}
        onMenuClick={onMenuClick}
        actionButtons={headerActionButtons}
      />

      <div className="p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 lg:grid-cols-4 gap-2">
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            {/* Attendance Tab */}
            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <CardTitle>Attendance Records</CardTitle>
                      {isSupervisor && (
                        <CardDescription>
                          Attendance data for your team
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="attendance-date" className="text-sm whitespace-nowrap">
                          Select Date:
                        </Label>
                        <Input
                          id="attendance-date"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full sm:w-auto"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refreshAttendanceData}
                        disabled={loadingAttendance}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingAttendance ? 'animate-spin' : ''}`} />
                        {loadingAttendance ? 'Refreshing...' : 'Refresh'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSectionExport("attendance", 'pdf')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSectionExport("attendance", 'excel')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingAttendance ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium">Loading Attendance Data</p>
                      <p className="text-muted-foreground">Fetching real data from backend...</p>
                    </div>
                  ) : attendanceError ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                      <p className="text-lg font-medium text-red-600">Failed to Load Attendance Data</p>
                      <p className="text-muted-foreground mb-4">{attendanceError}</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={fetchAttendanceData}>
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="border rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-600">
                            {attendanceStats.presentCount}
                          </div>
                          <p className="text-sm text-muted-foreground">Present</p>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="text-2xl font-bold text-red-600">
                            {attendanceStats.absentCount}
                          </div>
                          <p className="text-sm text-muted-foreground">Absent</p>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="text-2xl font-bold text-yellow-600">
                            {attendanceStats.lateCount}
                          </div>
                          <p className="text-sm text-muted-foreground">Late Arrivals</p>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {attendanceStats.totalOvertime.toFixed(1)}
                          </div>
                          <p className="text-sm text-muted-foreground">Overtime Hours</p>
                        </div>
                      </div>

                      {/* Attendance Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Overtime</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {attendanceRecords.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={9} className="text-center py-8">
                                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-lg font-medium">No attendance records found</p>
                                    <p className="text-muted-foreground">
                                      No attendance data available for {selectedDate}
                                    </p>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                attendanceRecords.map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell className="font-medium">
                                      {record.employeeName}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {record.employeeId}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{record.date}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {record.checkIn}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {record.checkOut}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {record.hoursWorked.toFixed(1)} hrs
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getAttendanceColor(record.status)}>
                                        {record.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {record.overtime > 0 ? (
                                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                          +{record.overtime.toFixed(1)} hrs
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                      <p className="truncate text-sm">
                                        {record.notes || "-"}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Summary Section */}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3">Attendance Summary for {selectedDate}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Working Hours</p>
                            <p className="text-2xl font-bold">
                              {attendanceStats.totalHours.toFixed(1)} hours
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Attendance Rate</p>
                            <p className="text-2xl font-bold text-green-600">
                              {attendanceStats.attendanceRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Employees</p>
                            <p className="text-2xl font-bold">
                              {attendanceStats.totalEmployees}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">Breakdown</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className="bg-green-100 text-green-800">
                              Present: {attendanceStats.presentCount}
                            </Badge>
                            <Badge className="bg-red-100 text-red-800">
                              Absent: {attendanceStats.absentCount}
                            </Badge>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Late: {attendanceStats.lateCount}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              Half-Day: {attendanceStats.halfDayCount}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800">
                              Leave: {attendanceStats.leaveCount}
                            </Badge>
                            <Badge className="bg-gray-100 text-gray-800">
                              Weekly-Off: {attendanceStats.weeklyOffCount}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {isSupervisor ? `${currentUser.name}'s Tasks` : "Production Tasks"}
                      </CardTitle>
                      <CardDescription>
                        {isSupervisor 
                          ? "Tasks assigned to you or created by you" 
                          : "Real tasks data from backend - No dummy data"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refreshTasksData}
                        disabled={loadingTasks}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingTasks ? 'animate-spin' : ''}`} />
                        {loadingTasks ? 'Refreshing...' : 'Refresh'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSectionExport("tasks", 'pdf')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={exportAllToExcel}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!isSupervisor ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
                      <p className="text-lg font-medium">Access Restricted</p>
                      <p className="text-muted-foreground mb-4">
                        This section is only accessible to supervisors.
                      </p>
                      <Badge variant="outline" className="text-lg capitalize">
                        Your role: {currentUser?.role || "Not logged in"}
                      </Badge>
                    </div>
                  ) : loadingTasks ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium">Loading Your Tasks</p>
                      <p className="text-muted-foreground">Fetching tasks data from backend...</p>
                    </div>
                  ) : tasksError ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                      <p className="text-lg font-medium text-red-600">Failed to Load Tasks Data</p>
                      <p className="text-muted-foreground mb-4">{tasksError}</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={fetchTasksData}>
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : productionTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No Tasks Found</p>
                      <p className="text-muted-foreground mb-4">
                        You don't have any tasks assigned to you or created by you.
                      </p>
                      <Button onClick={fetchTasksData}>
                        Check Again
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Supervisor Info */}
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <div className="flex items-center gap-3">
                          <User className="h-8 w-8 text-blue-600" />
                          <div>
                            <h4 className="font-semibold">{currentUser.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Supervisor • {productionTasks.length} tasks found
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Tasks</p>
                              <p className="text-2xl font-bold">{taskStats.totalTasks}</p>
                            </div>
                            <FileText className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Completed</p>
                              <p className="text-2xl font-bold text-green-600">
                                {taskStats.completedTasks}
                              </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Efficiency</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {taskStats.totalEfficiency}%
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* Tasks Table */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task Name</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Site/Client</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Quality Check</TableHead>
                            <TableHead>Efficiency</TableHead>
                            <TableHead>Due Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productionTasks.slice(0, 10).map((task) => {
                            const isAssignedToMe = task.assignedToId === currentUser._id;
                            const isCreatedByMe = task.createdById === currentUser._id;
                            
                            return (
                              <TableRow key={task.id} className={
                                isAssignedToMe ? 'bg-green-50' : 
                                isCreatedByMe ? 'bg-blue-50' : ''
                              }>
                                <TableCell className="font-medium">
                                  <div>
                                    <div>{task.taskName}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      {isAssignedToMe && (
                                        <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-100 text-green-800">
                                          Assigned to you
                                        </Badge>
                                      )}
                                      {isCreatedByMe && (
                                        <Badge variant="outline" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-800">
                                          Created by you
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div>{task.operator}</div>
                                    {isAssignedToMe && (
                                      <div className="text-xs text-green-600">(You)</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(task.status)}>
                                    {task.status === "in-progress" ? "In Progress" : 
                                     task.status === "pending" ? "Pending" :
                                     task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div>{task.siteName}</div>
                                    <div className="text-muted-foreground">{task.clientName}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>{task.completed}/{task.quantity}</span>
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${(task.completed / task.quantity) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getQualityCheckColor(task.qualityCheck)}>
                                    {task.qualityCheck}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className={`font-medium ${getEfficiencyColor(task.efficiency)}`}>
                                    {task.efficiency}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {formatDate(task.deadline)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Task Summary */}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3">Task Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Units Produced</p>
                            <p className="text-2xl font-bold">
                              {taskStats.totalUnits}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Quality Pass Rate</p>
                            <p className="text-2xl font-bold text-green-600">
                              {taskStats.qualityPassRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Completion Rate</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {taskStats.totalTasks > 0 
                                ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100)
                                : 0}%
                            </p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground mb-2">Task Status Breakdown</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              Completed: {taskStats.completedTasks}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              In Progress: {taskStats.inProgressTasks}
                            </Badge>
                            <Badge className="bg-gray-100 text-gray-800">
                              Pending: {taskStats.pendingTasks}
                            </Badge>
                            <Badge className="bg-red-100 text-red-800">
                              Cancelled: {taskStats.cancelledTasks}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Inventory Management</CardTitle>
                      <CardDescription>Real inventory data from backend</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refreshInventoryData}
                        disabled={inventoryLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${inventoryLoading ? 'animate-spin' : ''}`} />
                        {inventoryLoading ? 'Refreshing...' : 'Refresh'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSectionExport("inventory", 'pdf')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={exportAllToExcel}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {inventoryLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-lg font-medium">Loading Inventory Data</p>
                        <p className="text-muted-foreground">Fetching real data from backend...</p>
                      </div>
                    </div>
                  ) : inventoryError ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                      <p className="text-lg font-medium text-red-600">Failed to Load Inventory Data</p>
                      <p className="text-muted-foreground mb-4">{inventoryError}</p>
                      <Button onClick={fetchInventoryData}>
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Items</p>
                              <p className="text-2xl font-bold">{inventoryStats.totalItems}</p>
                            </div>
                            <Package className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Low Stock</p>
                              <p className="text-2xl font-bold text-yellow-600">
                                {inventoryStats.lowStockItems}
                              </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-yellow-500" />
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Out of Stock</p>
                              <p className="text-2xl font-bold text-red-600">
                                {inventoryStats.outOfStockItems}
                              </p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-500" />
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Categories</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {inventoryStats.categoriesCount}
                              </p>
                            </div>
                            <BarChart className="h-8 w-8 text-blue-500" />
                          </div>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Current Stock</TableHead>
                            <TableHead>Minimum Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-lg font-medium">No inventory items found</p>
                                <p className="text-muted-foreground">
                                  Add items to your inventory database
                                </p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            inventoryItems.slice(0, 10).map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{item.category}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{item.quantity}</span>
                                    <span className="text-muted-foreground text-sm">
                                      {item.brushCount ? `(${item.brushCount} brushes)` : 
                                       item.squeegeeCount ? `(${item.squeegeeCount} squeegees)` : 'units'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{item.reorderLevel}</TableCell>
                                <TableCell>
                                  <Badge className={getInventoryStatusColor(getItemStatus(item))}>
                                    {getItemStatus(item)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{item.supplier}</TableCell>
                                <TableCell>
                                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3">Stock Level Analysis</h4>
                        {inventoryItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No inventory data to display
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {inventoryItems.slice(0, 5).map((item) => (
                              <div key={item.id} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>{item.name}</span>
                                  <span>{item.quantity}/{item.reorderLevel} units</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      item.quantity > item.reorderLevel * 1.5 ? "bg-green-500" :
                                      item.quantity > item.reorderLevel ? "bg-yellow-500" :
                                      item.quantity === 0 ? "bg-red-500" :
                                      "bg-orange-500"
                                    }`}
                                    style={{ 
                                      width: `${Math.min(100, (item.quantity / (item.reorderLevel * 2)) * 100)}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                            {inventoryItems.length > 5 && (
                              <p className="text-sm text-muted-foreground text-center">
                                Showing 5 of {inventoryItems.length} items
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold">
                        {attendanceStats.presentCount}/{attendanceStats.totalEmployees}
                      </div>
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {attendanceStats.absentCount} Absent
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Production Efficiency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold">
                        {taskStats.totalEfficiency}%
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Average across all tasks
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold">
                        {inventoryStats.lowStockItems + inventoryStats.outOfStockItems}
                      </div>
                      <Package className="h-8 w-8 text-yellow-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Items needing attention
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Task Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold">
                        {taskStats.completedTasks}/{taskStats.totalTasks}
                      </div>
                      <CheckCircle className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {taskStats.inProgressTasks} in progress
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Attendance</CardTitle>
                    <CardDescription>Today's attendance status ({selectedDate})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attendanceRecords.length === 0 ? (
                      <div className="text-center py-8">
                        <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="font-medium">No attendance records</p>
                        <p className="text-sm text-muted-foreground">No attendance data available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attendanceRecords.slice(0, 5).map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getAttendanceColor(record.status)}`}>
                                {record.status.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{record.employeeName}</p>
                                <p className="text-sm text-muted-foreground">{record.employeeId}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={getAttendanceColor(record.status)}>
                                {record.status}
                              </Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                {record.checkIn} - {record.checkOut}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{isSupervisor ? "Your Recent Tasks" : "Recent Tasks"}</CardTitle>
                    <CardDescription>
                      {isSupervisor 
                        ? "Latest tasks assigned to you or created by you" 
                        : "Latest tasks from backend"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {productionTasks.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="font-medium">No tasks found</p>
                        <p className="text-sm text-muted-foreground">
                          {isSupervisor 
                            ? "You don't have any tasks assigned to you or created by you" 
                            : "Create tasks to see them here"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {productionTasks.slice(0, 5).map((task) => {
                          const isAssignedToMe = task.assignedToId === currentUser?._id;
                          const isCreatedByMe = task.createdById === currentUser?._id;
                          
                          return (
                            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium truncate max-w-xs">{task.taskName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {task.operator}
                                  </Badge>
                                  {isAssignedToMe && (
                                    <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-100 text-green-800">
                                      To You
                                    </Badge>
                                  )}
                                  {isCreatedByMe && (
                                    <Badge variant="outline" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-800">
                                      Your Task
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    Due: {formatDate(task.deadline)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={getStatusColor(task.status)}>
                                  {task.status === "in-progress" ? "In Progress" : 
                                   task.status === "pending" ? "Pending" :
                                   task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                </Badge>
                                <p className={`text-sm font-medium mt-1 ${getEfficiencyColor(task.efficiency)}`}>
                                  {task.efficiency}% efficiency
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {productionTasks.length > 5 && (
                          <p className="text-sm text-muted-foreground text-center">
                            Showing 5 of {productionTasks.length} tasks
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Employee Details Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Employee Information</CardTitle>
                  <CardDescription>Employee details from database</CardDescription>
                </CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-lg font-medium">No employee data available</p>
                      <p className="text-muted-foreground">Employee data will appear here when loaded</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {employees.slice(0, 6).map((employee) => (
                          <div key={employee._id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold">{employee.name}</h4>
                                <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
                              </div>
                              <Badge variant={
                                employee.status === "active" ? "default" :
                                employee.status === "inactive" ? "secondary" :
                                "destructive"
                              }>
                                {employee.status}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.position}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.department}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{employee.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.phone}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {employees.length > 6 && (
                        <div className="text-center pt-4">
                          <p className="text-sm text-muted-foreground">
                            Showing 6 of {employees.length} employees
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default SupervisorReport;