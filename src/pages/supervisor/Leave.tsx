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
import { Plus, Loader2, RefreshCw, Users, AlertCircle, Database, Search, Building, MapPin, User, Bug, Info, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRole } from "@/context/RoleContext";
import { taskService } from "@/services/TaskService"; // Import taskService

interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  site: string;
  siteId?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
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
  site?: string;
  siteId?: string;
  contactNumber: string;
  position: string;
  email: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  isSupervisor?: boolean;
  role?: "employee" | "staff" | "manager" | "supervisor";
}

interface Site {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  status: string;
  managerCount?: number;
  supervisorCount?: number;
  employeeCount?: number;
}

// Helper to normalize site IDs
const normalizeSiteId = (site: any): string | null => {
  if (!site) return null;
  
  if (typeof site === "string") {
    const cleanId = site.replace(/['"\\]/g, '').trim();
    const match = cleanId.match(/"([^"]+)"/) || cleanId.match(/'([^']+)'/);
    return match ? match[1] : cleanId;
  }
  
  if (typeof site === "object") {
    return site._id || site.id || site.siteId || site.site || null;
  }
  
  return null;
};

// Helper to compare site IDs
const compareSiteIds = (id1: string | null, id2: string | null): boolean => {
  if (!id1 || !id2) return false;
  return id1.toString().toLowerCase().trim() === id2.toString().toLowerCase().trim();
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Leave = () => {
  const { user, loading: authLoading } = useRole();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]); // Add sites state
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>(""); // Add selected site state
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false); // Add sites loading state
  const [supervisorDepartment, setSupervisorDepartment] = useState<string>("");
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [applyMode, setApplyMode] = useState<'employee' | 'self'>('employee');

  // Form state
  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    appliedBy: "",
  });

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    sitesLoaded: false,
    employeesLoaded: false,
    userHasSite: false,
    userSiteValue: "",
    filteredEmployeesCount: 0,
    employeesBySite: {} as Record<string, number>
  });

  // Check API connection on component mount
  useEffect(() => {
    checkApiConnection();
    
    if (user) {
      setFormData(prev => ({
        ...prev,
        appliedBy: user.name || "Supervisor"
      }));
      
      if (user.department) {
        setSupervisorDepartment(user.department);
      }
    }
  }, [user]);

  // Fetch sites first (like in SupervisorTasks)
  useEffect(() => {
    if (user && user.role === "supervisor") {
      console.log("Initializing supervisor data for Leave...");
      fetchSitesFromTasks();
    }
  }, [user]);

  // Fetch departments when sites are available
  useEffect(() => {
    if (sites.length > 0 && user?.site) {
      console.log("Sites loaded, fetching departments...");
      fetchDepartments();
    }
  }, [sites, user?.site]);

  // Fetch employees and leave requests when department changes
  useEffect(() => {
    if (user?.site && supervisorDepartment && apiStatus === 'connected' && sites.length > 0) {
      console.log("Fetching data for:", {
        site: user.site,
        department: supervisorDepartment,
        apiStatus,
        sitesCount: sites.length
      });
      fetchEmployees();
      fetchLeaveRequests();
    }
  }, [user?.site, supervisorDepartment, apiStatus, sites]);

  // Fetch sites from tasks like in SupervisorTasks component
  const fetchSitesFromTasks = async () => {
    if (!user) return;
    
    try {
      setIsLoadingSites(true);
      console.log("Fetching sites for supervisor...");
      
      // First, try to get sites from tasks
      let supervisorSites: Site[] = [];
      
      try {
        // Get all sites from task service
        const sitesData = await taskService.getAllSites();
        
        if (Array.isArray(sitesData)) {
          // Map all sites
          const allSites = sitesData.map((site: any) => ({
            _id: site._id || site.id || site.siteId || `site_${Date.now()}`,
            name: site.name || site.siteName || "Unknown Site",
            clientName: site.clientName || site.client || site.clientName || "Unknown Client",
            location: site.location || site.address || "Unknown Location",
            status: site.status || "active",
            managerCount: site.managerCount || 0,
            supervisorCount: site.supervisorCount || 0,
            employeeCount: site.employeeCount || 0
          }));
          
          console.log("All sites fetched:", allSites.length);
          
          // Get supervisor's site IDs from user profile
          let supervisorSiteIds: string[] = [];
          
          if (user.site) {
            if (Array.isArray(user.site)) {
              supervisorSiteIds = user.site.map(normalizeSiteId).filter(Boolean) as string[];
            } else {
              supervisorSiteIds = [normalizeSiteId(user.site)].filter(Boolean) as string[];
            }
          }
          
          console.log("Supervisor site IDs:", supervisorSiteIds);
          
          // Filter sites for supervisor
          if (supervisorSiteIds.length > 0) {
            supervisorSites = allSites.filter((site: Site) => {
              return supervisorSiteIds.some(supervisorId => 
                compareSiteIds(supervisorId, site._id)
              );
            });
          } else {
            // If no sites in profile, show all sites
            supervisorSites = allSites;
          }
          
          // If still no sites, try to get from user's existing site string
          if (supervisorSites.length === 0 && user.site) {
            const siteName = typeof user.site === 'string' ? user.site : '';
            supervisorSites = allSites.filter(site => 
              site.name.toLowerCase().includes(siteName.toLowerCase()) ||
              site._id.toLowerCase().includes(siteName.toLowerCase())
            );
          }
          
        } else {
          console.log("Sites data is not an array");
        }
        
      } catch (error) {
        console.error("Error fetching sites from taskService:", error);
      }
      
      // If no sites found, create demo site based on user info
      if (supervisorSites.length === 0) {
        console.log("No sites found, creating demo site");
        const supervisorSiteId = normalizeSiteId(user.site) || "site_demo_" + Date.now();
        supervisorSites = [
          {
            _id: supervisorSiteId,
            name: user.site ? `Site ${user.site}` : "Supervisor Site",
            clientName: "Demo Client",
            location: "Demo Location",
            status: "active",
            managerCount: 1,
            supervisorCount: 1,
            employeeCount: 5
          }
        ];
      }
      
      setSites(supervisorSites);
      
      // Auto-select first site
      if (supervisorSites.length > 0 && !selectedSite) {
        setSelectedSite(supervisorSites[0]._id);
      }
      
      setDebugInfo(prev => ({
        ...prev,
        sitesLoaded: true,
        userHasSite: supervisorSites.length > 0,
        userSiteValue: supervisorSites.map(s => s.name).join(', ')
      }));
      
      console.log("Sites loaded for supervisor:", supervisorSites.length);
      
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      toast.error(`Failed to load sites: ${error.message}`);
      
      // Create demo site as fallback
      const supervisorSiteId = normalizeSiteId(user.site) || "site_demo_" + Date.now();
      const demoSites: Site[] = [
        {
          _id: supervisorSiteId,
          name: user.site ? `Site ${user.site}` : "Supervisor Site",
          clientName: "Demo Client",
          location: "Demo Location",
          status: "active",
          managerCount: 1,
          supervisorCount: 1,
          employeeCount: 5
        }
      ];
      setSites(demoSites);
      
      if (demoSites.length > 0 && !selectedSite) {
        setSelectedSite(demoSites[0]._id);
      }
      
    } finally {
      setIsLoadingSites(false);
    }
  };

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
    if (!user?.site || sites.length === 0) {
      console.error("No user site or sites available");
      toast.error("Site information not available");
      return;
    }

    try {
      console.log("Fetching departments for site:", user.site);
      const response = await fetch(`${API_URL}/leaves/departments?site=${encodeURIComponent(user.site)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch departments:", response.status, errorText);
        
        // Try alternative endpoint
        console.log("Trying alternative endpoint...");
        const altResponse = await fetch(`${API_URL}/departments?site=${encodeURIComponent(user.site)}`);
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log("Alternative departments response:", altData);
          handleDepartmentsResponse(altData);
        } else {
          throw new Error(`Failed to fetch departments: ${response.status}`);
        }
      } else {
        const data = await response.json();
        console.log("Departments response:", data);
        handleDepartmentsResponse(data);
      }
    } catch (error: any) {
      console.error("Error fetching departments:", error);
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
    
    console.log("Processed departments:", departments);
    
    if (departments && departments.length > 0) {
      setAvailableDepartments(departments);
      
      if (user?.department && departments.includes(user.department)) {
        setSupervisorDepartment(user.department);
        console.log("Set supervisor department to user's department:", user.department);
      } else if (departments.length > 0) {
        setSupervisorDepartment(departments[0]);
        console.log("Set supervisor department to first available:", departments[0]);
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
      if (user?.department && defaultDepartments.includes(user.department)) {
        setSupervisorDepartment(user.department);
      } else {
        setSupervisorDepartment(defaultDepartments[0]);
      }
    }
    console.log("Using default departments:", defaultDepartments);
    toast.warning("No departments found. Using default departments.");
  };

  const fetchEmployees = async () => {
    if (apiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    if (!supervisorDepartment || !user?.site || sites.length === 0) {
      console.warn("Cannot fetch employees: missing department, site, or sites", {
        supervisorDepartment,
        userSite: user?.site,
        sitesCount: sites.length
      });
      toast.warning("Please select department and ensure site is set");
      return;
    }

    try {
      setIsLoadingEmployees(true);
      
      const url = `${API_URL}/leaves/supervisor/employees?department=${encodeURIComponent(supervisorDepartment)}&site=${encodeURIComponent(user.site)}&excludeSupervisors=true`;
      console.log("Fetching employees from:", url);
      
      const response = await fetch(url);
      
      console.log("Response status:", response.status);
      
      if (response.status === 404) {
        // Try alternative endpoint
        console.log("Trying alternative employees endpoint...");
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
      console.log("Response text:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Invalid JSON response from server");
      }
      
      handleEmployeesResponse(data);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error(error.message || "Failed to load employees");
      setEmployees([]);
      setSelectedEmployee("");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleEmployeesResponse = (data: any) => {
    console.log("Parsed employees response:", data);
    
    let employeesList: Employee[] = [];
    
    // Check if this is an error response
    if (data.message && data.message.includes("No active employees found")) {
      console.log(`No employees found in ${supervisorDepartment} at ${user?.site}`);
      setEmployees([]);
      setSelectedEmployee("");
      
      if (data.availableDepartments && data.availableDepartments.length > 0) {
        toast.info(`No employees in ${supervisorDepartment} at ${user?.site}. Try: ${data.availableDepartments.join(', ')}`);
        setAvailableDepartments(data.availableDepartments);
      } else {
        toast.warning(`No active employees found in ${supervisorDepartment} department at ${user?.site} site`);
      }
      return;
    }
    
    // Handle different response formats
    if (Array.isArray(data)) {
      employeesList = data;
    } else if (data.data && Array.isArray(data.data)) {
      employeesList = data.data;
    } else if (data.employees && Array.isArray(data.employees)) {
      employeesList = data.employees;
    } else {
      console.error("Unexpected response format:", data);
      toast.error("Unexpected response format from server");
      setEmployees([]);
      setSelectedEmployee("");
      return;
    }
    
    // Filter by site and exclude supervisors
    const siteFilteredEmployees = employeesList.filter((emp: Employee) => {
      // Check if employee belongs to any of supervisor's sites
      const employeeSiteId = normalizeSiteId(emp.site || emp.siteId);
      const isInSupervisorSite = sites.some(site => 
        compareSiteIds(site._id, employeeSiteId)
      );
      
      return isInSupervisorSite && 
             !emp.isSupervisor && 
             emp.position?.toLowerCase() !== 'supervisor' &&
             emp.role !== 'supervisor' &&
             emp.role !== 'manager';
    });
    
    console.log(`Found ${siteFilteredEmployees.length} employees in supervisor's sites`);
    
    // Group employees by site for debug info
    const employeesBySite = siteFilteredEmployees.reduce((acc: Record<string, number>, emp) => {
      const siteName = sites.find(s => compareSiteIds(s._id, normalizeSiteId(emp.site || emp.siteId)))?.name || 'Unknown Site';
      acc[siteName] = (acc[siteName] || 0) + 1;
      return acc;
    }, {});
    
    setEmployees(siteFilteredEmployees);
    setDebugInfo(prev => ({
      ...prev,
      employeesLoaded: siteFilteredEmployees.length > 0,
      filteredEmployeesCount: siteFilteredEmployees.length,
      employeesBySite: employeesBySite
    }));
    
    // Auto-select first employee if none selected
    if (siteFilteredEmployees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(siteFilteredEmployees[0]._id);
      console.log("Auto-selected employee:", siteFilteredEmployees[0].name);
      toast.success(`Loaded ${siteFilteredEmployees.length} employees`);
    } else if (siteFilteredEmployees.length === 0) {
      setSelectedEmployee("");
      toast.warning(`No employees found in ${supervisorDepartment} department at your sites`);
    }
  };

  const fetchLeaveRequests = async () => {
    if (apiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    if (!supervisorDepartment || !user?.site || sites.length === 0) {
      console.warn("Cannot fetch leaves: missing department, site, or sites", {
        supervisorDepartment,
        userSite: user?.site,
        sitesCount: sites.length
      });
      toast.warning("Please select both department and ensure site is set");
      return;
    }

    try {
      setIsLoading(true);
      
      // Get site IDs for filter
      const siteIds = sites.map(site => site._id);
      const siteNames = sites.map(site => site.name);
      
      const url = `${API_URL}/leaves/supervisor?department=${encodeURIComponent(supervisorDepartment)}&site=${encodeURIComponent(user.site)}&includeSupervisorLeaves=true&supervisorId=${user._id}&siteIds=${encodeURIComponent(JSON.stringify(siteIds))}&siteNames=${encodeURIComponent(JSON.stringify(siteNames))}`;
      
      console.log("Fetching leaves from:", url);
      
      const response = await fetch(url);
      
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
      console.log("Leaves data received:", data);
      
      // Filter leaves to only show those from supervisor's sites
      const filteredLeaves = data.filter((leave: LeaveRequest) => {
        const leaveSiteId = normalizeSiteId(leave.site || leave.siteId);
        return sites.some(site => compareSiteIds(site._id, leaveSiteId));
      });
      
      setLeaveRequests(filteredLeaves);
      toast.success(`Loaded ${filteredLeaves.length} leave requests`);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      toast.error(error.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  // Get employees for the selected site
  const getEmployeesForSite = (siteId: string): Employee[] => {
    return employees.filter(emp => 
      compareSiteIds(normalizeSiteId(emp.site || emp.siteId), siteId)
    );
  };

  // Handle site selection in the form
  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
    const selectedSiteObj = sites.find(s => s._id === siteId);
    if (selectedSiteObj) {
      console.log(`Selected site: ${selectedSiteObj.name}, employees: ${getEmployeesForSite(siteId).length}`);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submitting employee leave form...", {
      formData,
      selectedEmployee,
      selectedSite,
      applyMode,
      userSite: user?.site,
      supervisorDepartment
    });
    
    // Validate form for employee
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    
    if (!selectedSite) {
      toast.error("Please select a site");
      return;
    }
    
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

    // Get selected employee
    const selectedEmp = employees.find(emp => emp._id === selectedEmployee);
    if (!selectedEmp) {
      toast.error("Selected employee not found");
      return;
    }

    // Get selected site
    const selectedSiteObj = sites.find(s => s._id === selectedSite);
    if (!selectedSiteObj) {
      toast.error("Selected site not found");
      return;
    }

    // Verify employee belongs to selected site
    if (!compareSiteIds(normalizeSiteId(selectedEmp.site || selectedEmp.siteId), selectedSite)) {
      toast.error(`Selected employee does not belong to site ${selectedSiteObj.name}`);
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    const leaveData = {
      employeeId: selectedEmp.employeeId,
      employeeName: selectedEmp.name,
      department: selectedEmp.department,
      site: selectedSiteObj.name,
      siteId: selectedSiteObj._id,
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
      position: selectedEmp.position,
      email: selectedEmp.email,
      isSupervisorLeave: false
    };

    try {
      setIsSubmitting(true);
      
      console.log("Submitting employee leave data:", leaveData);

      const response = await fetch(`${API_URL}/leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        },
        body: JSON.stringify(leaveData),
      });
      
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response text:", responseText);
      
      if (!response.ok) {
        let errorMessage = 'Failed to submit leave';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
          
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
      
      toast.success(data.message || "Leave request submitted successfully for employee!");
      
      // Reset form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
        appliedBy: user?.name || "Supervisor",
      });
      setSelectedEmployee(employees.length > 0 ? employees[0]._id : "");
      setSelectedSite(sites.length > 0 ? sites[0]._id : "");
      
      setDialogOpen(false);
      fetchLeaveRequests();
      fetchEmployees();
    } catch (error: any) {
      console.error("Error submitting employee leave request:", error);
      toast.error(error.message || "Failed to submit leave request for employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submitting self leave form...", {
      formData,
      applyMode,
      userSite: user?.site,
      supervisorDepartment
    });
    
    // Validate form for self
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
      toast.error("Please enter your name");
      return;
    }

    if (!user?.site) {
      toast.error("Your site is not assigned. Cannot apply for leave.");
      return;
    }

    if (!user?.department && !supervisorDepartment) {
      toast.error("Your department is not assigned. Cannot apply for leave.");
      return;
    }

    // Use first available site for supervisor's own leave
    const supervisorSite = sites.length > 0 ? sites[0] : null;
    if (!supervisorSite) {
      toast.error("No sites available for supervisor");
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    const leaveData = {
      employeeId: user?.employeeId || `SUP_${user?._id}`,
      employeeName: user?.name || "Supervisor",
      department: user?.department || supervisorDepartment,
      site: supervisorSite.name,
      siteId: supervisorSite._id,
      contactNumber: user?.phone || "",
      leaveType: formData.leaveType,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      totalDays,
      reason: formData.reason,
      appliedBy: formData.appliedBy,
      appliedFor: user?.employeeId || `SUP_${user?._id}`,
      supervisorId: user?._id,
      isSupervisorLeave: true,
      supervisorAsEmployee: true,
      status: 'pending',
      position: user?.position || "Supervisor",
      email: user?.email || ""
    };

    try {
      setIsSubmitting(true);
      
      console.log("Submitting self leave data:", leaveData);

      const response = await fetch(`${API_URL}/leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        },
        body: JSON.stringify(leaveData),
      });
      
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response text:", responseText);
      
      if (!response.ok) {
        let errorMessage = 'Failed to submit leave';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
          
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
      
      toast.success(data.message || "Leave request submitted successfully for yourself!");
      
      // Reset form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
        appliedBy: user?.name || "Supervisor",
      });
      
      setDialogOpen(false);
      fetchLeaveRequests();
    } catch (error: any) {
      console.error("Error submitting self leave request:", error);
      toast.error(error.message || "Failed to submit leave request for yourself");
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
        
        if (data.departments && data.departments.length > 0) {
          setAvailableDepartments(data.departments);
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
      console.log("Sites count:", sites.length);
      console.log("Selected site:", selectedSite);
      console.log("Employees count:", employees.length);
      console.log("Selected employee:", selectedEmployee);
      console.log("Apply mode:", applyMode);
      console.log("Debug info:", debugInfo);
      
      // Test basic API endpoint
      console.log("\n1. Testing base API...");
      const baseResponse = await fetch(`${API_URL}/test`);
      console.log("Base API status:", baseResponse.status);
      console.log("Base API response:", await baseResponse.text());
      
      toast.info("API debug complete. Check console for details.");
    } catch (error) {
      console.error("Debug error:", error);
      toast.error("Debug failed");
    }
  };

  const handleRefreshAll = () => {
    checkApiConnection();
    fetchSitesFromTasks();
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
      sitesCount: sites.length,
      sites: sites.map(s => s.name),
      selectedSite,
      employeesCount: employees.length,
      selectedEmployee,
      leaveRequestsCount: leaveRequests.length,
      applyMode,
      debugInfo
    });
    
    console.log("3. Form Data:", formData);
    console.log("4. Selected Employee Data:", employees.find(e => e._id === selectedEmployee));
    
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

  // Employee Leave Form Component - UPDATED WITH SITE SELECTION
  const EmployeeLeaveForm = () => {
    return (
      <form onSubmit={handleEmployeeSubmit} className="space-y-4">
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
          <Label htmlFor="site" className="text-sm">Select Site *</Label>
          {isLoadingSites ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Loading sites...</span>
            </div>
          ) : sites.length === 0 ? (
            <div className="p-3 border border-dashed rounded-lg text-center">
              <Building className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No sites available
              </p>
            </div>
          ) : (
            <Select
              value={selectedSite}
              onValueChange={handleSiteSelect}
              required
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => {
                  const siteEmployees = getEmployeesForSite(site._id);
                  return (
                    <SelectItem key={site._id} value={site._id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{site.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {siteEmployees.length} employees
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {site.clientName}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          {selectedSite && (
            <p className="text-xs text-muted-foreground mt-1">
              {getEmployeesForSite(selectedSite).length} employees available at this site
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="employee" className="text-sm">
              Select Employee *
            </Label>
            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="mr-1 h-3 w-3" />
              {selectedSite ? getEmployeesForSite(selectedSite).length : employees.length} employees
            </div>
          </div>
          
          {isLoadingEmployees ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Loading employees...</span>
            </div>
          ) : !selectedSite ? (
            <div className="p-3 border border-dashed rounded-lg text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Please select a site first
              </p>
            </div>
          ) : getEmployeesForSite(selectedSite).length === 0 ? (
            <div className="p-3 border border-dashed rounded-lg text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No employees found at this site
              </p>
            </div>
          ) : (
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              required
              disabled={!selectedSite}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {getEmployeesForSite(selectedSite).map((employee) => (
                  <SelectItem key={employee._id} value={employee._id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {employee.employeeId} • {employee.position}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {employee.department}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedEmployee && selectedSite && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Employee Name</Label>
                <Input 
                  value={employees.find(e => e._id === selectedEmployee)?.name || ""}
                  readOnly 
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Employee ID</Label>
                <Input 
                  value={employees.find(e => e._id === selectedEmployee)?.employeeId || ""}
                  readOnly 
                  className="bg-background h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Input 
                  value={employees.find(e => e._id === selectedEmployee)?.department || ""}
                  readOnly 
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Site</Label>
                <Input 
                  value={sites.find(s => s._id === selectedSite)?.name || ""}
                  readOnly 
                  className="bg-background h-9 text-sm"
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
            Employee: {employees.find(e => e._id === selectedEmployee)?.name || "Not selected"}
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Site: {sites.find(s => s._id === selectedSite)?.name || "Not selected"}
          </p>
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-9"
          disabled={isSubmitting || !selectedEmployee || !selectedSite}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Leave Request for Employee'
          )}
        </Button>
      </form>
    );
  };

  // Self Leave Form Component - UPDATED WITH SITE INFO
  const SelfLeaveForm = () => {
    const supervisorSite = sites.length > 0 ? sites[0] : null;
    
    return (
      <form onSubmit={handleSelfSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">Supervisor Information</Label>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{user?.name || "Supervisor"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Supervisor ID</p>
                <p className="font-medium">{user?.employeeId || `SUP_${user?._id}`}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="font-medium">{user?.department || supervisorDepartment || "Not assigned"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Site</p>
                <p className="font-medium">{supervisorSite?.name || user?.site || "Not assigned"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appliedBy" className="text-sm">
            Applied By (Your Name) *
          </Label>
          <Input 
            id="appliedBy"
            value={formData.appliedBy}
            onChange={(e) => setFormData(prev => ({...prev, appliedBy: e.target.value}))}
            placeholder="Enter your name"
            required
            className="h-9"
          />
        </div>

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
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">
            This leave request will be sent to: Site Manager
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Site: {supervisorSite?.name || user?.site || "Not assigned"}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Department: {user?.department || supervisorDepartment || "Not assigned"}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            ⓘ Supervisor's own leave request
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
            'Submit Leave Request for Myself'
          )}
        </Button>
      </form>
    );
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
        {/* Supervisor Info Bar - UPDATED WITH SITES INFO */}
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
                <Badge variant="outline" className={sites.length > 0 ? "bg-green-50" : "bg-red-50"}>
                  <span className="flex items-center">
                    <Building className="mr-1 h-3 w-3" />
                    Sites: {sites.length}
                  </span>
                </Badge>
                <Badge variant="outline" className={user.department ? "bg-green-50" : "bg-yellow-50"}>
                  <span className="flex items-center">
                    <Briefcase className="mr-1 h-3 w-3" />
                    Dept: {user.department || "Not assigned"}
                  </span>
                </Badge>
                {debugInfo.employeesLoaded && (
                  <Badge variant="outline" className="bg-blue-50">
                    <span className="flex items-center">
                      <Users className="mr-1 h-3 w-3" />
                      Employees: {employees.length}
                    </span>
                  </Badge>
                )}
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

        {/* Debug Info Panel */}
        {showDebugInfo && (
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">System Status</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                {debugInfo.sitesLoaded ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-600">✗</span>
                )}
                <span>Sites: {sites.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {debugInfo.employeesLoaded ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-600">✗</span>
                )}
                <span>Employees: {employees.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>API Status:</span>
                <span className={`ml-1 ${apiStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {apiStatus}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Selected Site:</span>
                <span className="ml-1">
                  {sites.find(s => s._id === selectedSite)?.name || "None"}
                </span>
              </div>
            </div>
            {Object.keys(debugInfo.employeesBySite).length > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600">Employees by Site: </span>
                <span>
                  {Object.entries(debugInfo.employeesBySite).map(([site, count]) => (
                    <Badge key={site} variant="outline" className="ml-1 text-xs">
                      {site}: {count}
                    </Badge>
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Your Assigned Sites</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center px-3 py-2 border rounded-md text-sm bg-primary/5 border-primary/20">
                      <Building className="mr-2 h-4 w-4" />
                      {sites.length} site(s) available
                    </div>
                    <div className="flex items-center px-2 py-1 bg-blue-50 rounded text-xs">
                      <Briefcase className="mr-1 h-3 w-3" />
                      Manager: Site Manager
                    </div>
                  </div>
                  {sites.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sites: {sites.map(s => s.name).join(', ')}
                    </p>
                  )}
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
                                <Briefcase className="mr-2 h-4 w-4" />
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
                  {employees.length} employees at your sites
                </span>
                <span className="flex items-center">
                  <Building className="mr-1 h-3 w-3" />
                  {sites.length} site(s) assigned
                </span>
                <span className="flex items-center">
                  <Briefcase className="mr-1 h-3 w-3" />
                  {availableDepartments.length} departments available
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshAll}
                className="h-9"
                disabled={isLoading || isLoadingEmployees || isLoadingSites}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh All
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant={applyMode === 'employee' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApplyMode('employee')}
                className="flex-1"
              >
                <Users className="mr-2 h-4 w-4" />
                For Employee
              </Button>
              <Button
                type="button"
                variant={applyMode === 'self' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApplyMode('self')}
                className="flex-1"
              >
                <User className="mr-2 h-4 w-4" />
                For Myself
              </Button>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Apply for {applyMode === 'employee' ? 'Employee' : 'Leave'}
                  {applyMode === 'employee' && employees.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {employees.length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {applyMode === 'employee' ? 'Apply Leave for Employee' : 'Apply Leave for Yourself'}
                  </DialogTitle>
                </DialogHeader>
                
                {applyMode === 'employee' ? <EmployeeLeaveForm /> : <SelfLeaveForm />}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-2 lg:space-y-0">
              <div>
                <CardTitle>
                  Leave Requests - {supervisorDepartment || "Select Department"} at your sites
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {leaveRequests.length} leave requests found across {sites.length} site(s)
                  {leaveRequests.filter(leave => leave.isSupervisorLeave).length > 0 && 
                    ` • ${leaveRequests.filter(leave => leave.isSupervisorLeave).length} supervisor leaves`}
                  {employees.length > 0 && ` • ${employees.length} employees in department`}
                </p>
              </div>
              <div className="flex items-center space-x-2">
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
            ) : sites.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No Sites Assigned</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any sites assigned. Please contact your administrator.
                </p>
                <Button onClick={fetchSitesFromTasks} className="mt-2">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Sites
                </Button>
              </div>
            ) : !supervisorDepartment ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                    No leave requests found for {supervisorDepartment} department at your sites
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Leave Request
                  </Button>
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