import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CheckCircle, XCircle, Clock, Download, Filter, BarChart3, TrendingUp, AlertCircle, User, Loader2, Coffee, Timer } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import userService from "@/services/userService";
import { useRole } from "@/context/RoleContext";

interface AttendanceRecord {
  id: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "Half Day" | "Late" | "Checked In";
  totalHours: string;
  breakTime: string;
  breakDuration: string;
  breaks: number;
  overtime: string;
  isOnBreak?: boolean;
  hasCheckedOutToday?: boolean;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  checkedInDays: number;
  averageHours: string;
  totalOvertime: string;
  totalBreakTime: string;
  attendanceRate: number;
}

const ManagerAttendance = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user: authUser } = useRole();
  
  // API Base URL
  const API_URL = import.meta.env.VITE_API_URL || `http://localhost:5001/api`;
  
  // Current user state
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    checkedInDays: 0,
    averageHours: "0.0",
    totalOvertime: "0.0",
    totalBreakTime: "0.0",
    attendanceRate: 0
  });
  
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [isTodayCheckedIn, setIsTodayCheckedIn] = useState(false);
  const [isTodayOnBreak, setIsTodayOnBreak] = useState(false);

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

  // Load data when managerId is available or month changes
  useEffect(() => {
    if (managerId) {
      fetchAttendanceData();
      fetchCurrentStatus();
    }
  }, [managerId, selectedMonth]);

  // Fetch current attendance status
  const fetchCurrentStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/manager-attendance/today/${managerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentStatus(data.data);
          setIsTodayCheckedIn(data.data?.isCheckedIn || false);
          setIsTodayOnBreak(data.data?.isOnBreak || false);
        }
      }
    } catch (error) {
      console.error('Error fetching current status:', error);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get day of week from date string
  const getDayOfWeek = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Fetch attendance data from API
  const fetchAttendanceData = async () => {
    setIsLoading(true);
    
    try {
      // Parse selected month to get date range
      const [year, month] = selectedMonth.split('-').map(Number);
      
      console.log('Fetching attendance data for:', { 
        managerId, 
        month: `${year}-${month}`,
        today: getTodayDateString()
      });
      
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
        console.log('API response:', data);
        
        if (data.success && data.data) {
          const { dailyRecords, stats, currentStatus } = data.data;
          
          // Update current status
          setCurrentStatus(currentStatus);
          setIsTodayCheckedIn(currentStatus?.isCheckedIn || false);
          setIsTodayOnBreak(currentStatus?.isOnBreak || false);
          
          // Process daily records
          const processedRecords: AttendanceRecord[] = dailyRecords.map((record: any) => ({
            id: `record-${record.date}`,
            date: record.date,
            day: record.day,
            checkIn: record.checkIn || "-",
            checkOut: record.checkOut || "-",
            status: record.status,
            totalHours: record.totalHours || "0.0",
            breakTime: record.breakTime || "0.0",
            breakDuration: record.breakDuration || "0m",
            breaks: record.breaks || 0,
            overtime: record.overtime || "0.0",
            isOnBreak: record.isOnBreak || false,
            hasCheckedOutToday: record.hasCheckedOutToday || false
          }));
          
          setAllRecords(processedRecords);
          setAttendanceRecords(processedRecords);
          
          // Update stats
          setStats({
            totalDays: stats.totalDays || 0,
            presentDays: stats.presentDays || 0,
            absentDays: stats.absentDays || 0,
            lateDays: stats.lateDays || 0,
            halfDays: stats.halfDays || 0,
            checkedInDays: stats.checkedInDays || 0,
            averageHours: stats.averageHours || "0.0",
            totalOvertime: stats.totalOvertime || "0.0",
            totalBreakTime: stats.totalBreakTime || "0.0",
            attendanceRate: stats.attendanceRate || 0
          });
          
          toast.success(`Attendance data loaded for ${getCurrentMonthName()}`);
        } else {
          throw new Error(data.message || 'Failed to load data');
        }
      } else {
        throw new Error('Failed to fetch attendance data');
      }
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
      // Generate empty records for the month
      generateEmptyMonthRecords();
    } finally {
      setIsLoading(false);
    }
  };

  // Format duration for display
  const formatDuration = (hours: number): string => {
    if (!hours || hours === 0) return "0m";
    
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

  // Generate empty records for the month
  const generateEmptyMonthRecords = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();
    
    const emptyRecords: AttendanceRecord[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = getDayOfWeek(dateStr);
      
      emptyRecords.push({
        id: `empty-${dateStr}`,
        date: dateStr,
        day: dayOfWeek,
        checkIn: "-",
        checkOut: "-",
        status: "Absent",
        totalHours: "0.0",
        breakTime: "0.0",
        breakDuration: "0m",
        breaks: 0,
        overtime: "0.0",
        isOnBreak: false,
        hasCheckedOutToday: false
      });
    }
    
    setAllRecords(emptyRecords);
    setAttendanceRecords(emptyRecords);
    
    const daysInMonthNum = daysInMonth;
    setStats({
      totalDays: daysInMonthNum,
      presentDays: 0,
      absentDays: daysInMonthNum,
      lateDays: 0,
      halfDays: 0,
      checkedInDays: 0,
      averageHours: "0.0",
      totalOvertime: "0.0",
      totalBreakTime: "0.0",
      attendanceRate: 0
    });
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...allRecords];
    
    // Apply date filter if selected
    if (selectedDate) {
      filtered = filtered.filter(record => record.date === selectedDate);
    }
    
    // Apply status filter
    if (filter === "present") {
      filtered = filtered.filter(record => record.status === "Present");
    } else if (filter === "present_half") {
      filtered = filtered.filter(record => record.status === "Present" || record.status === "Half Day");
    } else if (filter === "absent") {
      filtered = filtered.filter(record => record.status === "Absent");
    } else if (filter === "late") {
      filtered = filtered.filter(record => record.status === "Late");
    } else if (filter === "halfday") {
      filtered = filtered.filter(record => record.status === "Half Day");
    } else if (filter === "checkedin") {
      filtered = filtered.filter(record => record.status === "Checked In");
    }
    // "all" shows all records
    
    setAttendanceRecords(filtered);
  }, [allRecords, selectedDate, filter]);

  const handleExportData = () => {
    // Create CSV content
    const headers = ["Date", "Day", "Check In", "Check Out", "Status", "Total Hours", "Break Time", "Break Duration", "Breaks", "Overtime"];
    const csvContent = [
      headers.join(","),
      ...attendanceRecords.map(record => [
        record.date,
        record.day,
        record.checkIn,
        record.checkOut,
        record.status,
        record.totalHours,
        record.breakTime,
        record.breakDuration,
        record.breaks,
        record.overtime
      ].join(","))
    ].join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${managerName}-${selectedMonth}.csv`;
    a.click();
    
    toast.success("Attendance data exported successfully!");
  };

  const handleRequestCorrection = (record: AttendanceRecord) => {
    toast.info(`Correction requested for ${record.date}`, {
      description: "Your request has been submitted for review"
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Present: "bg-green-100 text-green-800 border-green-200",
      Absent: "bg-red-100 text-red-800 border-red-200",
      Late: "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Half Day": "bg-blue-100 text-blue-800 border-blue-200",
      "Checked In": "bg-purple-100 text-purple-800 border-purple-200"
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      Present: <CheckCircle className="h-4 w-4" />,
      Absent: <XCircle className="h-4 w-4" />,
      Late: <Clock className="h-4 w-4" />,
      "Half Day": <AlertCircle className="h-4 w-4" />,
      "Checked In": <Clock className="h-4 w-4" />
    };
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />;
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value);
    setSelectedDate("");
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const getCurrentMonthName = () => {
    return new Date(selectedMonth + "-01").toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const clearDateFilter = () => {
    setSelectedDate("");
  };

  // Handle break actions
  const handleBreakIn = async () => {
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
        toast.success("Break started!");
        fetchCurrentStatus(); // Refresh current status
        fetchAttendanceData(); // Refresh all data
      } else {
        toast.error(data.message || "Failed to start break");
      }
    } catch (error) {
      console.error('Error starting break:', error);
      toast.error("Failed to start break. Please try again.");
    }
  };

  const handleBreakOut = async () => {
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
        toast.success("Break ended!");
        fetchCurrentStatus(); // Refresh current status
        fetchAttendanceData(); // Refresh all data
      } else {
        toast.error(data.message || "Failed to end break");
      }
    } catch (error) {
      console.error('Error ending break:', error);
      toast.error("Failed to end break. Please try again.");
    }
  };

  // Handle check in/out
  const handleCheckIn = async () => {
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
        toast.success("Successfully checked in!");
        fetchCurrentStatus(); // Refresh current status
        fetchAttendanceData(); // Refresh all data
      } else {
        toast.error(data.message || "Failed to check in");
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error("Failed to check in. Please try again.");
    }
  };

  const handleCheckOut = async () => {
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
        toast.success("Successfully checked out!");
        fetchCurrentStatus(); // Refresh current status
        fetchAttendanceData(); // Refresh all data
      } else {
        toast.error(data.message || "Failed to check out");
      }
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error("Failed to check out. Please try again.");
    }
  };

  // Refresh data
  const handleRefresh = () => {
    fetchAttendanceData();
    fetchCurrentStatus();
    toast.info("Refreshing attendance data...");
  };

  // Check if today's date is in the selected month
  const isTodayInSelectedMonth = () => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
    
    return todayYear === selectedYear && todayMonth === selectedMonthNum;
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
        {/* Current Status Card */}
        {currentStatus && isTodayInSelectedMonth() && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-600" />
                Today's Status - {managerName}
              </CardTitle>
              <CardDescription>
                {currentStatus.isCheckedIn ? (
                  currentStatus.isOnBreak ? (
                    "Currently on break"
                  ) : (
                    "Currently checked in"
                  )
                ) : (
                  currentStatus.hasCheckedOutToday ? "Checked out for today" : "Not checked in today"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Status</div>
                  <Badge className={
                    currentStatus.isCheckedIn ? 
                      (currentStatus.isOnBreak ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800') 
                      : (currentStatus.hasCheckedOutToday ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800')
                  }>
                    {currentStatus.isCheckedIn ? 
                      (currentStatus.isOnBreak ? 'On Break' : 'Checked In') 
                      : (currentStatus.hasCheckedOutToday ? 'Checked Out' : 'Not Checked In')}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Check In Time</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {currentStatus.checkInTime ? 
                        new Date(currentStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : '--:--'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Break Time</div>
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {formatDuration(currentStatus.breakTime || 0)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Actions</div>
                  <div className="flex gap-2">
                    {currentStatus.isCheckedIn ? (
                      <>
                        {!currentStatus.isOnBreak ? (
                          <Button size="sm" onClick={handleBreakIn} className="flex-1">
                            <Coffee className="h-3 w-3 mr-1" />
                            Break In
                          </Button>
                        ) : (
                          <Button size="sm" onClick={handleBreakOut} className="flex-1">
                            <Timer className="h-3 w-3 mr-1" />
                            Break Out
                          </Button>
                        )}
                        <Button size="sm" onClick={handleCheckOut} className="flex-1" variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Check Out
                        </Button>
                      </>
                    ) : !currentStatus.hasCheckedOutToday ? (
                      <Button size="sm" onClick={handleCheckIn} className="flex-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Check In
                      </Button>
                    ) : (
                      <Button size="sm" disabled className="flex-1" variant="outline">
                        Already Checked Out
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Controls and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Attendance Records - {managerName}</CardTitle>
                <CardDescription>
                  Showing records for {getCurrentMonthName()}
                  {selectedDate && (
                    <span className="ml-2">
                      | Filtered: {formatDisplayDate(selectedDate)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 px-2"
                        onClick={clearDateFilter}
                      >
                        Clear
                      </Button>
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    placeholder="Select Date"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present Only</option>
                  <option value="present_half">Present & Half Day</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="halfday">Half Day</option>
                  <option value="checkedin">Checked In</option>
                </select>
                <Button variant="outline" size="sm" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading attendance data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Break Time</TableHead>
                      <TableHead>Breaks</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.length > 0 ? (
                      attendanceRecords.map((record) => (
                        <TableRow key={record.id} className={
                          record.date === getTodayDateString() ? 'bg-blue-50' : ''
                        }>
                          <TableCell className="font-medium">
                            {formatDisplayDate(record.date)}
                            {record.date === getTodayDateString() && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Today
                              </Badge>
                            )}
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
                            <div className="flex items-center gap-2">
                              <Coffee className="h-4 w-4 text-muted-foreground" />
                              <div className="text-center">
                                <span className="font-medium">{record.breakTime}h</span>
                                <div className="text-xs text-muted-foreground">{record.breakDuration}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <span className="font-medium">{record.breaks}</span>
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium">No records found</h3>
                          <p className="text-muted-foreground mt-2">
                            No attendance records match your current filters.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
                    {((parseFloat(stats.averageHours) * stats.presentDays) || 0).toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Daily Hours</span>
                  <span className="font-medium">{stats.averageHours}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Break Time</span>
                  <span className="font-medium text-blue-600">{stats.totalBreakTime}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overtime Rate</span>
                  <span className="font-medium text-orange-600">
                    {((parseFloat(stats.totalOvertime) / stats.presentDays) || 0).toFixed(1)}h/day
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