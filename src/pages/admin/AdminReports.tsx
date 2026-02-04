import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Loader2, 
  Users,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  Paperclip,
  User,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Briefcase,
  DollarSign,
  FilePieChart,
  CheckSquare,
  Download as DownloadIcon,
  Receipt,
  Filter,
  Search,
  Clock4,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  FileSpreadsheet,
  FileDown,
  File
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import taskService, { type Task } from "@/services/TaskService";
import * as XLSX from 'xlsx';

const API_URL = process.env.NODE_ENV === 'development' 
  ? `http://localhost:5001/api` 
  : '/api';

// Interfaces
interface LeaveData {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  contactNumber?: string;
  reason?: string;
  appliedBy?: string;
  appliedFor?: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave' | 'weekend' | 'holiday';
  overtime: number;
  notes?: string;
  site?: string;
  shift?: string;
  lateByMinutes?: number;
  earlyDeparture?: boolean;
  createdBy?: string;
}

interface AttendanceReportSummary {
  id: number;
  employee: string;
  employeeId: string;
  department: string;
  present: number;
  absent: number;
  leaves: number;
  totalDays: number;
  percentage: string;
  lateArrivals: number;
  earlyDepartures: number;
  averageHours: string;
  overtimeHours: number;
}

interface TaskReportData {
  id: string;
  title: string;
  description: string;
  assignedToName: string;
  siteName: string;
  clientName: string;
  priority: string;
  status: string;
  deadline: string;
  dueDateTime: string;
  taskType: string;
  hourlyUpdatesCount: number;
  attachmentsCount: number;
  createdAt: string;
}

interface ExpenseData {
  _id: string;
  expenseId: string;
  category: string;
  description: string;
  amount: number;
  baseAmount: number;
  gst: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  vendor: string;
  paymentMethod: string;
  site: string;
  siteId?: string;
  expenseType: "operational" | "office" | "other";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FinancialData {
  category: string;
  value: number;
}

interface TaskCompletionData {
  name: string;
  value: number;
  color: string;
}

interface EmployeeData {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  status: string;
}

// Attendance Status Colors
const getAttendanceStatusColor = (status: string) => {
  switch (status) {
    case 'present': return 'bg-green-100 text-green-800';
    case 'absent': return 'bg-red-100 text-red-800';
    case 'late': return 'bg-yellow-100 text-yellow-800';
    case 'half-day': return 'bg-blue-100 text-blue-800';
    case 'leave': return 'bg-purple-100 text-purple-800';
    case 'weekend': return 'bg-gray-100 text-gray-800';
    case 'holiday': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Expense categories
const expenseCategories = [
  "Cleaning Supplies",
  "Security Equipment",
  "Office Supplies",
  "Utilities",
  "Maintenance",
  "Transportation",
  "Staff Welfare",
  "Training",
  "Marketing",
  "Legal Fees",
  "Insurance",
  "Software",
  "Hardware",
  "Travel",
  "Food & Beverages",
  "Miscellaneous"
];

const getExpenseStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getExpenseTypeColor = (type: string) => {
  switch (type) {
    case "operational":
      return "bg-blue-100 text-blue-800";
    case "office":
      return "bg-green-100 text-green-800";
    case "other":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to calculate working days between dates
const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Count only weekdays (Monday to Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

const Reports = () => {
  // State for attendance reports
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [leaveData, setLeaveData] = useState<LeaveData[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportSummary[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  
  // State for task reports
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilterStatus, setTaskFilterStatus] = useState("all");
  const [taskFilterPriority, setTaskFilterPriority] = useState("all");
  const [taskFilterSite, setTaskFilterSite] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  
  // State for expense reports
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseData[]>([]);
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [expenseFilterType, setExpenseFilterType] = useState<"all" | "operational" | "office" | "other">("all");
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [expenseLoading, setExpenseLoading] = useState(false);
  
  // Common state
  const [departments, setDepartments] = useState<string[]>(["All Departments"]);
  const [sites, setSites] = useState<string[]>(["All Sites"]);

  // Fetch all employees from database
  const fetchAllEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves/test/employees`);
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      
      if (data.success && data.sampleEmployees) {
        setAllEmployees(data.sampleEmployees);
        const uniqueDepts = Array.from(new Set(data.sampleEmployees.map((emp: EmployeeData) => emp.department)));
        setDepartments(["All Departments", ...uniqueDepts]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees data");
    }
  };

  // Fetch attendance records from API
  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      
      const response = await fetch(`${API_URL}/attendance?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAttendanceRecords(data.data || []);
        // Also fetch leave data for leave calculations
        await fetchLeaveData();
      } else {
        throw new Error(data.message || 'Failed to fetch attendance data');
      }
    } catch (error: any) {
      console.error("Error fetching attendance data:", error);
      toast.error(error.message || "Failed to load attendance data");
      setAttendanceRecords([]);
      
      // Fallback to mock data for demonstration
      setAttendanceRecords(generateMockAttendanceData());
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock attendance data for demonstration
  const generateMockAttendanceData = (): AttendanceRecord[] => {
    const mockData: AttendanceRecord[] = [];
    const employees = [
      { id: "EMP001", name: "John Doe", department: "HR" },
      { id: "EMP002", name: "Jane Smith", department: "IT" },
      { id: "EMP003", name: "Mike Johnson", department: "Operations" },
      { id: "EMP004", name: "Sarah Williams", department: "Sales" },
      { id: "EMP005", name: "Robert Brown", department: "Marketing" },
    ];
    
    const startDate = new Date(dateFrom || '2024-01-01');
    const endDate = new Date(dateTo || '2024-01-31');
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        employees.forEach(emp => {
          // Random attendance status
          const statusOptions: Array<AttendanceRecord['status']> = ['present', 'present', 'present', 'late', 'half-day', 'absent'];
          const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
          
          // Generate check-in/out times based on status
          let checkIn = "09:00";
          let checkOut = "18:00";
          let hoursWorked = 8;
          let overtime = 0;
          let lateByMinutes = 0;
          
          if (status === 'late') {
            checkIn = "09:30";
            lateByMinutes = 30;
            hoursWorked = 7.5;
          } else if (status === 'half-day') {
            checkOut = "13:00";
            hoursWorked = 4;
          } else if (status === 'absent') {
            checkIn = "";
            checkOut = "";
            hoursWorked = 0;
          } else {
            // Random overtime
            if (Math.random() > 0.7) {
              overtime = Math.floor(Math.random() * 3);
              checkOut = "19:00";
              hoursWorked = 9;
            }
          }
          
          mockData.push({
            _id: `${emp.id}-${dateStr}`,
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            date: dateStr,
            checkIn,
            checkOut,
            hoursWorked,
            status,
            overtime,
            lateByMinutes: status === 'late' ? lateByMinutes : undefined,
            site: "Main Office"
          });
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return mockData;
  };

  // Fetch leave data for attendance calculation
  const fetchLeaveData = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves?status=approved`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leave data');
      }
      
      const data = await response.json();
      setLeaveData(data);
    } catch (error) {
      console.error("Error fetching leave data:", error);
      // Continue without leave data
    }
  };

  // Fetch all tasks
  const fetchAllTasks = async () => {
    try {
      setIsLoading(true);
      const tasksData = await taskService.getAllTasks();
      setTasks(tasksData || []);
      
      // Extract unique sites
      const uniqueSites = Array.from(new Set(tasksData
        .filter(task => task.siteName && task.siteName !== "Unspecified Site")
        .map(task => task.siteName)
      ));
      setSites(["All Sites", ...uniqueSites]);
      
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error(error.message || "Failed to load tasks");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all expenses from backend
  const fetchAllExpenses = async () => {
    try {
      setExpenseLoading(true);
      const response = await fetch(`${API_URL}/expenses?limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      
      const data = await response.json();
      if (data.success) {
        setExpenses(data.data || []);
        setFilteredExpenses(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses data");
      setExpenses([]);
      setFilteredExpenses([]);
    } finally {
      setExpenseLoading(false);
    }
  };

  // Generate attendance report summary
  const generateAttendanceReport = useMemo(() => {
    if (attendanceRecords.length === 0 && allEmployees.length === 0) {
      return [];
    }

    const report: AttendanceReportSummary[] = [];
    
    // Calculate date range for total days
    const startDate = dateFrom ? new Date(dateFrom) : new Date();
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const totalWorkingDays = calculateWorkingDays(startDate, endDate);
    
    // Group attendance by employee
    const employeeAttendance = new Map<string, {
      employeeId: string;
      employeeName: string;
      department: string;
      present: number;
      absent: number;
      late: number;
      halfDay: number;
      leave: number;
      totalHours: number;
      overtimeHours: number;
      records: AttendanceRecord[];
    }>();
    
    // Process attendance records
    attendanceRecords.forEach(record => {
      const key = record.employeeId;
      if (!employeeAttendance.has(key)) {
        employeeAttendance.set(key, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          leave: 0,
          totalHours: 0,
          overtimeHours: 0,
          records: []
        });
      }
      
      const stats = employeeAttendance.get(key)!;
      stats.records.push(record);
      
      switch (record.status) {
        case 'present':
          stats.present++;
          break;
        case 'absent':
          stats.absent++;
          break;
        case 'late':
          stats.late++;
          stats.present++; // Late is still present
          break;
        case 'half-day':
          stats.halfDay++;
          stats.present++; // Half-day is still present
          break;
        case 'leave':
          stats.leave++;
          break;
      }
      
      stats.totalHours += record.hoursWorked;
      stats.overtimeHours += record.overtime || 0;
    });
    
    // Calculate leave days from leave data
    const employeeLeaves = new Map<string, number>();
    leaveData.forEach(leave => {
      if (leave.status === 'approved') {
        const key = leave.employeeId;
        employeeLeaves.set(key, (employeeLeaves.get(key) || 0) + leave.totalDays);
      }
    });
    
    // Create report summary
    let id = 1;
    employeeAttendance.forEach((stats, employeeId) => {
      const leaveDays = employeeLeaves.get(employeeId) || 0;
      const totalPresent = stats.present + stats.halfDay; // Include half-days as present
      const totalAbsent = totalWorkingDays - totalPresent - leaveDays;
      const attendancePercentage = totalWorkingDays > 0 
        ? ((totalPresent / totalWorkingDays) * 100).toFixed(1) + '%'
        : '0%';
      const averageHours = stats.present > 0 
        ? (stats.totalHours / stats.present).toFixed(1) + ' hrs'
        : '0 hrs';
      
      report.push({
        id: id++,
        employee: stats.employeeName,
        employeeId: stats.employeeId,
        department: stats.department,
        present: totalPresent,
        absent: Math.max(0, totalAbsent),
        leaves: leaveDays,
        totalDays: totalWorkingDays,
        percentage: attendancePercentage,
        lateArrivals: stats.late,
        earlyDepartures: 0, // You can calculate this from check-out times if needed
        averageHours,
        overtimeHours: stats.overtimeHours
      });
    });
    
    // Add employees without attendance records
    allEmployees.forEach(emp => {
      if (!employeeAttendance.has(emp.employeeId)) {
        const leaveDays = employeeLeaves.get(emp.employeeId) || 0;
        const totalAbsent = totalWorkingDays - leaveDays;
        
        report.push({
          id: id++,
          employee: emp.name,
          employeeId: emp.employeeId,
          department: emp.department,
          present: 0,
          absent: Math.max(0, totalAbsent),
          leaves: leaveDays,
          totalDays: totalWorkingDays,
          percentage: '0%',
          lateArrivals: 0,
          earlyDepartures: 0,
          averageHours: '0 hrs',
          overtimeHours: 0
        });
      }
    });
    
    return report;
  }, [attendanceRecords, leaveData, allEmployees, dateFrom, dateTo]);

  // Filter attendance report by department
  const getFilteredAttendanceReport = useMemo(() => {
    if (selectedDepartment === "all") {
      return generateAttendanceReport;
    }
    return generateAttendanceReport.filter(record => record.department === selectedDepartment);
  }, [generateAttendanceReport, selectedDepartment]);

  // Prepare attendance data for charts
  const getAttendanceChartData = useMemo(() => {
    // Group by department and calculate statistics
    const departmentStats = new Map();
    
    generateAttendanceReport.forEach(record => {
      if (!departmentStats.has(record.department)) {
        departmentStats.set(record.department, {
          department: record.department,
          totalEmployees: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalLeaves: 0,
          totalLate: 0
        });
      }
      
      const stats = departmentStats.get(record.department);
      stats.totalEmployees++;
      stats.totalPresent += record.present;
      stats.totalAbsent += record.absent;
      stats.totalLeaves += record.leaves;
      stats.totalLate += record.lateArrivals;
    });
    
    // Convert to array and calculate averages
    return Array.from(departmentStats.values()).map(stats => ({
      department: stats.department,
      present: Math.round(stats.totalPresent / stats.totalEmployees),
      absent: Math.round(stats.totalAbsent / stats.totalEmployees),
      leaves: Math.round(stats.totalLeaves / stats.totalEmployees),
      late: Math.round(stats.totalLate / stats.totalEmployees)
    }));
  }, [generateAttendanceReport]);

  // Prepare daily attendance trend data
  const getDailyAttendanceData = useMemo(() => {
    const dailyStats = new Map<string, { date: string; present: number; absent: number; late: number }>();
    
    attendanceRecords.forEach(record => {
      const date = record.date.split('T')[0];
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { date, present: 0, absent: 0, late: 0 });
      }
      
      const stats = dailyStats.get(date)!;
      if (record.status === 'present' || record.status === 'late' || record.status === 'half-day') {
        stats.present++;
        if (record.status === 'late') {
          stats.late++;
        }
      } else if (record.status === 'absent') {
        stats.absent++;
      }
    });
    
    // Convert to array and sort by date
    return Array.from(dailyStats.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-15); // Last 15 days
  }, [attendanceRecords]);

  // Filter expenses based on filters
  useEffect(() => {
    let result = [...expenses];
    
    // Filter by status
    if (expenseFilterStatus !== "all") {
      result = result.filter(expense => expense.status === expenseFilterStatus);
    }
    
    // Filter by type
    if (expenseFilterType !== "all") {
      result = result.filter(expense => expense.expenseType === expenseFilterType);
    }
    
    // Filter by date range
    if (expenseDateFrom) {
      result = result.filter(expense => new Date(expense.date) >= new Date(expenseDateFrom));
    }
    
    if (expenseDateTo) {
      const toDate = new Date(expenseDateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(expense => new Date(expense.date) <= toDate);
    }
    
    // Filter by search term
    if (expenseSearchTerm) {
      const searchLower = expenseSearchTerm.toLowerCase();
      result = result.filter(expense => 
        expense.expenseId.toLowerCase().includes(searchLower) ||
        expense.description.toLowerCase().includes(searchLower) ||
        expense.vendor.toLowerCase().includes(searchLower) ||
        expense.category.toLowerCase().includes(searchLower) ||
        expense.site.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredExpenses(result);
  }, [expenses, expenseFilterStatus, expenseFilterType, expenseDateFrom, expenseDateTo, expenseSearchTerm]);

  // Filter tasks for report
  const getFilteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by search query
    if (taskSearchQuery.trim()) {
      const searchLower = taskSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.assignedToName.toLowerCase().includes(searchLower) ||
        task.siteName.toLowerCase().includes(searchLower) ||
        task.clientName.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (taskFilterStatus !== "all") {
      filtered = filtered.filter(task => task.status === taskFilterStatus);
    }

    // Filter by priority
    if (taskFilterPriority !== "all") {
      filtered = filtered.filter(task => task.priority === taskFilterPriority);
    }

    // Filter by site
    if (taskFilterSite !== "all") {
      filtered = filtered.filter(task => task.siteName === taskFilterSite);
    }

    return filtered;
  }, [tasks, taskSearchQuery, taskFilterStatus, taskFilterPriority, taskFilterSite]);

  // Prepare task report data
  const taskReportData: TaskReportData[] = useMemo(() => {
    return getFilteredTasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      assignedToName: task.assignedToName,
      siteName: task.siteName,
      clientName: task.clientName,
      priority: task.priority,
      status: task.status,
      deadline: new Date(task.deadline).toLocaleDateString(),
      dueDateTime: task.dueDateTime ? new Date(task.dueDateTime).toLocaleString() : "N/A",
      taskType: task.taskType || "routine",
      hourlyUpdatesCount: task.hourlyUpdates?.length || 0,
      attachmentsCount: task.attachments?.length || 0,
      createdAt: new Date(task.createdAt).toLocaleString()
    }));
  }, [getFilteredTasks]);

  // Task statistics for charts
  const taskStats = useMemo(() => {
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      highPriority: tasks.filter(t => t.priority === 'high').length,
      mediumPriority: tasks.filter(t => t.priority === 'medium').length,
      lowPriority: tasks.filter(t => t.priority === 'low').length
    };
    
    return stats;
  }, [tasks]);

  // Expense statistics
  const expenseStats = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const approvedExpenses = filteredExpenses.filter(e => e.status === 'approved');
    const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending');
    const rejectedExpenses = filteredExpenses.filter(e => e.status === 'rejected');
    
    const operationalExpenses = filteredExpenses.filter(e => e.expenseType === 'operational')
      .reduce((sum, expense) => sum + expense.amount, 0);
    const officeExpenses = filteredExpenses.filter(e => e.expenseType === 'office')
      .reduce((sum, expense) => sum + expense.amount, 0);
    const otherExpenses = filteredExpenses.filter(e => e.expenseType === 'other')
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    // Group by category
    const categoryStats = filteredExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by month for trend analysis
    const monthlyStats = filteredExpenses.reduce((acc, expense) => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to array for charts
    const monthlyData = Object.entries(monthlyStats)
      .map(([month, amount]) => ({
        month: month,
        amount: amount
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Get top 10 categories for pie chart
    const topCategories = Object.entries(categoryStats)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    
    return {
      totalExpenses,
      approvedExpenses: approvedExpenses.length,
      pendingExpenses: pendingExpenses.length,
      rejectedExpenses: rejectedExpenses.length,
      operationalExpenses,
      officeExpenses,
      otherExpenses,
      categoryData: topCategories,
      monthlyData,
      totalTransactions: filteredExpenses.length
    };
  }, [filteredExpenses]);

  // Task completion data for pie chart
  const taskCompletionData: TaskCompletionData[] = useMemo(() => [
    { name: "Completed", value: taskStats.completed, color: "#10b981" },
    { name: "In Progress", value: taskStats.inProgress, color: "#3b82f6" },
    { name: "Pending", value: taskStats.pending, color: "#f59e0b" },
    { name: "Cancelled", value: taskStats.cancelled, color: "#ef4444" }
  ], [taskStats]);

  // Task priority data for bar chart
  const taskPriorityData = useMemo(() => [
    { priority: "High", count: taskStats.highPriority, color: "#ef4444" },
    { priority: "Medium", count: taskStats.mediumPriority, color: "#f59e0b" },
    { priority: "Low", count: taskStats.lowPriority, color: "#10b981" }
  ], [taskStats]);

  // Financial data from expenses
  const financialData: FinancialData[] = useMemo(() => [
    { category: "Operational", value: expenseStats.operationalExpenses },
    { category: "Office", value: expenseStats.officeExpenses },
    { category: "Other", value: expenseStats.otherExpenses }
  ], [expenseStats]);

  // Category data for pie chart
  const expenseCategoryData = useMemo(() => {
    return expenseStats.categoryData.map((item, index) => ({
      name: item.category,
      value: item.amount,
      color: `hsl(${index * 30}, 70%, 50%)`
    }));
  }, [expenseStats]);

  // Helper function to export data as CSV
  const exportToCSV = (data: any[], filename: string) => {
    try {
      setIsExporting(true);
      
      if (data.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      // Convert data to CSV format
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Report exported as CSV: ${filename}`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to export data as Excel
  const exportToExcel = (data: any[], filename: string, sheetName = 'Sheet1') => {
    try {
      setIsExporting(true);
      
      if (data.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Report exported as Excel: ${filename}`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  // Export attendance report
  const exportAttendanceReport = (format: 'csv' | 'excel') => {
    if (getFilteredAttendanceReport.length === 0) {
      toast.error('No attendance data to export');
      return;
    }

    const data = getFilteredAttendanceReport.map(record => ({
      'Employee ID': record.employeeId,
      'Employee Name': record.employee,
      'Department': record.department,
      'Present Days': record.present,
      'Absent Days': record.absent,
      'Leave Days': record.leaves,
      'Total Days': record.totalDays,
      'Attendance %': record.percentage,
      'Late Arrivals': record.lateArrivals,
      'Early Departures': record.earlyDepartures,
      'Average Hours': record.averageHours,
      'Overtime Hours': record.overtimeHours
    }));

    const filename = `attendance-report-${selectedDepartment === "all" ? "all" : selectedDepartment}-${dateFrom}-to-${dateTo}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Attendance Report');
    }
  };

  // Export task report
  const exportTaskReport = (format: 'csv' | 'excel') => {
    if (taskReportData.length === 0) {
      toast.error('No task data to export');
      return;
    }

    const data = taskReportData.map(task => ({
      'Task ID': task.id,
      'Title': task.title,
      'Description': task.description,
      'Assignee': task.assignedToName,
      'Site': task.siteName,
      'Client': task.clientName,
      'Priority': task.priority,
      'Status': task.status,
      'Deadline': task.deadline,
      'Due Date': task.dueDateTime,
      'Task Type': task.taskType,
      'Hourly Updates': task.hourlyUpdatesCount,
      'Attachments': task.attachmentsCount,
      'Created At': task.createdAt
    }));

    const filename = `task-report-${taskFilterStatus}-${taskFilterPriority}-${taskFilterSite}-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Task Report');
    }
  };

  // Export expense report
  const exportExpenseReport = (format: 'csv' | 'excel') => {
    if (filteredExpenses.length === 0) {
      toast.error('No expense data to export');
      return;
    }

    const data = filteredExpenses.map(expense => ({
      'Expense ID': expense.expenseId,
      'Category': expense.category,
      'Description': expense.description,
      'Vendor': expense.vendor,
      'Site': expense.site,
      'Amount': formatCurrency(expense.amount),
      'Base Amount': formatCurrency(expense.baseAmount),
      'GST': formatCurrency(expense.gst),
      'Date': new Date(expense.date).toLocaleDateString(),
      'Status': expense.status,
      'Type': expense.expenseType,
      'Payment Method': expense.paymentMethod,
      'Created By': expense.createdBy,
      'Notes': expense.notes || ''
    }));

    const filename = `expense-report-${expenseFilterStatus}-${expenseFilterType}-${expenseDateFrom || 'all'}-to-${expenseDateTo || 'all'}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Expense Report');
    }
  };

  // Export detailed attendance records
  const exportAttendanceRecords = (format: 'csv' | 'excel') => {
    if (attendanceRecords.length === 0) {
      toast.error('No attendance records to export');
      return;
    }

    const data = attendanceRecords.map(record => ({
      'Employee ID': record.employeeId,
      'Employee Name': record.employeeName,
      'Department': record.department,
      'Date': record.date,
      'Check In': record.checkIn,
      'Check Out': record.checkOut,
      'Hours Worked': record.hoursWorked,
      'Status': record.status,
      'Overtime': record.overtime,
      'Site': record.site || '',
      'Shift': record.shift || '',
      'Late By Minutes': record.lateByMinutes || 0,
      'Notes': record.notes || ''
    }));

    const filename = `attendance-records-${dateFrom}-to-${dateTo}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Attendance Records');
    }
  };

  // Export expense statistics summary
  const exportExpenseSummary = (format: 'csv' | 'excel') => {
    const summaryData = [
      {
        'Metric': 'Total Expenses',
        'Value': formatCurrency(expenseStats.totalExpenses)
      },
      {
        'Metric': 'Total Transactions',
        'Value': expenseStats.totalTransactions
      },
      {
        'Metric': 'Approved Expenses',
        'Value': expenseStats.approvedExpenses
      },
      {
        'Metric': 'Pending Expenses',
        'Value': expenseStats.pendingExpenses
      },
      {
        'Metric': 'Rejected Expenses',
        'Value': expenseStats.rejectedExpenses
      },
      {
        'Metric': 'Operational Expenses',
        'Value': formatCurrency(expenseStats.operationalExpenses)
      },
      {
        'Metric': 'Office Expenses',
        'Value': formatCurrency(expenseStats.officeExpenses)
      },
      {
        'Metric': 'Other Expenses',
        'Value': formatCurrency(expenseStats.otherExpenses)
      }
    ];

    // Add category breakdown
    expenseStats.categoryData.forEach(category => {
      summaryData.push({
        'Metric': category.category,
        'Value': formatCurrency(category.amount)
      });
    });

    const filename = `expense-summary-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(summaryData, `${filename}.csv`);
    } else {
      exportToExcel(summaryData, `${filename}.xlsx`, 'Expense Summary');
    }
  };

  // Export task statistics summary
  const exportTaskSummary = (format: 'csv' | 'excel') => {
    const summaryData = [
      {
        'Metric': 'Total Tasks',
        'Value': taskStats.total
      },
      {
        'Metric': 'Completed Tasks',
        'Value': taskStats.completed
      },
      {
        'Metric': 'In Progress Tasks',
        'Value': taskStats.inProgress
      },
      {
        'Metric': 'Pending Tasks',
        'Value': taskStats.pending
      },
      {
        'Metric': 'Cancelled Tasks',
        'Value': taskStats.cancelled
      },
      {
        'Metric': 'Completion Rate',
        'Value': taskStats.total > 0 ? `${((taskStats.completed / taskStats.total) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Metric': 'High Priority Tasks',
        'Value': taskStats.highPriority
      },
      {
        'Metric': 'Medium Priority Tasks',
        'Value': taskStats.mediumPriority
      },
      {
        'Metric': 'Low Priority Tasks',
        'Value': taskStats.lowPriority
      }
    ];

    const filename = `task-summary-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(summaryData, `${filename}.csv`);
    } else {
      exportToExcel(summaryData, `${filename}.xlsx`, 'Task Summary');
    }
  };

  // Handle apply filters and refresh data
  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);
      await fetchAttendanceRecords();
      toast.success("Filters applied and attendance data refreshed");
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Failed to apply filters");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear expense filters
  const clearExpenseFilters = () => {
    setExpenseFilterStatus("all");
    setExpenseFilterType("all");
    setExpenseDateFrom("");
    setExpenseDateTo("");
    setExpenseSearchTerm("");
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchAllEmployees(),
        fetchAttendanceRecords(),
        fetchAllTasks(),
        fetchAllExpenses()
      ]);
    };
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Reports & Analytics" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >

        {/* Report Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Report Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                  placeholder="From Date"
                />
                <span className="text-muted-foreground">to</span>
                <Input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                  placeholder="To Date"
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleApplyFilters} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different reports */}
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Financial
            </TabsTrigger>
          </TabsList>

          {/* Attendance Report Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Attendance Analytics</CardTitle>
                <div className="flex gap-2">
                  <div className="relative group">
                    <Button 
                      variant="outline"
                      disabled={isExporting || getFilteredAttendanceReport.length === 0}
                    >
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-1">
                        <button
                          onClick={() => exportAttendanceReport('csv')}
                          disabled={isExporting || getFilteredAttendanceReport.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Summary as CSV
                        </button>
                        <button
                          onClick={() => exportAttendanceReport('excel')}
                          disabled={isExporting || getFilteredAttendanceReport.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export Summary as Excel
                        </button>
                        <button
                          onClick={() => exportAttendanceRecords('csv')}
                          disabled={isExporting || attendanceRecords.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Detailed Records as CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading attendance data...</span>
                  </div>
                ) : (
                  <>
                    {/* Attendance Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Employees</p>
                              <p className="text-2xl font-bold">
                                {getFilteredAttendanceReport.length}
                              </p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Attendance</p>
                              <p className="text-2xl font-bold text-green-600">
                                {getFilteredAttendanceReport.length > 0
                                  ? (getFilteredAttendanceReport.reduce((sum, record) => {
                                      const perc = parseFloat(record.percentage);
                                      return sum + (isNaN(perc) ? 0 : perc);
                                    }, 0) / getFilteredAttendanceReport.length).toFixed(1) + "%"
                                  : "0%"}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Late Arrivals</p>
                              <p className="text-2xl font-bold text-yellow-600">
                                {getFilteredAttendanceReport.reduce((sum, record) => sum + record.lateArrivals, 0)}
                              </p>
                            </div>
                            <Clock4 className="h-8 w-8 text-yellow-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Overtime Hours</p>
                              <p className="text-2xl font-bold text-purple-600">
                                {getFilteredAttendanceReport.reduce((sum, record) => sum + record.overtimeHours, 0)}
                              </p>
                            </div>
                            <Clock className="h-8 w-8 text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <BarChartIcon className="h-4 w-4" />
                          Attendance Overview by Department
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={getAttendanceChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="department" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="present" fill="#3b82f6" name="Present Days" />
                              <Bar dataKey="late" fill="#f59e0b" name="Late Days" />
                              <Bar dataKey="absent" fill="#ef4444" name="Absent Days" />
                              <Bar dataKey="leaves" fill="#8b5cf6" name="Leave Days" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Daily Attendance Trend
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getDailyAttendanceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="present" stroke="#3b82f6" name="Present" />
                              <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" />
                              <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Employee Attendance Details</h3>
                      {getFilteredAttendanceReport.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No attendance records found for the selected filters</p>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Employee ID</TableHead>
                                  <TableHead>Employee Name</TableHead>
                                  <TableHead>Department</TableHead>
                                  <TableHead>Present Days</TableHead>
                                  <TableHead>Absent Days</TableHead>
                                  <TableHead>Leave Days</TableHead>
                                  <TableHead>Late Arrivals</TableHead>
                                  <TableHead>Avg Hours</TableHead>
                                  <TableHead>Overtime</TableHead>
                                  <TableHead>Attendance %</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getFilteredAttendanceReport.slice(0, 10).map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell className="font-medium">{record.employeeId}</TableCell>
                                    <TableCell className="font-medium">{record.employee}</TableCell>
                                    <TableCell>{record.department}</TableCell>
                                    <TableCell>
                                      <Badge className="bg-green-100 text-green-800">
                                        {record.present}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className="bg-red-100 text-red-800">
                                        {record.absent}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className="bg-blue-100 text-blue-800">
                                        {record.leaves}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className="bg-yellow-100 text-yellow-800">
                                        {record.lateArrivals}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{record.averageHours}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={record.overtimeHours > 0 ? "text-green-600" : ""}>
                                        {record.overtimeHours}h
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-semibold ${
                                          parseFloat(record.percentage) >= 90 ? "text-green-600" :
                                          parseFloat(record.percentage) >= 75 ? "text-yellow-600" :
                                          "text-red-600"
                                        }`}>
                                          {record.percentage}
                                        </span>
                                        {parseFloat(record.percentage) >= 90 ? (
                                          <ArrowUp className="h-4 w-4 text-green-600" />
                                        ) : parseFloat(record.percentage) < 75 ? (
                                          <ArrowDown className="h-4 w-4 text-red-600" />
                                        ) : null}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {getFilteredAttendanceReport.length > 10 && (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                Showing 10 of {getFilteredAttendanceReport.length} records. Export full list for complete data.
                              </div>
                            )}
                          </div>
                          <div className="mt-4 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Note: This report is generated from actual attendance records in the system. Data includes check-in/check-out times, late arrivals, and overtime.
                            </p>
                            <p className="mt-1">
                              Report Period: {dateFrom} to {dateTo} | Total Working Days: {getFilteredAttendanceReport[0]?.totalDays || 0}
                            </p>
                            <p className="mt-1">
                              Data last updated: {new Date().toLocaleString()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Report Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Task Management Report</CardTitle>
                <div className="flex gap-2">
                  <div className="relative group">
                    <Button 
                      disabled={isExporting || taskReportData.length === 0}
                    >
                      {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Export
                    </Button>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-1">
                        <button
                          onClick={() => exportTaskReport('csv')}
                          disabled={isExporting || taskReportData.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Task Details as CSV
                        </button>
                        <button
                          onClick={() => exportTaskReport('excel')}
                          disabled={isExporting || taskReportData.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export Task Details as Excel
                        </button>
                        <button
                          onClick={() => exportTaskSummary('csv')}
                          disabled={isExporting || tasks.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Task Summary as CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Task Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Tasks</label>
                    <Input
                      placeholder="Search by title, assignee, site..."
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={taskFilterPriority} onValueChange={setTaskFilterPriority}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Site</label>
                    <Select value={taskFilterSite} onValueChange={setTaskFilterSite}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sites" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site} value={site === "All Sites" ? "all" : site}>
                            {site}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading task data...</span>
                  </div>
                ) : taskReportData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No tasks found for the selected filters</p>
                  </div>
                ) : (
                  <>
                    {/* Task Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <PieChartIcon className="h-4 w-4" />
                          Task Status Distribution
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={taskCompletionData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {taskCompletionData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <BarChartIcon className="h-4 w-4" />
                          Task Priority Distribution
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={taskPriorityData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="priority" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#8b5cf6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Task Details Table */}
                    <div>
                      <h3 className="font-semibold mb-4">Task Details ({taskReportData.length} tasks)</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Task Title</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead>Site</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Deadline</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Updates</TableHead>
                              <TableHead>Attachments</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {taskReportData.slice(0, 10).map((task) => (
                              <TableRow key={task.id}>
                                <TableCell className="font-medium">
                                  <div className="max-w-xs truncate" title={task.title}>
                                    {task.title}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3" />
                                    {task.assignedToName}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Building className="h-3 w-3" />
                                    {task.siteName}
                                  </div>
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
                                    task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }>
                                    {task.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{task.deadline}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{task.taskType}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {task.hourlyUpdatesCount}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    {task.attachmentsCount}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {taskReportData.length > 10 && (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            Showing 10 of {taskReportData.length} tasks. Export for complete list.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Report Tab */}
          <TabsContent value="financial">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Financial & Expense Reports</CardTitle>
                <div className="flex gap-2">
                  <div className="relative group">
                    <Button 
                      disabled={isExporting || filteredExpenses.length === 0}
                    >
                      {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Export
                    </Button>
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-1">
                        <button
                          onClick={() => exportExpenseReport('csv')}
                          disabled={isExporting || filteredExpenses.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Expense Details as CSV
                        </button>
                        <button
                          onClick={() => exportExpenseReport('excel')}
                          disabled={isExporting || filteredExpenses.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export Expense Details as Excel
                        </button>
                        <button
                          onClick={() => exportExpenseSummary('csv')}
                          disabled={isExporting || filteredExpenses.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Expense Summary as CSV
                        </button>
                        <button
                          onClick={() => exportExpenseSummary('excel')}
                          disabled={isExporting || filteredExpenses.length === 0}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export Expense Summary as Excel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Expense Filters */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Expense Filters
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearExpenseFilters}
                      disabled={!expenseFilterStatus && !expenseFilterType && !expenseDateFrom && !expenseDateTo && !expenseSearchTerm}
                    >
                      Clear Filters
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search Expenses</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search expenses..."
                          className="pl-8"
                          value={expenseSearchTerm}
                          onChange={(e) => setExpenseSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={expenseFilterStatus} onValueChange={(value: any) => setExpenseFilterStatus(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Expense Type</label>
                      <Select value={expenseFilterType} onValueChange={(value: any) => setExpenseFilterType(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Range</label>
                      <div className="flex gap-2">
                        <Input 
                          type="date" 
                          value={expenseDateFrom}
                          onChange={(e) => setExpenseDateFrom(e.target.value)}
                          className="w-1/2"
                          placeholder="From"
                        />
                        <Input 
                          type="date" 
                          value={expenseDateTo}
                          onChange={(e) => setExpenseDateTo(e.target.value)}
                          className="w-1/2"
                          placeholder="To"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expense Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Expenses</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(expenseStats.totalExpenses)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {expenseStats.totalTransactions} transactions
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Operational Expenses</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(expenseStats.operationalExpenses)}
                          </p>
                        </div>
                        <Building className="h-8 w-8 text-blue-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Main operational costs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Office Expenses</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(expenseStats.officeExpenses)}
                          </p>
                        </div>
                        <Briefcase className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Administrative costs
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {expenseLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading expense data...</span>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No expenses found for the selected filters</p>
                  </div>
                ) : (
                  <>
                    {/* Expense Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <PieChartIcon className="h-4 w-4" />
                          Expense Categories Distribution
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={expenseCategoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {expenseCategoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <BarChartIcon className="h-4 w-4" />
                          Expense by Type
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={financialData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="category" />
                              <YAxis />
                              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                              <Bar dataKey="value" fill="#10b981" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Expense Trend Chart */}
                    {expenseStats.monthlyData.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Monthly Expense Trend
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={expenseStats.monthlyData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                              <Legend />
                              <Line type="monotone" dataKey="amount" stroke="#8b5cf6" activeDot={{ r: 8 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Expense Details Table */}
                    <div>
                      <h3 className="font-semibold mb-4">Expense Details ({filteredExpenses.length} transactions)</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Expense ID</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Vendor</TableHead>
                              <TableHead>Site</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredExpenses.slice(0, 10).map((expense) => (
                              <TableRow key={expense._id}>
                                <TableCell className="font-medium">{expense.expenseId}</TableCell>
                                <TableCell>{expense.category}</TableCell>
                                <TableCell className="max-w-xs truncate" title={expense.description}>
                                  {expense.description}
                                </TableCell>
                                <TableCell>{expense.vendor}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {expense.site}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold">{formatCurrency(expense.amount)}</TableCell>
                                <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge className={getExpenseStatusColor(expense.status)}>
                                    {expense.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getExpenseTypeColor(expense.expenseType)}>
                                    {expense.expenseType}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {filteredExpenses.length > 10 && (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            Showing 10 of {filteredExpenses.length} expenses. Export for complete list.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Reports;