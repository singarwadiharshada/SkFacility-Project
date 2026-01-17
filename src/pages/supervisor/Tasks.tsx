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
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { taskService, type Assignee, type Site as TaskServiceSite } from "@/services/TaskService";

// Types - Updated to match your data structure
interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "employee" | "staff" | "manager" | "supervisor";
  site?: string;
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
type SupervisorViewMode = "assigned" | "created" | "site" | "team" | "all";

const SupervisorTasks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState({
    tasks: false,
    employees: false,
    sites: false,
    myTasks: false
  });
  
  const [viewMode, setViewMode] = useState<SupervisorViewMode>("assigned");
  const [activeTab, setActiveTab] = useState("all");
  
  const { user: currentUser, isAuthenticated } = useRole();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myAssignedTasks, setMyAssignedTasks] = useState<Task[]>([]);
  
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

  // Fetch sites assigned to this supervisor
  const fetchSites = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, sites: true }));
      
      const sitesData = await taskService.getAllSites();
      
      let filteredSites: Site[] = [];
      
      if (Array.isArray(sitesData)) {
        filteredSites = sitesData.map((site: any) => ({
          _id: site._id || site.id,
          name: site.name,
          clientName: site.clientName || site.client,
          location: site.location || "",
          status: site.status || "active",
          managerCount: site.managerCount || 0,
          supervisorCount: site.supervisorCount || 0,
          employeeCount: site.employeeCount || 0
        }));
        
        if (currentUser.site) {
          if (typeof currentUser.site === 'string') {
            filteredSites = filteredSites.filter((site: Site) => 
              site._id === currentUser.site || site.name === currentUser.site
            );
          } else if (Array.isArray(currentUser.site)) {
            filteredSites = filteredSites.filter((site: Site) => 
              currentUser.site?.includes(site._id) || currentUser.site?.includes(site.name)
            );
          }
        }
      }
      
      setSites(filteredSites);
      
      if (filteredSites.length === 1 && !newTask.siteId) {
        const site = filteredSites[0];
        setNewTask(prev => ({
          ...prev,
          siteId: site._id,
          siteName: site.name,
          clientName: site.clientName
        }));
      }
      
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      toast.error(`Failed to load sites: ${error.message}`);
      
      const demoSites: Site[] = [
        {
          _id: "site_1",
          name: "Site A",
          clientName: "Client A",
          location: "Location A",
          status: "active",
          managerCount: 1,
          supervisorCount: 2,
          employeeCount: 10
        }
      ];
      setSites(demoSites);
    } finally {
      setLoading(prev => ({ ...prev, sites: false }));
    }
  };

  // Fetch employees for supervisor - UPDATED VERSION
  const fetchEmployeesByRole = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, employees: true }));
      
      let employeeAssignees: any[] = [];
      
      try {
        // Method 1: Try to fetch employees from the employee API directly
        const response = await fetch('/api/employees');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.employees) {
            employeeAssignees = result.employees;
            console.log("Employees fetched from /api/employees:", employeeAssignees);
          }
        }
      } catch (apiError) {
        console.log("Could not fetch from employee API, trying task service...");
        
        try {
          // Method 2: Get all assignees and filter for employees
          const allAssignees = await taskService.getAllAssignees();
          
          // Filter for employees - exclude managers and supervisors
          employeeAssignees = allAssignees.filter((assignee: any) => {
            const role = assignee.role?.toLowerCase();
            return role !== 'manager' && role !== 'supervisor' && role !== 'superadmin' && role !== 'admin';
          });
          
          console.log("Employees filtered from all assignees:", employeeAssignees);
          
        } catch (taskServiceError) {
          console.error("Error from taskService:", taskServiceError);
        }
      }
      
      // Always include the supervisor themselves as an assignee option
      const supervisorAsEmployee: Employee = {
        _id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        role: "supervisor" as const,
        site: currentUser.site || '',
        department: 'Supervisor',
        isActive: true
      };
      
      // Map fetched employees to Employee interface
      const fetchedEmployees = employeeAssignees.map((assignee: any) => ({
        _id: assignee._id || assignee.id,
        name: assignee.name,
        email: assignee.email || '',
        phone: assignee.phone || '',
        role: (assignee.role?.toLowerCase() === 'staff' ? 'employee' : assignee.role?.toLowerCase() || 'employee') as "employee" | "staff" | "manager" | "supervisor",
        site: assignee.siteName || assignee.site || currentUser.site,
        department: assignee.department || 'General',
        isActive: assignee.status === 'active' || assignee.isActive !== false
      })) as Employee[];
      
      // Combine supervisor with fetched employees
      const allEmployees = [supervisorAsEmployee, ...fetchedEmployees];
      
      console.log("Final employees for supervisor:", allEmployees);
      setEmployees(allEmployees);
      
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error(`Failed to load employees: ${error.message}`);
      
      // At minimum, include the supervisor as an employee option
      const demoEmployees: Employee[] = [
        {
          _id: currentUser._id,
          name: currentUser.name,
          email: currentUser.email || "supervisor@example.com",
          phone: currentUser.phone || "123-456-7890",
          role: "supervisor",
          site: currentUser.site || "Site A",
          department: "Supervisor"
        },
        {
          _id: "emp_1",
          name: "John Doe",
          email: "john@example.com",
          phone: "123-456-7890",
          role: "employee",
          site: currentUser.site || "Site A",
          department: "Security"
        },
        {
          _id: "emp_2",
          name: "Jane Smith",
          email: "jane@example.com",
          phone: "123-456-7891",
          role: "employee",
          site: currentUser.site || "Site A",
          department: "Housekeeping"
        }
      ];
      setEmployees(demoEmployees);
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  // Fetch tasks specifically assigned to supervisor (from manager/admin)
  const fetchMyAssignedTasks = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, myTasks: true }));
      
      let assignedTasks: Task[] = [];
      
      try {
        const tasks = await taskService.getTasksByAssignee(currentUser._id);
        
        assignedTasks = tasks.map((task: any) => ({
          ...task,
          source: task.createdBy === currentUser._id ? "supervisor" : 
                 (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
          isAssignedToMe: true,
          isCreatedByMe: task.createdBy === currentUser._id,
          assignedToRole: "supervisor"
        }));
      } catch (error) {
        console.error("Error fetching assigned tasks:", error);
        const allTasks = await taskService.getAllTasks();
        assignedTasks = allTasks
          .filter((task: any) => task.assignedTo === currentUser._id)
          .map((task: any) => ({
            ...task,
            source: task.createdBy === currentUser._id ? "supervisor" : 
                   (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
            isAssignedToMe: true,
            isCreatedByMe: task.createdBy === currentUser._id,
            assignedToRole: "supervisor"
          }));
      }
      
      setMyAssignedTasks(assignedTasks);
      
    } catch (error: any) {
      console.error('Error fetching assigned tasks:', error);
      toast.error(`Failed to load your tasks: ${error.message}`);
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
        
        fetchedTasks = getDemoTasks();
        
        toast.warning("Using demo data. Check your backend connection.");
      }
      
      setTasks(fetchedTasks);
      
    } catch (error: any) {
      console.error('Error in fetchTasks:', error);
      toast.error(`Failed to load tasks: ${error.message}`);
      
      setTasks(getDemoTasks());
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  };

  // Helper function for assigned tasks - ONLY tasks assigned to logged-in supervisor
  const fetchAssignedTasks = async (): Promise<Task[]> => {
    return myAssignedTasks.filter(task => task.isAssignedToMe);
  };

  // Helper function for created tasks - ONLY tasks created by logged-in supervisor
  const fetchCreatedTasks = async (): Promise<Task[]> => {
    try {
      const tasks = await taskService.getTasksByCreator(currentUser._id);
      return tasks.map((task: any) => ({
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

  // Helper function for team tasks - ONLY tasks assigned to supervisor's employees
  const fetchTeamTasks = async (): Promise<Task[]> => {
    try {
      const allTasks = await taskService.getAllTasks();
      
      // Get IDs of employees managed by this supervisor
      const supervisorEmployeeIds = getSupervisorEmployeeIds();
      
      return allTasks
        .filter((task: any) => 
          // Show tasks assigned to supervisor's employees (NOT supervisor themselves)
          supervisorEmployeeIds.includes(task.assignedTo)
        )
        .map((task: any) => ({
          ...task,
          source: task.createdBy === currentUser._id ? "supervisor" : 
                 (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
          isAssignedToMe: task.assignedTo === currentUser._id,
          isCreatedByMe: task.createdBy === currentUser._id,
          assignedToRole: "employee"
        }));
    } catch (error) {
      console.error("Error fetching team tasks:", error);
      return [];
    }
  };

  // Helper function for site tasks - ONLY tasks on supervisor's sites AND assigned to supervisor/their employees
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
          source: task.createdBy === currentUser._id ? "supervisor" : 
                 (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
          isAssignedToMe: task.assignedTo === currentUser._id,
          isCreatedByMe: task.createdBy === currentUser._id,
          assignedToRole: task.assignedTo === currentUser._id ? "supervisor" : "employee"
        }));
      
      return siteTasks;
    } catch (error) {
      console.error("Error fetching site tasks:", error);
      return [];
    }
  };

  // Helper function for all tasks - ONLY tasks supervisor has direct involvement with
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
        const isCreatedBySupervisor = task.createdBy === currentUser._id;
        
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
        source: task.createdBy === currentUser._id ? "supervisor" : 
               (task.createdByRole === 'manager' || task.createdBy === 'manager') ? "manager" : "superadmin",
        isAssignedToMe: task.assignedTo === currentUser._id,
        isCreatedByMe: task.createdBy === currentUser._id,
        assignedToRole: task.assignedTo === currentUser._id ? "supervisor" : "employee"
      }));
    } catch (error) {
      console.error("Error fetching all tasks:", error);
      return [];
    }
  };

  // Helper function for demo tasks - ONLY show tasks for logged-in supervisor
  const getDemoTasks = (): Task[] => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    // Get supervisor's employee IDs for demo
    const supervisorEmployeeIds = getSupervisorEmployeeIds();
    
    const demoTasks: Task[] = [
      // Tasks assigned TO current supervisor (from manager/admin)
      {
        _id: "assigned_to_sup_1",
        title: "Weekly Site Review",
        description: "Review weekly site operations and submit report",
        assignedTo: currentUser?._id || "supervisor_id",
        assignedToName: currentUser?.name || "Supervisor",
        assignedToRole: "supervisor",
        priority: "high",
        status: "pending",
        deadline: nextWeek.toISOString().split('T')[0],
        siteId: "site_1",
        siteName: "Site A",
        clientName: "Client A",
        taskType: "report",
        attachments: [],
        hourlyUpdates: [],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        createdBy: "manager_id",
        createdById: "manager_id",
        source: "manager",
        isAssignedToMe: true,
        isCreatedByMe: false
      },
      
      // Tasks created BY current supervisor (assigned to THEIR employees)
      {
        _id: "created_by_sup_1",
        title: "Floor Cleaning Schedule",
        description: "Clean all floors in building A",
        assignedTo: supervisorEmployeeIds[0] || "emp_1",
        assignedToName: "John Doe",
        assignedToRole: "employee",
        priority: "medium",
        status: "in-progress",
        deadline: today.toISOString().split('T')[0],
        siteId: "site_1",
        siteName: "Site A",
        clientName: "Client A",
        taskType: "cleaning",
        attachments: [],
        hourlyUpdates: [],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        createdBy: currentUser?._id,
        createdById: currentUser?._id,
        source: "supervisor",
        isAssignedToMe: false,
        isCreatedByMe: true
      },
      
      // Tasks assigned to supervisor's employees (by others)
      {
        _id: "emp_task_1",
        title: "Security Check",
        description: "Morning security check of premises",
        assignedTo: supervisorEmployeeIds[1] || "emp_2",
        assignedToName: "Jane Smith",
        assignedToRole: "employee",
        priority: "high",
        status: "pending",
        deadline: nextWeek.toISOString().split('T')[0],
        siteId: "site_1",
        siteName: "Site A",
        clientName: "Client A",
        taskType: "security",
        attachments: [],
        hourlyUpdates: [],
        createdAt: lastWeek.toISOString(),
        updatedAt: lastWeek.toISOString(),
        createdBy: "another_manager_id",
        createdById: "another_manager_id",
        source: "manager",
        isAssignedToMe: false,
        isCreatedByMe: false
      }
    ];
    
    return demoTasks;
  };

  // Initialize data
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor") {
      fetchSites();
      fetchEmployeesByRole();
      fetchMyAssignedTasks();
      fetchTasks();
    }
  }, [currentUser]);

  // Refresh tasks when view mode changes
  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [viewMode]);

  // Refresh when myAssignedTasks changes
  useEffect(() => {
    if (viewMode === "assigned" && myAssignedTasks.length > 0) {
      setTasks(myAssignedTasks.filter(task => task.isAssignedToMe));
    }
  }, [myAssignedTasks, viewMode]);

  // Refresh employees when sites change
  useEffect(() => {
    if (sites.length > 0 && currentUser?.role === "supervisor") {
      fetchEmployeesByRole();
    }
  }, [sites]);

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
      
      fetchEmployeesByRole();
    }
  };

  // Handle assignee selection
  const handleAssigneeSelect = (assigneeId: string, isSelf: boolean = false) => {
    if (isSelf) {
      setNewTask(prev => ({ 
        ...prev, 
        assignedTo: currentUser?._id || "",
        assignedToName: currentUser?.name || "Yourself",
        assignedToRole: "self"
      }));
    } else {
      const selectedEmployee = employees.find(e => e._id === assigneeId);
      if (selectedEmployee) {
        setNewTask(prev => ({ 
          ...prev, 
          assignedTo: assigneeId,
          assignedToName: selectedEmployee.name,
          assignedToRole: selectedEmployee.role === "supervisor" ? "self" : "employee"
        }));
      }
    }
  };

  // Add new task (supervisor can assign to employees or self)
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
    
    try {
      const isAssigningToSelf = newTask.assignedToRole === "self" || newTask.assignedTo === currentUser._id;
      const assigneeName = isAssigningToSelf ? currentUser.name : newTask.assignedToName;
      
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        assignedToName: assigneeName,
        assignedToRole: isAssigningToSelf ? "supervisor" : "employee",
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
        isAssignedToMe: createdTask.assignedTo === currentUser._id,
        isCreatedByMe: true,
        assignedToRole: isAssigningToSelf ? "supervisor" : "employee"
      };
      
      setTasks(prev => [...prev, taskWithSource]);
      
      if (isAssigningToSelf) {
        setMyAssignedTasks(prev => [...prev, taskWithSource]);
      }
      
      toast.success("Task assigned successfully!");
      
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
      
      setTimeout(() => fetchTasks(), 1000);
      
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast.error(err.message || "Failed to assign task. Please try again.");
      
      const isAssigningToSelf = newTask.assignedToRole === "self" || newTask.assignedTo === currentUser._id;
      const assigneeName = isAssigningToSelf ? currentUser.name : newTask.assignedToName;
      
      const demoTask: Task = {
        _id: `demo_${Date.now()}`,
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        assignedToName: assigneeName,
        assignedToRole: isAssigningToSelf ? "supervisor" : "employee",
        priority: newTask.priority,
        status: "pending",
        deadline: newTask.deadline,
        siteId: newTask.siteId,
        siteName: newTask.siteName,
        clientName: newTask.clientName,
        taskType: newTask.taskType || "general",
        attachments: [],
        hourlyUpdates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser._id,
        createdById: currentUser._id,
        source: "supervisor",
        isAssignedToMe: isAssigningToSelf,
        isCreatedByMe: true
      };
      
      setTasks(prev => [...prev, demoTask]);
      
      if (isAssigningToSelf) {
        setMyAssignedTasks(prev => [...prev, demoTask]);
      }
      
      toast.success("Task assigned (demo mode)! Check console for details.");
      
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

  // Get statistics
  const getStats = () => {
    const assignedToMe = tasks.filter(t => t.isAssignedToMe);
    const createdByMe = tasks.filter(t => t.isCreatedByMe);
    const teamTasks = tasks.filter(t => t.assignedToRole === "employee" && !t.isAssignedToMe);
    
    return {
      total: tasks.length,
      assignedToMe: assignedToMe.length,
      createdByMe: createdByMe.length,
      teamTasks: teamTasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "in-progress").length,
      completed: tasks.filter(t => t.status === "completed").length,
      sites: sites.length,
      employees: employees.filter(e => e.role === "employee" || e.role === "staff").length
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
                    onClick={fetchTasks}
                    disabled={loading.tasks}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading.tasks ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.total} tasks • {stats.assignedToMe} to you • {stats.employees} employees
                </div>
              </div>
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
                  ? "Tasks you created (assigned to employees or yourself)"
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
              disabled={loading.sites || sites.length === 0}
              className="whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Task
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
                  onClick={fetchTasks}
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
              <DialogTitle>Create New Task</DialogTitle>
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
                      {sites.map((site) => (
                        <SelectItem key={site._id} value={site._id}>
                          {site.name} ({site.clientName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="assignee">Assign To *</Label>
                  <Select
                    value={newTask.assignedTo}
                    onValueChange={(value) => {
                      handleAssigneeSelect(value, value === currentUser._id || value === "self");
                    }}
                    required
                    disabled={loading.sites || !newTask.siteId}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          !newTask.siteId ? "Select site first" : 
                          "Select assignee"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Option to assign to self */}
                      <SelectItem value={currentUser._id}>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <div>
                            <div>Yourself ({currentUser.name})</div>
                            <div className="text-xs text-muted-foreground">Supervisor</div>
                          </div>
                        </div>
                      </SelectItem>
                      
                      {/* Employees (if available) */}
                      {employees.filter(emp => emp.role === "employee" || emp.role === "staff").length > 0 && (
                        <>
                          <div className="border-t my-2"></div>
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                            Employees at {sites.find(s => s._id === newTask.siteId)?.name}
                          </div>
                          
                          {employees
                            .filter(emp => (emp.role === "employee" || emp.role === "staff") && 
                                   (!newTask.siteId || emp.site === sites.find(s => s._id === newTask.siteId)?.name))
                            .map((employee) => (
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
                        </>
                      )}
                      
                      {employees.filter(emp => emp.role === "employee" || emp.role === "staff").length === 0 && (
                        <div className="px-2 py-2 text-center">
                          <p className="text-sm text-muted-foreground">No employees found at this site</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            You can still assign tasks to yourself
                          </p>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
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
              
              <Button type="submit" className="w-full" disabled={loading.sites || loading.employees}>
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default SupervisorTasks;