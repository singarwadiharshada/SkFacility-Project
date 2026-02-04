import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOutletContext } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Edit,
  Mail,
  Phone,
  MapPin,
  Users,
  Building,
  UserCheck,
  RefreshCw,
  Shield,
  Briefcase,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  List,
  Calendar,
  UserPlus,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import supervisorService, {
  Supervisor,
  CreateSupervisorData,
  UpdateSupervisorData,
} from "@/services/supervisorService";
import { siteService, Site } from "@/services/SiteService";
import { taskService, Assignee, Task } from "@/services/TaskService";

/* ------------------------------------------------------------------ */
/* SCHEMAS */
/* ------------------------------------------------------------------ */

const createSupervisorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  department: z.string(),
  site: z.string(),
});

const updateSupervisorSchema = createSupervisorSchema.extend({
  password: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSupervisorSchema>;
type UpdateFormData = z.infer<typeof updateSupervisorSchema>;

const departments = [
  "Operations",
  "IT",
  "HR",
  "Finance",
  "Marketing",
  "Sales",
  "Admin",
];

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

interface EnhancedSupervisor extends Supervisor {
  // Task-related information
  assignedTasks?: Task[];
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
  overdueTasks?: number;
  // Site info from tasks
  primarySite?: string;
  assignedSites?: string[];
}

/* ------------------------------------------------------------------ */
/* COMPONENT */
/* ------------------------------------------------------------------ */

const Supervisors = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user: currentUser, role } = useRole();

  const [activeTab, setActiveTab] = useState<string>("task-supervisors");
  const [supervisors, setSupervisors] = useState<EnhancedSupervisor[]>([]);
  const [managedSupervisors, setManagedSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingManaged, setLoadingManaged] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQueryManaged, setSearchQueryManaged] = useState("");
  
  // Site selection state
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedSiteName, setSelectedSiteName] = useState<string>("");
  const [canCreateSupervisor, setCanCreateSupervisor] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  /* ------------------------------------------------------------------ */
  /* FORM */
  /* ------------------------------------------------------------------ */

  const form = useForm<CreateFormData | UpdateFormData>({
    resolver: zodResolver(
      editingSupervisor
        ? updateSupervisorSchema
        : createSupervisorSchema
    ),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      department: "Operations",
      site: "",
    },
  });

  /* ------------------------------------------------------------------ */
  /* FETCH MANAGED SUPERVISORS (FROM SUPERVISOR SERVICE) */
  /* ------------------------------------------------------------------ */

  const fetchManagedSupervisors = async () => {
    try {
      setLoadingManaged(true);
      const supervisors = await supervisorService.getAllSupervisors();
      
      // Filter by site if needed
      let filteredSupervisors = supervisors;
      
      if (selectedSiteId !== "all" && selectedSiteName) {
        filteredSupervisors = supervisors.filter(supervisor => 
          supervisor.site === selectedSiteName
        );
      }
      
      // Exclude current user if they are a supervisor
      if (role === "supervisor" && currentUser) {
        filteredSupervisors = filteredSupervisors.filter(s => 
          s.email.toLowerCase() !== currentUser.email?.toLowerCase()
        );
      }
      
      setManagedSupervisors(filteredSupervisors);
    } catch (error: any) {
      console.error("Error fetching managed supervisors:", error);
      toast.error("Could not load managed supervisors");
      setManagedSupervisors([]);
    } finally {
      setLoadingManaged(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* FETCH TASKS (USING assignedTo FIELD) */
  /* ------------------------------------------------------------------ */

  const fetchAllTasks = async () => {
    try {
      setLoadingTasks(true);
      const allTasks = await taskService.getAllTasks();
      setTasks(allTasks);
      return allTasks;
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Could not load tasks. Some supervisor data may be incomplete.");
      return [];
    } finally {
      setLoadingTasks(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* FETCH ASSIGNEES FROM TASK SERVICE */
  /* ------------------------------------------------------------------ */

  const fetchAssignees = async () => {
    try {
      const allAssignees = await taskService.getAllAssignees();
      // Filter for supervisors only
      const supervisorAssignees = allAssignees.filter(
        assignee => assignee.role === "supervisor"
      );
      setAssignees(supervisorAssignees);
      return supervisorAssignees;
    } catch (error: any) {
      console.error("Error fetching assignees:", error);
      toast.error("Could not load assignees. Check if TaskService API is running.");
      return [];
    }
  };

  /* ------------------------------------------------------------------ */
  /* FETCH SITES */
  /* ------------------------------------------------------------------ */

  const fetchSites = async () => {
    try {
      const sitesData = await siteService.getAllSites();
      
      if (!Array.isArray(sitesData)) {
        console.error("Sites data is not an array:", sitesData);
        toast.error("Invalid sites data format");
        setSites([]);
        return;
      }
      
      const activeSites = sitesData.filter(site => site.status === 'active');
      setSites(activeSites);
      
      // Set default site selection
      if (activeSites.length > 0) {
        if (role === "manager" || role === "supervisor") {
          // Find user's site
          const userSite = activeSites.find(s => 
            s.name === currentUser?.site
          );
          
          if (userSite) {
            setSelectedSiteId(userSite._id);
            setSelectedSiteName(userSite.name);
            form.setValue("site", userSite.name);
          } else {
            // Fallback to first site
            const firstSite = activeSites[0];
            setSelectedSiteId(firstSite._id);
            setSelectedSiteName(firstSite.name);
            form.setValue("site", firstSite.name);
          }
        } else {
          // For admin/superadmin, select first site
          const firstSite = activeSites[0];
          setSelectedSiteId(firstSite._id);
          setSelectedSiteName(firstSite.name);
          form.setValue("site", firstSite.name);
        }
      }
      
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error(`Failed to load sites: ${error.message}`);
      setSites([]);
    }
  };

  /* ------------------------------------------------------------------ */
  /* EXTRACT SUPERVISORS FROM TASKS (USING assignedTo FIELD) */
  /* ------------------------------------------------------------------ */

  const extractSupervisorsFromTasks = (tasks: Task[], assignees: Assignee[]) => {
    // Group tasks by assignee
    const tasksByAssignee = new Map<string, {
      supervisorInfo: Partial<EnhancedSupervisor>;
      tasks: Task[];
      sites: Set<string>;
    }>();
    
    // Process each task
    tasks.forEach(task => {
      if (!task.assignedTo || !task.assignedToName) {
        return; // Skip tasks without assignee
      }
      
      // Try to find supervisor by different identifiers
      const supervisorId = task.assignedTo;
      const supervisorName = task.assignedToName;
      
      // Find matching assignee for additional info
      const matchedAssignee = assignees.find(assignee => 
        assignee._id === supervisorId || 
        assignee.name?.toLowerCase() === supervisorName.toLowerCase() ||
        assignee.email?.toLowerCase() === supervisorId.toLowerCase()
      );
      
      const assigneeKey = matchedAssignee?._id || supervisorId;
      
      if (!tasksByAssignee.has(assigneeKey)) {
        // Create new supervisor entry
        tasksByAssignee.set(assigneeKey, {
          supervisorInfo: {
            _id: assigneeKey,
            name: supervisorName,
            email: matchedAssignee?.email || supervisorId.includes('@') ? supervisorId : `${supervisorName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            phone: matchedAssignee?.phone || "Not provided",
            department: matchedAssignee?.department || "Operations",
            site: task.siteName || "",
            role: "supervisor" as const,
            employees: 0,
            tasks: 0,
            assignedProjects: [],
            reportsTo: "",
            isActive: true,
            status: "active" as const,
            joinDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            primarySite: task.siteName,
            assignedSites: []
          },
          tasks: [],
          sites: new Set<string>()
        });
      }
      
      const supervisorData = tasksByAssignee.get(assigneeKey)!;
      supervisorData.tasks.push(task);
      
      // Add site to sites set
      if (task.siteName) {
        supervisorData.sites.add(task.siteName);
      }
    });
    
    // Convert map to array and enrich with task statistics
    const supervisorsFromTasks: EnhancedSupervisor[] = Array.from(tasksByAssignee.values()).map(data => {
      const tasks = data.tasks;
      const sites = Array.from(data.sites);
      
      // Count task statuses
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      
      // Check for overdue tasks
      const today = new Date();
      const overdueTasks = tasks.filter(t => {
        if (t.deadline && t.status !== 'completed') {
          const deadline = new Date(t.deadline);
          return deadline < today;
        }
        return false;
      }).length;
      
      // Determine primary site (site with most tasks)
      const siteTaskCount: Record<string, number> = {};
      tasks.forEach(task => {
        if (task.siteName) {
          siteTaskCount[task.siteName] = (siteTaskCount[task.siteName] || 0) + 1;
        }
      });
      
      const primarySite = Object.entries(siteTaskCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || sites[0] || "Not assigned";
      
      return {
        ...data.supervisorInfo as EnhancedSupervisor,
        tasks: tasks.length,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
        assignedTasks: tasks,
        assignedSites: sites,
        primarySite,
        site: primarySite
      };
    });
    
    return supervisorsFromTasks;
  };

  /* ------------------------------------------------------------------ */
  /* COMBINE SUPERVISOR DATA FROM MULTIPLE SOURCES */
  /* ------------------------------------------------------------------ */

  const combineSupervisorData = async () => {
    try {
      // Fetch all data in parallel
      const [allTasks, assigneeList] = await Promise.allSettled([
        fetchAllTasks(),
        fetchAssignees(),
      ]);
      
      const tasks = allTasks.status === 'fulfilled' ? allTasks.value : [];
      const assignees = assigneeList.status === 'fulfilled' ? assigneeList.value : [];
      
      // Extract supervisors from tasks (primary source)
      const taskSupervisors = extractSupervisorsFromTasks(tasks, assignees);
      
      // Convert assignees to supervisor format
      const assigneeSupervisors: EnhancedSupervisor[] = assignees
        .filter(assignee => assignee.role === "supervisor")
        .map(assignee => {
          // Find tasks for this assignee
          const assigneeTasks = tasks.filter(task => 
            task.assignedTo === assignee._id || 
            task.assignedToName?.toLowerCase() === assignee.name?.toLowerCase()
          );
          
          // Calculate task statistics
          const pendingTasks = assigneeTasks.filter(t => t.status === 'pending').length;
          const inProgressTasks = assigneeTasks.filter(t => t.status === 'in-progress').length;
          const completedTasks = assigneeTasks.filter(t => t.status === 'completed').length;
          
          // Get unique sites from tasks
          const assignedSites = [...new Set(assigneeTasks.map(t => t.siteName).filter(Boolean))];
          
          return {
            _id: assignee._id || `assignee-${assignee.email}`,
            name: assignee.name || "Unknown Supervisor",
            email: assignee.email,
            phone: assignee.phone || "Not provided",
            department: assignee.department || "Operations",
            site: assignedSites[0] || "",
            role: "supervisor" as const,
            employees: 0,
            tasks: assigneeTasks.length,
            assignedProjects: [],
            reportsTo: "",
            isActive: true,
            status: "active" as const,
            joinDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pendingTasks,
            inProgressTasks,
            completedTasks,
            overdueTasks: 0,
            assignedTasks: assigneeTasks,
            assignedSites,
            primarySite: assignedSites[0] || "Not assigned"
          };
        });
      
      // Merge all supervisor sources
      const allSupervisors = [...taskSupervisors, ...assigneeSupervisors];
      
      // Remove duplicates by email (primary key)
      const uniqueSupervisors = Array.from(
        new Map(allSupervisors.map(s => [s.email.toLowerCase(), s])).values()
      );
      
      // Filter by site if needed
      let filteredSupervisors = uniqueSupervisors;
      
      if (selectedSiteId !== "all" && selectedSiteName) {
        filteredSupervisors = uniqueSupervisors.filter(supervisor => {
          // Check if supervisor is assigned to this site via tasks
          const hasSiteTasks = supervisor.assignedSites?.includes(selectedSiteName) || false;
          const siteMatches = supervisor.site === selectedSiteName;
          const primarySiteMatches = supervisor.primarySite === selectedSiteName;
          
          return hasSiteTasks || siteMatches || primarySiteMatches;
        });
      }
      
      // Exclude current user if they are a supervisor
      if (role === "supervisor" && currentUser) {
        filteredSupervisors = filteredSupervisors.filter(s => 
          s.email.toLowerCase() !== currentUser.email?.toLowerCase()
        );
      }
      
      setSupervisors(filteredSupervisors);
      
    } catch (error: any) {
      console.error("Error combining supervisor data:", error);
      toast.error("Could not load supervisors");
      setSupervisors([]);
    }
  };

  /* ------------------------------------------------------------------ */
  /* FETCH ALL DATA */
  /* ------------------------------------------------------------------ */

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await combineSupervisorData();
      await fetchManagedSupervisors();
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Could not load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* INITIAL DATA LOAD */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const initializeData = async () => {
      if (!currentUser) {
        return;
      }
      
      // Check permissions
      const canCreate = ["superadmin", "admin", "manager"].includes(role);
      setCanCreateSupervisor(canCreate);
      
      // Fetch initial data
      await fetchSites();
    };
    
    initializeData();
  }, [currentUser, role]);

  /* ------------------------------------------------------------------ */
  /* FETCH DATA WHEN SITE CHANGES */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (selectedSiteId && currentUser) {
      fetchAllData();
    }
  }, [selectedSiteId, selectedSiteName, currentUser]);

  /* ------------------------------------------------------------------ */
  /* HANDLERS */
  /* ------------------------------------------------------------------ */

  const openDialog = (supervisor?: Supervisor) => {
    if (supervisor) {
      setEditingSupervisor(supervisor);
      form.reset({
        name: supervisor.name,
        email: supervisor.email,
        phone: supervisor.phone,
        department: supervisor.department,
        site: supervisor.site || selectedSiteName,
      });
    } else {
      setEditingSupervisor(null);
      form.reset({
        name: "",
        email: "",
        phone: "",
        password: "",
        department: "Operations",
        site: selectedSiteName || "",
      });
    }
    setDialogOpen(true);
  };

  const handleSiteChange = (siteId: string) => {
    if (siteId === "all") {
      setSelectedSiteId("all");
      setSelectedSiteName("All Sites");
    } else {
      const selected = sites.find(s => s._id === siteId);
      if (selected) {
        setSelectedSiteId(selected._id);
        setSelectedSiteName(selected.name);
      } else {
        console.error("Selected site not found:", siteId);
        toast.error("Selected site not found");
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSites();
    await fetchAllData();
    toast.success("Data refreshed");
  };

  const onSubmit = async (data: CreateFormData | UpdateFormData) => {
    try {
      // Ensure site is set
      const siteValue = data.site || selectedSiteName;
      
      if (!siteValue) {
        toast.error("Please select a site");
        return;
      }
      
      if (editingSupervisor) {
        const payload: UpdateSupervisorData = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          site: siteValue,
          reportsTo: role === "manager" ? currentUser?.email : undefined,
        };

        await supervisorService.updateSupervisor(
          editingSupervisor._id,
          payload
        );
        toast.success("Supervisor updated successfully");
      } else {
        const payload: CreateSupervisorData = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: (data as CreateFormData).password,
          department: data.department,
          site: siteValue,
          reportsTo: role === "manager" ? currentUser?.email : undefined,
        };

        await supervisorService.createSupervisor(payload);
        toast.success("Supervisor created successfully");
      }

      setDialogOpen(false);
      // Refresh data
      await handleRefresh();
    } catch (error: any) {
      console.error("Failed to save supervisor:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message ||
                          "Failed to save supervisor";
      toast.error(errorMessage);
    }
  };

  /* ------------------------------------------------------------------ */
  /* HELPER FUNCTIONS */
  /* ------------------------------------------------------------------ */

  const getTaskCountBadge = (count: number, type: 'pending' | 'inProgress' | 'completed' | 'overdue') => {
    const colors = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      inProgress: 'bg-blue-50 text-blue-700 border-blue-200',
      completed: 'bg-green-50 text-green-700 border-green-200',
      overdue: 'bg-red-50 text-red-700 border-red-200'
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${colors[type]}`}>
        {type === 'pending' && <Clock className="h-3 w-3 mr-1" />}
        {type === 'inProgress' && <Clock className="h-3 w-3 mr-1" />}
        {type === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
        {type === 'overdue' && <AlertCircle className="h-3 w-3 mr-1" />}
        {count}
      </Badge>
    );
  };

  /* ------------------------------------------------------------------ */
  /* FILTER SUPERVISORS BASED ON SEARCH */
  /* ------------------------------------------------------------------ */

  const filteredSupervisors = supervisors.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.site && s.site.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.primarySite && s.primarySite.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredManagedSupervisors = managedSupervisors.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQueryManaged.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQueryManaged.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchQueryManaged.toLowerCase())) ||
      (s.site && s.site.toLowerCase().includes(searchQueryManaged.toLowerCase()))
  );

  /* ------------------------------------------------------------------ */
  /* RENDER */
  /* ------------------------------------------------------------------ */

  // If no current user, show loading
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Supervisors"
        subtitle={
          role === "supervisor" 
            ? `Supervisors at ${selectedSiteName || "your site"}` 
            : role === "manager" 
              ? `Supervisors at ${selectedSiteName || "your site"}`
              : selectedSiteId === "all"
                ? "All Supervisors"
                : `Supervisors at ${selectedSiteName || "Select a site"}`
        }
        onMenuClick={onMenuClick}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Supervisors Management</CardTitle>
                <Badge variant="outline" className="ml-2">
                  {filteredSupervisors.length + filteredManagedSupervisors.length} total
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing || loading || loadingTasks}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                
                {canCreateSupervisor && selectedSiteId && selectedSiteId !== "all" && (
                  <Button onClick={() => openDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Supervisor
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Site Selection */}
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="text-sm font-medium whitespace-nowrap">Site:</span>
                <Select
                  value={selectedSiteId}
                  onValueChange={handleSiteChange}
                  disabled={loading || loadingTasks}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={sites.length === 0 ? "Loading sites..." : "Select site"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(role === "admin" || role === "superadmin") && (
                      <SelectItem value="all">All Sites</SelectItem>
                    )}
                    {sites.map((site) => (
                      <SelectItem key={site._id} value={site._id}>
                        {site.name}
                        {site.location && ` - ${site.location}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSiteName && (
                  <Badge variant="outline" className="ml-2">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {selectedSiteName}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading || loadingTasks ? (
              <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-muted-foreground">
                  {loadingTasks ? "Analyzing tasks to find supervisors..." : "Loading supervisors..."}
                </p>
              </div>
            ) : !selectedSiteId ? (
              <div className="text-center py-10">
                <Building className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Site Selected</h3>
                <p className="text-muted-foreground mt-1">
                  Please select a site to view supervisors
                </p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full md:w-auto grid-cols-2">
                  <TabsTrigger value="task-supervisors" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    From Tasks & Assignees
                    <Badge variant="secondary" className="ml-2">
                      {filteredSupervisors.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="managed-supervisors" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Manager-Added Supervisors
                    <Badge variant="secondary" className="ml-2">
                      {filteredManagedSupervisors.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                {/* Tab 1: Supervisors from Tasks & Assignees */}
                <TabsContent value="task-supervisors" className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">
                        Supervisors discovered from task assignments and assignee lists
                      </span>
                    </div>
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search supervisors from tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full sm:w-[300px]"
                      />
                    </div>
                  </div>
                  
                  {filteredSupervisors.length === 0 ? (
                    <div className="text-center py-10">
                      <Database className="h-12 w-12 mx-auto text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">No Supervisors Found</h3>
                      <p className="text-muted-foreground mt-1">
                        {searchQuery
                          ? "No supervisors match your search criteria"
                          : selectedSiteId === "all"
                          ? "No supervisors found in any site from tasks"
                          : `No task supervisors found at ${selectedSiteName}`
                        }
                      </p>
                      
                      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200 max-w-md mx-auto">
                        <h4 className="font-medium text-blue-800 mb-2">Why no supervisors?</h4>
                        <ul className="text-sm text-blue-700 text-left space-y-1">
                          <li>• No tasks have been assigned to supervisors at this site</li>
                          <li>• Tasks might not have the <code>assignedTo</code> field populated</li>
                          <li>• Check if supervisors exist in the Assignees list</li>
                          <li>• Verify that tasks have correct <code>assignedToName</code> values</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supervisor</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Task Statistics</TableHead>
                            <TableHead>Site(s)</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSupervisors.map((supervisor) => (
                            <TableRow key={supervisor._id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <div className="flex items-center">
                                    <Shield className="h-4 w-4 mr-2 text-blue-500" />
                                    <span>{supervisor.name}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    ID: {supervisor._id?.slice(-8) || 'From Tasks'}
                                    {supervisor._id?.includes('assignee') && ' (From Assignees)'}
                                    {supervisor._id?.includes('task') && ' (From Tasks)'}
                                  </div>
                                  <div className="mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      <FileText className="h-3 w-3 mr-1" />
                                      {supervisor.tasks || 0} total tasks
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-1">
                                  <div className="flex items-center text-sm">
                                    <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                                    <span className="truncate">{supervisor.email}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                                    <span>{supervisor.phone || "Not provided"}</span>
                                  </div>
                                  <div className="text-xs mt-2">
                                    <Badge variant="outline">
                                      {supervisor.department || "Operations"}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    {supervisor.pendingTasks && supervisor.pendingTasks > 0 && 
                                      getTaskCountBadge(supervisor.pendingTasks, 'pending')}
                                    {supervisor.inProgressTasks && supervisor.inProgressTasks > 0 && 
                                      getTaskCountBadge(supervisor.inProgressTasks, 'inProgress')}
                                    {supervisor.completedTasks && supervisor.completedTasks > 0 && 
                                      getTaskCountBadge(supervisor.completedTasks, 'completed')}
                                    {supervisor.overdueTasks && supervisor.overdueTasks > 0 && 
                                      getTaskCountBadge(supervisor.overdueTasks, 'overdue')}
                                  </div>
                                  {supervisor.assignedTasks && supervisor.assignedTasks.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Latest: {supervisor.assignedTasks[0]?.title?.substring(0, 30)}...
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                                    <span className="font-medium">{supervisor.primarySite || "Not assigned"}</span>
                                  </div>
                                  {supervisor.assignedSites && supervisor.assignedSites.length > 1 && (
                                    <div className="text-xs text-muted-foreground">
                                      Also at: {supervisor.assignedSites.slice(1).join(', ')}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Badge
                                    variant={supervisor.isActive ? "default" : "secondary"}
                                    className={
                                      supervisor.isActive
                                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                    }
                                  >
                                    {supervisor.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  {supervisor.assignedTasks && supervisor.assignedTasks.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Last active: {new Date(supervisor.updatedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
                
                {/* Tab 2: Manager-Added Supervisors */}
                <TabsContent value="managed-supervisors" className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">
                        Supervisors created by managers through the supervisor management system
                      </span>
                    </div>
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search managed supervisors..."
                        value={searchQueryManaged}
                        onChange={(e) => setSearchQueryManaged(e.target.value)}
                        className="pl-10 w-full sm:w-[300px]"
                      />
                    </div>
                  </div>
                  
                  {loadingManaged ? (
                    <div className="text-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-muted-foreground">Loading managed supervisors...</p>
                    </div>
                  ) : filteredManagedSupervisors.length === 0 ? (
                    <div className="text-center py-10">
                      <UserPlus className="h-12 w-12 mx-auto text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">No Managed Supervisors</h3>
                      <p className="text-muted-foreground mt-1">
                        {searchQueryManaged
                          ? "No managed supervisors match your search"
                          : selectedSiteId === "all"
                          ? "No supervisors have been created by managers"
                          : `No supervisors created by managers at ${selectedSiteName}`
                        }
                      </p>
                      
                      {canCreateSupervisor && !searchQueryManaged && selectedSiteId !== "all" && (
                        <Button className="mt-6" onClick={() => openDialog()}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Your First Supervisor
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supervisor</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Department & Site</TableHead>
                            <TableHead>Employees & Tasks</TableHead>
                            <TableHead>Reports To</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredManagedSupervisors.map((supervisor) => (
                            <TableRow key={supervisor._id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <div className="flex items-center">
                                    <UserPlus className="h-4 w-4 mr-2 text-green-500" />
                                    <span>{supervisor.name}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    ID: {supervisor._id?.slice(-8)}
                                  </div>
                                  <div className="mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Joined {new Date(supervisor.joinDate).toLocaleDateString()}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-1">
                                  <div className="flex items-center text-sm">
                                    <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                                    <span className="truncate">{supervisor.email}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                                    <span>{supervisor.phone}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <Badge variant="outline">
                                    {supervisor.department}
                                  </Badge>
                                  <div className="flex items-center text-sm">
                                    <Building className="h-3 w-3 mr-2" />
                                    <span>{supervisor.site}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    <span className="text-sm">{supervisor.employees} employees</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    <span className="text-sm">{supervisor.tasks} tasks</span>
                                  </div>
                                  {supervisor.assignedProjects && supervisor.assignedProjects.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Projects: {supervisor.assignedProjects.length}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {supervisor.reportsTo ? (
                                    <div className="flex items-center">
                                      <Shield className="h-3 w-3 mr-2" />
                                      {supervisor.reportsTo === currentUser?.email ? (
                                        <Badge variant="secondary">You</Badge>
                                      ) : (
                                        supervisor.reportsTo
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Not assigned</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={supervisor.isActive ? "default" : "secondary"}
                                  className={
                                    supervisor.isActive
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                  }
                                >
                                  {supervisor.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {canCreateSupervisor && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openDialog(supervisor)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSupervisor ? "Edit Supervisor" : "Add New Supervisor"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
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
                        <Input placeholder="+91 9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {!editingSupervisor && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
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
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={role === "manager" || role === "supervisor"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site._id} value={site.name}>
                            {site.name}
                            {site.location && ` (${site.location})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(role === "manager" || role === "supervisor") && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Site is automatically set to: {selectedSiteName}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingSupervisor ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Supervisors;