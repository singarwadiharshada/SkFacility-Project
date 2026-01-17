// src/components/hrms/tabs/ReportsTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, FileText, Users, IndianRupee, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";

// API Services
import { payrollApi } from "@/services/payrollApi";

// Types
interface Employee {
  _id: string;
  id?: string;
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  position: string;
  salary: number;
  status: string;
  accountNumber?: string;
  ifscCode?: string;
  bankBranch?: string;
  bankName?: string;
  gender?: string;
  dateOfJoining?: string;
  aadharNumber?: string;
  panNumber?: string;
  esicNumber?: string;
  uanNumber?: string;
  providentFund?: number;
  professionalTax?: number;
  permanentAddress?: string;
  localAddress?: string;
  documents?: Array<{
    type: string;
    expiryDate: string;
    status: string;
  }>;
}

interface Attendance {
  employeeId: string;
  date: string;
  status: "present" | "absent" | "half-day" | "late";
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
}

interface Payroll {
  _id: string;
  id?: string;
  employeeId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "pending" | "processed" | "paid" | "hold" | "part-paid";
  paymentDate?: string;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaves: number;
  paidAmount: number;
  paymentStatus: "pending" | "paid" | "hold" | "part-paid";
  notes?: string;
  overtimeHours?: number;
  overtimeAmount?: number;
  bonus?: number;
  providentFund?: number;
  esic?: number;
  professionalTax?: number;
  mlwf?: number;
  advance?: number;
  uniformAndId?: number;
  fine?: number;
  otherDeductions?: number;
  da?: number;
  hra?: number;
  otherAllowances?: number;
  leaveEncashment?: number;
  arrears?: number;
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
}

interface ReportsTabProps {
  employees: Employee[];
  attendance: Attendance[];
  selectedMonth?: string;
}

interface PayrollSummary {
  total: number;
  processed: number;
  pending: number;
  paid: number;
  hold: number;
  partPaid: number;
  totalAmount: number;
}

interface EmployeeCounts {
  total: number;
  active: number;
  left: number;
  departments: {
    [key: string]: number;
  };
}

interface APIAttendance {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
  department?: string;
  hoursWorked?: number;
  remarks?: string;
}

