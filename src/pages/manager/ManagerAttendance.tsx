import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, CheckCircle, XCircle, Clock, Download, Filter, BarChart3, TrendingUp, AlertCircle, Wifi, WifiOff, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

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

const ManagerAttendance = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  
  // API Base URL
  const API_URL = `http://${window.location.hostname}:5001/api`;
  
  // Manager ID and Name - Get from localStorage
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  
  // State for API connection status
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    averageHours: "0.0",
    totalOvertime: "0.0",
    attendanceRate: 0
  });
  
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isFetchingFromAPI, setIsFetchingFromAPI] = useState(false);

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
        console.log('Current Manager for Attendance:', { id, name });
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

  // Load data when managerId is available or selectedMonth changes
  useEffect(() => {
    if (managerId) {
      checkBackendConnection();
      fetchAttendanceData();
    }
  }, [selectedMonth, managerId]);

  // Check backend connection
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
          console.log('✅ Backend connected successfully for attendance');
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

  // Fetch attendance data from MongoDB API - Only for current manager
  const fetchAttendanceData = async () => {
    setIsLoading(true);
    setIsFetchingFromAPI(false);
    
    try {
      // Try to fetch from API first if connected
      if (isBackendConnected && managerId) {
        setIsFetchingFromAPI(true);
        await fetchAttendanceFromAPI();
      } else {
        // Fallback to local storage
        await fetchAttendanceFromLocalStorage();
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      // Fallback to generating sample data
      generateSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch attendance data from MongoDB API - Only for current manager
  const fetchAttendanceFromAPI = async () => {
    try {
      // Parse selected month to get date range
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      // Format dates for API
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
          // Transform API data to match our UI format
          const apiRecords: ApiAttendanceRecord[] = data.data.history || data.data;
          const formattedRecords = transformApiDataToRecords(apiRecords, year, month);
          
          setAttendanceRecords(formattedRecords);
          calculateStats(formattedRecords);
          toast.success(`Attendance data loaded for ${managerName}`);
          return;
        }
      }
      
      // If API returns no data or fails, fall back to local storage
      console.warn('No valid data from API, falling back to local storage');
      throw new Error('No data from API');
      
    } catch (error) {
      console.error('Error fetching from API:', error);
      // Fallback to local storage
      await fetchAttendanceFromLocalStorage();
    }
  };

  // Transform API data to UI format - Only current manager's data
  const transformApiDataToRecords = (apiRecords: ApiAttendanceRecord[], year: number, month: number): AttendanceRecord[] => {
    // Get all days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const records: AttendanceRecord[] = [];
    
    // Create a map of existing records by date - ONLY for current manager
    const recordsByDate = new Map<string, ApiAttendanceRecord>();
    apiRecords.forEach(record => {
      // IMPORTANT: Only include records for the current manager
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
    
    // Generate records for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const existingRecord = recordsByDate.get(dateString);
      
      if (existingRecord) {
        // Convert API record to UI format
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
        // No record for this day - mark as absent (only for this manager)
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
    expectedStart.setHours(9, 0, 0, 0); // Expected check-in at 9:00 AM
    
    // Check if late (after 9:30 AM)
    const lateThreshold = new Date(checkInTime);
    lateThreshold.setHours(9, 30, 0, 0);
    
    if (checkInTime > lateThreshold) {
      return "Late";
    }
    
    // Check if half day (less than 4 hours)
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

  // Fetch attendance from localStorage - Only current manager's data
  const fetchAttendanceFromLocalStorage = async () => {
    try {
      // Try to get from localStorage with manager-specific key
      const savedAttendance = localStorage.getItem(`managerAttendance_${managerId}`);
      
      if (savedAttendance) {
        const attendanceData = JSON.parse(savedAttendance);
        
        if (attendanceData.lastCheckInDate) {
          // Create a record from localStorage data
          const date = new Date(attendanceData.lastCheckInDate);
          const dateString = date.toISOString().split('T')[0];
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
          const status = determineStatusFromLocalStorage(attendanceData);
          const totalHours = attendanceData.totalHours || 0;
          const breakTime = attendanceData.breakTime || 0;
          const overtime = Math.max(0, totalHours - 8);
          
          const record: AttendanceRecord = {
            id: `local-${dateString}`,
            date: dateString,
            day: dayOfWeek,
            checkIn: attendanceData.checkInTime ? formatTimeForDisplay(attendanceData.checkInTime) : "-",
            checkOut: attendanceData.checkOutTime ? formatTimeForDisplay(attendanceData.checkOutTime) : "-",
            status: status,
            totalHours: totalHours.toFixed(1),
            breaks: attendanceData.breakStartTime && attendanceData.breakEndTime ? 1 : 0,
            breakDuration: formatDuration(breakTime),
            overtime: overtime.toFixed(1),
            managerId: managerId,
            managerName: managerName,
            checkInTime: attendanceData.checkInTime,
            checkOutTime: attendanceData.checkOutTime,
            breakStartTime: attendanceData.breakStartTime,
            breakEndTime: attendanceData.breakEndTime,
            breakTime: attendanceData.breakTime,
            lastCheckInDate: attendanceData.lastCheckInDate,
            isCheckedIn: attendanceData.isCheckedIn,
            isOnBreak: attendanceData.isOnBreak
          };
          
          setAttendanceRecords([record]);
          calculateStats([record]);
          toast.info(`Using local attendance data for ${managerName}`);
          return;
        }
      }
      
      // If no localStorage data, generate sample data for this manager
      generateSampleData();
      
    } catch (error) {
      console.error('Error fetching from localStorage:', error);
      generateSampleData();
    }
  };

  // Determine status from localStorage data
  const determineStatusFromLocalStorage = (data: any): "Present" | "Absent" | "Half Day" | "Late" => {
    if (!data.checkInTime) return "Absent";
    
    const checkInTime = new Date(data.checkInTime);
    const expectedStart = new Date(checkInTime);
    expectedStart.setHours(9, 0, 0, 0);
    
    const lateThreshold = new Date(checkInTime);
    lateThreshold.setHours(9, 30, 0, 0);
    
    if (checkInTime > lateThreshold) {
      return "Late";
    }
    
    if (data.totalHours < 4) {
      return "Half Day";
    }
    
    return "Present";
  };

  // Generate sample data (fallback) - Only for current manager
  const generateSampleData = () => {
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
        
        // Skip weekends randomly (approx 20% chance)
        if (date.getDay() === 0 || date.getDay() === 6 || Math.random() < 0.2) {
          if (Math.random() < 0.3) { // 30% chance of working on weekend
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
          // Weekday logic
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
      setStats({
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

  // Calculate statistics from records
  const calculateStats = (records: AttendanceRecord[]) => {
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

    setStats({
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

  const filteredRecords = attendanceRecords.filter(record => {
    if (filter === "all") return true;
    if (filter === "present") return record.status === "Present";
    if (filter === "absent") return record.status === "Absent";
    if (filter === "late") return record.status === "Late";
    if (filter === "halfday") return record.status === "Half Day";
    return true;
  });

  const handleExportData = () => {
    // Create CSV content
    const headers = ["Date", "Day", "Check In", "Check Out", "Status", "Total Hours", "Breaks", "Break Duration", "Overtime", "Manager"];
    const csvContent = [
      headers.join(","),
      ...filteredRecords.map(record => [
        record.date,
        record.day,
        record.checkIn,
        record.checkOut,
        record.status,
        record.totalHours,
        record.breaks,
        record.breakDuration,
        record.overtime,
        record.managerName
      ].join(","))
    ].join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${managerName}-${selectedMonth}.csv`;
    a.click();
    
    toast.success("Attendance data exported successfully!", {
      action: {
        label: "Open File",
        onClick: () => {
          toast.info("File downloaded to your device");
        }
      }
    });
  };

  const handleRequestCorrection = (record: AttendanceRecord) => {
    toast.info(`Correction requested for ${record.date}`, {
      description: "Your request has been submitted for review",
      action: {
        label: "View Status",
        onClick: () => {
          toast.success("Opening correction requests...");
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Present: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
      Absent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
      Late: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
      "Half Day": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
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

  const getCurrentMonthName = () => {
    return new Date(selectedMonth + "-01").toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Handle retry connection
  const handleRetryConnection = () => {
    checkBackendConnection().then(() => {
      if (isBackendConnected) {
        fetchAttendanceData();
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="My Attendance" 
        subtitle="Track and manage your attendance records"
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
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
                  Showing sample attendance data. To view real attendance records, please connect to the backend server.
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
                onClick={handleRetryConnection}
                disabled={isCheckingConnection}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
              >
                {isCheckingConnection ? "Checking..." : "Retry Connection"}
              </Button>
            </div>
          </div>
        )}

        {/* Connected Status Banner */}
        {isBackendConnected && isFetchingFromAPI && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  ✅ Connected to Database
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Showing real attendance data from MongoDB database.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Manager: {managerName} | Month: {getCurrentMonthName()}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Live Data
              </Badge>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Days</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDays}</div>
              <p className="text-xs text-muted-foreground">{getCurrentMonthName()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Days</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.lateDays} late, +{stats.halfDays} half day
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.absentDays / stats.totalDays) * 100)}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">
                Avg. {stats.averageHours}h/day
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Hours/Day</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageHours}h</div>
              <p className="text-xs text-muted-foreground">Daily average</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Overtime</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.totalOvertime}h</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.lateDays}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.lateDays / stats.totalDays) * 100)}% of days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Attendance Records - {managerName}</CardTitle>
                <CardDescription>
                  {isBackendConnected && isFetchingFromAPI 
                    ? "Real attendance data from database (Private to you)" 
                    : "Sample attendance data (connect to backend for real data)"}
                  <span className="block mt-1">Showing records for {getCurrentMonthName()}</span>
                  <span className="block text-xs text-green-600 dark:text-green-400 mt-1">
                    🔒 Your attendance data is private and not visible to other managers
                  </span>
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="halfday">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
                <Button variant="outline" size="sm" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              // Loading skeleton
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="h-10 w-10 bg-muted rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                    </div>
                    <div className="h-6 bg-muted rounded animate-pulse w-20" />
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
                    <TableHead>Breaks</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
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
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {record.day}
                        </div>
                      </TableCell>
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
                        <div className="text-center">
                          <span className="font-medium">{record.breaks}</span>
                          <div className="text-xs text-muted-foreground">{record.breakDuration}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            parseFloat(record.overtime) > 0 
                              ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800" 
                              : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {record.overtime}h
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestCorrection(record)}
                          disabled={record.status === "Absent"}
                        >
                          Request Correction
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && filteredRecords.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No records found</h3>
                <p className="text-muted-foreground mt-2">
                  No attendance records match your current filters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Summary - {managerName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Working Days</span>
                  <span className="font-medium">{stats.totalDays - stats.absentDays} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Hours Worked</span>
                  <span className="font-medium">
                    {((parseFloat(stats.averageHours) * (stats.presentDays + stats.lateDays + stats.halfDays)) || 0).toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Daily Hours</span>
                  <span className="font-medium">{stats.averageHours}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overtime Rate</span>
                  <span className="font-medium text-orange-600">
                    {((parseFloat(stats.totalOvertime) / (stats.presentDays + stats.lateDays + stats.halfDays)) || 0).toFixed(1)}h/day
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Punctuality Score</span>
                  <Badge variant="default">
                    {stats.presentDays > 0 ? Math.round((stats.presentDays / (stats.presentDays + stats.lateDays)) * 100) : 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Consistency</span>
                  <Badge variant="default">
                    {stats.attendanceRate}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overtime Contribution</span>
                  <Badge variant="default">
                    {stats.totalOvertime}h
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Leave Balance</span>
                  <Badge variant="default">
                    {Math.max(0, 18 - stats.absentDays)} days
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default ManagerAttendance;