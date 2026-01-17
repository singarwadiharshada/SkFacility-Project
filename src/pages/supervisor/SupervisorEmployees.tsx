import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Eye, Edit, Trash2, Mail, Phone, MapPin, Clock, Users, UserPlus, Loader2, AlertCircle, Bug } from "lucide-react";
import { toast } from "sonner";
import { taskService } from "@/services/TaskService";

// Import the comprehensive onboarding tab
import SupervisorOnboardingTab from "./SupervisorOnboardingTab";

// Use the same types as in SupervisorOnboardingTab
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  joinDate?: string;
  dateOfJoining?: string;
  status: "active" | "inactive" | "left";
  salary: number | string;
  uanNumber?: string;
  uan?: string;
  esicNumber?: string;
  panNumber?: string;
  photo?: string;
  siteName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: string | number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  employeeSignature?: string;
  authorizedSignature?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SalaryStructure {
  id: number;
  employeeId: string;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowances: number;
  pf: number;
  esic: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
}

// Define a simpler Employee type for the supervisor's local use
type SupervisorEmployee = Employee & {
  id?: number;
  site?: string;
  shift?: string;
  role?: string;
};

const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  site: z.string().min(1, "Please select a site"),
  shift: z.string().min(1, "Please select a shift"),
  department: z.string().min(1, "Please select department"),
  role: z.string().min(1, "Please enter job role"),
});

