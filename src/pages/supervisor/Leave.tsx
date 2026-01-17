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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, RefreshCw, Users, AlertCircle, Database, Search, Building, MapPin, User, Bug, Info, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRole } from "@/context/RoleContext";

interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  site: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
  // Added fields
  isSupervisorLeave?: boolean;
  supervisorId?: string;
  managerSite?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  site: string;
  contactNumber: string;
  position: string;
  email: string;
  // Added fields
  reportingManagerId?: string;
  reportingManagerName?: string;
  isSupervisor?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Leave = () => {
  const { user, loading: authLoading } = useRole();
  
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
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [applyForSelf, setApplyForSelf] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    appliedBy: "",
  });

  // Check API connection on component mount
  useEffect(() => {
    checkApiConnection();
    
    // Set supervisor's name in form when user is available
    if (user) {
      setFormData(prev => ({
        ...prev,
        appliedBy: user.name || "Supervisor"
      }));
      
      // If user has a department, set it
      if (user.department) {
        setSupervisorDepartment(user.department);
      }
    }
  }, [user]);

  // Fetch departments when user site is available
  useEffect(() => {
    if (user?.site) {
      console.log("📋 User site detected:", user.site);
      console.log("📋 User department from context:", user.department);
      fetchDepartments();
    }
  }, [user?.site, user?.department]);

  // Fetch employees and leave requests when department changes
  useEffect(() => {
    if (user?.site && supervisorDepartment && apiStatus === 'connected') {
      console.log("🔄 Fetching data for:", {
        site: user.site,
        department: supervisorDepartment,
        apiStatus
      });
      fetchEmployees();
      fetchLeaveRequests();
    }
  }, [user?.site, supervisorDepartment, apiStatus]);

  const checkApiConnection = async () => {
    try {
      setApiStatus('checking');
      const response = await fetch(`${API_URL}/test`);
      
      if (response.ok) {
        setApiStatus('connected');
        console.log("✅ API connection successful");
        toast.success("API connected successfully");
      } else {
        setApiStatus('error');
        console.error("❌ API connection failed");
        toast.error("API connection failed");
      }
    } catch (error) {
      setApiStatus('error');
      console.error("❌ API connection error:", error);
      toast.error("Cannot connect to server. Please make sure backend is running.");
    }
  };

  const fetchDepartments = async () => {
    if (!user?.site) {
      console.error("❌ No user site available");
      toast.error("User site information not available");
      return;
    }

    try {
      console.log("📋 Fetching departments for site:", user.site);
      const response = await fetch(`${API_URL}/leaves/departments?site=${encodeURIComponent(user.site)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Failed to fetch departments:", response.status, errorText);
        
        // Try alternative endpoint
        console.log("🔄 Trying alternative endpoint...");
        const altResponse = await fetch(`${API_URL}/departments?site=${encodeURIComponent(user.site)}`);
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log("✅ Alternative departments response:", altData);
          handleDepartmentsResponse(altData);
        } else {
          throw new Error(`Failed to fetch departments: ${response.status}`);
        }
      } else {
        const data = await response.json();
        console.log("✅ Departments response:", data);
        handleDepartmentsResponse(data);
      }
    } catch (error: any) {
      console.error("❌ Error fetching departments:", error);
      // Use default departments as fallback
      useDefaultDepartments();
      toast.error("Failed to load departments. Using defaults.");
    }
  };

  const handleDepartmentsResponse = (data: any) => {
    let departments = [];
    
    if (data.departments && Array.isArray(data.departments)) {
      departments = data.departments;
    } else if (Array.isArray(data)) {
      departments = data.map((dept: any) => 
        typeof dept === 'string' ? dept : dept.name || dept.departmentName || dept.department
      ).filter(Boolean);
    } else if (data.data && Array.isArray(data.data)) {
      departments = data.data.map((dept: any) => 
        typeof dept === 'string' ? dept : dept.name || dept.departmentName || dept.department
      ).filter(Boolean);
    }
    
    console.log("📋 Processed departments:", departments);
    
    if (departments && departments.length > 0) {
      setAvailableDepartments(departments);
      
      // Set department: first check user's department, then first in list
      if (user?.department && departments.includes(user.department)) {
        setSupervisorDepartment(user.department);
        console.log("✅ Set supervisor department to user's department:", user.department);
      } else if (departments.length > 0) {
        setSupervisorDepartment(departments[0]);
        console.log("✅ Set supervisor department to first available:", departments[0]);
      }
      
      toast.success(`Loaded ${departments.length} departments`);
    } else {
      useDefaultDepartments();
    }
  };

  const useDefaultDepartments = () => {
    const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
    setAvailableDepartments(defaultDepartments);
    
    if (!supervisorDepartment && defaultDepartments.length > 0) {
      // Check if user's department is in defaults
      if (user?.department && defaultDepartments.includes(user.department)) {
        setSupervisorDepartment(user.department);
      } else {
        setSupervisorDepartment(defaultDepartments[0]);
      }
    }
    console.log("⚠️ Using default departments:", defaultDepartments);
    toast.warning("No departments found. Using default departments.");
  };

  const fetchLeaveRequests = async () => {
    if (apiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    if (!supervisorDepartment || !user?.site) {
      console.warn("Cannot fetch leaves: missing department or site", {
        supervisorDepartment,
        userSite: user?.site
      });
      toast.warning("Please select both department and ensure site is set");
      return;
    }

    try {
      setIsLoading(true);
      const url = `${API_URL}/leaves/supervisor?department=${encodeURIComponent(supervisorDepartment)}&site=${encodeURIComponent(user.site)}&includeSupervisorLeaves=true&supervisorId=${user._id}`;
      
      console.log("📊 Fetching leaves from:", url);
      
      const response = await fetch(url);
      
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
      toast.success(`Loaded ${data.length} leave requests`);
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

    if (!supervisorDepartment || !user?.site) {
      console.warn("Cannot fetch employees: missing department or site", {
        supervisorDepartment,
        userSite: user?.site
      });
      toast.warning("Please select department and ensure site is set");
      return;
    }

    try {
      setIsLoadingEmployees(true);
      
      const url = `${API_URL}/leaves/supervisor/employees?department=${encodeURIComponent(supervisorDepartment)}&site=${encodeURIComponent(user.site)}`;
      console.log("📡 Fetching employees from:", url);
      
      const response = await fetch(url);
      
      console.log("📊 Response status:", response.status);
      
      if (response.status === 404) {
        // Try alternative endpoint
        console.log("🔄 Trying alternative employees endpoint...");
        const altUrl = `${API_URL}/employees?department=${encodeURIComponent(supervisorDepartment)}&site=${encodeURIComponent(user.site)}`;
        const altResponse = await fetch(altUrl);
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          handleEmployeesResponse(altData);
          return;
        }
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
      
      handleEmployeesResponse(data);
    } catch (error: any) {
      console.error("❌ Error fetching employees:", error);
      toast.error(error.message || "Failed to load employees");
      setEmployees([]);
      setSelectedEmployee("");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleEmployeesResponse = (data: any) => {
    console.log("✅ Parsed response data:", data);
    
    // Check if this is an error response (200 but with error message)
    if (data.message && data.message.includes("No active employees found")) {
      // This is a valid response - just no employees in this department/site
      console.log(`ℹ️ No employees found in ${supervisorDepartment} department at ${user?.site} site`);
      setEmployees([]);
      setSelectedEmployee("");
      
      // Show info toast with available departments
      if (data.availableDepartments && data.availableDepartments.length > 0) {
        toast.info(`No employees in ${supervisorDepartment} at ${user?.site}. Try: ${data.availableDepartments.join(', ')}`, {
          duration: 5000,
        });
        // Update departments list with actual data from server
        setAvailableDepartments(data.availableDepartments);
      } else {
        toast.warning(`No active employees found in ${supervisorDepartment} department at ${user?.site} site`);
      }
    } else if (Array.isArray(data)) {
      // This is the successful array response
      console.log(`✅ Found ${data.length} employees in ${supervisorDepartment} at ${user?.site}`);
      
      // Filter employees by site (additional client-side filtering for safety)
      const siteFilteredEmployees = data.filter((emp: any) => emp.site === user?.site);
      setEmployees(siteFilteredEmployees);
      
      // Auto-select first employee if none selected
      if (siteFilteredEmployees.length > 0 && !selectedEmployee) {
        setSelectedEmployee(siteFilteredEmployees[0]._id);
        console.log("✅ Auto-selected employee:", siteFilteredEmployees[0].name);
        toast.success(`Found ${siteFilteredEmployees.length} employees`);
      } else if (siteFilteredEmployees.length === 0) {
        setSelectedEmployee("");
        toast.warning(`No active employees found in ${supervisorDepartment} department at ${user?.site} site`);
      }
    } else if (data.data && Array.isArray(data.data)) {
      // Handle { data: [] } format
      console.log(`✅ Found ${data.data.length} employees in ${supervisorDepartment} at ${user?.site}`);
      
      const siteFilteredEmployees = data.data.filter((emp: any) => emp.site === user?.site);
      setEmployees(siteFilteredEmployees);
      
      if (siteFilteredEmployees.length > 0 && !selectedEmployee) {
        setSelectedEmployee(siteFilteredEmployees[0]._id);
        console.log("✅ Auto-selected employee:", siteFilteredEmployees[0].name);
        toast.success(`Found ${siteFilteredEmployees.length} employees`);
      }
    } else {
      // Unexpected response format
      console.log("⚠️ Unexpected response format, trying to extract employees:", data);
      
      // Try to extract employees from different response formats
      let extractedEmployees: Employee[] = [];
      
      if (data.employees && Array.isArray(data.employees)) {
        extractedEmployees = data.employees;
      } else if (data.users && Array.isArray(data.users)) {
        extractedEmployees = data.users;
      }
      
      if (extractedEmployees.length > 0) {
        const siteFilteredEmployees = extractedEmployees.filter((emp: any) => emp.site === user?.site);
        setEmployees(siteFilteredEmployees);
        toast.success(`Found ${siteFilteredEmployees.length} employees`);
      } else {
        throw new Error("Unexpected response format from server");
      }
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
    
    console.log("🔄 Submitting form...", {
      formData,
      selectedEmployee,
      applyForSelf,
      userSite: user?.site,
      supervisorDepartment
    });
    
    // Validate form
    if (!formData.leaveType) {
      toast.error("Please select leave type");
      return;
    }
    
    if (!formData.fromDate || !formData.toDate) {
      toast.error("Please select both from and to dates");
      return;
    }
    
    if (!formData.reason.trim()) {
      toast.error("Please enter reason for leave");
      return;
    }
    
    if (!formData.appliedBy.trim()) {
      toast.error("Please enter supervisor name");
      return;
    }
    
    if (!selectedEmployee && !applyForSelf) {
      toast.error("Please select an employee or check 'Apply for myself'");
      return;
    }

    let leaveData;
    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }
    
    if (applyForSelf) {
      // Supervisor applying for themselves
      const userSite = user?.site || "";
      const userDepartment = user?.department || supervisorDepartment;
      
      if (!userSite) {
        toast.error("Your site is not assigned. Cannot apply for leave.");
        return;
      }
      
      if (!userDepartment) {
        toast.error("Your department is not assigned. Cannot apply for leave.");
        return;
      }
      
      leaveData = {
        employeeId: user?.employeeId || `SUP_${user?._id}`,
        employeeName: user?.name || "Supervisor",
        department: userDepartment,
        site: userSite,
        contactNumber: user?.phone || "",
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays,
        reason: formData.reason,
        appliedBy: formData.appliedBy,
        appliedFor: user?.employeeId || `SUP_${user?._id}`,
        supervisorId: user?._id,
        // Add these fields for supervisor's own leave
        isSupervisorLeave: true,
        supervisorAsEmployee: true,
        status: 'pending',
        // Add required fields that might be missing
        position: user?.position || "Supervisor",
        email: user?.email || ""
      };
    } else {
      // Supervisor applying for employee
      const selectedEmp = employees.find(emp => emp._id === selectedEmployee);
      if (!selectedEmp) {
        toast.error("Selected employee not found");
        return;
      }

      if (!selectedEmp.site) {
        toast.error("Selected employee has no site assigned");
        return;
      }

      if (!selectedEmp.department) {
        toast.error("Selected employee has no department assigned");
        return;
      }

      leaveData = {
        employeeId: selectedEmp.employeeId,
        employeeName: selectedEmp.name,
        department: selectedEmp.department,
        site: selectedEmp.site,
        contactNumber: selectedEmp.contactNumber,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays,
        reason: formData.reason,
        appliedBy: formData.appliedBy,
        appliedFor: selectedEmp.employeeId,
        supervisorId: user?._id,
        status: 'pending',
        // Add required fields that might be missing
        position: selectedEmp.position,
        email: selectedEmp.email
      };
    }

    try {
      setIsSubmitting(true);
      
      console.log("📤 Submitting leave data:", leaveData);

      const response = await fetch(`${API_URL}/leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        },
        body: JSON.stringify(leaveData),
      });
      
      const responseText = await response.text();
      console.log("📥 Response status:", response.status);
      console.log("📥 Response text:", responseText);
      
      if (!response.ok) {
        let errorMessage = 'Failed to submit leave';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
          
          // Handle specific validation errors
          if (errorData.errors) {
            const errorMessages = Object.values(errorData.errors).join(', ');
            errorMessage = `Validation error: ${errorMessages}`;
          }
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = JSON.parse(responseText);
      
      toast.success(data.message || "Leave request submitted successfully!");
      
      // Reset form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
        appliedBy: user?.name || "Supervisor",
      });
      setSelectedEmployee("");
      setApplyForSelf(false);
      
      setDialogOpen(false);
      fetchLeaveRequests(); // Refresh the list
      fetchEmployees(); // Refresh employees list
    } catch (error: any) {
      console.error("❌ Error submitting leave request:", error);
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
      console.log("Current user:", user);
      console.log("User site:", user?.site);
      console.log("User department:", user?.department);
      console.log("Current selected department:", supervisorDepartment);
      console.log("Available departments:", availableDepartments);
      console.log("Employees count:", employees.length);
      console.log("Selected employee:", selectedEmployee);
      
      // Test basic API endpoint
      console.log("\n1. Testing base API...");
      const baseResponse = await fetch(`${API_URL}/test`);
      console.log("Base API status:", baseResponse.status);
      console.log("Base API response:", await baseResponse.text());
      
      // Test departments endpoint
      console.log("\n2. Testing departments endpoint...");
      const deptUrl = `${API_URL}/leaves/departments?site=${encodeURIComponent(user?.site || '')}`;
      console.log("Departments URL:", deptUrl);
      const deptResponse = await fetch(deptUrl);
      console.log("Departments status:", deptResponse.status);
      console.log("Departments response:", await deptResponse.text());
      
      // Test employees endpoint with current department and site
      console.log("\n3. Testing employees endpoint...");
      const testUrl = `${API_URL}/leaves/supervisor/employees?department=${encodeURIComponent(supervisorDepartment)}&site=${encodeURIComponent(user?.site || '')}`;
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
    if (user?.site) {
      fetchDepartments();
    }
    if (user?.site && supervisorDepartment && apiStatus === 'connected') {
      fetchLeaveRequests();
      fetchEmployees();
    }
  };

  const debugLeaveSystem = () => {
    console.log("=== LEAVE SYSTEM DEBUG ===");
    console.log("1. User Info:", {
      name: user?.name,
      email: user?.email,
      site: user?.site,
      department: user?.department,
      role: user?.role,
      id: user?._id,
      employeeId: user?.employeeId,
      phone: user?.phone,
      position: user?.position
    });
    
    console.log("2. System Status:", {
      apiStatus,
      supervisorDepartment,
      availableDepartments,
      employeesCount: employees.length,
      selectedEmployee,
      leaveRequestsCount: leaveRequests.length,
      applyForSelf,
      userSite: user?.site,
      userDepartment: user?.department
    });
    
    console.log("3. Form Data:", formData);
    console.log("4. Selected Employee Data:", employees.find(e => e._id === selectedEmployee));
    
    console.log("5. Supervisor's own leaves:", leaveRequests.filter(leave => leave.isSupervisorLeave));
    
    console.log("6. Local Storage:");
    console.log("   Token:", localStorage.getItem('sk_token') ? "Exists" : "Missing");
    console.log("   User:", localStorage.getItem('sk_user'));
    
    toast.info("Debug info logged to console. Check F12 → Console");
    setShowDebugInfo(!showDebugInfo);
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

  // Add a test employee function for debugging
  const addTestEmployee = async () => {
    if (!supervisorDepartment || !user?.site) {
      toast.error("Please select a department and ensure site is assigned");
      return;
    }

    try {
      const testEmployee = {
        employeeId: `TEST${Date.now().toString().slice(-4)}`,
        name: "Test Employee",
        department: supervisorDepartment,
        site: user.site,
        position: "Test Position",
        phone: "+91 9876543210",
        email: "test@example.com"
      };
      
      toast.info("Adding test employee...");
      const response = await fetch(`${API_URL}/leaves/test/add-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEmployee),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Test employee added to ${supervisorDepartment} at ${user.site}`);
        fetchEmployees(); // Refresh the list
      } else {
        toast.error(data.message || "Failed to add test employee");
      }
    } catch (error) {
      console.error("Error adding test employee:", error);
      toast.error("Failed to add test employee");
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading supervisor information...</p>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="font-medium text-lg mb-2">Authentication Required</h3>
          <p className="text-muted-foreground mb-4">
            Please login to access the leave management system
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is a supervisor
  if (user.role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="font-medium text-lg mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4">
            Only supervisors can access the leave management system
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Your role: {user.role}
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
        {/* Supervisor Info Bar */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Supervisor Information</p>
              <div className="flex items-center space-x-2 text-xs">
                <Badge variant="outline">
                  <span className="flex items-center">
                    <User className="mr-1 h-3 w-3" />
                    {user.name}
                  </span>
                </Badge>
                <Badge variant="outline" className={user.site ? "bg-green-50" : "bg-red-50"}>
                  <span className="flex items-center">
                    <MapPin className="mr-1 h-3 w-3" />
                    Site: {user.site || "Not assigned"}
                  </span>
                </Badge>
                <Badge variant="outline" className={user.department ? "bg-green-50" : "bg-yellow-50"}>
                  <span className="flex items-center">
                    <Building className="mr-1 h-3 w-3" />
                    Dept: {user.department || "Not assigned"}
                  </span>
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={debugLeaveSystem}
              className="h-8"
            >
              <Bug className="mr-2 h-3 w-3" />
              Debug System
            </Button>
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

        {/* System Status Panel */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">System Status</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="h-6 text-xs"
            >
              {showDebugInfo ? "Hide Details" : "Show Details"}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className={`p-2 rounded text-center ${apiStatus === 'connected' ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="text-xs font-medium">API Status</div>
              <div className={`text-xs ${apiStatus === 'connected' ? 'text-green-700' : 'text-red-700'}`}>
                {apiStatus === 'connected' ? '✅ Connected' : '❌ Not Connected'}
              </div>
            </div>
            <div className={`p-2 rounded text-center ${user?.site ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="text-xs font-medium">Your Site</div>
              <div className={`text-xs ${user?.site ? 'text-green-700' : 'text-red-700'}`}>
                {user?.site ? `✅ ${user.site}` : '❌ Not Assigned'}
              </div>
            </div>
            <div className={`p-2 rounded text-center ${employees.length > 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <div className="text-xs font-medium">Employees</div>
              <div className={`text-xs ${employees.length > 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                {employees.length > 0 ? `✅ ${employees.length} found` : '⚠️ None'}
              </div>
            </div>
            <div className={`p-2 rounded text-center ${supervisorDepartment ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <div className="text-xs font-medium">Department</div>
              <div className="text-xs">
                {supervisorDepartment ? `✅ ${supervisorDepartment}` : '⚠️ Not Selected'}
              </div>
            </div>
          </div>
          
          {showDebugInfo && (
            <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
              <p className="font-medium mb-1">Debug Information:</p>
              <div className="grid grid-cols-2 gap-1">
                <span>User Email: {user.email}</span>
                <span>User Role: {user.role}</span>
                <span>User Site: {user.site || "None"}</span>
                <span>User Dept: {user.department || "None"}</span>
                <span>Available Depts: {availableDepartments.length}</span>
                <span>Leave Requests: {leaveRequests.length}</span>
                <span>Selected Employee: {selectedEmployee ? "Yes" : "No"}</span>
                <span>Apply for Self: {applyForSelf ? "Yes" : "No"}</span>
              </div>
              <div className="mt-2">
                <p className="font-medium">Available Departments:</p>
                <p>{availableDepartments.join(', ') || 'None'}</p>
              </div>
            </div>
          )}
          
          {!user.site && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs">
              <p className="font-medium mb-1 text-red-700">⚠️ Site Not Assigned</p>
              <p className="text-red-600">You don't have a site assigned. Please contact your administrator to assign a site.</p>
            </div>
          )}
          
          {user.site && employees.length === 0 && supervisorDepartment && !applyForSelf && (
            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
              <p className="font-medium mb-1">⚠️ No Employees Found</p>
              <p>Department: <strong>{supervisorDepartment}</strong></p>
              <p>Site: <strong>{user.site}</strong></p>
              <p className="mt-1">You can still apply for leave for yourself.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button 
                  size="sm" 
                  onClick={addTestEmployee}
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Test Employee
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Your Assigned Site</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`flex items-center px-3 py-2 border rounded-md text-sm ${user.site ? 'font-medium bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
                      <MapPin className="mr-2 h-4 w-4" />
                      {user.site || "No site assigned"}
                    </div>
                    <div className="flex items-center px-2 py-1 bg-blue-50 rounded text-xs">
                      <Briefcase className="mr-1 h-3 w-3" />
                      Manager: Site Manager
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Department to Manage</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Select
                      value={supervisorDepartment}
                      onValueChange={setSupervisorDepartment}
                      disabled={apiStatus !== 'connected' || availableDepartments.length === 0}
                    >
                      <SelectTrigger className="w-full lg:w-64">
                        <SelectValue placeholder={availableDepartments.length > 0 ? "Select Department" : "Loading departments..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDepartments.length > 0 ? (
                          availableDepartments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              <div className="flex items-center">
                                <Building className="mr-2 h-4 w-4" />
                                {dept}
                                {user.department === dept && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    Your Dept
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>
                            {apiStatus === 'connected' ? "Loading departments..." : "API not connected"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchDepartments}
                      disabled={!user.site}
                      className="h-9"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center">
                  <Users className="mr-1 h-3 w-3" />
                  {employees.length} employees at {user.site || "your site"}
                </span>
                <span className="flex items-center">
                  <Building className="mr-1 h-3 w-3" />
                  {availableDepartments.length} departments available
                </span>
                <span className="flex items-center">
                  <Briefcase className="mr-1 h-3 w-3" />
                  Site Manager: Site Manager
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshAll}
                className="h-9"
                disabled={isLoading || isLoadingEmployees || !user.site}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh All
              </Button>
              
              {employees.length === 0 && supervisorDepartment && user.site && !applyForSelf && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={addTestEmployee}
                  className="h-9 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Test Employee
                </Button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full lg:w-auto"
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
                    <p className="text-xs text-muted-foreground">
                      Pre-filled with your name from profile
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <Checkbox 
                        id="applyForSelf" 
                        checked={applyForSelf}
                        onCheckedChange={(checked) => {
                          setApplyForSelf(checked as boolean);
                          if (checked) {
                            setSelectedEmployee("self");
                          } else {
                            setSelectedEmployee("");
                          }
                        }}
                      />
                      <Label htmlFor="applyForSelf" className="text-sm cursor-pointer font-medium">
                        Apply leave for myself (Supervisor)
                      </Label>
                    </div>
                    {applyForSelf && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700 font-medium">
                          You're applying leave for yourself as Supervisor.
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          This leave request will be sent to Site Manager at {user?.site}
                        </p>
                        {(!user?.site || !user?.department) && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ Warning: Your site or department is not assigned. This may cause issues.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!applyForSelf && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="employee" className="text-sm">
                          Select Employee *
                        </Label>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="mr-1 h-3 w-3" />
                          {employees.length} available in {supervisorDepartment}
                          <MapPin className="ml-2 mr-1 h-3 w-3" />
                          {user.site}
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
                            No employees found in {supervisorDepartment} at {user.site}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Check "Apply for myself" to apply leave for yourself
                          </p>
                        </div>
                      ) : (
                        <Select
                          value={selectedEmployee}
                          onValueChange={setSelectedEmployee}
                          required={!applyForSelf}
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
                                  <span className="text-xs text-muted-foreground">
                                    Site: {employee.site} • Dept: {employee.department}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {(selectedEmployee || applyForSelf) && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Employee Name</Label>
                          <Input 
                            value={applyForSelf ? user?.name : employees.find(e => e._id === selectedEmployee)?.name || ""}
                            readOnly 
                            className="bg-background h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Employee ID</Label>
                          <Input 
                            value={applyForSelf ? user?.employeeId || `SUP_${user?._id}` : employees.find(e => e._id === selectedEmployee)?.employeeId || ""}
                            readOnly 
                            className="bg-background h-9"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Department</Label>
                          <Input 
                            value={applyForSelf ? user?.department || supervisorDepartment : employees.find(e => e._id === selectedEmployee)?.department || ""}
                            readOnly 
                            className="bg-background h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Site</Label>
                          <Input 
                            value={applyForSelf ? user?.site || "" : employees.find(e => e._id === selectedEmployee)?.site || ""}
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
                        <SelectItem value="emergency">Emergency Leave</SelectItem>
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
                  
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-700 font-medium">
                      This leave request will be sent to: Site Manager
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Site: {applyForSelf ? user?.site : employees.find(e => e._id === selectedEmployee)?.site || user?.site} • 
                      Department: {applyForSelf ? (user?.department || supervisorDepartment) : (employees.find(e => e._id === selectedEmployee)?.department || supervisorDepartment)}
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-9"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      `Submit Leave Request ${applyForSelf ? '(for Supervisor)' : ''}`
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-2 lg:space-y-0">
              <div>
                <CardTitle>
                  Leave Requests - {supervisorDepartment || "Select Department"} at {user.site || "Your Site"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {leaveRequests.length} leave requests found
                  {leaveRequests.filter(leave => leave.isSupervisorLeave).length > 0 && 
                    ` • ${leaveRequests.filter(leave => leave.isSupervisorLeave).length} supervisor leaves`}
                  {employees.length > 0 && ` • ${employees.length} employees in department`}
                  {user.site && ` • Site: ${user.site}`}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {employees.length === 0 && supervisorDepartment && user.site && !applyForSelf && (
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchLeaveRequests}
                  disabled={isLoading || apiStatus !== 'connected' || !supervisorDepartment || !user.site}
                  className="h-9"
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
            ) : !user.site ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Site Not Assigned</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have a site assigned. Please contact your administrator.
                </p>
                <p className="text-sm text-muted-foreground">
                  Current user: {user.email}
                </p>
              </div>
            ) : !supervisorDepartment ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Select a Department</h3>
                <p className="text-muted-foreground">
                  Please select a department to manage leave requests
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
                    No leave requests found for {supervisorDepartment} department at {user.site} site
                  </p>
                  {employees.length === 0 && !applyForSelf ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        There are no employees in this department at your site
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={addTestEmployee}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Test Employee
                        </Button>
                        <Button variant="outline" onClick={() => setDialogOpen(true)}>
                          <User className="mr-2 h-4 w-4" />
                          Apply for Myself
                        </Button>
                      </div>
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
                    className={`p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors ${leave.isSupervisorLeave ? 'bg-blue-50/50 border-blue-200' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{leave.employeeName}</h3>
                          {leave.isSupervisorLeave && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              <User className="mr-1 h-3 w-3" />
                              Supervisor's Leave
                            </Badge>
                          )}
                          <Badge variant={getStatusBadgeVariant(leave.status)}>
                            {leave.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(leave.fromDate)} to {formatDate(leave.toDate)} ({leave.totalDays} days)
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Type: <span className="font-medium capitalize">{leave.leaveType} Leave</span>
                          </span>
                          <span className="text-muted-foreground">
                            ID: {leave.employeeId}
                          </span>
                          <span className="text-muted-foreground">
                            Dept: {leave.department}
                          </span>
                          <span className="text-muted-foreground">
                            Site: {leave.site}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Reason:</span> {leave.reason}
                      </p>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Applied by: {leave.appliedBy} {leave.appliedBy === user.name && '(You)'}</span>
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