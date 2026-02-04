import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  ArrowLeft, 
  Download, 
  Filter, 
  Calendar, 
  Building, 
  Users, 
  Edit, 
  Save, 
  X,
  Plus,
  Minus,
  User,
  AlertCircle,
  UserCheck,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RefreshCw,
  Loader2,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  FileSpreadsheet,
  MapPin,
  Briefcase,
  Hash,
  Mail,
  Phone,
  UserCog,
  Target,
  Percent,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { siteService, Site } from "@/services/SiteService";

// Department data matching the dashboard
const departmentViewData = [
  { 
    department: 'Housekeeping', 
    present: 56, 
    total: 65, 
    rate: '86.2%'
  },
  { 
    department: 'Security', 
    present: 26, 
    total: 28, 
    rate: '92.9%'
  },
  { 
    department: 'Parking', 
    present: 5, 
    total: 5, 
    rate: '100%'
  },
  { 
    department: 'Waste Management', 
    present: 8, 
    total: 10, 
    rate: '80.0%'
  },
  { 
    department: 'Consumables', 
    present: 3, 
    total: 3, 
    rate: '100%'
  },
  { 
    department: 'Other', 
    present: 5, 
    total: 7, 
    rate: '71.4%'
  },
];

// Employee data structure - Updated with real employee fields
interface Employee {
  id: string;
  _id?: string;
  employeeId?: string;
  name: string;
  department: string;
  position: string;
  status: 'present' | 'absent' | 'leave' | 'weekly-off';
  checkInTime?: string;
  checkOutTime?: string;
  site: string;
  siteName?: string;
  date: string;
  remark?: string;
  action?: 'fine' | 'advance' | 'other' | '' | 'none';
  email?: string;
  phone?: string;
  employeeStatus?: string;
  role?: string;
  gender?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  salary?: number | string;
  assignedSites?: string[];
  shift?: string;
  workingHours?: string;
  employeeType?: string;
  reportingManager?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Attendance Record structure
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
  siteName?: string;
  department?: string;
  shift?: string;
  overtimeHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
}

// API base URL
const API_URL = `http://${window.location.hostname}:5001/api`;

// Helper function to calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1; // +1 to include both start and end dates
};

// Helper function to format date
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format time
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-" || timestamp === "" || timestamp === "null") return "-";
  
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
    console.error('Error formatting time:', timestamp, error);
    return timestamp || "-";
  }
};

// Fetch employees from API
const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Fetching employees from API...');
    
    const response = await fetch(`${API_URL}/employees`);
    const data = await response.json();
    
    console.log('Employees API response:', data);
    
    if (response.ok) {
      let employeesData = [];
      
      if (Array.isArray(data)) {
        employeesData = data;
      } else if (data.success && Array.isArray(data.data)) {
        employeesData = data.data;
      } else if (Array.isArray(data.employees)) {
        employeesData = data.employees;
      } else if (data.data && Array.isArray(data.data.employees)) {
        employeesData = data.data.employees;
      }
      
      // Transform employees data to match our interface
      const transformedEmployees: Employee[] = employeesData.map((emp: any) => ({
        id: emp._id || emp.id || `emp_${Math.random()}`,
        _id: emp._id || emp.id,
        employeeId: emp.employeeId || emp.employeeID || `EMP${String(Math.random()).slice(2, 6)}`,
        name: emp.name || emp.employeeName || "Unknown Employee",
        email: emp.email || "",
        phone: emp.phone || emp.mobile || "",
        department: emp.department || "Unknown Department",
        position: emp.position || emp.designation || emp.role || "Employee",
        site: emp.site || emp.siteName || "Main Site",
        siteName: emp.siteName || emp.site || "Main Site",
        status: "present" as const, // Default status, will be updated by attendance data
        employeeStatus: (emp.status || "active") as string,
        role: emp.role || 'employee',
        gender: emp.gender || '',
        dateOfJoining: emp.dateOfJoining || emp.joinDate || '',
        dateOfBirth: emp.dateOfBirth || '',
        salary: emp.salary || emp.basicSalary || 0,
        assignedSites: emp.assignedSites || emp.sites || [],
        shift: emp.shift || 'General',
        workingHours: emp.workingHours || '9:00 AM - 6:00 PM',
        employeeType: emp.employeeType || emp.type || 'Full-time',
        reportingManager: emp.reportingManager || emp.manager || '',
        createdAt: emp.createdAt || emp.created || new Date().toISOString(),
        updatedAt: emp.updatedAt || emp.updated || new Date().toISOString(),
        date: new Date().toISOString().split('T')[0] // Current date as default
      }));
      
      console.log(`✅ Loaded ${transformedEmployees.length} employees`);
      return transformedEmployees;
    } else {
      console.error('Failed to fetch employees:', data.message || data.error);
      throw new Error(data.message || 'Failed to load employees');
    }
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw new Error(`Error loading employees: ${error.message}`);
  }
};