const SupervisorEmployees = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useRole();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SupervisorEmployee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeHRMSTab, setActiveHRMSTab] = useState<"employees" | "onboarding">("employees");
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [activeTab, setActiveTab] = useState("employees");
  
  const [loading, setLoading] = useState({
    employees: false,
    sites: false
  });
  
  const [sites, setSites] = useState<any[]>([]);
  const [filteredSites, setFilteredSites] = useState<any[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [allEmployeesDebug, setAllEmployeesDebug] = useState<any[]>([]);

  // Helper function to normalize site names for comparison - FIXED ERROR #1
  const normalizeSiteName = (siteName: string | null | undefined): string => {
    if (!siteName) return '';
    return siteName
      .toString() // Ensure it's a string
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^a-z0-9\s]/g, ''); // Remove special characters
  };

  // Debug function to fetch all employees without filtering
  const fetchAllEmployeesDebug = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.employees) {
          setAllEmployeesDebug(result.employees);
          console.log("DEBUG - All employees in system:", result.employees);
          console.log("Employee sites:", [...new Set(result.employees.map((e: any) => e.site || e.siteName))]);
          
          toast.info(`Found ${result.employees.length} total employees in system`);
          
          // Show a breakdown by site
          const siteCounts: Record<string, number> = {};
          result.employees.forEach((emp: any) => {
            const site = emp.site || emp.siteName || 'Unknown';
            siteCounts[site] = (siteCounts[site] || 0) + 1;
          });
          
          console.log("Employees by site:", siteCounts);
          
          // Also check task service
          try {
            const allAssignees = await taskService.getAllAssignees();
            console.log("DEBUG - All assignees from task service:", allAssignees);
          } catch (error) {
            console.log("Could not fetch from task service:", error);
          }
        }
      }
    } catch (error) {
      console.error("Debug fetch error:", error);
      toast.error("Debug fetch failed");
    }
  };

  // Fetch supervisor's assigned sites
  const fetchSupervisorSites = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, sites: true }));
      
      const sitesData = await taskService.getAllSites();
      console.log("All sites from task service:", sitesData);
      
      let supervisorSites: any[] = [];
      
      if (Array.isArray(sitesData)) {
        supervisorSites = sitesData.map((site: any) => ({
          _id: site._id || site.id,
          name: site.name,
          normalizedName: normalizeSiteName(site.name),
          clientName: site.clientName || site.client,
          location: site.location || "",
          status: site.status || "active",
        }));
        
        // Filter sites based on supervisor's assigned sites
        const userSite = currentUser.site;
        if (userSite) {
          console.log("Supervisor's assigned site from context:", userSite);
          
          if (typeof userSite === 'string') {
            const supervisorSiteNormalized = normalizeSiteName(userSite);
            supervisorSites = supervisorSites.filter((site: any) => 
              site._id === userSite || 
              site.name === userSite ||
              site.normalizedName === supervisorSiteNormalized
            );
          } else if (Array.isArray(userSite)) {
            supervisorSites = supervisorSites.filter((site: any) => {
              const siteId = site._id;
              const siteName = site.name;
              const siteNormalizedName = site.normalizedName;
              
              // Check if any of the supervisor's sites match
              return userSite.some((s: string) => {
                const supervisorSiteNormalized = normalizeSiteName(s);
                return siteId === s || 
                       siteName === s || 
                       siteNormalizedName === supervisorSiteNormalized;
              });
            });
          }
        }
      }
      
      console.log("Supervisor's filtered sites:", supervisorSites);
      console.log("Supervisor info:", {
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        site: currentUser.site
      });
      
      setSites(supervisorSites);
      setFilteredSites(supervisorSites);
      
      if (supervisorSites.length === 0) {
        toast.warning("No sites assigned to this supervisor. Please contact administrator.");
      }
      
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      toast.error(`Failed to load sites: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, sites: false }));
    }
  };

  // Fetch employees under supervisor's sites
  const fetchEmployeesBySite = async () => {
    if (!currentUser) {
      console.log("No current user");
      return;
    }
    
    if (sites.length === 0) {
      console.log("No sites available for supervisor");
      toast.warning("No sites available. Fetching sites first...");
      await fetchSupervisorSites();
      if (sites.length === 0) return;
    }
    
    try {
      setLoading(prev => ({ ...prev, employees: true }));
      
      let fetchedEmployees: Employee[] = [];
      
      // Debug: Log supervisor info
      console.log("=== DEBUG: Supervisor Employee Fetch ===");
      console.log("Supervisor:", {
        name: currentUser.name,
        site: currentUser.site,
        sitesCount: sites.length,
        sitesList: sites.map(s => ({ id: s._id, name: s.name, normalizedName: s.normalizedName }))
      });
      
      // Method 1: Try to fetch from employee API
      try {
        const response = await fetch('/api/employees');
        if (response.ok) {
          const result = await response.json();
          console.log("API response success:", result.success);
          
          if (result.success && result.employees) {
            console.log(`Total employees in system: ${result.employees.length}`);
            
            // Get all unique site names from employees
            const allEmployeeSites = [...new Set(result.employees.map((e: any) => e.site || e.siteName || 'Unknown'))];
            console.log("All employee sites in system:", allEmployeeSites);
            
            // Filter employees by supervisor's sites
            const supervisorSiteNames = sites.map(site => site.name);
            const supervisorSiteNormalizedNames = sites.map(site => site.normalizedName);
            const supervisorSiteIds = sites.map(site => site._id);
            
            console.log("Supervisor sites to match:", {
              names: supervisorSiteNames,
              normalized: supervisorSiteNormalizedNames,
              ids: supervisorSiteIds
            });
            
            // Enhanced filtering with better matching
            fetchedEmployees = result.employees
              .filter((emp: any) => {
                const employeeSite = emp.site || emp.siteName || '';
                const employeeSiteId = emp.siteId;
                const employeeSiteNormalized = normalizeSiteName(employeeSite);
                
                // Check multiple matching strategies
                const matchesExactName = supervisorSiteNames.includes(employeeSite);
                const matchesNormalizedName = supervisorSiteNormalizedNames.includes(employeeSiteNormalized);
                const matchesSiteId = supervisorSiteIds.includes(employeeSiteId);
                const matchesCurrentUserSite = currentUser.site && 
                  (employeeSite === currentUser.site || 
                   employeeSiteId === currentUser.site ||
                   employeeSiteNormalized === normalizeSiteName(currentUser.site));
                
                // Also check partial matches for common site patterns
                const matchesPartial = supervisorSiteNormalizedNames.some(siteNorm => 
                  employeeSiteNormalized.includes(siteNorm) || 
                  siteNorm.includes(employeeSiteNormalized)
                );
                
                const matches = matchesExactName || matchesNormalizedName || matchesSiteId || matchesCurrentUserSite || matchesPartial;
                
                if (debugMode && employeeSite) {
                  console.log(`Employee ${emp.name}:`, {
                    site: employeeSite,
                    normalized: employeeSiteNormalized,
                    matchesExactName,
                    matchesNormalizedName,
                    matchesSiteId,
                    matchesCurrentUserSite,
                    matchesPartial,
                    matches
                  });
                }
                
                return matches;
              })
              .map((emp: any): Employee => ({
                _id: emp._id || emp.id?.toString() || Date.now().toString(),
                employeeId: emp.employeeId || `EMP${emp._id || emp.id || Date.now()}`,
                name: emp.name,
                email: emp.email || '',
                phone: emp.phone || '',
                aadharNumber: emp.aadharNumber || '',
                department: emp.department || 'General',
                position: emp.position || emp.role || 'Staff',
                joinDate: emp.dateOfJoining || emp.joinDate || new Date().toISOString().split('T')[0],
                dateOfJoining: emp.dateOfJoining || emp.joinDate || new Date().toISOString().split('T')[0],
                status: (emp.status || 'active') as "active" | "inactive" | "left",
                salary: emp.salary || 0,
                uanNumber: emp.uanNumber || emp.uan || '',
                esicNumber: emp.esicNumber || '',
                panNumber: emp.panNumber || '',
                siteName: emp.site || emp.siteName || 'Unknown',
                // Add other optional fields
                photo: emp.photo,
                dateOfBirth: emp.dateOfBirth,
                bloodGroup: emp.bloodGroup,
                gender: emp.gender,
                maritalStatus: emp.maritalStatus,
                permanentAddress: emp.permanentAddress,
                permanentPincode: emp.permanentPincode,
                localAddress: emp.localAddress,
                localPincode: emp.localPincode,
                bankName: emp.bankName,
                accountNumber: emp.accountNumber,
                ifscCode: emp.ifscCode,
                branchName: emp.branchName,
                fatherName: emp.fatherName,
                motherName: emp.motherName,
                spouseName: emp.spouseName,
                numberOfChildren: emp.numberOfChildren,
                emergencyContactName: emp.emergencyContactName,
                emergencyContactPhone: emp.emergencyContactPhone,
                emergencyContactRelation: emp.emergencyContactRelation,
                nomineeName: emp.nomineeName,
                nomineeRelation: emp.nomineeRelation,
                pantSize: emp.pantSize,
                shirtSize: emp.shirtSize,
                capSize: emp.capSize,
                idCardIssued: emp.idCardIssued || false,
                westcoatIssued: emp.westcoatIssued || false,
                apronIssued: emp.apronIssued || false,
                employeeSignature: emp.employeeSignature,
                authorizedSignature: emp.authorizedSignature,
                createdAt: emp.createdAt,
                updatedAt: emp.updatedAt
              }));
            
            console.log(`Filtered employees: ${fetchedEmployees.length} out of ${result.employees.length}`);
            
            if (fetchedEmployees.length === 0 && result.employees.length > 0) {
              console.warn("No employees matched the filter! Details:");
              console.log("All employee sites:", allEmployeeSites);
              console.log("Supervisor sites:", supervisorSiteNames);
              
              // Show which employees have which sites
              result.employees.forEach((emp: any) => {
                console.log(`- ${emp.name}: site="${emp.site || emp.siteName || 'None'}"`);
              });
              
              toast.warning(`No employees found for your sites. Total employees in system: ${result.employees.length}`);
            }
          } else {
            console.log("No employees data in API response");
          }
        } else {
          console.error("API response not OK:", response.status);
        }
      } catch (apiError) {
        console.log("Could not fetch from employee API:", apiError);
        
        // Method 2: Try task service as fallback
        try {
          console.log("Trying task service as fallback...");
          const allAssignees = await taskService.getAllAssignees();
          console.log("Task service assignees count:", allAssignees?.length || 0);
          
          if (allAssignees && Array.isArray(allAssignees)) {
            // Filter employees (not managers/supervisors)
            const employeeAssignees = allAssignees.filter((assignee: any) => {
              const role = assignee.role?.toLowerCase();
              return role === 'employee' || role === 'staff' || !role;
            });
            
            console.log("Employee assignees from task service:", employeeAssignees.length);
            
            // Filter by supervisor's sites
            const supervisorSiteNames = sites.map(site => site.name);
            const supervisorSiteNormalizedNames = sites.map(site => site.normalizedName);
            
            fetchedEmployees = employeeAssignees
              .filter((emp: any) => {
                const employeeSite = emp.site || emp.siteName || '';
                const employeeSiteNormalized = normalizeSiteName(employeeSite);
                
                const matchesExactName = supervisorSiteNames.includes(employeeSite);
                const matchesNormalizedName = supervisorSiteNormalizedNames.includes(employeeSiteNormalized);
                const matchesPartial = supervisorSiteNormalizedNames.some(siteNorm => 
                  employeeSiteNormalized.includes(siteNorm) || 
                  siteNorm.includes(employeeSiteNormalized)
                );
                
                return matchesExactName || matchesNormalizedName || matchesPartial;
              })
              .map((emp: any): Employee => ({
                _id: emp._id || emp.id.toString(),
                employeeId: emp.employeeId || `EMP${emp._id || emp.id}`,
                name: emp.name,
                email: emp.email || '',
                phone: emp.phone || '',
                aadharNumber: emp.aadharNumber || '',
                department: emp.department || 'General',
                position: emp.position || emp.role || 'Staff',
                joinDate: emp.dateOfJoining || emp.joinDate || new Date().toISOString().split('T')[0],
                dateOfJoining: emp.dateOfJoining || emp.joinDate || new Date().toISOString().split('T')[0],
                status: (emp.status || 'active') as "active" | "inactive" | "left",
                salary: emp.salary || 0,
                uanNumber: emp.uanNumber || emp.uan || '',
                esicNumber: emp.esicNumber || '',
                panNumber: emp.panNumber || '',
                siteName: emp.site || emp.siteName || 'Unknown',
                // Add minimal other fields
                photo: emp.photo,
                gender: emp.gender
              }));
            
            console.log("Task service filtered employees:", fetchedEmployees.length);
          }
        } catch (taskServiceError) {
          console.error("Error from task service:", taskServiceError);
        }
      }
      
      setEmployees(fetchedEmployees);
      
      // REMOVED MOCK DATA - Only show real data
      if (fetchedEmployees.length === 0) {
        console.log("No employees found for supervisor's sites");
        toast.info("No employees found for your assigned sites.");
      } else {
        toast.success(`Loaded ${fetchedEmployees.length} employees`);
      }
      
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error(`Failed to load employees: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  // Initialize data
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor") {
      console.log("Initializing supervisor data...");
      fetchSupervisorSites();
    }
  }, [currentUser]);

  // Fetch employees when sites are loaded
  useEffect(() => {
    if (sites.length > 0 && currentUser?.role === "supervisor") {
      console.log("Sites loaded, fetching employees...");
      fetchEmployeesBySite();
    }
  }, [sites, currentUser]);

  // Load employees from localStorage as fallback (only if we have real data)
  useEffect(() => {
    const savedEmployees = localStorage.getItem('supervisor_employees');
    if (savedEmployees) {
      try {
        const parsedEmployees = JSON.parse(savedEmployees);
        // Only use localStorage if we have no real data
        if (employees.length === 0 && parsedEmployees.length > 0) {
          // Filter localStorage employees by supervisor's site
          if (currentUser?.site && sites.length > 0) {
            const filtered = parsedEmployees.filter((emp: Employee) => {
              const employeeSiteNormalized = normalizeSiteName(emp.siteName || '');
              return sites.some(site => 
                normalizeSiteName(site.name) === employeeSiteNormalized
              );
            });
            if (filtered.length > 0) {
              setEmployees(filtered);
              console.log("Loaded from localStorage:", filtered.length, "employees");
            }
          }
        }
      } catch (error) {
        console.error("Error parsing localStorage employees:", error);
      }
    }
  }, [currentUser, sites, employees.length]);

  // Save real employees to localStorage
  useEffect(() => {
    if (employees.length > 0) {
      localStorage.setItem('supervisor_employees', JSON.stringify(employees));
    }
  }, [employees]);

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      site: "",
      shift: "",
      department: "",
      role: "",
    },
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof employeeSchema>) => {
    if (editingEmployee) {
      // Update existing employee
      setEmployees(employees.map(e => 
        e._id === editingEmployee._id 
          ? { 
              ...e, 
              name: values.name, 
              email: values.email,
              phone: values.phone, 
              siteName: values.site,
              department: values.department,
              position: values.role,
              ...(e as any),
              role: values.role
            } 
          : e
      ));
      toast.success("Employee updated successfully!");
    } else {
      // Create new employee
      const newEmployee: Employee = {
        _id: Date.now().toString(),
        employeeId: `SKEMP${String(employees.length + 1).padStart(4, '0')}`,
        name: values.name,
        email: values.email,
        phone: values.phone,
        aadharNumber: "",
        department: values.department,
        position: values.role,
        joinDate: new Date().toISOString().split('T')[0],
        dateOfJoining: new Date().toISOString().split('T')[0],
        status: "active",
        salary: 0,
        siteName: values.site,
        ...(values as any),
        role: values.role
      };
      setEmployees([...employees, newEmployee]);
      toast.success("Employee added successfully!");
    }
    setDialogOpen(false);
    form.reset();
  };

  // Create simplified employees tab component
  const SupervisorEmployeesTab = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name, email, department..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchAllEmployeesDebug}
              className="text-xs flex items-center gap-1"
            >
              <Bug className="h-3 w-3" />
              Debug
            </Button>
            <Button 
              onClick={() => {
                form.reset({
                  name: "",
                  email: "",
                  phone: "",
                  site: sites.length > 0 ? sites[0].name : "",
                  shift: "Day",
                  department: "",
                  role: "",
                });
                setEditingEmployee(null);
                setDialogOpen(true);
              }}
              className="whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {debugMode && allEmployeesDebug.length > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-yellow-800">Debug Info</h3>
                <Button size="sm" variant="outline" onClick={() => setDebugMode(false)}>
                  Hide
                </Button>
              </div>
              <div className="text-sm space-y-2">
                <p><strong>Total employees in system:</strong> {allEmployeesDebug.length}</p>
                <p><strong>Your sites:</strong> {sites.map(s => s.name).join(', ')}</p>
                <p><strong>Filtered employees:</strong> {employees.length}</p>
                <div className="mt-2">
                  <p className="font-semibold">All employee sites in system:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[...new Set(allEmployeesDebug.map((e: any) => e.site || e.siteName || 'Unknown'))].map((site, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {site || 'No site'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading.employees ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Loading employees...</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Checking sites: {sites.map(s => s.name).join(', ')}
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No employees found for your site(s)</p>
            <div className="space-y-2 mt-4">
              <Button
                variant="outline"
                onClick={fetchEmployeesBySite}
                className="mr-2"
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={fetchAllEmployeesDebug}
                className="text-xs"
              >
                <Bug className="h-3 w-3 mr-1" />
                Debug: Check All Employees
              </Button>
            </div>
            {sites.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Your assigned sites: <strong>{sites.map(s => s.name).join(', ')}</strong></p>
                <p className="text-xs mt-1">Check if employees are assigned to these sites</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {employees.length} employees for site(s):{" "}
                <span className="font-semibold">{sites.map(s => s.name).join(', ')}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDebugMode(!debugMode)}
                className="text-xs"
              >
                {debugMode ? 'Hide Debug' : 'Show Debug'}
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees
                    .filter(employee => 
                      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      employee.department.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((employee) => (
                      <TableRow key={employee._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {employee.employeeId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.siteName || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.status === "active" ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => toggleEmployeeStatus(employee._id)}
                          >
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingEmployee({
                                  ...employee,
                                  id: parseInt(employee._id),
                                  site: employee.siteName,
                                  shift: 'Day',
                                  role: employee.position
                                });
                                form.reset({
                                  name: employee.name,
                                  email: employee.email,
                                  phone: employee.phone,
                                  site: employee.siteName || '',
                                  shift: 'Day',
                                  department: employee.department,
                                  role: employee.position,
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEmployeeToDelete(employee._id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const toggleEmployeeStatus = (id: string) => {
    setEmployees(employees.map(employee =>
      employee._id === id 
        ? { 
            ...employee, 
            status: employee.status === "active" ? "inactive" : "active" as "active" | "inactive" | "left"
          } 
        : employee
    ));
    toast.success("Employee status updated!");
  };

  const handleDelete = () => {
    if (employeeToDelete) {
      setEmployees(employees.filter(e => e._id !== employeeToDelete));
      toast.success("Employee deleted successfully!");
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === "active").length,
    inactive: employees.filter(e => e.status === "inactive").length,
    sites: sites.length,
  };

  const handleRefresh = () => {
    if (sites.length > 0) {
      fetchEmployeesBySite();
    } else {
      fetchSupervisorSites().then(() => {
        if (sites.length > 0) {
          fetchEmployeesBySite();
        }
      });
    }
  };

  // Check if user is a supervisor
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please login to access this page</p>
        </div>
      </div>
    );
  }

  if (currentUser.role !== "supervisor") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">This page is only accessible to supervisors</p>
          <div className="space-y-2">
            <Badge variant="outline" className="text-lg capitalize">
              Your role: {currentUser.role}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Employee Management"
        subtitle={`Managing employees at your ${stats.sites} assigned site(s)`}
        onMenuClick={onMenuClick}
      />
      
      <div className="p-6 space-y-6">
        {/* Supervisor Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{currentUser.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="default" className="text-sm capitalize">
                    <Users className="h-3 w-3 mr-1" />
                    {currentUser.role}
                  </Badge>
                  {currentUser.site && (
                    <Badge variant="outline" className="text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      Site: {Array.isArray(currentUser.site) ? currentUser.site.join(', ') : currentUser.site}
                    </Badge>
                  )}
                  {currentUser.email && (
                    <Badge variant="outline" className="text-sm">
                      <Mail className="h-3 w-3 mr-1" />
                      {currentUser.email}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading.employees}
                    className="text-xs"
                  >
                    <Loader2 className={`h-3 w-3 mr-1 ${loading.employees ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDebugMode(!debugMode)}
                    className="text-xs"
                  >
                    <Bug className="h-3 w-3 mr-1" />
                    {debugMode ? 'Hide Debug' : 'Debug'}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.total} employees • {stats.active} active • {stats.sites} site(s)
                </div>
              </div>
            </div>
            {debugMode && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                <div className="text-xs space-y-1">
                  <p><strong>Debug Info:</strong></p>
                  <p>User ID: {currentUser.id}</p>
                  <p>Assigned Site: {currentUser.site || 'None'}</p>
                  <p>Found Sites: {sites.length} ({sites.map(s => s.name).join(', ')})</p>
                  <p>Employees loaded: {employees.length}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-gray-500"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Sites</p>
                  <p className="text-2xl font-bold">{stats.sites}</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HRMS Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="employees" className="flex-1 min-w-[120px]">
                  Employees
                </TabsTrigger>
                <TabsTrigger value="onboarding" className="flex-1 min-w-[120px]">
                  Onboarding
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="employees" className="space-y-4">
                <SupervisorEmployeesTab />
              </TabsContent>
              
              <TabsContent value="onboarding" className="space-y-4">
                <SupervisorOnboardingTab 
                  employees={employees}
                  setEmployees={setEmployees}
                  salaryStructures={salaryStructures}
                  setSalaryStructures={setSalaryStructures}
                  sites={sites} // Pass sites to the onboarding component
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter employee name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter employee email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map(site => (
                          <SelectItem key={site._id} value={site.name}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Day">Day Shift</SelectItem>
                        <SelectItem value="Night">Night Shift</SelectItem>
                        <SelectItem value="Rotating">Rotating Shift</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Role *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter job role" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full">
                {editingEmployee ? "Update Employee" : "Add Employee"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone and all their data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupervisorEmployees;