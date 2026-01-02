import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, RefreshCw, Users, AlertCircle, Database, Search, Building } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  contactNumber: string;
  position: string;
  email: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Leave = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [supervisorDepartment, setSupervisorDepartment] = useState<string>("");
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');

  // Form state
  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    appliedBy: "Supervisor",
  });

  // Check API connection and fetch departments on component mount
  useEffect(() => {
    checkApiConnection();
    fetchDepartments();
  }, []);

  // Fetch employees and leave requests when department changes
  useEffect(() => {
    if (supervisorDepartment && apiStatus === 'connected') {
      fetchEmployees();
      fetchLeaveRequests();
    }
  }, [supervisorDepartment, apiStatus]);

  const checkApiConnection = async () => {
    try {
      setApiStatus('checking');
      const response = await fetch(`${API_URL}/test`);
      
      if (response.ok) {
        setApiStatus('connected');
        console.log("✅ API connection successful");
      } else {
        setApiStatus('error');
        console.error("❌ API connection failed");
      }
    } catch (error) {
      setApiStatus('error');
      console.error("❌ API connection error:", error);
      toast.error("Cannot connect to server. Please make sure backend is running.");
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves/departments`);
      if (response.ok) {
        const departments = await response.json();
        console.log("📋 Available departments:", departments);
        
        if (departments && departments.length > 0) {
          setAvailableDepartments(departments);
          // Set the first department as default if none selected
          if (!supervisorDepartment) {
            setSupervisorDepartment(departments[0]);
          }
        } else {
          // If no departments, use defaults
          setAvailableDepartments(["Consumables Management", "Housekeeping Management", "Security Management"]);
          if (!supervisorDepartment) {
            setSupervisorDepartment("Consumables Management");
          }
        }
      } else {
        throw new Error("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      // Use the departments from the error response you saw
      const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
      setAvailableDepartments(defaultDepartments);
      if (!supervisorDepartment) {
        setSupervisorDepartment(defaultDepartments[0]);
      }
    }
  };

  const fetchLeaveRequests = async () => {
    if (apiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    if (!supervisorDepartment) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_URL}/leaves/supervisor?department=${encodeURIComponent(supervisorDepartment)}`
      );
      
      console.log("📊 Fetching leaves from:", `${API_URL}/leaves/supervisor?department=${encodeURIComponent(supervisorDepartment)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        let errorMessage = 'Failed to fetch leaves';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Not JSON response
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Leaves data received:", data);
      setLeaveRequests(data);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      toast.error(error.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (apiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    if (!supervisorDepartment) {
      return;
    }

    try {
      setIsLoadingEmployees(true);
      
      const url = `${API_URL}/leaves/supervisor/employees?department=${encodeURIComponent(supervisorDepartment)}`;
      console.log("📡 Fetching employees from:", url);
      
      const response = await fetch(url);
      
      console.log("📊 Response status:", response.status);
      
      if (response.status === 404) {
        // This is a real 404 - route not found
        throw new Error(`API endpoint not found: ${url}. Check server routes.`);
      }
      
      const responseText = await response.text();
      console.log("📄 Response text:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Invalid JSON response from server");
      }
      
      console.log("✅ Parsed response data:", data);
      
      // Check if this is an error response (200 but with error message)
      if (data.message && data.message.includes("No active employees found")) {
        // This is a valid response - just no employees in this department
        console.log(`ℹ️ No employees found in ${supervisorDepartment} department`);
        setEmployees([]);
        setSelectedEmployee("");
        
        // Show info toast with available departments
        if (data.availableDepartments && data.availableDepartments.length > 0) {
          toast.info(`No employees in ${supervisorDepartment}. Try: ${data.availableDepartments.join(', ')}`, {
            duration: 5000,
          });
          // Update departments list with actual data from server
          setAvailableDepartments(data.availableDepartments);
        } else {
          toast.warning(`No active employees found in ${supervisorDepartment} department`);
        }
      } else if (Array.isArray(data)) {
        // This is the successful array response
        console.log(`✅ Found ${data.length} employees in ${supervisorDepartment}`);
        setEmployees(data);
        
        // Auto-select first employee if none selected
        if (data.length > 0 && !selectedEmployee) {
          setSelectedEmployee(data[0]._id);
        } else if (data.length === 0) {
          setSelectedEmployee("");
          toast.warning(`No active employees found in ${supervisorDepartment} department`);
        }
      } else {
        // Unexpected response format
        throw new Error("Unexpected response format from server");
      }
    } catch (error: any) {
      console.error("❌ Error fetching employees:", error);
      toast.error(error.message || "Failed to load employees");
      setEmployees([]);
      setSelectedEmployee("");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const calculateTotalDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    const selectedEmp = employees.find(emp => emp._id === selectedEmployee);
    if (!selectedEmp) {
      toast.error("Selected employee not found");
      return;
    }

    if (!formData.appliedBy.trim()) {
      toast.error("Please enter supervisor name");
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const leaveData = {
        employeeId: selectedEmp.employeeId,
        employeeName: selectedEmp.name,
        department: selectedEmp.department,
        contactNumber: selectedEmp.contactNumber,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays,
        reason: formData.reason,
        appliedBy: formData.appliedBy,
        appliedFor: selectedEmp.employeeId
      };

      console.log("Submitting leave data:", leaveData);

      const response = await fetch(`${API_URL}/leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit leave');
      }
      
      const data = await response.json();
      
      toast.success(data.message || "Leave request submitted successfully!");
      
      // Reset form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
        appliedBy: "Supervisor",
      });
      
      setDialogOpen(false);
      fetchLeaveRequests(); // Refresh the list
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      toast.error(error.message || "Failed to submit leave request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestDatabase = async () => {
    try {
      setIsLoading(true);
      toast.info("Testing database connection...");
      
      const response = await fetch(`${API_URL}/leaves/test/employees`);
      const data = await response.json();
      
      console.log("Database test response:", data);
      
      if (response.ok && data.success) {
        toast.success(
          `Database connected! Found ${data.totalCount} employees, ${data.activeCount} active. Departments: ${data.departments?.join(', ') || 'None'}`
        );
        
        // Update departments with real data
        if (data.departments && data.departments.length > 0) {
          setAvailableDepartments(data.departments);
          // Update current department if not in list
          if (!data.departments.includes(supervisorDepartment) && data.departments.length > 0) {
            setSupervisorDepartment(data.departments[0]);
          }
        }
        
        setApiStatus('connected');
      } else {
        toast.error(data.message || "Database test failed");
      }
    } catch (error) {
      console.error("Database test error:", error);
      toast.error("Failed to connect to database");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugApi = async () => {
    try {
      console.log("=== API Debug Information ===");
      console.log("API_URL:", API_URL);
      console.log("Current department:", supervisorDepartment);
      console.log("Available departments:", availableDepartments);
      
      // Test basic API endpoint
      console.log("\n1. Testing base API...");
      const baseResponse = await fetch(`${API_URL}/test`);
      console.log("Base API status:", baseResponse.status);
      console.log("Base API response:", await baseResponse.text());
      
      // Test departments endpoint
      console.log("\n2. Testing departments endpoint...");
      const deptResponse = await fetch(`${API_URL}/leaves/departments`);
      console.log("Departments status:", deptResponse.status);
      console.log("Departments response:", await deptResponse.text());
      
      // Test employees endpoint with current department
      console.log("\n3. Testing employees endpoint...");
      const testUrl = `${API_URL}/leaves/supervisor/employees?department=${encodeURIComponent(supervisorDepartment)}`;
      console.log("Testing URL:", testUrl);
      const empResponse = await fetch(testUrl);
      console.log("Employees status:", empResponse.status);
      console.log("Employees response:", await empResponse.text());
      
      toast.info("API debug complete. Check console for details.");
    } catch (error) {
      console.error("Debug error:", error);
      toast.error("Debug failed");
    }
  };

  const handleRefreshAll = () => {
    checkApiConnection();
    fetchDepartments();
    if (supervisorDepartment && apiStatus === 'connected') {
      fetchLeaveRequests();
      fetchEmployees();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
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
    switch (apiStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">API Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">API Error</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking API...</Badge>;
      default:
        return <Badge variant="outline">API Unknown</Badge>;
    }
  };

  // Add a test employee function for debugging
  const addTestEmployee = async () => {
    try {
      const testEmployee = {
        employeeId: `TEST${Date.now().toString().slice(-4)}`,
        name: "Test Employee",
        department: supervisorDepartment,
        position: "Test Position",
        phone: "+91 9876543210",
        email: "test@example.com"
      };
      
      const response = await fetch(`${API_URL}/leaves/test/add-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEmployee),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Test employee added to ${supervisorDepartment}`);
        fetchEmployees(); // Refresh the list
      } else {
        toast.error(data.message || "Failed to add test employee");
      }
    } catch (error) {
      console.error("Error adding test employee:", error);
      toast.error("Failed to add test employee");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Leave Management" 
        subtitle="Apply for leave for yourself or team members" 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* API Status Bar */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Database className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">API Status</p>
              <div className="flex items-center space-x-2">
                {getApiStatusBadge()}
                <span className="text-xs text-muted-foreground">
                  {API_URL}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDebugApi}
              className="h-8"
            >
              <Search className="mr-2 h-3 w-3" />
              Debug API
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestDatabase}
              className="h-8"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Database className="mr-2 h-3 w-3" />
              )}
              Test DB
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="space-y-1">
              <Label className="text-sm">Department</Label>
              <div className="flex items-center space-x-2">
                <Select
                  value={supervisorDepartment}
                  onValueChange={setSupervisorDepartment}
                  disabled={apiStatus !== 'connected' || availableDepartments.length === 0}
                >
                  <SelectTrigger className="w-64">
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
                
                {/* Add test employee button - only show if no employees in department */}
                {employees.length === 0 && supervisorDepartment && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addTestEmployee}
                    className="h-9"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Test Employee
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <Users className="mr-1 h-3 w-3" />
                  {employees.length} employees
                </span>
                <span className="flex items-center">
                  <Building className="mr-1 h-3 w-3" />
                  {availableDepartments.length} departments
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshAll}
                className="h-9"
                disabled={isLoading || isLoadingEmployees}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh All
              </Button>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={apiStatus !== 'connected' || employees.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Apply for Leave
                {employees.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {employees.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appliedBy" className="text-sm">
                    Applied By (Supervisor Name) *
                  </Label>
                  <Input 
                    id="appliedBy"
                    value={formData.appliedBy}
                    onChange={(e) => setFormData(prev => ({...prev, appliedBy: e.target.value}))}
                    placeholder="Enter supervisor name"
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="employee" className="text-sm">
                      Select Employee *
                    </Label>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Users className="mr-1 h-3 w-3" />
                      {employees.length} available in {supervisorDepartment}
                    </div>
                  </div>
                  
                  {isLoadingEmployees ? (
                    <div className="flex items-center justify-center p-4 border rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading employees...</span>
                    </div>
                  ) : employees.length === 0 ? (
                    <div className="p-3 border border-dashed rounded-lg text-center">
                      <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No employees found in {supervisorDepartment}
                      </p>
                      <Button 
                        type="button" 
                        variant="link" 
                        size="sm"
                        onClick={fetchEmployees}
                        className="mt-1"
                      >
                        Retry
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Try selecting a different department or add a test employee
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={selectedEmployee}
                      onValueChange={setSelectedEmployee}
                      required
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee._id} value={employee._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {employee.employeeId} • {employee.position}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedEmployee && selectedEmployee !== "none" && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Employee Name</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.name || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Employee ID</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.employeeId || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Department</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.department || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Contact</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.contactNumber || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm">Leave Type *</Label>
                  <Select 
                    value={formData.leaveType}
                    onValueChange={(value) => setFormData(prev => ({...prev, leaveType: value}))}
                    required
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from" className="text-sm">From Date *</Label>
                    <Input 
                      id="from" 
                      type="date" 
                      value={formData.fromDate}
                      onChange={(e) => setFormData(prev => ({...prev, fromDate: e.target.value}))}
                      required 
                      className="h-9" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to" className="text-sm">To Date *</Label>
                    <Input 
                      id="to" 
                      type="date" 
                      value={formData.toDate}
                      onChange={(e) => setFormData(prev => ({...prev, toDate: e.target.value}))}
                      required 
                      className="h-9" 
                    />
                  </div>
                </div>
                
                {formData.fromDate && formData.toDate && (
                  <div className="text-sm text-muted-foreground">
                    Total Days: {calculateTotalDays(formData.fromDate, formData.toDate)} days
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm">Reason *</Label>
                  <Textarea 
                    id="reason" 
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({...prev, reason: e.target.value}))}
                    placeholder="Enter reason for leave" 
                    required 
                    className="min-h-[80px] resize-none"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-9"
                  disabled={isSubmitting || employees.length === 0 || isLoadingEmployees || !selectedEmployee}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Leave Request"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  Leave Requests - {supervisorDepartment || "Select Department"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {leaveRequests.length} leave requests found
                  {employees.length > 0 && ` • ${employees.length} employees in department`}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {employees.length === 0 && supervisorDepartment && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addTestEmployee}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Test Employee
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchLeaveRequests}
                  disabled={isLoading || apiStatus !== 'connected' || !supervisorDepartment}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {apiStatus !== 'connected' ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">API Connection Required</h3>
                <p className="text-muted-foreground mb-4">
                  Please check your backend server is running and click "Test DB"
                </p>
                <Button onClick={handleTestDatabase}>
                  <Database className="mr-2 h-4 w-4" />
                  Test Database Connection
                </Button>
              </div>
            ) : !supervisorDepartment ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Select a Department</h3>
                <p className="text-muted-foreground">
                  Please select a department to view leave requests
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex flex-col items-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No Leave Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    No leave requests found for {supervisorDepartment} department
                  </p>
                  {employees.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        There are no employees in this department
                      </p>
                      <Button onClick={addTestEmployee}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Test Employee
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Leave Request
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((leave) => (
                  <motion.div
                    key={leave._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{leave.employeeName}</h3>
                          <Badge variant={getStatusBadgeVariant(leave.status)}>
                            {leave.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(leave.fromDate)} to {formatDate(leave.toDate)} ({leave.totalDays} days)
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Type: <span className="font-medium capitalize">{leave.leaveType} Leave</span>
                          </span>
                          <span className="text-muted-foreground">
                            ID: {leave.employeeId}
                          </span>
                          <span className="text-muted-foreground">
                            Dept: {leave.department}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Reason:</span> {leave.reason}
                      </p>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Applied by: {leave.appliedBy}</span>
                        <span>{formatDate(leave.createdAt)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Leave;