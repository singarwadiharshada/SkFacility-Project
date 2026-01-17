import React, { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, XCircle, Clock, Users, BarChart3, Download, CalendarDays, LogIn, LogOut, ChevronLeft, ChevronRight, FileSpreadsheet, Crown, RefreshCw, AlertCircle, Search, FileText, Loader2, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// API base URL
const API_URL = `http://${window.location.hostname}:5001/api`;

// Get current supervisor info from localStorage
const getCurrentSupervisor = () => {
  const storedUser = localStorage.getItem("sk_user");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return {
        id: user._id || user.id || `supervisor-${Date.now()}`,
        name: user.name || user.firstName || 'Supervisor',
        supervisorId: user.supervisorId || user._id || `supervisor-${Date.now()}`
      };
    } catch (e) {
      console.error('Error parsing user:', e);
      return {
        id: `supervisor-${Date.now()}`,
        name: 'Supervisor',
        supervisorId: `supervisor-${Date.now()}`
      };
    }
  } else {
    // Fallback for development
    return {
      id: 'supervisor-001',
      name: 'Supervisor User',
      supervisorId: 'supervisor-001',
    };
  }
};

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

interface WeeklyAttendanceSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  weekStartDate: string;
  weekEndDate: string;
  daysPresent: number;
  daysAbsent: number;
  daysHalfDay: number;
  daysLeave: number;
  daysWeeklyOff: number;
  totalHours: number;
  totalBreakTime: number;
  overallStatus: 'present' | 'absent' | 'mixed';
}

interface SupervisorAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  supervisorId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: string;
  shift: string;
  hours: number;
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
  lastCheckInDate?: string | null;
}

const Attendance = () => {
  const [activeTab, setActiveTab] = useState("my-attendance");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Current supervisor info
  const [currentSupervisor, setCurrentSupervisor] = useState(getCurrentSupervisor());
  
  // Supervisor attendance states - ONLY CURRENT SUPERVISOR'S DATA
  const [supervisorAttendance, setSupervisorAttendance] = useState<SupervisorAttendanceRecord[]>([]);
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus | null>(null);
  const [loadingSupervisor, setLoadingSupervisor] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Employee attendance states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklyAttendanceSummary[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  
  // Manual attendance dialog
  const [manualAttendanceDialogOpen, setManualAttendanceDialogOpen] = useState(false);
  const [selectedEmployeeForManual, setSelectedEmployeeForManual] = useState<Employee | null>(null);
  const [manualAttendanceData, setManualAttendanceData] = useState({
    date: new Date().toISOString().split('T')[0],
    checkInTime: "",
    checkOutTime: "",
    breakStartTime: "",
    breakEndTime: "",
    status: "present" as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
    remarks: ""
  });

  // Week selection for register view
  const [selectedWeek, setSelectedWeek] = useState<number>(2);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  // Format time for display
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

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayAbbreviation = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeekDates = (year: number, month: number, weekNumber: number) => {
    const dates = [];
    const startDate = new Date(year, month, 1);
    
    while (startDate.getDay() !== 1) {
      startDate.setDate(startDate.getDate() + 1);
    }
    
    startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // SUPERVISOR ATTENDANCE FUNCTIONS - FOR CURRENT SUPERVISOR ONLY
  const loadSupervisorAttendance = async () => {
    try {
      setLoadingSupervisor(true);
      setApiError(null);
      
      console.log('🔄 Loading supervisor attendance for:', currentSupervisor.id);
      
      // Load current status
      try {
        const statusResponse = await fetch(`${API_URL}/api/attendance/status/${currentSupervisor.id}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success) {
            setCurrentStatus(statusData.data);
            console.log('✅ Current status loaded:', statusData.data);
          }
        }
      } catch (statusError) {
        console.log('Status API call failed:', statusError);
      }

      // Load attendance history - ONLY FOR CURRENT SUPERVISOR
      try {
        console.log('📋 Fetching attendance history for supervisor:', currentSupervisor.id);
        const historyResponse = await fetch(`${API_URL}/api/attendance/history?employeeId=${currentSupervisor.id}`);
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log('📊 Supervisor attendance history response:', historyData);
          
          if (historyData.success && Array.isArray(historyData.data)) {
            // Filter to include ONLY current supervisor's records
            const supervisorRecords = historyData.data.filter((record: any) => 
              record.employeeId === currentSupervisor.id || 
              record.supervisorId === currentSupervisor.id
            );
            
            console.log(`✅ Found ${supervisorRecords.length} records for current supervisor`);
            
            const transformedRecords = supervisorRecords.map((record: any, index: number) => {
              const recordDate = record.date ? record.date : 
                               new Date(Date.now() - index * 86400000).toISOString().split('T')[0];
              
              let status = "Absent";
              if (record.checkInTime && record.checkOutTime) {
                status = "Present";
              } else if (record.checkInTime && !record.checkOutTime) {
                status = "In Progress";
              } else if (record.status === "Weekly Off") {
                status = "Weekly Off";
              }
              
              return {
                id: record._id || record.id || `record-${index}`,
                employeeId: record.employeeId || currentSupervisor.id,
                employeeName: record.employeeName || currentSupervisor.name,
                supervisorId: record.supervisorId || currentSupervisor.supervisorId,
                date: recordDate,
                checkInTime: record.checkInTime ? formatTimeForDisplay(record.checkInTime) : "-",
                checkOutTime: record.checkOutTime ? formatTimeForDisplay(record.checkOutTime) : "-",
                breakStartTime: record.breakStartTime ? formatTimeForDisplay(record.breakStartTime) : "-",
                breakEndTime: record.breakEndTime ? formatTimeForDisplay(record.breakEndTime) : "-",
                totalHours: Number(record.totalHours) || 0,
                breakTime: Number(record.breakTime) || 0,
                status: status,
                shift: record.shift || "Supervisor Shift",
                hours: Number(record.totalHours) || 0
              };
            });
            
            transformedRecords.sort((a: SupervisorAttendanceRecord, b: SupervisorAttendanceRecord) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            
            setSupervisorAttendance(transformedRecords);
            return;
          }
        }
      } catch (historyError) {
        console.log('History API call failed:', historyError);
      }
      
      // Sample data - ONLY FOR CURRENT SUPERVISOR
      const sampleData: SupervisorAttendanceRecord[] = [
        {
          id: "today",
          employeeId: currentSupervisor.id,
          employeeName: currentSupervisor.name,
          supervisorId: currentSupervisor.supervisorId,
          date: new Date().toISOString().split('T')[0],
          checkInTime: currentStatus?.checkInTime ? formatTimeForDisplay(currentStatus.checkInTime) : "08:30 AM",
          checkOutTime: currentStatus?.checkOutTime ? formatTimeForDisplay(currentStatus.checkOutTime) : "-",
          breakStartTime: currentStatus?.breakStartTime ? formatTimeForDisplay(currentStatus.breakStartTime) : "-",
          breakEndTime: currentStatus?.breakEndTime ? formatTimeForDisplay(currentStatus.breakEndTime) : "-",
          totalHours: currentStatus?.totalHours || 0,
          breakTime: currentStatus?.breakTime || 0,
          status: currentStatus?.isCheckedIn ? 
                 (currentStatus.checkOutTime ? "Present" : "In Progress") : 
                 "Absent",
          shift: "Supervisor Shift",
          hours: currentStatus?.totalHours || 0
        },
        {
          id: "1",
          employeeId: currentSupervisor.id,
          employeeName: currentSupervisor.name,
          supervisorId: currentSupervisor.supervisorId,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          checkInTime: "08:45 AM",
          checkOutTime: "05:15 PM",
          breakStartTime: "01:00 PM",
          breakEndTime: "01:30 PM",
          totalHours: 8.5,
          breakTime: 0.5,
          status: "Present",
          shift: "Supervisor Shift",
          hours: 8.5
        },
        {
          id: "2",
          employeeId: currentSupervisor.id,
          employeeName: currentSupervisor.name,
          supervisorId: currentSupervisor.supervisorId,
          date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          checkInTime: "09:00 AM",
          checkOutTime: "04:30 PM",
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 7.5,
          breakTime: 0.5,
          status: "Present",
          shift: "Supervisor Shift",
          hours: 7.5
        },
        {
          id: "3",
          employeeId: currentSupervisor.id,
          employeeName: currentSupervisor.name,
          supervisorId: currentSupervisor.supervisorId,
          date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
          checkInTime: "-",
          checkOutTime: "-",
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 0,
          breakTime: 0,
          status: "Absent",
          shift: "Supervisor Shift",
          hours: 0
        }
      ];
      
      setSupervisorAttendance(sampleData);
      
    } catch (error) {
      console.error('Error loading supervisor attendance:', error);
      setApiError("Error loading attendance data");
    } finally {
      setLoadingSupervisor(false);
    }
  };

  // Handle check-in for current supervisor
  const handleCheckIn = async () => {
    try {
      console.log('🔄 Attempting check-in for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
      };
      
      const response = await fetch(`${API_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Checked in successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const newStatus = {
          ...currentStatus,
          isCheckedIn: true,
          checkInTime: now,
          checkOutTime: null,
          lastCheckInDate: new Date().toDateString()
        };
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error checking in");
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error("Error checking in");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const newStatus = {
        ...currentStatus,
        isCheckedIn: true,
        checkInTime: now,
        checkOutTime: null,
        lastCheckInDate: new Date().toDateString()
      };
      setCurrentStatus(newStatus);
    }
  };

  // Handle check-out for current supervisor
  const handleCheckOut = async () => {
    try {
      console.log('🔄 Attempting check-out for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await fetch(`${API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Checked out successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const totalHours = calculateTotalHours(currentStatus?.checkInTime, now);
        const newStatus = {
          ...currentStatus,
          isCheckedIn: false,
          isOnBreak: false,
          checkOutTime: now,
          totalHours: totalHours
        };
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error checking out");
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error("Error checking out");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const totalHours = calculateTotalHours(currentStatus?.checkInTime, now);
      const newStatus = {
        ...currentStatus,
        isCheckedIn: false,
        isOnBreak: false,
        checkOutTime: now,
        totalHours: totalHours
      };
      setCurrentStatus(newStatus);
    }
  };

  // Handle break in for current supervisor
  const handleBreakIn = async () => {
    try {
      console.log('🔄 Starting break for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await fetch(`${API_URL}/api/attendance/breakin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Break started successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const newStatus = {
          ...currentStatus,
          isOnBreak: true,
          breakStartTime: now
        };
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error starting break");
      }
    } catch (error) {
      console.error('Break-in error:', error);
      toast.error("Error starting break");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const newStatus = {
        ...currentStatus,
        isOnBreak: true,
        breakStartTime: now
      };
      setCurrentStatus(newStatus);
    }
  };

  // Handle break out for current supervisor
  const handleBreakOut = async () => {
    try {
      console.log('🔄 Ending break for supervisor:', currentSupervisor.id);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await fetch(`${API_URL}/api/attendance/breakout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Break ended successfully!");
        
        // Update local state
        const now = new Date().toISOString();
        const breakTime = calculateBreakTime(currentStatus?.breakStartTime, now);
        const totalBreakTime = (Number(currentStatus?.breakTime) || 0) + breakTime;
        const newStatus = {
          ...currentStatus,
          isOnBreak: false,
          breakEndTime: now,
          breakTime: totalBreakTime
        };
        setCurrentStatus(newStatus);
        
        // Reload supervisor attendance
        loadSupervisorAttendance();
      } else {
        toast.error(data.message || "Error ending break");
      }
    } catch (error) {
      console.error('Break-out error:', error);
      toast.error("Error ending break");
      
      // Fallback: Update local state
      const now = new Date().toISOString();
      const breakTime = calculateBreakTime(currentStatus?.breakStartTime, now);
      const totalBreakTime = (Number(currentStatus?.breakTime) || 0) + breakTime;
      const newStatus = {
        ...currentStatus,
        isOnBreak: false,
        breakEndTime: now,
        breakTime: totalBreakTime
      };
      setCurrentStatus(newStatus);
    }
  };

  // NEW EMPLOYEE ATTENDANCE FUNCTIONS
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      console.log('Fetching employees from:', `${API_URL}/api/employees`);
      
      const response = await fetch(`${API_URL}/api/employees`);
      const data = await response.json();
      
      console.log('Employees API response:', data);
      
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
        
        // Transform employee data to match our interface
        const transformedEmployees = employeesData.map((emp: any) => ({
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
        
        console.log('Transformed employees:', transformedEmployees);
        setEmployees(transformedEmployees);
        
        if (transformedEmployees.length === 0) {
          toast.warning("No employees found in the database");
        } else {
          toast.success(`Loaded ${transformedEmployees.length} employees`);
        }
      } else {
        console.error('Failed to load employees:', data.message || data.error);
        toast.error(data.message || "Failed to load employees");
        
        // Load sample data if API fails
        loadSampleEmployees();
      }
    } catch (error: any) {
      console.error('Error loading employees:', error);
      toast.error(`Error loading employees: ${error.message}`);
      
      // Load sample data on error
      loadSampleEmployees();
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load sample employees if API fails
  const loadSampleEmployees = () => {
    const sampleEmployees: Employee[] = [
      {
        _id: "emp_1",
        employeeId: "EMP001",
        name: "John Doe",
        email: "john@example.com",
        phone: "9876543210",
        department: "Housekeeping",
        position: "Cleaner",
        siteName: "Main Site",
        status: "active",
        salary: 18000
      },
      {
        _id: "emp_2",
        employeeId: "EMP002",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "9876543211",
        department: "Security",
        position: "Security Guard",
        siteName: "Site A",
        status: "active",
        salary: 20000
      },
      {
        _id: "emp_3",
        employeeId: "EMP003",
        name: "Mike Johnson",
        email: "mike@example.com",
        phone: "9876543212",
        department: "Housekeeping",
        position: "Supervisor",
        siteName: "Main Site",
        status: "active",
        salary: 25000
      },
      {
        _id: "emp_4",
        employeeId: "EMP004",
        name: "Sarah Williams",
        email: "sarah@example.com",
        phone: "9876543213",
        department: "Waste Management",
        position: "Worker",
        siteName: "Site B",
        status: "active",
        salary: 15000
      },
      {
        _id: "emp_5",
        employeeId: "EMP005",
        name: "David Brown",
        email: "david@example.com",
        phone: "9876543214",
        department: "Parking",
        position: "Attendant",
        siteName: "Main Site",
        status: "inactive",
        salary: 16000
      }
    ];
    
    setEmployees(sampleEmployees);
    toast.info("Using sample employee data. Check your API connection.");
  };

  const loadAttendanceRecords = async (date: string) => {
    try {
      setLoadingAttendance(true);
      console.log('📋 Fetching attendance for date:', date);
      
      const response = await fetch(`${API_URL}/api/attendance?date=${date}`);
      const data = await response.json();
      
      console.log('Attendance API response:', data);
      
      if (data.success) {
        // Process records to ensure no negative hours
        const processedRecords = (data.data || []).map((record: any) => {
          if (record.checkInTime && record.checkOutTime) {
            // Recalculate hours if they're negative
            const calculatedHours = calculateTotalHours(record.checkInTime, record.checkOutTime);
            if (calculatedHours > 0 && record.totalHours < 0) {
              record.totalHours = calculatedHours;
            }
          }
          return record;
        });
        
        setAttendanceRecords(processedRecords);
      } else {
        console.error('Failed to load attendance:', data.message);
        setAttendanceRecords([]);
        
        // Load sample attendance data
        loadSampleAttendance(date);
      }
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      setAttendanceRecords([]);
      
      // Load sample attendance data on error
      loadSampleAttendance(date);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Load sample attendance data
  const loadSampleAttendance = (date: string) => {
    const sampleAttendance: AttendanceRecord[] = [
      {
        _id: "att_1",
        employeeId: "emp_1",
        employeeName: "John Doe",
        date: date,
        checkInTime: `${date}T09:00:00`,
        checkOutTime: `${date}T18:00:00`,
        breakStartTime: `${date}T13:00:00`,
        breakEndTime: `${date}T14:00:00`,
        totalHours: 8,
        breakTime: 1,
        status: "present",
        isCheckedIn: false,
        isOnBreak: false,
        supervisorId: currentSupervisor.supervisorId
      },
      {
        _id: "att_2",
        employeeId: "emp_2",
        employeeName: "Jane Smith",
        date: date,
        checkInTime: `${date}T14:00:00`,
        checkOutTime: `${date}T22:00:00`,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 8,
        breakTime: 0,
        status: "present",
        isCheckedIn: false,
        isOnBreak: false,
        supervisorId: currentSupervisor.supervisorId
      },
      {
        _id: "att_3",
        employeeId: "emp_3",
        employeeName: "Mike Johnson",
        date: date,
        checkInTime: `${date}T08:30:00`,
        checkOutTime: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: "present",
        isCheckedIn: true,
        isOnBreak: false,
        supervisorId: currentSupervisor.supervisorId
      },
      {
        _id: "att_4",
        employeeId: "emp_4",
        employeeName: "Sarah Williams",
        date: date,
        checkInTime: null,
        checkOutTime: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: "absent",
        isCheckedIn: false,
        isOnBreak: false,
        supervisorId: currentSupervisor.supervisorId
      },
      {
        _id: "att_5",
        employeeId: "emp_5",
        employeeName: "David Brown",
        date: date,
        checkInTime: null,
        checkOutTime: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: "weekly-off",
        isCheckedIn: false,
        isOnBreak: false,
        supervisorId: currentSupervisor.supervisorId
      }
    ];
    
    setAttendanceRecords(sampleAttendance);
  };

  const formatHours = (hours: number): string => {
    if (hours < 0) {
      return "0.00 hrs";
    }
    return `${hours.toFixed(2)} hrs`;
  };

  // Helper functions for time calculations
  const calculateTotalHours = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    
    try {
      // Parse times safely
      const parseTime = (timeStr: string): Date => {
        if (timeStr.includes('T')) {
          return new Date(timeStr);
        }
        
        // Handle time strings like "18:43"
        const today = new Date().toISOString().split('T')[0];
        return new Date(`${today}T${timeStr}`);
      };

      const checkIn = parseTime(start);
      const checkOut = parseTime(end);
      
      // Check if dates are valid
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return 0;
      }
      
      // If check-out is earlier than check-in, it might be next day (for night shifts)
      let diffMs = checkOut.getTime() - checkIn.getTime();
      
      // If negative, assume next day (for overnight shifts)
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
      }
      
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Ensure hours are positive and reasonable
      return Math.max(0, Math.min(diffHours, 24)); // Max 24 hours per day
    } catch (error) {
      console.error('Error calculating hours:', error);
      return 0;
    }
  };

  const calculateBreakTime = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return (endTime - startTime) / (1000 * 60 * 60);
  };

  // Load weekly summaries
  const loadWeeklySummaries = async (weekStart: string, weekEnd: string) => {
    try {
      setLoadingWeekly(true);
      console.log('📋 Fetching weekly summary for:', { weekStart, weekEnd });
      
      // First, try to get weekly summary from the API endpoint
      try {
        const weeklyResponse = await fetch(
          `${API_URL}/api/attendance/weekly-summary?startDate=${weekStart}&endDate=${weekEnd}`
        );
        
        if (weeklyResponse.ok) {
          const weeklyData = await weeklyResponse.json();
          console.log('Weekly summary API response:', weeklyData);
          
          if (weeklyData.success && Array.isArray(weeklyData.data)) {
            // Transform the data to match our interface
            const transformedSummaries = weeklyData.data.map((item: any) => ({
              employeeId: item.employeeId || item._id || `emp_${Math.random()}`,
              employeeName: item.employeeName || "Unknown Employee",
              department: item.department || "Unknown",
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
              daysPresent: item.daysPresent || item.presentDays || 0,
              daysAbsent: item.daysAbsent || item.absentDays || 0,
              daysHalfDay: item.daysHalfDay || item.halfDays || 0,
              daysLeave: item.daysLeave || item.leaveDays || 0,
              daysWeeklyOff: item.daysWeeklyOff || item.weeklyOffDays || 0,
              totalHours: item.totalHours || item.workingHours || 0,
              totalBreakTime: item.totalBreakTime || item.breakHours || 0,
              overallStatus: (item.overallStatus || 'absent') as 'present' | 'absent' | 'mixed'
            }));
            
            console.log('Transformed weekly summaries:', transformedSummaries);
            setWeeklySummaries(transformedSummaries);
            return;
          }
        }
      } catch (weeklyError) {
        console.log('Weekly summary API failed, trying bulk attendance fetch:', weeklyError);
      }
      
      // If weekly summary API fails, try to fetch all attendance records for the week
      await fetchAllAttendanceForWeek(weekStart, weekEnd);
      
    } catch (error) {
      console.error('Error loading weekly summaries:', error);
      toast.error("Error loading weekly attendance data");
      
      // Try to calculate from existing data as fallback
      try {
        calculateWeeklySummaryFromExistingData(weekStart, weekEnd);
      } catch (calcError) {
        console.error('Fallback calculation failed:', calcError);
        // Show empty state with all employees marked as absent
        showEmptyWeeklySummary(weekStart, weekEnd);
      }
    } finally {
      setLoadingWeekly(false);
    }
  };

  const fetchAllAttendanceForWeek = async (weekStart: string, weekEnd: string) => {
    try {
      console.log('📋 Fetching bulk attendance for week:', { weekStart, weekEnd });
      
      // Use the attendance range endpoint if available
      const response = await fetch(
        `${API_URL}/api/attendance/range?startDate=${weekStart}&endDate=${weekEnd}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Bulk attendance response:', data);
        
        if (data.success && Array.isArray(data.data)) {
          // Process the attendance records
          calculateWeeklySummaryFromAttendanceRecords(data.data, weekStart, weekEnd);
          return;
        }
      }
      
      // If bulk endpoint fails, fetch day by day
      await fetchAttendanceDayByDay(weekStart, weekEnd);
      
    } catch (error) {
      console.error('Error fetching bulk attendance:', error);
      await fetchAttendanceDayByDay(weekStart, weekEnd);
    }
  };

  const fetchAttendanceDayByDay = async (weekStart: string, weekEnd: string) => {
    try {
      // Create array of all dates in the week
      const startDate = new Date(weekStart);
      const endDate = new Date(weekEnd);
      const dates = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dates.push(formatDate(new Date(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Fetch attendance for each date
      const allAttendanceRecords: AttendanceRecord[] = [];
      const fetchPromises = dates.map(async (date) => {
        try {
          const response = await fetch(`${API_URL}/api/attendance?date=${date}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
              return data.data;
            }
          }
        } catch (error) {
          console.log(`Failed to fetch attendance for ${date}:`, error);
        }
        return [];
      });
      
      // Wait for all fetches to complete
      const results = await Promise.all(fetchPromises);
      
      // Flatten the results
      results.forEach(records => {
        if (Array.isArray(records)) {
          allAttendanceRecords.push(...records);
        }
      });
      
      console.log(`Fetched ${allAttendanceRecords.length} attendance records for the week`);
      
      if (allAttendanceRecords.length > 0) {
        calculateWeeklySummaryFromAttendanceRecords(allAttendanceRecords, weekStart, weekEnd);
      } else {
        // No attendance records found
        calculateWeeklySummaryFromExistingData(weekStart, weekEnd);
      }
      
    } catch (error) {
      console.error('Error fetching day-by-day attendance:', error);
      calculateWeeklySummaryFromExistingData(weekStart, weekEnd);
    }
  };

  const calculateWeeklySummaryFromAttendanceRecords = (records: any[], weekStart: string, weekEnd: string) => {
    const employeeMap = new Map<string, WeeklyAttendanceSummary>();
    
    // Initialize with all employees
    employees.forEach(employee => {
      employeeMap.set(employee._id, {
        employeeId: employee._id,
        employeeName: employee.name,
        department: employee.department,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        daysPresent: 0,
        daysAbsent: 0,
        daysHalfDay: 0,
        daysLeave: 0,
        daysWeeklyOff: 0,
        totalHours: 0,
        totalBreakTime: 0,
        overallStatus: 'absent'
      });
    });
    
    // Process all attendance records
    records.forEach(record => {
      const employeeId = record.employeeId || record.employee?._id;
      if (employeeId) {
        const summary = employeeMap.get(employeeId);
        if (summary) {
          const status = record.status?.toLowerCase() || 'absent';
          
          switch (status) {
            case 'present':
              summary.daysPresent++;
              summary.totalHours += record.totalHours || 0;
              break;
            case 'absent':
              summary.daysAbsent++;
              break;
            case 'half-day':
            case 'halfday':
              summary.daysHalfDay++;
              summary.totalHours += record.totalHours || (record.totalHours || 0) / 2;
              break;
            case 'leave':
              summary.daysLeave++;
              break;
            case 'weekly-off':
            case 'weeklyoff':
              summary.daysWeeklyOff++;
              break;
            default:
              // If status is unknown but has check-in time, count as present
              if (record.checkInTime) {
                summary.daysPresent++;
                summary.totalHours += record.totalHours || 0;
              } else {
                summary.daysAbsent++;
              }
          }
          
          summary.totalBreakTime += record.breakTime || 0;
        }
      }
    });
    
    // Calculate overall status for each employee
    const summaries = Array.from(employeeMap.values()).map(summary => {
      const totalDays = summary.daysPresent + summary.daysAbsent + summary.daysHalfDay + 
                       summary.daysLeave + summary.daysWeeklyOff;
      
      // If employee has no records for the week at all, mark as absent for all days
      if (totalDays === 0) {
        summary.daysAbsent = 7;
        summary.overallStatus = 'absent';
      } else {
        // Calculate attendance percentage
        const attendanceDays = summary.daysPresent + summary.daysHalfDay * 0.5;
        const attendancePercentage = attendanceDays / totalDays;
        
        if (attendancePercentage >= 0.8) {
          summary.overallStatus = 'present';
        } else if (summary.daysAbsent / totalDays >= 0.8) {
          summary.overallStatus = 'absent';
        } else {
          summary.overallStatus = 'mixed';
        }
        
        // Fill remaining days as absent if total days is less than 7
        const recordedDays = totalDays;
        if (recordedDays < 7) {
          summary.daysAbsent += (7 - recordedDays);
        }
      }
      
      return summary;
    });
    
    console.log('Calculated weekly summaries:', summaries);
    setWeeklySummaries(summaries);
  };

  const calculateWeeklySummaryFromExistingData = (weekStart: string, weekEnd: string) => {
    // Filter existing attendance records for the week
    const weekRecords = attendanceRecords.filter(record => {
      try {
        const recordDate = new Date(record.date);
        const startDate = new Date(weekStart);
        const endDate = new Date(weekEnd);
        return recordDate >= startDate && recordDate <= endDate;
      } catch (error) {
        return false;
      }
    });

    const employeeMap = new Map<string, WeeklyAttendanceSummary>();

    // Initialize with all employees
    employees.forEach(employee => {
      employeeMap.set(employee._id, {
        employeeId: employee._id,
        employeeName: employee.name,
        department: employee.department,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        daysPresent: 0,
        daysAbsent: 0,
        daysHalfDay: 0,
        daysLeave: 0,
        daysWeeklyOff: 0,
        totalHours: 0,
        totalBreakTime: 0,
        overallStatus: 'absent'
      });
    });

    // Process attendance records
    weekRecords.forEach(record => {
      const summary = employeeMap.get(record.employeeId);
      if (summary) {
        switch (record.status) {
          case 'present':
            summary.daysPresent++;
            summary.totalHours += record.totalHours || 0;
            break;
          case 'absent':
            summary.daysAbsent++;
            break;
          case 'half-day':
            summary.daysHalfDay++;
            summary.totalHours += record.totalHours || 0;
            break;
          case 'leave':
            summary.daysLeave++;
            break;
          case 'weekly-off':
            summary.daysWeeklyOff++;
            break;
        }
        summary.totalBreakTime += record.breakTime || 0;
      }
    });

    // Calculate overall status
    const summaries = Array.from(employeeMap.values()).map(summary => {
      const totalDays = summary.daysPresent + summary.daysAbsent + summary.daysHalfDay + 
                       summary.daysLeave + summary.daysWeeklyOff;
      
      if (totalDays > 0) {
        const attendanceRate = (summary.daysPresent + summary.daysHalfDay * 0.5) / totalDays;
        if (attendanceRate >= 0.8) {
          summary.overallStatus = 'present';
        } else if (summary.daysAbsent / totalDays >= 0.8) {
          summary.overallStatus = 'absent';
        } else {
          summary.overallStatus = 'mixed';
        }
        
        // Fill remaining days
        if (totalDays < 7) {
          summary.daysAbsent += (7 - totalDays);
        }
      } else {
        // No attendance records for this employee
        summary.daysAbsent = 7;
        summary.overallStatus = 'absent';
      }
      
      return summary;
    });

    console.log('Weekly summaries from existing data:', summaries);
    setWeeklySummaries(summaries);
  };

  const showEmptyWeeklySummary = (weekStart: string, weekEnd: string) => {
    const summaries = employees.map(employee => ({
      employeeId: employee._id,
      employeeName: employee.name,
      department: employee.department,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      daysPresent: 0,
      daysAbsent: 7,
      daysHalfDay: 0,
      daysLeave: 0,
      daysWeeklyOff: 0,
      totalHours: 0,
      totalBreakTime: 0,
      overallStatus: 'absent' as const
    }));
    
    setWeeklySummaries(summaries);
  };

  // Load data on component mount and when date changes
  useEffect(() => {
    // Refresh current supervisor info
    setCurrentSupervisor(getCurrentSupervisor());
    
    // Load data
    loadSupervisorAttendance();
    loadEmployees();
    loadAttendanceRecords(selectedDate);
  }, [selectedDate]);

  // Load weekly summaries when week changes
  useEffect(() => {
    if (employees.length > 0) {
      const weekDates = getWeekDates(selectedYear, selectedMonth, selectedWeek);
      const weekStart = formatDate(weekDates[0]);
      const weekEnd = formatDate(weekDates[6]);
      loadWeeklySummaries(weekStart, weekEnd);
    }
  }, [selectedYear, selectedMonth, selectedWeek, employees]);

  const weekDates = getWeekDates(selectedYear, selectedMonth, selectedWeek);

  const handlePreviousWeek = () => {
    if (selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1);
    } else {
      if (selectedMonth > 0) {
        setSelectedMonth(selectedMonth - 1);
        setSelectedWeek(5);
      } else {
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(11);
        setSelectedWeek(5);
      }
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek < 5) {
      setSelectedWeek(selectedWeek + 1);
    } else {
      if (selectedMonth < 11) {
        setSelectedMonth(selectedMonth + 1);
        setSelectedWeek(1);
      } else {
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(0);
        setSelectedWeek(1);
      }
    }
  };

  // Employee attendance functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return "bg-green-100 text-green-800 border-green-200";
      case 'absent':
        return "bg-red-100 text-red-800 border-red-200";
      case 'half-day':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'leave':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'weekly-off':
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="mr-1 h-3 w-3" />;
      case 'absent':
        return <XCircle className="mr-1 h-3 w-3" />;
      case 'half-day':
        return <Clock className="mr-1 h-3 w-3" />;
      case 'leave':
        return <Calendar className="mr-1 h-3 w-3" />;
      case 'weekly-off':
        return <Calendar className="mr-1 h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleManualAttendance = (employee: Employee) => {
    setSelectedEmployeeForManual(employee);
    setManualAttendanceData({
      date: selectedDate,
      checkInTime: "",
      checkOutTime: "",
      breakStartTime: "",
      breakEndTime: "",
      status: "present",
      remarks: ""
    });
    setManualAttendanceDialogOpen(true);
  };

  // Update manual attendance submission
  const submitManualAttendance = async () => {
    if (!selectedEmployeeForManual) return;

    try {
      let totalHours = 0;
      if (manualAttendanceData.checkInTime && manualAttendanceData.checkOutTime) {
        // Use the fixed calculation function
        totalHours = calculateTotalHours(
          `${manualAttendanceData.date}T${manualAttendanceData.checkInTime}`,
          `${manualAttendanceData.date}T${manualAttendanceData.checkOutTime}`
        );
      }

      const response = await fetch(`${API_URL}/api/attendance/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeForManual._id,
          employeeName: selectedEmployeeForManual.name,
          date: manualAttendanceData.date,
          checkInTime: manualAttendanceData.checkInTime ? `${manualAttendanceData.date}T${manualAttendanceData.checkInTime}` : null,
          checkOutTime: manualAttendanceData.checkOutTime ? `${manualAttendanceData.date}T${manualAttendanceData.checkOutTime}` : null,
          breakStartTime: manualAttendanceData.breakStartTime ? `${manualAttendanceData.date}T${manualAttendanceData.breakStartTime}` : null,
          breakEndTime: manualAttendanceData.breakEndTime ? `${manualAttendanceData.date}T${manualAttendanceData.breakEndTime}` : null,
          status: manualAttendanceData.status,
          remarks: manualAttendanceData.remarks,
          totalHours: totalHours,
          isCheckedIn: !!manualAttendanceData.checkInTime && !manualAttendanceData.checkOutTime,
          supervisorId: currentSupervisor.supervisorId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Attendance recorded successfully!");
        setManualAttendanceDialogOpen(false);
        loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error recording attendance");
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error("Error recording attendance");
    }
  };

  const handleEmployeeCheckIn = async (employee: Employee) => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee._id,
          employeeName: employee.name,
          supervisorId: currentSupervisor.supervisorId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${employee.name} checked in successfully!`);
        loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error checking in");
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error("Error checking in");
    }
  };

  const handleEmployeeCheckOut = async (employee: Employee) => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee._id,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${employee.name} checked out successfully!`);
        loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error checking out");
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error("Error checking out");
    }
  };

  const handleEmployeeBreakIn = async (employee: Employee) => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/breakin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee._id,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${employee.name} break started!`);
        loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error starting break");
      }
    } catch (error) {
      console.error('Break-in error:', error);
      toast.error("Error starting break");
    }
  };

  const handleEmployeeBreakOut = async (employee: Employee) => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/breakout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee._id,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${employee.name} break ended!`);
        loadAttendanceRecords(selectedDate);
      } else {
        toast.error(data.message || "Error ending break");
      }
    } catch (error) {
      console.error('Break-out error:', error);
      toast.error("Error ending break");
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment;
    const matchesSite = selectedSite === "all" || employee.siteName === selectedSite;
    
    return matchesSearch && matchesDepartment && matchesSite;
  });

  const departments = Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean);
  const sites = Array.from(new Set(employees.map(emp => emp.siteName))).filter(Boolean);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDepartment("all");
    setSelectedSite("all");
  };

  const getEmployeeAttendanceRecord = (employeeId: string) => {
    return attendanceRecords.find(record => 
      record.employeeId === employeeId && record.date === selectedDate
    );
  };

  const calculateAttendanceStats = () => {
    const records = attendanceRecords.filter(record => record.date === selectedDate);
    const totalEmployees = filteredEmployees.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const halfDayCount = records.filter(r => r.status === 'half-day').length;
    const leaveCount = records.filter(r => r.status === 'leave').length;
    const weeklyOffCount = records.filter(r => r.status === 'weekly-off').length;
    const checkedInCount = records.filter(r => r.isCheckedIn).length;
    
    return {
      totalEmployees,
      presentCount,
      absentCount,
      halfDayCount,
      leaveCount,
      weeklyOffCount,
      checkedInCount,
      attendanceRate: totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0
    };
  };

  const stats = calculateAttendanceStats();

  const sortedAttendanceData = [...supervisorAttendance].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleRefresh = () => {
    // Refresh current supervisor info
    setCurrentSupervisor(getCurrentSupervisor());
    
    // Refresh data
    loadSupervisorAttendance();
    loadEmployees();
    loadAttendanceRecords(selectedDate);
    
    // Also refresh weekly data
    const weekDates = getWeekDates(selectedYear, selectedMonth, selectedWeek);
    const weekStart = formatDate(weekDates[0]);
    const weekEnd = formatDate(weekDates[6]);
    loadWeeklySummaries(weekStart, weekEnd);
    
    toast.success("Attendance data refreshed!");
  };

  if (loadingSupervisor && activeTab === "my-attendance") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Attendance Management" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Current User Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-800">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-300">
                  Current User: {currentSupervisor.name}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  ID: {currentSupervisor.id} | Role: Supervisor
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                  Viewing your attendance data only
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh All
            </Button>
          </div>
        </div>

        {apiError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Note</p>
              <p className="text-sm text-yellow-700">{apiError}</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="my-attendance" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="employee-attendance" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Attendance
            </TabsTrigger>
            <TabsTrigger value="weekly-register" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Weekly Register
            </TabsTrigger>
          </TabsList>

          {/* My Attendance Tab - Shows ONLY current supervisor's data */}
          <TabsContent value="my-attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's Actions - {currentSupervisor.name}
                </CardTitle>
                <CardDescription>
                  Check in/out and manage breaks for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Current Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Check In Status</p>
                        <p className={`text-xl font-bold ${currentStatus?.isCheckedIn ? 'text-green-600' : 'text-red-600'}`}>
                          {currentStatus?.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Break Status</p>
                        <p className={`text-xl font-bold ${currentStatus?.isOnBreak ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {currentStatus?.isOnBreak ? 'On Break' : 'Not on Break'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Check In Time</p>
                        <p className="text-xl font-bold">
                          {currentStatus?.checkInTime ? formatTimeForDisplay(currentStatus.checkInTime) : '--:--'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Hours</p>
                        <p className="text-xl font-bold">
                          {currentStatus?.totalHours ? currentStatus.totalHours.toFixed(2) : '0.00'} hrs
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={handleCheckIn}
                        disabled={currentStatus?.isCheckedIn}
                        className="h-12"
                      >
                        <LogIn className="mr-2 h-5 w-5" />
                        Check In
                      </Button>
                      <Button 
                        onClick={handleCheckOut}
                        disabled={!currentStatus?.isCheckedIn}
                        variant="outline"
                        className="h-12"
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        Check Out
                      </Button>
                      <Button 
                        onClick={handleBreakIn}
                        disabled={!currentStatus?.isCheckedIn || currentStatus?.isOnBreak}
                        variant="secondary"
                        className="h-12"
                      >
                        <Clock className="mr-2 h-5 w-5" />
                        Start Break
                      </Button>
                      <Button 
                        onClick={handleBreakOut}
                        disabled={!currentStatus?.isOnBreak}
                        variant="secondary"
                        className="h-12"
                      >
                        <Clock className="mr-2 h-5 w-5" />
                        End Break
                      </Button>
                    </div>
                    <div className="pt-4">
                      <Button 
                        onClick={handleRefresh}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Status
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <div>
                    <CardTitle>My Attendance History</CardTitle>
                    <CardDescription>
                      Your personal attendance records
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Data exported!")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Showing only your attendance records. You are viewing: <strong>{currentSupervisor.name}</strong>
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Break In</TableHead>
                      <TableHead>Break Out</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Break Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAttendanceData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                            {record.shift}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <LogIn className="h-4 w-4 text-muted-foreground" />
                            {record.checkInTime || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-muted-foreground" />
                            {record.checkOutTime || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {record.breakStartTime || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {record.breakEndTime || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {record.hours.toFixed(2)} hrs
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {record.breakTime.toFixed(2)} hrs
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(record.status.toLowerCase())}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {sortedAttendanceData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No attendance records found for you.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employee Attendance Tab */}
          <TabsContent value="employee-attendance" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">All departments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.presentCount}</div>
                  <p className="text-xs text-muted-foreground">Checked in: {stats.checkedInCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.absentCount}</div>
                  <p className="text-xs text-muted-foreground">Employees absent</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.attendanceRate}%</div>
                  <p className="text-xs text-muted-foreground">Overall rate</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    <div>
                      <CardTitle>Team Attendance - {selectedDate}</CardTitle>
                      <CardDescription>Manage attendance for team employees</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="attendance-date" className="text-sm">Date:</Label>
                      <Input
                        id="attendance-date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <Button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                      Today
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Site" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sites</SelectItem>
                        {sites.map(site => (
                          <SelectItem key={site} value={site}>{site}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={clearFilters} className="w-full">
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {loadingEmployees || loadingAttendance ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading data...</span>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Site</TableHead>
                              <TableHead>Check In</TableHead>
                              <TableHead>Check Out</TableHead>
                              <TableHead>Break In</TableHead>
                              <TableHead>Break Out</TableHead>
                              <TableHead className="text-right">Hours</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEmployees.map((employee) => {
                              const attendanceRecord = getEmployeeAttendanceRecord(employee._id);
                              
                              return (
                                <TableRow key={employee._id}>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{employee.name}</span>
                                      <span className="text-sm text-muted-foreground">{employee.employeeId}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{employee.department}</TableCell>
                                  <TableCell>{employee.siteName}</TableCell>
                                  <TableCell>
                                    {attendanceRecord?.checkInTime ? (
                                      <div className="flex items-center gap-2">
                                        <LogIn className="h-4 w-4 text-muted-foreground" />
                                        {formatTimeForDisplay(attendanceRecord.checkInTime)}
                                      </div>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {attendanceRecord?.checkOutTime ? (
                                      <div className="flex items-center gap-2">
                                        <LogOut className="h-4 w-4 text-muted-foreground" />
                                        {formatTimeForDisplay(attendanceRecord.checkOutTime)}
                                      </div>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {attendanceRecord?.breakStartTime ? (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {formatTimeForDisplay(attendanceRecord.breakStartTime)}
                                      </div>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {attendanceRecord?.breakEndTime ? (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {formatTimeForDisplay(attendanceRecord.breakEndTime)}
                                      </div>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {attendanceRecord?.totalHours ? formatHours(attendanceRecord.totalHours) : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {attendanceRecord ? (
                                      <Badge className={getStatusBadge(attendanceRecord.status)}>
                                        {getStatusIcon(attendanceRecord.status)}
                                        {attendanceRecord.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">No Record</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {attendanceRecord?.isCheckedIn ? (
                                        <>
                                          {attendanceRecord.isOnBreak ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleEmployeeBreakOut(employee)}
                                            >
                                              End Break
                                            </Button>
                                          ) : (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleEmployeeBreakIn(employee)}
                                            >
                                              Start Break
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEmployeeCheckOut(employee)}
                                          >
                                            Check Out
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEmployeeCheckIn(employee)}
                                          disabled={!!attendanceRecord?.checkOutTime}
                                        >
                                          Check In
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleManualAttendance(employee)}
                                      >
                                        <FileText className="h-4 w-4 mr-1" />
                                        Manual
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            
                            {filteredEmployees.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                  {employees.length === 0 ? "No employees found in database" : "No employees found matching your filters."}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Half Day</div>
                        <div className="text-2xl font-bold text-yellow-600">{stats.halfDayCount}</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">On Leave</div>
                        <div className="text-2xl font-bold text-blue-600">{stats.leaveCount}</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Weekly Off</div>
                        <div className="text-2xl font-bold text-purple-600">{stats.weeklyOffCount}</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Hours</div>
                        <div className="text-2xl font-bold">
                          {attendanceRecords.reduce((sum, record) => sum + record.totalHours, 0).toFixed(2)} hrs
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Register Tab */}
          <TabsContent value="weekly-register" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Weekly Attendance Register</CardTitle>
                    <CardDescription>Team-wise weekly attendance summary</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-center min-w-[200px]">
                        <div className="font-medium">
                          Week {selectedWeek}, {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleNextWeek}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => toast.success("Report exported!")}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                      </Button>
                      <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Present (P)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Absent (A)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Half Day (HD)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Leave (L)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Weekly Off (WO)</span>
                  </div>
                </div>

                {loadingWeekly ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading weekly attendance data...</span>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Present</TableHead>
                              <TableHead>Absent</TableHead>
                              <TableHead>Half Day</TableHead>
                              <TableHead>Leave</TableHead>
                              <TableHead>Weekly Off</TableHead>
                              <TableHead className="text-right">Total Hours</TableHead>
                              <TableHead>Overall Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {weeklySummaries.length > 0 ? (
                              weeklySummaries.map((summary) => {
                                // Calculate actual total days recorded
                                const totalRecordedDays = summary.daysPresent + summary.daysAbsent + 
                                                         summary.daysHalfDay + summary.daysLeave + summary.daysWeeklyOff;
                                
                                // If no days recorded at all, show 0 for all instead of defaulting to 7 absent
                                const displayAbsent = totalRecordedDays === 0 ? 0 : summary.daysAbsent;
                                
                                return (
                                  <TableRow key={summary.employeeId}>
                                    <TableCell className="font-medium">
                                      {summary.employeeName}
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm text-muted-foreground">{summary.employeeId}</span>
                                    </TableCell>
                                    <TableCell>{summary.department}</TableCell>
                                    <TableCell>
                                      <div className="text-green-600 font-medium">{summary.daysPresent}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-red-600 font-medium">{displayAbsent}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-yellow-600 font-medium">{summary.daysHalfDay}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-blue-600 font-medium">{summary.daysLeave}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-purple-600 font-medium">{summary.daysWeeklyOff}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {summary.totalHours.toFixed(2)} hrs
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getStatusBadge(summary.overallStatus)}>
                                        {getStatusIcon(summary.overallStatus)}
                                        {summary.overallStatus.charAt(0).toUpperCase() + summary.overallStatus.slice(1)}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : employees.length > 0 ? (
                              // Show employees with 0 for all when no weekly data
                              employees.map((employee) => (
                                <TableRow key={employee._id}>
                                  <TableCell className="font-medium">
                                    {employee.name}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">{employee.employeeId}</span>
                                  </TableCell>
                                  <TableCell>{employee.department}</TableCell>
                                  <TableCell>
                                    <div className="text-green-600 font-medium">0</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-red-600 font-medium">0</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-yellow-600 font-medium">0</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-blue-600 font-medium">0</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-purple-600 font-medium">0</div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    0.00 hrs
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getStatusBadge('absent')}>
                                      {getStatusIcon('absent')}
                                      No Data
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                  No employees found. Please load employee data first.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Weekly Present Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {(() => {
                              const totalDays = weeklySummaries.reduce((sum, s) => sum + s.daysPresent + s.daysAbsent + s.daysHalfDay + s.daysLeave + s.daysWeeklyOff, 0);
                              const presentDays = weeklySummaries.reduce((sum, s) => sum + s.daysPresent, 0);
                              return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
                            })()}%
                          </div>
                          <div className="text-sm text-muted-foreground">Average attendance rate</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Best Attendance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {(() => {
                              const bestEmp = weeklySummaries.reduce((best, emp) => 
                                emp.daysPresent > best.daysPresent ? emp : best
                              , weeklySummaries[0]);
                              return bestEmp ? `${bestEmp.daysPresent}/7` : "0/7";
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {weeklySummaries.reduce((best, emp) => 
                              emp.daysPresent > best.daysPresent ? emp : best
                            , weeklySummaries[0])?.employeeName || "N/A"}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total Working Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {weeklySummaries.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(2)} hrs
                          </div>
                          <div className="text-sm text-muted-foreground">Weekly total</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Full Attendance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {weeklySummaries.filter(emp => emp.daysPresent === 7).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Employees with 7/7</div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Manual Attendance Dialog */}
      <Dialog open={manualAttendanceDialogOpen} onOpenChange={setManualAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Attendance Entry</DialogTitle>
            <DialogDescription>
              Record attendance for {selectedEmployeeForManual?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={manualAttendanceData.date}
                onChange={(e) => setManualAttendanceData({...manualAttendanceData, date: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check-in-time">Check In Time</Label>
                <Input
                  id="check-in-time"
                  type="time"
                  value={manualAttendanceData.checkInTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, checkInTime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="check-out-time">Check Out Time</Label>
                <Input
                  id="check-out-time"
                  type="time"
                  value={manualAttendanceData.checkOutTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, checkOutTime: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="break-start-time">Break Start</Label>
                <Input
                  id="break-start-time"
                  type="time"
                  value={manualAttendanceData.breakStartTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, breakStartTime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="break-end-time">Break End</Label>
                <Input
                  id="break-end-time"
                  type="time"
                  value={manualAttendanceData.breakEndTime}
                  onChange={(e) => setManualAttendanceData({...manualAttendanceData, breakEndTime: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={manualAttendanceData.status}
                onValueChange={(value: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off') => 
                  setManualAttendanceData({...manualAttendanceData, status: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="weekly-off">Weekly Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={manualAttendanceData.remarks}
                onChange={(e) => setManualAttendanceData({...manualAttendanceData, remarks: e.target.value})}
                placeholder="Enter any remarks or notes..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualAttendanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitManualAttendance}>
              Save Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;