// Fetch attendance records for date range
const fetchAttendanceRecords = async (start: string, end: string): Promise<AttendanceRecord[]> => {
  try {
    console.log(`🔄 Fetching attendance records from ${start} to ${end}`);
    
    // Try bulk range endpoint first
    try {
      const response = await fetch(`${API_URL}/attendance/range?startDate=${start}&endDate=${end}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Attendance range API response:', data);
        
        if (data.success && Array.isArray(data.data)) {
          const transformedRecords: AttendanceRecord[] = data.data.map((record: any) => ({
            _id: record._id || record.id || `att_${Math.random()}`,
            employeeId: record.employeeId || record.employee?._id || '',
            employeeName: record.employeeName || record.employee?.name || 'Unknown',
            date: record.date || '',
            checkInTime: record.checkInTime || null,
            checkOutTime: record.checkOutTime || null,
            breakStartTime: record.breakStartTime || null,
            breakEndTime: record.breakEndTime || null,
            totalHours: Number(record.totalHours) || 0,
            breakTime: Number(record.breakTime) || 0,
            status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
            isCheckedIn: Boolean(record.isCheckedIn),
            isOnBreak: Boolean(record.isOnBreak),
            supervisorId: record.supervisorId,
            remarks: record.remarks || '',
            siteName: record.siteName || record.site || record.department || '',
            department: record.department || '',
            shift: record.shift || '',
            overtimeHours: Number(record.overtimeHours) || 0,
            lateMinutes: Number(record.lateMinutes) || 0,
            earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
          }));
          
          console.log(`✅ Loaded ${transformedRecords.length} attendance records`);
          return transformedRecords;
        }
      }
    } catch (rangeError) {
      console.log('Range endpoint failed, trying day-by-day:', rangeError);
    }
    
    // Fallback: fetch day by day
    const allRecords: AttendanceRecord[] = [];
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      try {
        const response = await fetch(`${API_URL}/attendance?date=${dateStr}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            const dayRecords: AttendanceRecord[] = data.data.map((record: any) => ({
              _id: record._id || record.id || `att_${Math.random()}`,
              employeeId: record.employeeId || record.employee?._id || '',
              employeeName: record.employeeName || record.employee?.name || 'Unknown',
              date: record.date || dateStr,
              checkInTime: record.checkInTime || null,
              checkOutTime: record.checkOutTime || null,
              breakStartTime: record.breakStartTime || null,
              breakEndTime: record.breakEndTime || null,
              totalHours: Number(record.totalHours) || 0,
              breakTime: Number(record.breakTime) || 0,
              status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
              isCheckedIn: Boolean(record.isCheckedIn),
              isOnBreak: Boolean(record.isOnBreak),
              supervisorId: record.supervisorId,
              remarks: record.remarks || '',
              siteName: record.siteName || record.site || record.department || '',
              department: record.department || '',
              shift: record.shift || '',
              overtimeHours: Number(record.overtimeHours) || 0,
              lateMinutes: Number(record.lateMinutes) || 0,
              earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
            }));
            allRecords.push(...dayRecords);
          }
        }
      } catch (dayError) {
        console.log(`Failed to fetch attendance for ${dateStr}:`, dayError);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Loaded ${allRecords.length} attendance records (day-by-day)`);
    return allRecords;
    
  } catch (error: any) {
    console.error('Error fetching attendance records:', error);
    throw new Error(`Error loading attendance: ${error.message}`);
  }
};

// Generate employee data for sites with weekly off counted in present - Updated to use real data
const generateEmployeeData = async (siteName: string, startDate: string, endDate: string): Promise<Employee[]> => {
  try {
    const employees: Employee[] = [];
    
    // Fetch all employees
    const allEmployees = await fetchEmployees();
    
    // Filter employees for this site
    const siteEmployees = allEmployees.filter(emp => 
      emp.site === siteName || emp.siteName === siteName
    );
    
    // Fetch attendance for the period
    const attendanceRecords = await fetchAttendanceRecords(startDate, endDate);
    
    // Get the most recent date in the period for sample data
    const recentDate = endDate;
    
    // Create employee records with attendance data
    for (const employee of siteEmployees) {
      // Get attendance records for this employee
      const empAttendance = attendanceRecords.filter(record => 
        record.employeeId === employee._id || record.employeeId === employee.id
      );
      
      // Get attendance for the most recent date
      const recentAttendance = empAttendance.find(record => record.date === recentDate);
      
      // Determine status based on attendance
      let status: 'present' | 'absent' | 'leave' | 'weekly-off' = 'absent';
      let checkInTime = '';
      let checkOutTime = '';
      let remark = '';
      
      if (recentAttendance) {
        status = recentAttendance.status as any;
        checkInTime = recentAttendance.checkInTime ? formatTimeForDisplay(recentAttendance.checkInTime) : '';
        checkOutTime = recentAttendance.checkOutTime ? formatTimeForDisplay(recentAttendance.checkOutTime) : '';
        remark = recentAttendance.remarks || '';
      }
      
      // Generate random action (for demo purposes, maintain existing functionality)
      const actions = ['fine', 'advance', 'other', 'none'] as const;
      const hasAction = Math.random() > 0.7;
      const action = hasAction ? actions[Math.floor(Math.random() * actions.length)] : 'none';
      
      employees.push({
        id: employee.employeeId || employee.id,
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        status: status,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        site: siteName,
        siteName: siteName,
        date: recentDate,
        remark: remark,
        action: action,
        email: employee.email,
        phone: employee.phone,
        employeeStatus: employee.employeeStatus,
        role: employee.role,
        gender: employee.gender,
        dateOfJoining: employee.dateOfJoining,
        dateOfBirth: employee.dateOfBirth,
        salary: employee.salary,
        assignedSites: employee.assignedSites,
        shift: employee.shift,
        workingHours: employee.workingHours,
        employeeType: employee.employeeType,
        reportingManager: employee.reportingManager,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      });
    }
    
    // If no real employees found, generate demo data as fallback
    if (employees.length === 0) {
      console.log('No real employees found, generating demo data for', siteName);
      return generateDemoEmployeeData(siteName, startDate);
    }
    
    return employees;
  } catch (error) {
    console.error('Error generating employee data:', error);
    // Fallback to demo data if real data fails
    return generateDemoEmployeeData(siteName, startDate);
  }
};

// Generate demo employee data (fallback)
const generateDemoEmployeeData = (siteName: string, date: string): Employee[] => {
  const employees: Employee[] = [];
  const departments = ['Housekeeping', 'Security', 'Parking', 'Waste Management', 'Consumables', 'Other'];
  const positions = ['Staff', 'Supervisor', 'Manager', 'Executive'];
  const actions = ['fine', 'advance', 'other', 'none'] as const;
  const remarks = [
    'Late arrival',
    'Early departure',
    'Half day',
    'Permission granted',
    'Medical leave',
    'Personal work',
    '',
    '',
    '',
    ''
  ];
  
  // Generate demo employees
  const totalEmployees = 10 + Math.floor(Math.random() * 20);
  const presentCount = Math.floor(totalEmployees * (0.85 + Math.random() * 0.1));
  const weeklyOffCount = Math.floor(presentCount * 0.15);
  const regularPresentCount = presentCount - weeklyOffCount;
  
  // Generate weekly off employees (counted in present)
  for (let i = 1; i <= weeklyOffCount; i++) {
    employees.push({
      id: `EMP${siteName.substring(0, 3).toUpperCase()}${date.replace(/-/g, '')}WO${i}`,
      name: `Employee ${i} ${siteName.substring(0, 8)}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      position: positions[Math.floor(Math.random() * positions.length)],
      status: 'weekly-off',
      site: siteName,
      siteName: siteName,
      date: date,
      remark: 'Weekly off',
      action: 'none'
    });
  }
  
  // Generate regular present employees
  for (let i = 1; i <= regularPresentCount; i++) {
    const hasRemark = Math.random() > 0.5;
    const hasAction = Math.random() > 0.7;
    
    employees.push({
      id: `EMP${siteName.substring(0, 3).toUpperCase()}${date.replace(/-/g, '')}${i}`,
      name: `Employee ${i} ${siteName.substring(0, 8)}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      position: positions[Math.floor(Math.random() * positions.length)],
      status: 'present',
      checkInTime: '08:00',
      checkOutTime: '17:00',
      site: siteName,
      siteName: siteName,
      date: date,
      remark: hasRemark ? remarks[Math.floor(Math.random() * remarks.length)] : '',
      action: hasAction ? actions[Math.floor(Math.random() * actions.length)] : 'none'
    });
  }
  
  // Generate absent employees (remaining)
  const absentCount = totalEmployees - presentCount;
  for (let i = 1; i <= absentCount; i++) {
    const hasRemark = Math.random() > 0.3;
    const hasAction = Math.random() > 0.5;
    
    employees.push({
      id: `EMP${siteName.substring(0, 3).toUpperCase()}${date.replace(/-/g, '')}A${i}`,
      name: `Employee ${i} ${siteName.substring(0, 8)}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      position: positions[Math.floor(Math.random() * positions.length)],
      status: 'absent',
      site: siteName,
      siteName: siteName,
      date: date,
      remark: hasRemark ? remarks[Math.floor(Math.random() * remarks.length)] : '',
      action: hasAction ? actions[Math.floor(Math.random() * actions.length)] : 'none'
    });
  }
  
  return employees;
};

// Calculate attendance data for a site for a given period
const calculateSiteAttendanceData = async (site: Site, startDate: string, endDate: string) => {
  const daysInPeriod = calculateDaysBetween(startDate, endDate);
  const isSingleDay = daysInPeriod === 1;
  
  // Get staff count from the site data
  const totalEmployees = siteService.getTotalStaff(site);
  
  // For demo purposes, calculate present based on random attendance rate
  const attendanceRate = 0.85 + (Math.random() * 0.1); // 85-95% attendance rate
  const totalPresent = Math.floor(totalEmployees * attendanceRate);
  const weeklyOffCount = Math.floor(totalPresent * 0.15);
  const actualPresent = totalPresent - weeklyOffCount;
  const absentCount = totalEmployees - totalPresent;
  
  // Calculate cumulative totals for the period
  const durationTotalRequired = totalEmployees * daysInPeriod;
  const durationWeeklyOff = weeklyOffCount * daysInPeriod;
  const durationOnSiteRequirement = durationTotalRequired - durationWeeklyOff;
  const durationPresent = actualPresent * daysInPeriod;
  const durationAbsent = absentCount * daysInPeriod;
  
  // Existing calculations for backward compatibility
  const totalRequiredAttendance = daysInPeriod * totalEmployees;
  const totalPresentAttendance = totalPresent * daysInPeriod;
  const periodShortage = absentCount * daysInPeriod;
  
  // Fetch real employee data
  let employees: Employee[] = [];
  try {
    employees = await generateEmployeeData(site.name, startDate, endDate);
  } catch (error) {
    console.error('Error fetching employee data:', error);
    // Fallback to generated data
    employees = generateDemoEmployeeData(site.name, startDate);
  }
  
  return {
    id: `${site._id}-${startDate}-${endDate}`,
    name: site.name,
    siteName: site.name,
    totalEmployees,
    present: totalPresent,
    weeklyOff: weeklyOffCount,
    absent: absentCount,
    shortage: absentCount * daysInPeriod,
    date: `${startDate} to ${endDate}`,
    daysInPeriod,
    totalRequiredAttendance,
    totalPresentAttendance,
    periodShortage,
    startDate,
    endDate,
    
    // New calculated fields for duration
    durationTotalRequired,
    durationWeeklyOff,
    durationOnSiteRequirement,
    durationPresent,
    durationAbsent,
    
    // Daily averages for display
    avgDailyTotalRequired: totalEmployees,
    avgDailyWeeklyOff: weeklyOffCount,
    avgDailyOnSiteRequirement: totalEmployees - weeklyOffCount,
    avgDailyPresent: actualPresent,
    avgDailyAbsent: absentCount,
    
    // Single day specific fields
    singleDayActualPresent: actualPresent,
    singleDayWeeklyOff: weeklyOffCount,
    singleDayTotalPresent: totalPresent,
    singleDayAbsent: absentCount,
    singleDayShortage: absentCount,
    singleDayOnSiteRequirement: totalEmployees - weeklyOffCount,
    
    // Employee data - ensure it's always an array
    employees: employees || [],
    
    // Original site data
    originalSite: site,
    
    // Real data flag
    isRealData: employees.length > 0 && employees[0]?.employeeId?.startsWith?.('EMP') || false
  };
};

// Calculate department site data
const calculateDepartmentSiteData = async (site: Site, startDate: string, endDate: string, department: string) => {
  const siteData = await calculateSiteAttendanceData(site, startDate, endDate);
  
  return {
    ...siteData,
    siteId: `${site._id}-${startDate}-${endDate}`,
    total: siteService.getTotalStaff(site),
    // Filter employees by department for department view, ensure it's an array
    employees: (siteData.employees || []).filter(emp => emp.department === department)
  };
};

// Get available departments
const departments = departmentViewData.map(dept => dept.department);

// Site Employee Details Page Component
interface SiteEmployeeDetailsProps {
  siteData: any;
  onBack: () => void;
  viewType: 'site' | 'department';
}

const SiteEmployeeDetails: React.FC<SiteEmployeeDetailsProps> = ({ siteData, onBack, viewType }) => {
  // Add null check immediately
  if (!siteData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Site Data...</h2>
          <p className="text-gray-600 mb-4">Please wait while site data is being loaded.</p>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance View
          </Button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'all' | 'present' | 'absent' | 'weekly-off'>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>(siteData?.employees || []); // Add optional chaining
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Update employees when siteData changes
  useEffect(() => {
    if (siteData?.employees) {
      setEmployees(siteData.employees || []);
    }
  }, [siteData?.employees]); // Add optional chaining

  const itemsPerPage = 20;

  // Refresh employee data
  const refreshEmployeeData = async () => {
    try {
      setRefreshing(true);
      console.log('Refreshing employee data for site:', siteData.siteName);
      
      const refreshedEmployees = await generateEmployeeData(
        siteData.siteName || siteData.name,
        siteData.startDate,
        siteData.endDate
      );
      
      setEmployees(refreshedEmployees);
      toast.success('Employee data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing employee data:', error);
      toast.error('Failed to refresh employee data');
    } finally {
      setRefreshing(false);
    }
  };

  // Update employee action
  const updateEmployeeAction = (employeeId: string, action: 'fine' | 'advance' | 'other' | '' | 'none') => {
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        emp.id === employeeId ? { 
          ...emp, 
          action: action === 'none' ? '' : action 
        } : emp
      )
    );
  };

  // Update employee remark
  const updateEmployeeRemark = (employeeId: string, remark: string) => {
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        emp.id === employeeId ? { ...emp, remark } : emp
      )
    );
  };

  // Export detailed employee data
  const handleExportEmployeeDetails = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Position',
      'Status',
      'Check In Time',
      'Check Out Time',
      'Email',
      'Phone',
      'Employee Type',
      'Shift',
      'Working Hours',
      'Reporting Manager',
      'Date of Joining',
      'Action Required',
      'Remarks',
      'Site',
      'Date'
    ];
    
    const rows = filteredEmployees.map((emp: Employee) => [
      emp.employeeId || emp.id,
      `"${emp.name}"`,
      emp.department,
      emp.position,
      emp.status === 'weekly-off' ? 'Weekly Off' : emp.status.charAt(0).toUpperCase() + emp.status.slice(1),
      emp.checkInTime || '-',
      emp.checkOutTime || '-',
      emp.email || '-',
      emp.phone || '-',
      emp.employeeType || 'Full-time',
      emp.shift || 'General',
      emp.workingHours || '9:00 AM - 6:00 PM',
      emp.reportingManager || '-',
      emp.dateOfJoining ? formatDateDisplay(emp.dateOfJoining) : '-',
      emp.action === 'none' || !emp.action ? '-' : emp.action.charAt(0).toUpperCase() + emp.action.slice(1),
      `"${emp.remark || ''}"`,
      `"${emp.site}"`,
      emp.date
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_details_${siteData.name || siteData.siteName}_${siteData.startDate}_to_${siteData.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Employee details exported successfully`);
  };

  const allEmployees = employees;
  const presentEmployees = allEmployees.filter((emp: Employee) => emp.status === 'present' || emp.status === 'weekly-off');
  const absentEmployees = allEmployees.filter((emp: Employee) => emp.status === 'absent');
  const weeklyOffEmployees = allEmployees.filter((emp: Employee) => emp.status === 'weekly-off');
  const regularPresentEmployees = allEmployees.filter((emp: Employee) => emp.status === 'present');

  const filteredEmployees = useMemo(() => {
    let employees = [];
    switch (activeTab) {
      case 'present':
        employees = presentEmployees;
        break;
      case 'absent':
        employees = absentEmployees;
        break;
      case 'weekly-off':
        employees = weeklyOffEmployees;
        break;
      default:
        employees = allEmployees;
    }

    if (employeeSearch) {
      employees = employees.filter((emp: Employee) =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase())) ||
        emp.department.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(employeeSearch.toLowerCase()))
      );
    }

    return employees;
  }, [activeTab, employeeSearch, allEmployees, presentEmployees, absentEmployees, weeklyOffEmployees]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const handleExportEmployees = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Position', 'Status', 'Check In', 'Check Out', 'Action', 'Remark', 'Site', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map((emp: Employee) => [
        emp.employeeId || emp.id,
        `"${emp.name}"`,
        emp.department,
        emp.position,
        emp.status === 'weekly-off' ? 'Weekly Off' : emp.status.charAt(0).toUpperCase() + emp.status.slice(1),
        emp.checkInTime || '-',
        emp.checkOutTime || '-',
        emp.action === 'none' || !emp.action ? '-' : emp.action,
        `"${emp.remark || ''}"`,
        `"${emp.site}"`,
        emp.date
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_${siteData.name || siteData.siteName}_${siteData.startDate}_to_${siteData.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Employee data exported successfully`);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Attendance
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {siteData.name || siteData.siteName} - Employee Details
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatDateDisplay(siteData.startDate)} to {formatDateDisplay(siteData.endDate)} • {viewType === 'department' ? 'Department View' : 'Site View'}
                {siteData.isRealData && (
                  <span className="ml-2 text-green-600 font-medium">
                    ✓ Real Data
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshEmployeeData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportEmployees}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Summary
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={handleExportEmployeeDetails}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Details
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Employees</p>
                <p className="text-2xl font-bold text-blue-600">{siteData.totalEmployees || siteData.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {allEmployees.length} records loaded
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Show actual present for single day view */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  {siteData.daysInPeriod === 1 ? 'Today Actual Present' : 'Avg Daily Present'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {siteData.daysInPeriod === 1 
                    ? (siteData.singleDayActualPresent || siteData.actualPresent || siteData.present)
                    : (siteData.actualPresent || siteData.present)
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {siteData.daysInPeriod === 1 ? 'Excluding weekly off' : 'Including weekly off'}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">
                  {siteData.daysInPeriod === 1 ? 'Today Weekly Off' : 'Avg Weekly Off'}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {siteData.daysInPeriod === 1
                    ? (siteData.singleDayWeeklyOff || siteData.weeklyOff)
                    : siteData.weeklyOff
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {siteData.daysInPeriod === 1 ? 'Weekly off today' : 'Included in present count'}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">
                  {siteData.daysInPeriod === 1 ? 'Today Shortage' : 'Total Shortage'}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {siteData.daysInPeriod === 1
                    ? (siteData.singleDayShortage || siteData.shortage)
                    : siteData.shortage
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  For {siteData.daysInPeriod} {siteData.daysInPeriod === 1 ? 'day' : 'days'}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Data Source Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Card className={siteData.isRealData ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={siteData.isRealData ? "default" : "secondary"}>
                    {siteData.isRealData ? "Real Employee Data" : "Demo Employee Data"}
                  </Badge>
                  {siteData.isRealData && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      ✓ Connected to API
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  {siteData.isRealData 
                    ? `Loaded ${allEmployees.length} employees with real attendance data from ${siteData.startDate} to ${siteData.endDate}`
                    : 'Showing demo employee data. Real data will be shown when API connection is available.'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Click Refresh to update with latest attendance records
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-right">
                  <div className="text-sm font-medium">Data Source</div>
                  <div className="text-xs text-muted-foreground">
                    {siteData.isRealData ? 'Live Database' : 'Generated'}
                  </div>
                </div>
                {!siteData.isRealData && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`${API_URL}/employees`, '_blank')}
                  >
                    Check API Status
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Period Calculation Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="text-sm">
              <h3 className="font-semibold mb-2">Period Attendance Calculation ({siteData.daysInPeriod} days):</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2 rounded border">
                  <span className="font-medium">Total Required Attendance</span>
                  <div className="text-green-600 font-medium mt-1">
                    = {siteData.totalEmployees || siteData.total} employees × {siteData.daysInPeriod} days
                  </div>
                  <div className="text-green-600 font-medium mt-1">
                    = {siteData.totalRequiredAttendance}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <span className="font-medium">Total Present Attendance</span>
                  <div className="text-blue-600 font-medium mt-1">
                    = Sum of daily present counts
                  </div>
                  <div className="text-blue-600 font-medium mt-1">
                    = {siteData.totalPresentAttendance}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <span className="font-medium">Total Shortage</span>
                  <div className="text-red-600 font-medium mt-1">
                    = Total Required - Total Present
                  </div>
                  <div className="text-red-600 font-medium mt-1">
                    = {siteData.totalRequiredAttendance} - {siteData.totalPresentAttendance} = {siteData.shortage}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-muted-foreground">
                <strong>Note:</strong> Weekly off employees are counted in present. Daily shortage = Total Employees - Daily Present Count
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters and Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Tabs */}
              <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('all');
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                >
                  All Employees ({allEmployees.length})
                </Button>
                <Button
                  variant={activeTab === 'present' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('present');
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                >
                  Present ({presentEmployees.length})
                </Button>
                <Button
                  variant={activeTab === 'weekly-off' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('weekly-off');
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                >
                  Weekly Off ({weeklyOffEmployees.length})
                </Button>
                <Button
                  variant={activeTab === 'absent' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('absent');
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                >
                  Absent ({absentEmployees.length})
                </Button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full lg:w-64"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>
                Employee Details - {filteredEmployees.length} employees found
                {siteData.daysInPeriod === 1 ? ' (Sample day)' : ` (${siteData.daysInPeriod} days)`}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {paginatedEmployees.length} of {filteredEmployees.length} filtered employees
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {refreshing ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <span className="text-muted-foreground">Loading employee data...</span>
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Employee ID
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Department
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Position
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Check In
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Check Out
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Action
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Remark
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEmployees.map((employee: Employee) => (
                        <tr key={employee.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 align-middle font-medium">
                            <div className="font-mono text-xs">{employee.employeeId || employee.id}</div>
                            {employee.email && (
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {employee.email}
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">{employee.name}</div>
                            {employee.phone && (
                              <div className="text-xs text-muted-foreground">{employee.phone}</div>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant="outline">{employee.department}</Badge>
                          </td>
                          <td className="p-4 align-middle">
                            {employee.position}
                          </td>
                          <td className="p-4 align-middle">
                            <Badge 
                              variant={
                                employee.status === 'present' ? 'default' :
                                employee.status === 'weekly-off' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {employee.status === 'weekly-off' ? 'Weekly Off' : 
                               employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">
                            {employee.checkInTime || '-'}
                          </td>
                          <td className="p-4 align-middle">
                            {employee.checkOutTime || '-'}
                          </td>
                          <td className="p-4 align-middle">
                            <Select 
                              value={employee.action || 'none'}
                              onValueChange={(value) => updateEmployeeAction(employee.id, value === 'none' ? '' : value as 'fine' | 'advance' | 'other' | '')}
                            >
                              <SelectTrigger className="h-8 text-xs w-32">
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Action</SelectItem>
                                <SelectItem value="fine">Fine</SelectItem>
                                <SelectItem value="advance">Advance</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4 align-middle">
                            <Input
                              value={employee.remark || ''}
                              placeholder="Add remark..."
                              className="h-8 text-xs"
                              onChange={(e) => updateEmployeeRemark(employee.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredEmployees.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Empty State */}
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">
                      No employees found for the selected filters.
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const SuperAdminAttendanceView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(location.search);
  const initialViewType = searchParams.get('view') || 'site';
  const initialDepartment = searchParams.get('department') || '';
  const today = new Date().toISOString().split('T')[0];
  const initialStartDate = searchParams.get('startDate') || today;
  const initialEndDate = searchParams.get('endDate') || today;
  const initialSiteDetails = searchParams.get('siteDetails') === 'true';
  const initialSelectedSiteId = searchParams.get('selectedSiteId') || '';

  const [viewType, setViewType] = useState<'site' | 'department'>(initialViewType as 'site' | 'department');
  const [selectedDepartment, setSelectedDepartment] = useState(initialDepartment);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteDetails, setShowSiteDetails] = useState(initialSiteDetails);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [displayData, setDisplayData] = useState<any[]>([]);
  
  const itemsPerPage = 10;

  // Fetch sites data on component mount and when filters change
  const fetchSitesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching sites from server...');
      const sitesData = await siteService.getAllSites();
      
      if (sitesData && Array.isArray(sitesData)) {
        console.log(`✅ Successfully fetched ${sitesData.length} sites`);
        setSites(sitesData);
        
        // Calculate display data with real employee data
        await calculateDisplayData(sitesData);
      } else {
        console.warn('⚠️ No sites data received or invalid format');
        setSites([]);
        setDisplayData([]);
        toast.error('No sites data available');
      }
    } catch (err: any) {
      console.error('❌ Error fetching sites:', err);
      setError(err.message || 'Failed to fetch sites');
      toast.error('Failed to fetch sites', {
        description: err.message || 'Please try again later'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate display data with real employee data
  const calculateDisplayData = async (sitesData: Site[]) => {
    try {
      setRefreshing(true);
      
      const calculatedData = [];
      
      for (const site of sitesData) {
        let siteData;
        if (viewType === 'department' && selectedDepartment) {
          siteData = await calculateDepartmentSiteData(site, startDate, endDate, selectedDepartment);
        } else {
          siteData = await calculateSiteAttendanceData(site, startDate, endDate);
        }
        
        // Ensure siteData has employees array even if empty
        if (!siteData.employees) {
          siteData.employees = [];
        }
        
        calculatedData.push(siteData);
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setDisplayData(calculatedData);
      console.log(`✅ Calculated display data for ${calculatedData.length} sites`);
    } catch (error) {
      console.error('Error calculating display data:', error);
      // Fallback to empty data with employees array
      setDisplayData(sitesData.map(site => ({
        ...site,
        employees: [],
        isRealData: false
      })));
    } finally {
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSitesData();
  }, []); // Empty dependency array means this runs once on mount

  // Recalculate data when filters change
  useEffect(() => {
    if (sites.length > 0) {
      calculateDisplayData(sites);
    }
  }, [viewType, selectedDepartment, startDate, endDate]);

  // Calculate days in period
  const daysInPeriod = useMemo(() => {
    return calculateDaysBetween(startDate, endDate);
  }, [startDate, endDate]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];
    
    return displayData.filter(item =>
      item.siteName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      item.name?.toLowerCase().includes(searchTerm?.toLowerCase())
    );
  }, [displayData, searchTerm]);

  // Calculate overall totals for the period
  const overallTotals = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalEmployees: 0,
        durationTotalRequired: 0,
        durationWeeklyOff: 0,
        durationOnSiteRequirement: 0,
        durationPresent: 0,
        durationAbsent: 0,
        totalRequiredAttendance: 0,
        totalPresentAttendance: 0,
        totalShortage: 0,
        attendanceRate: '0.0'
      };
    }
    
    // Calculate duration totals
    const durationTotalRequired = filteredData.reduce((sum, item) => sum + item.durationTotalRequired, 0);
    const durationWeeklyOff = filteredData.reduce((sum, item) => sum + item.durationWeeklyOff, 0);
    const durationOnSiteRequirement = filteredData.reduce((sum, item) => sum + item.durationOnSiteRequirement, 0);
    const durationPresent = filteredData.reduce((sum, item) => sum + item.durationPresent, 0);
    const durationAbsent = filteredData.reduce((sum, item) => sum + item.durationAbsent, 0);
    
    // Existing calculations
    const totalEmployees = filteredData.reduce((sum, item) => sum + (item.totalEmployees || item.total), 0);
    const totalRequiredAttendance = filteredData.reduce((sum, item) => sum + item.totalRequiredAttendance, 0);
    const totalPresentAttendance = filteredData.reduce((sum, item) => sum + item.totalPresentAttendance, 0);
    const totalShortage = filteredData.reduce((sum, item) => sum + item.shortage, 0);
    const attendanceRate = totalRequiredAttendance > 0 ? ((totalPresentAttendance / totalRequiredAttendance) * 100).toFixed(1) : '0.0';
    
    return {
      totalEmployees,
      durationTotalRequired,
      durationWeeklyOff,
      durationOnSiteRequirement,
      durationPresent,
      durationAbsent,
      totalRequiredAttendance,
      totalPresentAttendance,
      totalShortage,
      attendanceRate
    };
  }, [filteredData]);

  // Calculate average daily values for the columns
  const columnValues = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgTotalRequired: 0,
        avgWeeklyOff: 0,
        avgOnSiteRequirement: 0,
        avgPresent: 0,
        avgAbsent: 0
      };
    }
    
    // Use the pre-calculated daily averages from the data
    const avgTotalRequired = Math.round(filteredData.reduce((sum, item) => sum + item.avgDailyTotalRequired, 0) / filteredData.length);
    const avgWeeklyOff = Math.round(filteredData.reduce((sum, item) => sum + item.avgDailyWeeklyOff, 0) / filteredData.length);
    const avgOnSiteRequirement = Math.round(filteredData.reduce((sum, item) => sum + item.avgDailyOnSiteRequirement, 0) / filteredData.length);
    const avgPresent = Math.round(filteredData.reduce((sum, item) => sum + item.avgDailyPresent, 0) / filteredData.length);
    const avgAbsent = Math.round(filteredData.reduce((sum, item) => sum + item.avgDailyAbsent, 0) / filteredData.length);
    
    return {
      avgTotalRequired,
      avgWeeklyOff,
      avgOnSiteRequirement,
      avgPresent,
      avgAbsent
    };
  }, [filteredData]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Handle export to Excel
  const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Original columns with duration calculations
    const headers = ['Site Name', 'Department', 'Period', 'Days', 'Total Required', 'Weekly Off', 'On Site Requirement', 'Present', 'Absent/Shortage', 'Attendance Rate', 'Data Source'];
    const filename = viewType === 'department' 
      ? `Attendance_${selectedDepartment}_${startDate}_to_${endDate}.csv`
      : `Sitewise_Attendance_${startDate}_to_${endDate}.csv`;
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => {
        const total = item.total || item.totalEmployees;
        
        // For multi-day view, show daily averages
        let weeklyOff, onSiteRequirement, present, absent;
        
        if (daysInPeriod === 1) {
          // Single day: use daily values
          weeklyOff = item.singleDayWeeklyOff || item.weeklyOff;
          onSiteRequirement = item.singleDayOnSiteRequirement || (total - weeklyOff);
          present = item.singleDayActualPresent || (item.present - weeklyOff);
          absent = item.singleDayAbsent || item.absent;
        } else {
          // Multi-day: show daily averages
          weeklyOff = item.avgDailyWeeklyOff;
          onSiteRequirement = item.avgDailyOnSiteRequirement;
          present = item.avgDailyPresent;
          absent = item.avgDailyAbsent;
        }
        
        const rate = item.totalRequiredAttendance > 0 ? ((item.totalPresentAttendance / item.totalRequiredAttendance) * 100).toFixed(1) + '%' : '0.0%';
        const dataSource = item.isRealData ? 'Real Data' : 'Demo Data';
        
        return [
          `"${item.siteName || item.name}"`,
          `"${viewType === 'department' ? selectedDepartment : 'General'}"`,
          `"${item.date}"`,
          item.daysInPeriod,
          total,
          weeklyOff,
          onSiteRequirement,
          present,
          absent,
          rate,
          dataSource
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast.success(`Data exported to ${filename}`);
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/superadmin/dashboard');
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle view type change
  const handleViewTypeChange = (newViewType: 'site' | 'department') => {
    setViewType(newViewType);
    setCurrentPage(1);
    if (newViewType === 'site') {
      setSelectedDepartment('');
    } else if (newViewType === 'department' && !selectedDepartment) {
      setSelectedDepartment(departments[0]);
    }
  };

  // Handle view details click
  const handleViewDetails = (siteData: any) => {
    if (!siteData) return; // Add null check
    
    setSelectedSite(siteData);
    setShowSiteDetails(true);
    
    // Update URL params
    const params = new URLSearchParams();
    params.set('view', viewType);
    if (viewType === 'department') {
      params.set('department', selectedDepartment);
    }
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    params.set('siteDetails', 'true');
    params.set('selectedSiteId', siteData?.id || siteData?.siteId || ''); // Add optional chaining
    
    navigate(`?${params.toString()}`, { replace: true });
  };

  // Handle back from site details
  const handleBackFromDetails = () => {
    setShowSiteDetails(false);
    setSelectedSite(null);
    
    // Update URL params
    const params = new URLSearchParams();
    params.set('view', viewType);
    if (viewType === 'department') {
      params.set('department', selectedDepartment);
    }
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    
    navigate(`?${params.toString()}`, { replace: true });
  };

  // Load selected site from URL params on component mount
  useEffect(() => {
    if (initialSiteDetails && initialSelectedSiteId && displayData.length > 0) {
      const site = displayData.find(item => item.id === initialSelectedSiteId || item.siteId === initialSelectedSiteId);
      if (site) {
        setSelectedSite(site);
        setShowSiteDetails(true);
      }
    }
  }, [initialSiteDetails, initialSelectedSiteId, displayData]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Pagination Component
  const Pagination = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {filteredData.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      </div>
    );
  };

  // Refresh all data
  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchSitesData();
      toast.success('All data refreshed successfully');
    } catch (err: any) {
      toast.error('Failed to refresh data', {
        description: err.message || 'Please try again'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Check if we have real employee data
  const hasRealEmployeeData = useMemo(() => {
    return displayData.some(item => item.isRealData);
  }, [displayData]);

  // Render loading state
  if (loading && sites.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Sites Data</h2>
          <p className="text-gray-600">Fetching sites and employee data from the server...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && sites.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  // If showing site details, render the SiteEmployeeDetails component
  if (showSiteDetails) {
    return (
      <SiteEmployeeDetails
        siteData={selectedSite}
        onBack={handleBackFromDetails}
        viewType={viewType}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewType === 'department' 
                  ? `${selectedDepartment} Department Attendance`
                  : 'Site-wise Attendance Overview'
                }
              </h1>
              <p className="text-sm text-muted-foreground">
                {viewType === 'department'
                  ? `Showing cumulative attendance data for ${selectedDepartment} department across ${sites.length} sites`
                  : `Showing cumulative attendance data for ${sites.length} sites`
                } - {formatDateDisplay(startDate)} to {formatDateDisplay(endDate)} (${daysInPeriod} days)
                {hasRealEmployeeData && (
                  <span className="ml-2 text-green-600 font-medium">
                    • Connected to Employee API
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              disabled={refreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Data Source Status */}
      {hasRealEmployeeData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-800">Employee API Connected</h3>
                    <p className="text-sm text-green-700">
                      Real employee data is being fetched from the server. Click "View Details" to see employee check-in/check-out times.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Live Data
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* View Type Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">View Type</label>
                <Select value={viewType} onValueChange={handleViewTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select View Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Site View (Cumulative)
                      </div>
                    </SelectItem>
                    <SelectItem value="department">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Department View (Cumulative)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Selector (only shown in department view) */}
              {viewType === 'department' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Sites</label>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by site name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading indicator for data refresh */}
      {(refreshing || loading) && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-muted-foreground">
                  {refreshing ? 'Refreshing employee data...' : 'Loading data...'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Card className="bg-gray-50">
          <CardContent className="p-6">
            <div className="text-sm">
              <h3 className="font-semibold mb-2 text-lg">Duration-Based Calculations ({daysInPeriod} days):</h3>
              
              {/* Duration Calculations Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-green-700">Total Required</div>
                  <div className="text-green-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationTotalRequired.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Total Employees × {daysInPeriod} days
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-purple-700">Weekly Off</div>
                  <div className="text-purple-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationWeeklyOff.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Total weekly off for {daysInPeriod} days
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-amber-700">On Site Requirement</div>
                  <div className="text-amber-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationOnSiteRequirement.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Total Required - Total Weekly Off
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-blue-700">Present</div>
                  <div className="text-blue-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationPresent.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Total present for {daysInPeriod} days
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-red-700">Absent</div>
                  <div className="text-red-600 font-medium mt-2 text-2xl">
                    {overallTotals.durationAbsent.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Total absent for {daysInPeriod} days
                  </div>
                </div>
              </div>
              
              {/* Attendance Rate Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-green-700">Total Required Attendance</div>
                  <div className="text-green-600 font-medium mt-2 text-2xl">
                    {overallTotals.totalRequiredAttendance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = {overallTotals.totalEmployees} employees × {daysInPeriod} days
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-blue-700">Total Present Attendance</div>
                  <div className="text-blue-600 font-medium mt-2 text-2xl">
                    {overallTotals.totalPresentAttendance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = Sum of daily present counts
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-yellow-700">Attendance Rate</div>
                  <div className="text-yellow-600 font-medium mt-2 text-2xl">
                    {overallTotals.attendanceRate}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    = (Total Present ÷ Total Required) × 100
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-1">Calculation Rules for {daysInPeriod} days:</h4>
                <ul className="list-disc pl-5 text-yellow-700 space-y-1">
                  <li><strong>Total Required</strong> = Total Employees × Days in Period</li>
                  <li><strong>Weekly Off</strong> = Sum of daily weekly off counts for the period</li>
                  <li><strong>On Site Requirement</strong> = Total Required - Total Weekly Off</li>
                  <li><strong>Present</strong> = Sum of daily present counts (excluding weekly off) for the period</li>
                  <li><strong>Absent</strong> = Sum of daily absent counts for the period</li>
                  <li><strong>Attendance Rate</strong> = (Total Present Attendance ÷ Total Required Attendance) × 100</li>
                  <li><strong>Weekly off employees are counted in present attendance</strong></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Average Cards - Show what appears in the table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6"
      >
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Required (Daily Avg)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {columnValues.avgTotalRequired}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average daily total employees
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Weekly Off (Daily Avg)</p>
                <p className="text-2xl font-bold text-purple-600">
                  {columnValues.avgWeeklyOff}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average daily weekly off
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">On Site Requirement (Daily Avg)</p>
                <p className="text-2xl font-bold text-amber-600">
                  {columnValues.avgOnSiteRequirement}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average daily on-site requirement
                </p>
              </div>
              <div className="p-2 bg-amber-100 rounded-full">
                <Building className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Present (Daily Avg)</p>
                <p className="text-2xl font-bold text-green-600">
                  {columnValues.avgPresent}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average daily actual present
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Absent (Daily Avg)</p>
                <p className="text-2xl font-bold text-red-600">
                  {columnValues.avgAbsent}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average daily absent
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {viewType === 'department' 
                  ? `Showing ${daysInPeriod === 1 ? 'single day' : 'daily average'} data for ${selectedDepartment} department from ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)} (${daysInPeriod} days)`
                  : `Showing ${daysInPeriod === 1 ? 'single day' : 'daily average'} data for ${filteredData.length} sites from ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)} (${daysInPeriod} days)`
                }
                {hasRealEmployeeData && (
                  <span className="ml-2 text-green-600">
                    • Real employee data available
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={refreshing || loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={filteredData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Table - Original Columns with Duration Calculations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>
                {viewType === 'department' 
                  ? `${selectedDepartment} Sites Attendance - ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)} (${daysInPeriod} days)`
                  : `All Sites Attendance - ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)} (${daysInPeriod} days)`
                }
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {hasRealEmployeeData 
                  ? `${displayData.filter(item => item.isRealData).length} sites with real employee data`
                  : 'Using demo employee data'
                }
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? 'No sites match your search criteria. Try a different search term.'
                    : 'No sites available or all sites are filtered out.'}
                </p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Site Name
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Department
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-blue-700 bg-blue-50">
                          Total Required
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-purple-700 bg-purple-50">
                          Weekly Off
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-amber-700 bg-amber-50">
                          On Site Requirement
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-green-700 bg-green-50">
                          Present
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-red-700 bg-red-50">
                          Absent/Shortage
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Attendance Rate
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Data Source
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => {
                        const total = item.total || item.totalEmployees;
                        
                        // For table display, show daily averages for multi-day, daily values for single day
                        let weeklyOff, onSiteRequirement, present, absent;
                        
                        if (daysInPeriod === 1) {
                          // Single day: show actual daily values
                          weeklyOff = item.singleDayWeeklyOff || item.weeklyOff;
                          onSiteRequirement = item.singleDayOnSiteRequirement || (total - weeklyOff);
                          present = item.singleDayActualPresent || (item.present - weeklyOff);
                          absent = item.singleDayAbsent || item.absent;
                        } else {
                          // Multi-day: show daily averages
                          weeklyOff = item.avgDailyWeeklyOff;
                          onSiteRequirement = item.avgDailyOnSiteRequirement;
                          present = item.avgDailyPresent;
                          absent = item.avgDailyAbsent;
                        }
                        
                        const rate = item.totalRequiredAttendance > 0 ? ((item.totalPresentAttendance / item.totalRequiredAttendance) * 100).toFixed(1) : '0.0';
                        const status = parseFloat(rate) >= 90 ? 'Excellent' :
                                      parseFloat(rate) >= 80 ? 'Good' :
                                      parseFloat(rate) >= 70 ? 'Average' : 'Poor';

                        // Get the most common department from employees for this site
                        const departments = item.employees?.map((emp: Employee) => emp.department) || [];
                        const departmentCounts = departments.reduce((acc: {[key: string]: number}, dept: string) => {
                          acc[dept] = (acc[dept] || 0) + 1;
                          return acc;
                        }, {});
                        const primaryDepartment = Object.keys(departmentCounts).length > 0 
                          ? Object.keys(departmentCounts).reduce((a, b) => 
                              departmentCounts[a] > departmentCounts[b] ? a : b
                            )
                          : 'General';

                        return (
                          <tr key={item.siteId || item.id} className="border-b hover:bg-muted/50">
                            <td className="p-4 align-middle font-medium">
                              <div className="font-medium text-sm">{item.siteName || item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.daysInPeriod} {item.daysInPeriod === 1 ? 'day' : 'days'}
                                {daysInPeriod > 1 && (
                                  <div className="text-blue-600 mt-1">
                                    Total for period: {item.durationPresent.toLocaleString()} present
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {viewType === 'department' ? selectedDepartment : primaryDepartment}
                              </Badge>
                            </td>
                            
                            {/* Total Required - Show daily average for multi-day */}
                            <td className="p-4 align-middle font-bold text-blue-700 bg-blue-50">
                              {total}
                              {daysInPeriod > 1 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  × {daysInPeriod} days = {item.durationTotalRequired.toLocaleString()}
                                </div>
                              )}
                            </td>
                            
                            {/* Weekly Off - Show daily average for multi-day */}
                            <td className="p-4 align-middle font-bold text-purple-700 bg-purple-50">
                              {weeklyOff}
                              {daysInPeriod > 1 && (
                                <div className="text-xs text-purple-600 mt-1">
                                  Total: {item.durationWeeklyOff.toLocaleString()}
                                </div>
                              )}
                            </td>
                            
                            {/* On Site Requirement - Show daily average for multi-day */}
                            <td className="p-4 align-middle font-bold text-amber-700 bg-amber-50">
                              {onSiteRequirement}
                              {daysInPeriod > 1 && (
                                <div className="text-xs text-amber-600 mt-1">
                                  Total: {item.durationOnSiteRequirement.toLocaleString()}
                                </div>
                              )}
                            </td>
                            
                            {/* Present - Show daily average for multi-day */}
                            <td className="p-4 align-middle font-bold text-green-700 bg-green-50">
                              {present}
                              {daysInPeriod > 1 && (
                                <div className="text-xs text-green-600 mt-1">
                                  Total: {item.durationPresent.toLocaleString()}
                                </div>
                              )}
                            </td>
                            
                            {/* Absent/Shortage - Show daily average for multi-day */}
                            <td className="p-4 align-middle font-bold text-red-700 bg-red-50">
                              {absent}
                              {daysInPeriod > 1 && (
                                <div className="text-xs text-red-600 mt-1">
                                  Total: {item.durationAbsent.toLocaleString()}
                                </div>
                              )}
                            </td>
                            
                            {/* Attendance Rate */}
                            <td className="p-4 align-middle font-bold">
                              {rate}%
                            </td>
                            
                            {/* Data Source */}
                            <td className="p-4 align-middle">
                              <Badge variant={item.isRealData ? "default" : "outline"}>
                                {item.isRealData ? "Real Data" : "Demo Data"}
                              </Badge>
                            </td>
                            
                            {/* Status */}
                            <td className="p-4 align-middle">
                              <Badge variant={
                                status === 'Excellent' ? 'default' :
                                status === 'Good' ? 'secondary' :
                                status === 'Average' ? 'outline' : 'destructive'
                              }>
                                {status}
                              </Badge>
                            </td>
                            
                            {/* Actions */}
                            <td className="p-4 align-middle">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredData.length > 0 && <Pagination />}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sites Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Sites Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Sites Loaded</span>
                  <span className="text-lg font-bold text-blue-600">{sites.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Active Sites</span>
                  <span className="text-lg font-bold text-green-600">
                    {sites.filter(site => site.status === 'active').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Inactive Sites</span>
                  <span className="text-lg font-bold text-red-600">
                    {sites.filter(site => site.status === 'inactive').length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Staff Across All Sites</span>
                  <span className="text-lg font-bold text-purple-600">
                    {siteService.getTotalStaffAcrossSites(sites)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Contract Value</span>
                  <span className="text-lg font-bold text-amber-600">
                    {siteService.formatCurrency(siteService.getTotalContractValue(sites))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Sites with Real Data</span>
                  <span className="text-lg font-bold text-green-600">
                    {displayData.filter(item => item.isRealData).length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Last Updated:</span>{' '}
                  {sites.length > 0 ? 
                    new Date(Math.max(...sites.map(s => new Date(s.updatedAt || s.createdAt || Date.now()).getTime()))).toLocaleString() 
                    : 'Never'
                  }
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Employee Data Source:</span>{' '}
                  {hasRealEmployeeData ? 'Live API Connection' : 'Demo Data'}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">API Status:</span>{' '}
                  <a 
                    href={`${API_URL}/employees`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {hasRealEmployeeData ? 'Connected ✓' : 'Check Connection'}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SuperAdminAttendanceView;