const API_URL = `http://${window.location.hostname}:5001/api`;
const ReportsTab = ({ employees, attendance, selectedMonth = new Date().toISOString().slice(0, 7) }: ReportsTabProps) => {
  // State for payroll data
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    total: 0,
    processed: 0,
    pending: 0,
    paid: 0,
    hold: 0,
    partPaid: 0,
    totalAmount: 0
  });

  // State for API fetched data
  const [attendanceData, setAttendanceData] = useState<APIAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  
  const [employeeCounts, setEmployeeCounts] = useState<EmployeeCounts>({
    total: 0,
    active: 0,
    left: 0,
    departments: {}
  });
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    fetchPayrollData();
    fetchAttendanceData();
    fetchEmployeeCounts();
  }, [selectedMonth]);

  // Fetch attendance data from API
  const fetchAttendanceData = async () => {
    try {
      setAttendanceLoading(true);
      setAttendanceError(null);
      
      const response = await axios.get(`${API_URL}/attendance`);
      
      if (response.data && response.data.success) {
        const apiData = response.data.data || response.data.attendance || [];
        
        if (!Array.isArray(apiData)) {
          console.error("API data is not an array:", apiData);
          setAttendanceError("Invalid data format received from server");
          setAttendanceData([]);
          return;
        }
        
        // Transform API data
        const transformedAttendance = apiData.map((att: any) => ({
          id: att._id || att.id || `att_${Date.now()}_${Math.random()}`,
          employeeId: att.employeeId || att.employeeID || "",
          employeeName: att.employeeName || att.name || "",
          date: att.date || new Date().toISOString().split('T')[0],
          checkIn: att.checkIn || att.checkInTime || "",
          checkOut: att.checkOut || att.checkOutTime || "",
          status: att.status || "present",
          department: att.department || "",
          hoursWorked: att.hoursWorked || 0,
          overtimeHours: att.overtimeHours || 0,
          remarks: att.remarks || ""
        }));
        
        setAttendanceData(transformedAttendance);
      } else {
        const errorMsg = response.data?.message || "Failed to fetch attendance data";
        setAttendanceError(errorMsg);
        console.error("API Error:", errorMsg);
      }
    } catch (err: any) {
      console.error("Error fetching attendance data:", err);
      const errorMsg = err.response?.data?.message || err.message || "Network error occurred";
      setAttendanceError(errorMsg);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch payroll data for the selected month
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      
      // Fetch payroll records for the selected month
      const response = await payrollApi.getAll({
        month: selectedMonth,
        limit: 1000 // Fetch all records for the month
      });

      console.log("Payroll API Response:", response);

      if (response.success && response.data) {
        const payrollData = Array.isArray(response.data) ? response.data : [];
        setPayroll(payrollData);
        
        // Calculate counts and total amount
        const counts = {
          total: payrollData.length,
          processed: payrollData.filter(p => p.status === "processed").length,
          pending: payrollData.filter(p => p.status === "pending").length,
          paid: payrollData.filter(p => p.status === "paid").length,
          hold: payrollData.filter(p => p.status === "hold").length,
          partPaid: payrollData.filter(p => p.status === "part-paid").length,
          totalAmount: payrollData.reduce((sum, p) => sum + (p.netSalary || 0), 0)
        };

        console.log("Payroll Summary Calculated:", counts);
        setPayrollSummary(counts);
      } else {
        console.error("Failed to fetch payroll data:", response.message);
        toast.error("Failed to fetch payroll data");
        setPayroll([]);
        setPayrollSummary({
          total: 0,
          processed: 0,
          pending: 0,
          paid: 0,
          hold: 0,
          partPaid: 0,
          totalAmount: 0
        });
      }
    } catch (error: any) {
      console.error("Error fetching payroll data:", error);
      toast.error(error.message || "Error fetching payroll data");
      setPayroll([]);
      setPayrollSummary({
        total: 0,
        processed: 0,
        pending: 0,
        paid: 0,
        hold: 0,
        partPaid: 0,
        totalAmount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee counts from API
  const fetchEmployeeCounts = async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError(null);
      
      // Fetch all employees to calculate counts
      const response = await axios.get(`${API_URL}/employees`);
      
      console.log("Employees API Response for counts:", response.data);
      
      if (response.data && response.data.success) {
        const employeesData = response.data.data || response.data.employees || [];
        
        if (!Array.isArray(employeesData)) {
          console.error("Employees data is not an array:", employeesData);
          setEmployeesError("Invalid employees data format");
          return;
        }
        
        // Calculate counts
        const total = employeesData.length;
        const active = employeesData.filter((emp: any) => emp.status === "active").length;
        const left = employeesData.filter((emp: any) => emp.status === "left").length;
        
        // Calculate department-wise counts
        const departments: { [key: string]: number } = {};
        employeesData.forEach((emp: any) => {
          const dept = emp.department || "Unknown";
          departments[dept] = (departments[dept] || 0) + 1;
        });
        
        setEmployeeCounts({
          total,
          active,
          left,
          departments
        });
        
        console.log("Calculated employee counts:", {
          total,
          active,
          left,
          departments
        });
      } else {
        const errorMsg = response.data?.message || "Failed to fetch employee data";
        setEmployeesError(errorMsg);
        console.error("Employees API Error:", errorMsg);
        
        // Fallback: calculate from props if available
        if (employees && Array.isArray(employees)) {
          const total = employees.length;
          const active = employees.filter(emp => emp.status === "active").length;
          const left = employees.filter(emp => emp.status === "left").length;
          const departments: { [key: string]: number } = {};
          
          employees.forEach(emp => {
            const dept = emp.department || "Unknown";
            departments[dept] = (departments[dept] || 0) + 1;
          });
          
          setEmployeeCounts({
            total,
            active,
            left,
            departments
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching employee counts:", err);
      const errorMsg = err.response?.data?.message || err.message || "Network error occurred";
      setEmployeesError(errorMsg);
      
      // Fallback: calculate from props
      if (employees && Array.isArray(employees)) {
        const total = employees.length;
        const active = employees.filter(emp => emp.status === "active").length;
        const left = employees.filter(emp => emp.status === "left").length;
        const departments: { [key: string]: number } = {};
        
        employees.forEach(emp => {
          const dept = emp.department || "Unknown";
          departments[dept] = (departments[dept] || 0) + 1;
        });
        
        setEmployeeCounts({
          total,
          active,
          left,
          departments
        });
      }
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Calculate attendance summary from actual data
  const calculateAttendanceSummary = (attendance: APIAttendance[]) => {
    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return {
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        total: 0
      };
    }

    const presentCount = attendance.filter(a => a.status?.toLowerCase() === "present").length;
    const absentCount = attendance.filter(a => a.status?.toLowerCase() === "absent").length;
    const lateCount = attendance.filter(a => a.status?.toLowerCase() === "late").length;
    const halfDayCount = attendance.filter(a => a.status?.toLowerCase() === "half-day").length;
    const totalCount = attendance.length;

    return {
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      halfDay: halfDayCount,
      total: totalCount
    };
  };

  const attendanceSummary = calculateAttendanceSummary(attendanceData);

  // Document expiry report
  const documentExpiryReport = employees.flatMap(emp =>
    emp.documents?.map(doc => ({
      employee: emp.name,
      document: doc.type,
      expiryDate: doc.expiryDate,
      status: doc.status
    })) || []
  );

  // Helper function to export data as CSV
  const exportToCSV = (data: any[], headers: string[], fileName: string) => {
    try {
      if (!data || data.length === 0) {
        toast.error(`No data to export for ${fileName}`);
        return;
      }

      // Prepare CSV content
      const csvRows = [
        headers.join(","),
        ...data.map(row => {
          const values = headers.map(header => {
            // Handle nested properties
            const value = header.includes('.') 
              ? header.split('.').reduce((obj, key) => obj?.[key], row)
              : row[header] || "";
            
            // Format the value for CSV
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma, newline, or quotes
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          return values.join(",");
        })
      ];

      const csvContent = csvRows.join("\n");
      
      // Create and download file
      const blob = new Blob([csvContent], { 
        type: "text/csv;charset=utf-8;" 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${data.length} records to ${fileName}.csv`);
      
    } catch (err: any) {
      console.error(`Error exporting ${fileName}:`, err);
      toast.error(`Failed to export ${fileName}`);
    }
  };

  // Export employees
  const handleExportEmployees = () => {
    const headers = [
      "Employee ID",
      "Name",
      "Email",
      "Phone",
      "Department",
      "Position",
      "Salary",
      "Status",
      "Date of Joining",
      "Gender",
      "Aadhar Number",
      "PAN Number"
    ];

    const data = employees.map(emp => ({
      "Employee ID": emp.employeeId,
      "Name": emp.name,
      "Email": emp.email || "",
      "Phone": emp.phone || "",
      "Department": emp.department,
      "Position": emp.position,
      "Salary": emp.salary,
      "Status": emp.status,
      "Date of Joining": emp.dateOfJoining || "",
      "Gender": emp.gender || "",
      "Aadhar Number": emp.aadharNumber || "",
      "PAN Number": emp.panNumber || ""
    }));

    exportToCSV(data, headers, "employees");
  };

  // Export attendance
  const handleExportAttendance = () => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error("No attendance data to export");
      return;
    }

    const headers = [
      "Date",
      "Employee ID",
      "Employee Name",
      "Department",
      "Status",
      "Check In",
      "Check Out",
      "Hours Worked",
      "Overtime Hours",
      "Remarks"
    ];

    exportToCSV(attendanceData, headers, "attendance");
  };

  // Export payroll
  const handleExportPayroll = () => {
    if (!payroll || payroll.length === 0) {
      toast.error("No payroll data to export");
      return;
    }

    const headers = [
      "Employee ID",
      "Month",
      "Basic Salary",
      "Allowances",
      "Deductions",
      "Net Salary",
      "Status",
      "Present Days",
      "Absent Days",
      "Leaves",
      "Overtime Hours",
      "Payment Date"
    ];

    const data = payroll.map(p => ({
      "Employee ID": p.employeeId,
      "Month": p.month,
      "Basic Salary": p.basicSalary,
      "Allowances": p.allowances,
      "Deductions": p.deductions,
      "Net Salary": p.netSalary,
      "Status": p.status,
      "Present Days": p.presentDays,
      "Absent Days": p.absentDays,
      "Leaves": p.leaves,
      "Overtime Hours": p.overtimeHours || 0,
      "Payment Date": p.paymentDate || ""
    }));

    exportToCSV(data, headers, "payroll");
  };

  // Export all reports
  const handleExportAllReports = () => {
    try {
      // Create a zip file with all reports
      const reports = [
        { name: "employees", data: employees, headers: ["Employee ID", "Name", "Department", "Position", "Status"] },
        { name: "attendance", data: attendanceData, headers: ["Date", "Employee ID", "Employee Name", "Status", "Hours Worked"] },
        { name: "payroll", data: payroll, headers: ["Employee ID", "Month", "Net Salary", "Status", "Payment Date"] }
      ];

      let allExportsCompleted = 0;
      const totalExports = reports.filter(r => r.data && r.data.length > 0).length;

      if (totalExports === 0) {
        toast.error("No data available to export");
        return;
      }

      reports.forEach(report => {
        if (report.data && report.data.length > 0) {
          setTimeout(() => {
            exportToCSV(report.data, report.headers, report.name);
            allExportsCompleted++;
            
            if (allExportsCompleted === totalExports) {
              toast.success("All reports exported successfully!");
            }
          }, allExportsCompleted * 100); // Stagger exports slightly
        }
      });

    } catch (err: any) {
      console.error("Error exporting all reports:", err);
      toast.error("Failed to export all reports");
    }
  };

  // Export document expiry report
  const handleExportDocuments = () => {
    if (documentExpiryReport.length === 0) {
      toast.error("No document data to export");
      return;
    }

    const headers = ["Employee", "Document Type", "Expiry Date", "Status"];
    exportToCSV(documentExpiryReport, headers, "document_expiry");
  };

  // Refresh all data
  const handleRefreshAll = () => {
    fetchPayrollData();
    fetchAttendanceData();
    fetchEmployeeCounts();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "valid": return "default";
      case "expired": return "destructive";
      case "expiring": return "secondary";
      default: return "outline";
    }
  };

  const formatMonth = (monthString: string) => {
    if (!monthString) return "Current Month";
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Month: {formatMonth(selectedMonth)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleRefreshAll}
            disabled={loading || attendanceLoading || employeesLoading}
            className="flex-shrink-0"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(loading || attendanceLoading || employeesLoading) ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportEmployees} className="flex-shrink-0">
              <Download className="mr-2 h-4 w-4" />
              Employees
            </Button>
            <Button variant="outline" onClick={handleExportAttendance} className="flex-shrink-0">
              <Download className="mr-2 h-4 w-4" />
              Attendance
            </Button>
            <Button variant="outline" onClick={handleExportPayroll} className="flex-shrink-0">
              <Download className="mr-2 h-4 w-4" />
              Payroll
            </Button>
            <Button onClick={handleExportAllReports} className="flex-shrink-0">
              <Download className="mr-2 h-4 w-4" />
              All Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Error States */}
      {(attendanceError || employeesError) && (
        <div className="space-y-2">
          {attendanceError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-red-700 font-medium">Attendance: {attendanceError}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchAttendanceData}
                  disabled={attendanceLoading}
                >
                  {attendanceLoading ? "Retrying..." : "Retry"}
                </Button>
              </div>
            </div>
          )}
          {employeesError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-yellow-700 font-medium">Employees: {employeesError}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchEmployeeCounts}
                  disabled={employeesLoading}
                >
                  {employeesLoading ? "Retrying..." : "Retry"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCounts.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {employeeCounts.active} active • {employeeCounts.left} left
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{payrollSummary.totalAmount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {payrollSummary.total} records
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(employeeCounts.departments).length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Active departments
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Attendance Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {attendanceData.length > 0 ? (
                <span>Based on {attendanceData.length} attendance records</span>
              ) : (
                <span>No attendance data available</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Calculating attendance...</p>
              </div>
            ) : attendanceError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-600 mb-2">Failed to load attendance data</p>
                <Button size="sm" onClick={fetchAttendanceData}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Present:</span>
                  <span className="font-medium">{attendanceSummary.present}</span>
                </div>
                <div className="flex justify-between">
                  <span>Absent:</span>
                  <span className="font-medium text-destructive">{attendanceSummary.absent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Late:</span>
                  <span className="font-medium text-secondary">{attendanceSummary.late}</span>
                </div>
                <div className="flex justify-between">
                  <span>Half Day:</span>
                  <span className="font-medium text-muted-foreground">{attendanceSummary.halfDay}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Total Records:</span>
                  <span className="font-medium">{attendanceSummary.total}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payroll Summary (Counts)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Total Records:</span>
                <span className="font-medium">{payrollSummary.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Processed:</span>
                <Badge variant="secondary">{payrollSummary.processed}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{payrollSummary.paid}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Hold:</span>
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{payrollSummary.hold}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Part Paid:</span>
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">{payrollSummary.partPaid}</Badge>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Pending:</span>
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{payrollSummary.pending}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department-wise Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Department-wise Staff Utilization
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {employeesLoading ? "Loading department data..." : `${Object.keys(employeeCounts.departments).length} departments`}
            </div>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading department data...</p>
              </div>
            ) : employeesError ? (
              <div className="text-center py-4">
                <p className="text-sm text-yellow-600 mb-2">Failed to load department data</p>
                <Button size="sm" onClick={fetchEmployeeCounts}>
                  Retry
                </Button>
              </div>
            ) : Object.keys(employeeCounts.departments).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No department data available
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(employeeCounts.departments)
                  .sort(([deptA, countA], [deptB, countB]) => countB - countA)
                  .map(([dept, count]) => (
                    <div key={dept} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dept}</span>
                      </div>
                      <Badge variant="secondary">
                        {count} {count === 1 ? 'employee' : 'employees'}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsTab;