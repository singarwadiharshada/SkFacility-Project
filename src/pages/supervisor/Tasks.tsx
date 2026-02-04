import { useState, useEffect } from "react";
import { useRole, User } from "@/context/RoleContext";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, Eye, Edit, Trash2, Loader2, AlertCircle, 
  Users, Shield, ListFilter, RefreshCw, UserCheck, FileText, Building,
  AlertTriangle, Info, XCircle, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { taskService, type Assignee, type Site as TaskServiceSite } from "@/services/TaskService";

// Types
interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "employee" | "staff" | "manager" | "supervisor";
  site?: string;
  siteName?: string;
  isActive?: boolean;
  department?: string;
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

// Task interface for supervisor
interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  deadline: string;
  dueDateTime?: string;
  siteId: string;
  siteName: string;
  clientName: string;
  taskType?: string;
  attachments: any[];
  hourlyUpdates: any[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdById?: string;
  source: "superadmin" | "manager" | "supervisor";
  isAssignedToMe?: boolean;
  isCreatedByMe?: boolean;
  assignedToRole?: "employee" | "supervisor" | "staff" | "manager";
}

// View modes for supervisor
type SupervisorViewMode = "assigned" | "created" | "team" | "site" | "all";

// Helper to normalize and compare site names (case insensitive, trim whitespace)
const normalizeSiteName = (siteName: any): string | null => {
  if (!siteName) return null;
  
  if (typeof siteName === "string") {
    return siteName.trim().toLowerCase();
  }
  
  if (typeof siteName === "object") {
    return siteName.name?.trim().toLowerCase() || null;
  }
  
  return null;
};

const compareSiteNames = (name1: string | null, name2: string | null): boolean => {
  if (!name1 || !name2) return false;
  return name1 === name2;
};

const SupervisorTasks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState({
    tasks: false,
    employees: false,
    sites: false,
    myTasks: false,
    initializing: false
  });
  
  const [viewMode, setViewMode] = useState<SupervisorViewMode>("assigned");
  const [activeTab, setActiveTab] = useState("all");
  
  const { user: currentUser, isAuthenticated } = useRole();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myAssignedTasks, setMyAssignedTasks] = useState<Task[]>([]);
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    sitesLoaded: false,
    employeesLoaded: false,
    userHasSite: false,
    userSiteValue: "",
    supervisorSiteNames: [] as string[],
    apiSitesCount: 0,
    filteredSitesCount: 0,
    filteredEmployeesCount: 0,
    employeesBySite: {} as Record<string, number>,
    initializationStep: ""
  });
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    assignedToName: "",
    assignedToRole: "employee" as "employee" | "self",
    siteId: "",
    siteName: "",
    clientName: "",
    priority: "medium" as "high" | "medium" | "low",
    deadline: "",
    dueDateTime: "",
    taskType: "general"
  });

  // Get IDs of employees managed by this supervisor
  const getSupervisorEmployeeIds = (): string[] => {
    return employees
      .filter(emp => emp.role === "employee" || emp.role === "staff")
      .map(emp => emp._id);
  };

  // Get supervisor's site IDs and names
  const getSupervisorSiteIds = (): string[] => {
    return sites.map(site => site._id);
  };

  const getSupervisorSiteNames = (): string[] => {
    return sites.map(site => site.name);
  };

  // Fetch employees from API with site name filtering
  const fetchEmployeesForSitesByName = async (siteNames: string[]) => {
    if (!currentUser || siteNames.length === 0) return [];
    
    try {
      console.log("=== FETCHING EMPLOYEES FOR SITES BY NAME ===");
      console.log("Site names to filter by:", siteNames);
      
      const allAssignees = await taskService.getAllAssignees();
      console.log("Total assignees fetched:", allAssignees.length);
      
      // Filter employees by site name
      const filteredEmployees = allAssignees
        .filter((assignee: any) => {
          const role = assignee.role?.toLowerCase();
          
          // Only include employees and staff
          const isEmployeeOrStaff = ["employee", "staff"].includes(role);
          if (!isEmployeeOrStaff) return false;
          
          // Get employee's site name from multiple possible fields
          const assigneeSiteName = normalizeSiteName(
            assignee.siteName || assignee.site?.name || assignee.site
          );
          
          // Check if employee belongs to any of the supervisor's sites by name
          const belongsToSupervisorSite = siteNames.some(siteName => 
            compareSiteNames(siteName, assigneeSiteName)
          );
          
          if (!belongsToSupervisorSite) {
            console.log(`Employee ${assignee.name} filtered out - site name mismatch. Employee site: ${assigneeSiteName}, Supervisor sites: ${siteNames}`);
            return false;
          }
          
          return true;
        })
        .map((assignee: any) => {
          // Determine site name from multiple possible fields
          const siteName = assignee.siteName || assignee.site?.name || assignee.site || "Unknown Site";
          
          return {
            _id: assignee._id,
            name: assignee.name,
            email: assignee.email,
            phone: assignee.phone,
            role: assignee.role.toLowerCase() as "employee" | "staff" | "manager" | "supervisor",
            site: assignee.siteId || assignee.site?._id,
            siteName: siteName,
            department: assignee.department,
            isActive: assignee.status === 'active' || assignee.isActive !== false
          };
        });
      
      console.log("Filtered employees by site name:", filteredEmployees.length);
      
      return filteredEmployees;
      
    } catch (error) {
      console.error("Error fetching employees for sites by name:", error);
      return [];
    }
  };

  // Fetch sites assigned to this supervisor
  const fetchSites = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, sites: true }));
      setDebugInfo(prev => ({ ...prev, initializationStep: "Fetching sites..." }));
      
      const sitesData = await taskService.getAllSites();
      
      console.log('=== FETCHING SITES ===');
      console.log('Current user:', currentUser);
      console.log('Current user site from context:', currentUser.site);
      console.log('Raw sites data from API:', sitesData);
      
      let filteredSites: Site[] = [];
      let allSites: Site[] = [];
      
      if (Array.isArray(sitesData)) {
        allSites = sitesData.map((site: any) => ({
          _id: site._id,
          name: site.name || site.siteName || "Unknown Site",
          clientName: site.clientName || site.client || "Unknown Client",
          location: site.location || site.address || "Unknown Location",
          status: site.status || "active",
          managerCount: site.managerCount || 0,
          supervisorCount: site.supervisorCount || 0,
          employeeCount: site.employeeCount || 0
        }));
        
        console.log('Mapped all sites:', allSites);
        console.log('All site names:', allSites.map(s => s.name));
        
        // Get supervisor's site names from user context
        let supervisorSiteNames: string[] = [];
        
        if (currentUser.site) {
          if (Array.isArray(currentUser.site)) {
            supervisorSiteNames = currentUser.site.map(site => {
              if (typeof site === 'string') {
                return site.trim().toLowerCase();
              } else if (site && typeof site === 'object') {
                return site.name?.trim().toLowerCase() || '';
              }
              return '';
            }).filter(name => name !== '');
          } else {
            const siteName = normalizeSiteName(currentUser.site);
            if (siteName) {
              supervisorSiteNames = [siteName];
            }
          }
        }
        
        console.log('Supervisor site names from context (normalized):', supervisorSiteNames);
        
        // Also get site names from assigned tasks
        const taskSiteNames = myAssignedTasks
          .map(task => task.siteName)
          .filter(Boolean)
          .map(name => normalizeSiteName(name))
          .filter(Boolean) as string[];
        
        console.log('Site names from assigned tasks:', taskSiteNames);
        
        // Combine both sources
        const allSupervisorSiteNames = [...new Set([...supervisorSiteNames, ...taskSiteNames])];
        console.log('All supervisor site names (combined):', allSupervisorSiteNames);
        
        if (allSupervisorSiteNames.length > 0) {
          // Filter sites by supervisor's site names
          filteredSites = allSites.filter((site: Site) => {
            const siteNameNormalized = normalizeSiteName(site.name);
            return allSupervisorSiteNames.some(supervisorSiteName => 
              compareSiteNames(supervisorSiteName, siteNameNormalized)
            );
          });
          
          console.log('Filtered sites for supervisor:', filteredSites);
        } else {
          console.log('Supervisor has no sites assigned in context or from tasks');
          // If no sites assigned, show all sites (or empty based on your requirement)
          filteredSites = [];
        }
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          userHasSite: supervisorSiteNames.length > 0,
          userSiteValue: supervisorSiteNames.length > 0 
            ? `From context: ${supervisorSiteNames.join(', ')}`
            : "No sites from context",
          supervisorSiteNames: supervisorSiteNames,
          sitesLoaded: filteredSites.length > 0,
          apiSitesCount: allSites.length,
          filteredSitesCount: filteredSites.length
        }));
      } else {
        console.log('Sites data is not an array:', sitesData);
      }
      
      setSites(filteredSites);
      
      // Auto-select first site if available
      if (filteredSites.length > 0 && !newTask.siteId) {
        const site = filteredSites[0];
        setNewTask(prev => ({
          ...prev,
          siteId: site._id,
          siteName: site.name,
          clientName: site.clientName
        }));
      }
      
      if (filteredSites.length === 0) {
        console.log('No sites found for supervisor');
        toast.info("No sites assigned. Please contact administrator.");
      }
      
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      toast.error(`Failed to load sites: ${error.message}`);
      
      setSites([]);
      setDebugInfo(prev => ({
        ...prev,
        sitesLoaded: false,
        userHasSite: false,
        userSiteValue: "Error loading sites",
        filteredSitesCount: 0
      }));
    } finally {
      setLoading(prev => ({ ...prev, sites: false }));
    }
  };

  // Fetch employees for supervisor - now fetches after sites are loaded
  const fetchEmployeesByRole = async () => {
    if (!currentUser || sites.length === 0) {
      console.log('Cannot fetch employees: no current user or sites are empty');
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, employees: true }));
      setDebugInfo(prev => ({ ...prev, initializationStep: "Fetching employees..." }));
      
      console.log("=== FETCH EMPLOYEES BY ROLE ===");
      console.log("Supervisor has", sites.length, "sites");
      console.log("Site names:", sites.map(s => s.name));
      
      // Get supervisor's site names
      const supervisorSiteNames = getSupervisorSiteNames();
      console.log("Supervisor site names for employee filtering:", supervisorSiteNames);
      
      if (supervisorSiteNames.length === 0) {
        console.log("No sites to filter employees by");
        setEmployees([]);
        toast.info("No sites assigned. Employees cannot be fetched.");
        return;
      }
      
      // Fetch employees for these specific sites by name
      const fetchedEmployees = await fetchEmployeesForSitesByName(supervisorSiteNames);
      
      console.log("Fetched employees for supervisor's sites:", fetchedEmployees.length);
      console.log("Employees details:", fetchedEmployees.map(e => ({ name: e.name, siteName: e.siteName })));
      
      // Group employees by site for debug info
      const employeesBySite = fetchedEmployees.reduce((acc: Record<string, number>, emp) => {
        const siteName = emp.siteName || 'Unknown Site';
        acc[siteName] = (acc[siteName] || 0) + 1;
        return acc;
      }, {});
      
      console.log("Employees by site:", employeesBySite);
      
      setEmployees(fetchedEmployees);
      setDebugInfo(prev => ({
        ...prev,
        employeesLoaded: fetchedEmployees.length > 0,
        filteredEmployeesCount: fetchedEmployees.length,
        employeesBySite: employeesBySite
      }));
      
      if (fetchedEmployees.length === 0) {
        toast.info("No employees found for your assigned sites");
      } else {
        console.log(`Successfully loaded ${fetchedEmployees.length} employees for supervisor`);
      }
      
    } catch (error: any) {
      console.error('Error in fetchEmployeesByRole:', error);
      toast.error(`Failed to load employees: ${error.message}`);
      
      setEmployees([]);
      setDebugInfo(prev => ({
        ...prev,
        employeesLoaded: false,
        filteredEmployeesCount: 0,
        employeesBySite: {}
      }));
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  // Fetch tasks specifically assigned to supervisor (from manager/admin)
  const fetchMyAssignedTasks = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, myTasks: true }));
      setDebugInfo(prev => ({ ...prev, initializationStep: "Fetching assigned tasks..." }));
      
      let assignedTasks: Task[] = [];
      
      try {
        // Get all tasks and filter them
        const allTasks = await taskService.getAllTasks();
        
        // Filter tasks where current supervisor is the assignee
        assignedTasks = allTasks
          .filter((task: any) => task.assignedTo === currentUser._id)
          .map((task: any) => {
            // Determine source based on creator role
            let source: "superadmin" | "manager" | "supervisor" = "superadmin";
            
            if (task.createdById === currentUser._id) {
              source = "supervisor";
            } else if (task.createdByRole === 'manager' || task.createdBy === 'manager') {
              source = "manager";
            } else if (task.createdByRole === 'supervisor') {
              source = "supervisor";
            }
            
            return {
              ...task,
              source,
              isAssignedToMe: true,
              isCreatedByMe: task.createdById === currentUser._id,
              assignedToRole: "supervisor"
            };
          });
        
        console.log("Found", assignedTasks.length, "tasks assigned to supervisor");
        
      } catch (error) {
        console.error("Error fetching assigned tasks:", error);
        toast.error("Failed to load assigned tasks");
      }
      
      setMyAssignedTasks(assignedTasks);
      
    } catch (error: any) {
      console.error('Error in fetchMyAssignedTasks:', error);
      toast.error(`Failed to load your tasks: ${error.message}`);
      setMyAssignedTasks([]);
    } finally {
      setLoading(prev => ({ ...prev, myTasks: false }));
    }
  };

  // Fetch tasks based on view mode
  const fetchTasks = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, tasks: true }));
      
      let fetchedTasks: Task[] = [];
      
      try {
        switch(viewMode) {
          case "assigned":
            fetchedTasks = await fetchAssignedTasks();
            break;
            
          case "created":
            fetchedTasks = await fetchCreatedTasks();
            break;
            
          case "team":
            fetchedTasks = await fetchTeamTasks();
            break;
            
          case "site":
            fetchedTasks = await fetchSiteTasks();
            break;
            
          case "all":
          default:
            fetchedTasks = await fetchAllTasks();
            break;
        }
        
      } catch (error) {
        console.error("Error fetching tasks from taskService:", error);
        toast.error("Failed to load tasks from service");
      }
      
      setTasks(fetchedTasks);
      
    } catch (error: any) {
      console.error('Error in fetchTasks:', error);
      toast.error(`Failed to load tasks: ${error.message}`);
      setTasks([]);
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  };

  // Helper function for assigned tasks
  const fetchAssignedTasks = async (): Promise<Task[]> => {
    return myAssignedTasks.filter(task =>
      task.assignedTo === currentUser._id
    );
  };

  // Helper function for created tasks
  const fetchCreatedTasks = async (): Promise<Task[]> => {
    try {
      const allTasks = await taskService.getAllTasks();
      
      return allTasks
        .filter((task: any) => task.createdById === currentUser._id)
        .map((task: any) => ({
          ...task,
          source: "supervisor",
          isAssignedToMe: task.assignedTo === currentUser._id,
          isCreatedByMe: true,
          assignedToRole: task.assignedTo === currentUser._id ? "supervisor" : "employee"
        }));
    } catch (error) {
      console.error("Error fetching created tasks:", error);
      return [];
    }
  };

  // Helper function for team tasks
  const fetchTeamTasks = async (): Promise<Task[]> => {
    try {
      const allTasks = await taskService.getAllTasks();
      
      // Get IDs of employees managed by this supervisor
      const supervisorEmployeeIds = getSupervisorEmployeeIds();
      
      return allTasks
        .filter((task: any) => 
          supervisorEmployeeIds.includes(task.assignedTo)
        )
        .map((task: any) => ({
          ...task,
          source: task.createdById === currentUser._id ? "supervisor" : 
                 (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
          isAssignedToMe: task.assignedTo === currentUser._id,
          isCreatedByMe: task.createdById === currentUser._id,
          assignedToRole: "employee"
        }));
    } catch (error) {
      console.error("Error fetching team tasks:", error);
      return [];
    }
  };

  // Helper function for site tasks
  const fetchSiteTasks = async (): Promise<Task[]> => {
    try {
      const allTasks = await taskService.getAllTasks();
      
      // Get supervisor's data
      const supervisorEmployeeIds = getSupervisorEmployeeIds();
      const siteIds = getSupervisorSiteIds();
      const siteNames = getSupervisorSiteNames();
      
      const siteTasks = allTasks
        .filter((task: any) => {
          // First check if task is on supervisor's site
          const isOnSupervisorSite = 
            siteIds.includes(task.siteId) || 
            siteNames.includes(task.siteName);
          
          if (!isOnSupervisorSite) return false;
          
          // Then check if task is assigned to supervisor OR their employees
          const isAssignedToSupervisorOrTeam = 
            task.assignedTo === currentUser._id ||
            supervisorEmployeeIds.includes(task.assignedTo);
          
          return isAssignedToSupervisorOrTeam;
        })
        .map((task: any) => ({
          ...task,
          source: task.createdById === currentUser._id ? "supervisor" : 
                 (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
          isAssignedToMe: task.assignedTo === currentUser._id,
          isCreatedByMe: task.createdById === currentUser._id,
          assignedToRole: task.assignedTo === currentUser._id ? "supervisor" : "employee"
        }));
      
      return siteTasks;
    } catch (error) {
      console.error("Error fetching site tasks:", error);
      return [];
    }
  };

  // Helper function for all tasks
  const fetchAllTasks = async (): Promise<Task[]> => {
    try {
      const allTasks = await taskService.getAllTasks();
      
      // Get supervisor's data
      const supervisorEmployeeIds = getSupervisorEmployeeIds();
      const siteIds = getSupervisorSiteIds();
      const siteNames = getSupervisorSiteNames();
      
      const filteredTasks = allTasks.filter((task: any) => {
        // Supervisor can see tasks if:
        
        // 1. Task is assigned to supervisor
        const isAssignedToSupervisor = task.assignedTo === currentUser._id;
        
        // 2. Task is created by supervisor
        const isCreatedBySupervisor = task.createdById === currentUser._id;
        
        // 3. Task is assigned to supervisor's employees
        const isAssignedToSupervisorEmployee = supervisorEmployeeIds.includes(task.assignedTo);
        
        // 4. Task is on supervisor's site AND assigned to supervisor/their employees
        const isOnSupervisorSite = siteIds.includes(task.siteId) || siteNames.includes(task.siteName);
        const isAssignedToSupervisorOrTeam = task.assignedTo === currentUser._id || supervisorEmployeeIds.includes(task.assignedTo);
        const isOnSiteAndAssignedToTeam = isOnSupervisorSite && isAssignedToSupervisorOrTeam;
        
        return isAssignedToSupervisor || 
               isCreatedBySupervisor || 
               isAssignedToSupervisorEmployee || 
               isOnSiteAndAssignedToTeam;
      });
      
      return filteredTasks.map((task: any) => ({
        ...task,
        source: task.createdById === currentUser._id ? "supervisor" : 
               (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
        isAssignedToMe: task.assignedTo === currentUser._id,
        isCreatedByMe: task.createdById === currentUser._id,
        assignedToRole: task.assignedTo === currentUser._id ? "supervisor" : "employee"
      }));
    } catch (error) {
      console.error("Error fetching all tasks:", error);
      return [];
    }
  };

  // Initialize data - IMPROVED SEQUENCE
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor") {
      console.log("=== INITIALIZING SUPERVISOR DATA ===");
      console.log("Current user:", currentUser);
      console.log("Current user site from context:", currentUser.site);
      
      // Clear existing data first
      setSites([]);
      setEmployees([]);
      setTasks([]);
      setMyAssignedTasks([]);
      setLoading(prev => ({ ...prev, initializing: true }));
      
      const initializeData = async () => {
        try {
          setDebugInfo(prev => ({ ...prev, initializationStep: "Starting initialization..." }));
          
          // 1. First fetch assigned tasks (to get sites from tasks)
          console.log("Step 1: Fetching assigned tasks...");
          setDebugInfo(prev => ({ ...prev, initializationStep: "Fetching assigned tasks..." }));
          await fetchMyAssignedTasks();
          
          // 2. Then fetch sites based on supervisor's info AND tasks
          console.log("Step 2: Fetching sites...");
          setDebugInfo(prev => ({ ...prev, initializationStep: "Fetching sites..." }));
          await fetchSites();
          
          // 3. Then fetch employees for those sites
          console.log("Step 3: Fetching employees for sites...");
          setDebugInfo(prev => ({ ...prev, initializationStep: "Fetching employees..." }));
          await fetchEmployeesByRole();
          
          // 4. Finally fetch all tasks based on view mode
          console.log("Step 4: Fetching all tasks...");
          setDebugInfo(prev => ({ ...prev, initializationStep: "Fetching tasks..." }));
          await fetchTasks();
          
          console.log("Supervisor data initialized successfully");
          setDebugInfo(prev => ({ ...prev, initializationStep: "Initialization complete" }));
          toast.success("Supervisor dashboard loaded successfully");
          
        } catch (error) {
          console.error("Error initializing supervisor data:", error);
          setDebugInfo(prev => ({ ...prev, initializationStep: "Initialization failed" }));
          toast.error("Failed to load supervisor data");
        } finally {
          setLoading(prev => ({ ...prev, initializing: false }));
        }
      };
      
      initializeData();
    }
  }, [currentUser]);

  // Fetch employees when sites change
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor" && sites.length > 0) {
      console.log("Sites updated, fetching employees for these sites...");
      fetchEmployeesByRole();
    }
  }, [sites]);

  // Refresh tasks when view mode changes
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor") {
      if (viewMode === "assigned") {
        setTasks(myAssignedTasks.filter(task => task.assignedTo === currentUser._id));
      } else {
        fetchTasks();
      }
    }
  }, [viewMode, currentUser, myAssignedTasks]);

  // Update sites when assigned tasks change
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor" && myAssignedTasks.length > 0) {
      // Extract unique sites from tasks and update sites list
      const uniqueTaskSites = myAssignedTasks.reduce((acc: Site[], task) => {
        if (task.siteId && task.siteName) {
          const siteExists = acc.some(site => site.name === task.siteName);
          if (!siteExists) {
            acc.push({
              _id: task.siteId,
              name: task.siteName,
              clientName: task.clientName || "Unknown Client",
              location: "Unknown Location",
              status: "active",
              managerCount: 0,
              supervisorCount: 1,
              employeeCount: 0
            });
          }
        }
        return acc;
      }, []);
      
      // Merge with existing sites
      if (uniqueTaskSites.length > 0) {
        setSites(prev => {
          const existingSiteNames = new Set(prev.map(site => site.name));
          const newSites = uniqueTaskSites.filter(site => 
            !existingSiteNames.has(site.name)
          );
          
          if (newSites.length > 0) {
            console.log("Adding", newSites.length, "new sites from tasks on update");
            
            // Update debug info
            setDebugInfo(prevDebug => ({
              ...prevDebug,
              sitesLoaded: true,
              filteredSitesCount: prev.length + newSites.length,
              userSiteValue: prevDebug.userSiteValue + `, Tasks → Sites: ${newSites.length} added`
            }));
            
            return [...prev, ...newSites];
          }
          return prev;
        });
      }
    }
  }, [myAssignedTasks]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
  };

  // Handle site selection
  const handleSiteSelect = (siteId: string) => {
    const selectedSite = sites.find(s => s._id === siteId);
    if (selectedSite) {
      setNewTask(prev => ({ 
        ...prev, 
        siteId: siteId,
        siteName: selectedSite.name,
        clientName: selectedSite.clientName,
        assignedTo: "",
        assignedToName: ""
      }));
      
      // Log employees for this site
      const siteEmployees = getEmployeesForSite(selectedSite.name);
      console.log(`Employees for site ${selectedSite.name}:`, siteEmployees.length);
    }
  };

  // Handle assignee selection
  const handleAssigneeSelect = (assigneeId: string) => {
    const selectedEmployee = employees.find(e => e._id === assigneeId);
    if (selectedEmployee) {
      setNewTask(prev => ({ 
        ...prev, 
        assignedTo: assigneeId,
        assignedToName: selectedEmployee.name,
        assignedToRole: "employee"
      }));
    }
  };

  // Add new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error("Please login to assign tasks");
      return;
    }

    if (!newTask.assignedTo || !newTask.siteId) {
      toast.error("Please select both an assignee and a site");
      return;
    }
    
    const selectedEmployee = employees.find(e => e._id === newTask.assignedTo);
    if (!selectedEmployee) {
      toast.error("Selected employee not found");
      return;
    }
    
    // Ensure supervisor is not assigning to themselves
    if (selectedEmployee.role === "supervisor" || newTask.assignedTo === currentUser._id) {
      toast.error("Supervisors cannot assign tasks to themselves");
      return;
    }
    
    // Ensure employee belongs to selected site (by name comparison)
    if (!compareSiteNames(
      normalizeSiteName(selectedEmployee.siteName), 
      normalizeSiteName(newTask.siteName)
    )) {
      toast.error(`Selected employee does not belong to site ${newTask.siteName}`);
      return;
    }
    
    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        assignedToName: selectedEmployee.name,
        assignedToRole: "employee",
        priority: newTask.priority,
        status: "pending" as const,
        deadline: newTask.deadline,
        dueDateTime: newTask.deadline ? `${newTask.deadline}T23:59:59` : "",
        siteId: newTask.siteId,
        siteName: newTask.siteName,
        clientName: newTask.clientName,
        taskType: newTask.taskType || "general",
        createdBy: currentUser._id,
        createdByRole: "supervisor"
      };
      
      const createdTask = await taskService.createTask(taskData);
      
      const taskWithSource: Task = {
        ...createdTask,
        source: "supervisor",
        isAssignedToMe: false,
        isCreatedByMe: true,
        assignedToRole: "employee"
      };
      
      setTasks(prev => [...prev, taskWithSource]);
      
      toast.success("Task assigned to employee successfully!");
      
      setDialogOpen(false);
      setNewTask({ 
        title: "", 
        description: "", 
        assignedTo: "",
        assignedToName: "",
        assignedToRole: "employee",
        siteId: "",
        siteName: "",
        clientName: "",
        priority: "medium", 
        deadline: "",
        dueDateTime: "",
        taskType: "general"
      });
      
      if (viewMode === "created") {
        setTimeout(() => fetchTasks(), 1000);
      }
      
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast.error(err.message || "Failed to assign task. Please try again.");
    }
  };

  // Update task status
  const updateStatus = async (taskId: string, status: string) => {
    const task = tasks.find(t => t._id === taskId);
    
    const canUpdate = 
      task?.isAssignedToMe || 
      task?.isCreatedByMe ||
      (task?.assignedToRole === "employee" && employees.some(e => e._id === task?.assignedTo));
    
    if (!canUpdate && task?.source === "superadmin") {
      toast.error("Cannot update superadmin tasks assigned to others");
      return;
    }
    
    try {
      await taskService.updateTaskStatus(taskId, { 
        status: status as "pending" | "in-progress" | "completed" | "cancelled" 
      });
      
      setTasks(tasks.map(t => t._id === taskId ? { 
        ...t, 
        status: status as Task['status'] 
      } : t));
      
      if (task?.isAssignedToMe) {
        setMyAssignedTasks(prev => prev.map(t => t._id === taskId ? { 
          ...t, 
          status: status as Task['status'] 
        } : t));
      }
      
      toast.success("Task status updated!");
      
    } catch (err: any) {
      console.error('Error updating task status:', err);
      toast.error(err.message || "Failed to update task status");
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    
    if (!task?.isCreatedByMe) {
      toast.error("You can only delete tasks you created");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    
    try {
      await taskService.deleteTask(taskId);
      
      setTasks(tasks.filter(t => t._id !== taskId));
      
      if (task.isAssignedToMe) {
        setMyAssignedTasks(prev => prev.filter(t => t._id !== taskId));
      }
      
      toast.success("Task deleted successfully!");
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast.error(err.message || "Failed to delete task");
    }
  };

  // View task details
  const handleViewTask = (task: Task) => {
    const details = `
      <div class="space-y-3">
        <div>
          <strong>Task:</strong> ${task.title}
        </div>
        <div>
          <strong>Description:</strong> ${task.description}
        </div>
        <div>
          <strong>Assigned To:</strong> ${task.assignedToName}
          ${task.isAssignedToMe ? '<span style="color: #10b981; font-weight: bold"> ← Assigned to you</span>' : ''}
          ${task.isCreatedByMe ? '<span style="color: #3b82f6; font-weight: bold"> ← Created by you</span>' : ''}
        </div>
        <div>
          <strong>Role:</strong> ${task.assignedToRole === "supervisor" ? "Supervisor" : "Employee"}
        </div>
        <div>
          <strong>Site:</strong> ${task.siteName}
        </div>
        <div>
          <strong>Client:</strong> ${task.clientName}
        </div>
        <div>
          <strong>Priority:</strong> ${task.priority}
        </div>
        <div>
          <strong>Status:</strong> ${task.status}
        </div>
        <div>
          <strong>Source:</strong> ${task.source === "superadmin" ? "Super Admin" : 
                                    task.source === "manager" ? "Manager" : "You (Supervisor)"}
        </div>
        <div>
          <strong>Due Date:</strong> ${formatDate(task.deadline)}
        </div>
        <div>
          <strong>Created On:</strong> ${formatDate(task.createdAt)}
        </div>
      </div>
    `;
    
    toast.info("Task Details", {
      description: details,
      duration: 10000,
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === "pending") matchesTab = task.status === "pending";
    else if (activeTab === "in-progress") matchesTab = task.status === "in-progress";
    else if (activeTab === "completed") matchesTab = task.status === "completed";
    else if (activeTab === "cancelled") matchesTab = task.status === "cancelled";
    else if (activeTab === "assigned-to-me") matchesTab = task.isAssignedToMe === true;
    else if (activeTab === "created-by-me") matchesTab = task.isCreatedByMe === true;
    else if (activeTab === "to-employees") matchesTab = task.assignedToRole === "employee" && !task.isAssignedToMe;
    else if (activeTab === "from-manager") matchesTab = task.source === "manager" && task.isAssignedToMe;
    
    return matchesSearch && matchesTab;
  });

  // Helper functions
  const getPriorityColor = (priority: string) => {
    return taskService.getPriorityColor(priority);
  };

  const getSourceBadge = (task: Task) => {
    if (task.isAssignedToMe) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <UserCheck className="h-3 w-3 mr-1" />
          Assigned to You
        </Badge>
      );
    }
    
    if (task.isCreatedByMe) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <FileText className="h-3 w-3 mr-1" />
          You Created
        </Badge>
      );
    }
    
    return task.source === "superadmin" ? (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        <Shield className="h-3 w-3 mr-1" />
        Super Admin
      </Badge>
    ) : task.source === "manager" ? (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        Manager
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        Other Supervisor
      </Badge>
    );
  };

  const getViewModeText = (mode: SupervisorViewMode) => {
    switch(mode) {
      case "assigned":
        return "Tasks Assigned to Me";
      case "created":
        return "Tasks I Created";
      case "team":
        return "My Team's Tasks";
      case "site":
        return "Tasks on My Sites";
      case "all":
        return "All My Tasks";
      default:
        return "My Tasks";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Get employees for a specific site (by site name)
  const getEmployeesForSite = (siteName: string): Employee[] => {
    return employees.filter(emp => 
      compareSiteNames(
        normalizeSiteName(emp.siteName), 
        normalizeSiteName(siteName)
      )
    );
  };

  // Get statistics
  const getStats = () => {
    const assignedToMe = tasks.filter(t => t.isAssignedToMe);
    const createdByMe = tasks.filter(t => t.isCreatedByMe);
    const teamTasks = tasks.filter(t => t.assignedToRole === "employee" && !t.isAssignedToMe);
    
    // Count employees per site
    const employeesBySite = sites.reduce((acc, site) => {
      acc[site.name] = getEmployeesForSite(site.name).length;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: tasks.length,
      assignedToMe: assignedToMe.length,
      createdByMe: createdByMe.length,
      teamTasks: teamTasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "in-progress").length,
      completed: tasks.filter(t => t.status === "completed").length,
      sites: sites.length,
      employees: employees.filter(e => e.role === "employee" || e.role === "staff").length,
      employeesBySite
    };
  };

  const stats = getStats();

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
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
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
        title="Task Management" 
        subtitle={getViewModeText(viewMode)} 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Supervisor Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{currentUser.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="default" className="text-sm capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {currentUser.role}
                  </Badge>
                  {currentUser.site && (
                    <Badge variant="outline" className="text-sm">
                      <Building className="h-3 w-3 mr-1" />
                      Site: {Array.isArray(currentUser.site) ? currentUser.site.join(', ') : currentUser.site}
                    </Badge>
                  )}
                  {currentUser.email && (
                    <Badge variant="outline" className="text-sm">
                      {currentUser.email}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground" />
                  <Select value={viewMode} onValueChange={(value: SupervisorViewMode) => setViewMode(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assigned">
                        <div className="flex items-center">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Tasks Assigned to Me
                        </div>
                      </SelectItem>
                      <SelectItem value="created">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Tasks I Created
                        </div>
                      </SelectItem>
                      <SelectItem value="team">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          My Team's Tasks
                        </div>
                      </SelectItem>
                      <SelectItem value="site">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2" />
                          Tasks on My Sites
                        </div>
                      </SelectItem>
                      <SelectItem value="all">
                        <div className="flex items-center">
                          <ListFilter className="h-4 w-4 mr-2" />
                          All My Tasks
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLoading(prev => ({ ...prev, initializing: true }));
                      await fetchMyAssignedTasks();
                      await fetchSites();
                      await fetchEmployeesByRole();
                      await fetchTasks();
                      setLoading(prev => ({ ...prev, initializing: false }));
                      toast.success("All data synced successfully");
                    }}
                    disabled={loading.initializing}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading.initializing ? 'animate-spin' : ''}`} />
                    {loading.initializing ? "Syncing..." : "Sync All"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchSites();
                      fetchEmployeesByRole();
                      if (viewMode === "assigned") {
                        fetchMyAssignedTasks();
                      } else {
                        fetchTasks();
                      }
                    }}
                    disabled={loading.sites || loading.employees || loading.tasks}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading.sites || loading.employees || loading.tasks ? 'animate-spin' : ''}`} />
                    Refresh All
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.total} tasks • {stats.assignedToMe} to you • {stats.employees} employees
                </div>
              </div>
            </div>
            
            {/* Debug Information */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">System Status</span>
                {loading.initializing && (
                  <span className="text-xs text-amber-600">
                    <Loader2 className="h-3 w-3 inline mr-1 animate-spin" />
                    {debugInfo.initializationStep}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  {debugInfo.sitesLoaded ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Sites: {sites.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  {debugInfo.employeesLoaded ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Employees: {employees.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Assigned Tasks:</span>
                  <span className="ml-1">{myAssignedTasks.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Task Sites:</span>
                  <span className="ml-1">
                    {[...new Set(myAssignedTasks.map(t => t.siteName).filter(Boolean))].length}
                  </span>
                </div>
              </div>
              {debugInfo.supervisorSiteNames.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-600">Your Sites: </span>
                  <span className="font-medium">
                    {debugInfo.supervisorSiteNames.join(', ')}
                  </span>
                </div>
              )}
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
              {sites.length > 0 && employees.length === 0 && (
                <div className="mt-2 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  No employees found for your sites: {sites.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Assigned to Me</p>
                  <p className="text-2xl font-bold">{stats.assignedToMe}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Created by Me</p>
                  <p className="text-2xl font-bold">{stats.createdByMe}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Tasks</p>
                  <p className="text-2xl font-bold">{stats.teamTasks}</p>
                </div>
                <Users className="h-8 w-8 text-amber-500" />
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
                <Building className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Card */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>
                {getViewModeText(viewMode)}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {viewMode === "assigned" 
                  ? "Tasks assigned to you by managers/admins"
                  : viewMode === "created"
                  ? "Tasks you created (assigned to your employees)"
                  : viewMode === "team"
                  ? `Tasks assigned to your ${stats.employees} employees`
                  : viewMode === "site"
                  ? `Tasks on your sites involving you or your ${stats.employees} employees`
                  : "All tasks involving you or your team"
                }
              </p>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)} 
              disabled={sites.length === 0 || employees.length === 0}
              className="whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Task for Employee
            </Button>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-8 h-9">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                  <TabsTrigger value="in-progress" className="text-xs">In Progress</TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
                  <TabsTrigger value="assigned-to-me" className="text-xs">To Me</TabsTrigger>
                  <TabsTrigger value="created-by-me" className="text-xs">My Tasks</TabsTrigger>
                  <TabsTrigger value="to-employees" className="text-xs">To Employees</TabsTrigger>
                  <TabsTrigger value="from-manager" className="text-xs">From Manager</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tasks Table */}
            {loading.tasks ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-4">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "No tasks match your search" 
                    : `No ${activeTab !== "all" ? activeTab.replace('-', ' ') : ""} tasks found for this view`
                  }
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (viewMode === "assigned") {
                      fetchMyAssignedTasks();
                    } else {
                      fetchTasks();
                    }
                  }}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Tasks
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Site/Client</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task._id} className={
                        task.isAssignedToMe ? 'bg-green-50/50' : 
                        task.isCreatedByMe ? 'bg-blue-50/50' : ''
                      }>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {task.title}
                              {task.isAssignedToMe && (
                                <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-100 text-green-800">
                                  To You
                                </Badge>
                              )}
                              {task.isCreatedByMe && (
                                <Badge variant="outline" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-800">
                                  Your Task
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {task.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1">
                              {task.assignedToName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {employees.find(e => e._id === task.assignedTo)?.email || 
                               (task.isAssignedToMe ? currentUser.email : 'N/A')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            task.assignedToRole === "supervisor" 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }>
                            {task.assignedToRole === "supervisor" ? "Supervisor" : "Employee"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{task.siteName}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.clientName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSourceBadge(task)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority)}>
                            {task.priority === "high" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={task.status} 
                            onValueChange={(value) => updateStatus(task._id, value)}
                            disabled={
                              (task.source === "superadmin" && !task.isAssignedToMe && !task.isCreatedByMe) ||
                              (task.assignedToRole === "employee" && !task.isCreatedByMe && task.source !== "superadmin")
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatDate(task.deadline)}</span>
                            {task.status === "pending" && new Date(task.deadline) < new Date() && (
                              <span className="text-xs text-red-500">Overdue</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewTask(task)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (!task.isCreatedByMe) {
                                  toast.warning("You can only edit tasks you created");
                                } else {
                                  toast.info("Edit feature coming soon");
                                }
                              }}
                              disabled={!task.isCreatedByMe}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTask(task._id)}
                              disabled={!task.isCreatedByMe}
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
            )}
          </CardContent>
        </Card>

        {/* Create Task Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Task for Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter task title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter task description"
                  rows={3}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="site">Site *</Label>
                  <Select
                    value={newTask.siteId}
                    onValueChange={handleSiteSelect}
                    required
                    disabled={loading.sites}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loading.sites ? "Loading sites..." : "Select site"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => {
                        const siteEmployees = getEmployeesForSite(site.name);
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
                  {newTask.siteId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getEmployeesForSite(newTask.siteName).length} employees available at this site
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="assignee">Assign To Employee *</Label>
                  <Select
                    value={newTask.assignedTo}
                    onValueChange={handleAssigneeSelect}
                    required
                    disabled={loading.sites || !newTask.siteId || employees.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          !newTask.siteId ? "Select site first" : 
                          getEmployeesForSite(newTask.siteName).length === 0 ? "No employees at this site" :
                          "Select employee"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show only employees for the selected site */}
                      {newTask.siteId && getEmployeesForSite(newTask.siteName).map((employee) => (
                        <SelectItem key={employee._id} value={employee._id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <div>
                              <div>{employee.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {employee.department || 'Employee'} • {employee.email}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {newTask.siteId && getEmployeesForSite(newTask.siteName).length === 0 && (
                        <div className="px-2 py-2 text-center">
                          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No employees found for this site</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Employees must be assigned to the selected site
                          </p>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {newTask.siteId && newTask.assignedTo && (
                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                      <p className="text-xs text-green-700">
                        ✓ Employee assigned to {newTask.siteName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="deadline">Due Date *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => handleInputChange('deadline', e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="taskType">Task Type</Label>
                <Select
                  value={newTask.taskType}
                  onValueChange={(value) => handleInputChange('taskType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={
                  loading.sites || 
                  loading.employees || 
                  employees.length === 0 ||
                  !newTask.siteId ||
                  getEmployeesForSite(newTask.siteName).length === 0
                }
              >
                {getEmployeesForSite(newTask.siteName).length === 0 
                  ? "No employees available for this site"
                  : "Assign Task to Employee"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Note: Supervisors can only assign tasks to employees at their assigned sites
              </p>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default SupervisorTasks;