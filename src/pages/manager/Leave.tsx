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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, Loader2, RefreshCw, Users, AlertCircle, Database, Search, Building, 
  Check, X, Calendar as CalendarIcon, Clock, Filter, Download, User, Hash, 
  Eye, FileText, Mail, Phone, MapPin, AlertTriangle, Info, Bell, 
  ChevronDown, ChevronUp, BarChart, TrendingUp, CheckSquare, 
  Square, Send, MessageSquare, Printer, Upload, Shield, ExternalLink,
  Zap, Wifi, WifiOff, Layers, PieChart, BarChart3, CalendarDays,
  Users2, UserCheck, UserX, Clock4, Target, BellRing, History,
  Sparkles, Star, Award, Rocket, ShieldCheck, ShieldAlert,
  LineChart, DownloadCloud, CloudOff, Cloud, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/context/RoleContext";
import { format, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { taskService } from "@/services/TaskService";
import type { ExtendedSite } from "@/services/TaskService";

interface LeaveRequest {
  _id: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
  contactNumber: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancellationReason?: string;
  managerRemarks?: string;
  emergencyContact?: string;
  handoverTo?: string;
  handoverCompleted?: boolean;
  handoverRemarks?: string;
  attachmentUrl?: string;
  isManagerLeave?: boolean;
  managerId?: string;
  site?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  escalationLevel?: number;
  escalationTo?: string;
  lastRemindedAt?: string;
  comments?: Comment[];
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  contactNumber: string;
  position: string;
  email: string;
  isActive?: boolean;
  site?: string;
}

interface ManagerInfo {
  _id: string;
  employeeId?: string;
  name: string;
  department: string;
  contactNumber?: string;
  email?: string;
  role: string;
  phone?: string;
  position?: string;
  site?: string;
  sites?: string[];
}

interface Comment {
  id: string;
  leaveId: string;
  userId: string;
  userName: string;
  comment: string;
  timestamp: string;
  isManager: boolean;
  userRole: string;
}

interface LeaveBalance {
  casual: number;
  sick: number;
  annual: number;
  maternity: number;
  paternity: number;
  bereavement: number;
  other: number;
}

interface Delegation {
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  isActive: boolean;
}

interface Analytics {
  monthlyTrend: { month: string; leaves: number }[];
  departmentComparison: { department: string; leaves: number }[];
  leaveTypeDistribution: { type: string; count: number }[];
  approvalTime: { average: number; min: number; max: number };
  topEmployees: { name: string; leaves: number }[];
  siteComparison: { site: string; leaves: number }[];
}

const API_URL = `http://${window.location.hostname}:5001/api`;

const ManagerLeave = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [delegationDialogOpen, setDelegationDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableSites, setAvailableSites] = useState<ExtendedSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<ExtendedSite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [managerDepartment, setManagerDepartment] = useState<string>("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [myLeavesFilter, setMyLeavesFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [activeTab, setActiveTab] = useState('team-leaves');
  const [selectedLeaves, setSelectedLeaves] = useState<string[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showCalendar, setShowCalendar] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [exportOptions, setExportOptions] = useState({
    includeManagerLeaves: true,
    includeComments: false,
    includeAttachments: false,
    format: 'csv' as 'csv' | 'excel' | 'pdf'
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    urgent: 0,
    escalated: 0
  });

  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    appliedBy: "",
    priority: "medium",
    handoverTo: "",
    handoverRemarks: "",
    attachment: null as File | null
  });

  const [managerInfo, setManagerInfo] = useState<ManagerInfo>({
    _id: "",
    name: "",
    department: "",
    contactNumber: "",
    email: "",
    role: "manager",
    phone: "",
    position: "Manager",
    sites: []
  });

  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    casual: 12,
    sick: 10,
    annual: 30,
    maternity: 180,
    paternity: 15,
    bereavement: 7,
    other: 5
  });

  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    monthlyTrend: [],
    departmentComparison: [],
    leaveTypeDistribution: [],
    approvalTime: { average: 0, min: 0, max: 0 },
    topEmployees: [],
    siteComparison: []
  });

  const [pendingActions, setPendingActions] = useState<any[]>([]);

  // Function to fetch sites from TaskService
  const fetchSitesFromTaskService = async () => {
    try {
      setIsLoading(true);
      const sites = await taskService.getAllSites();
      console.log("✅ Sites fetched from TaskService:", sites);
      
      // If manager has sites in their info, filter to only show those
      if (managerInfo.sites && managerInfo.sites.length > 0) {
        const managerSites = sites.filter(site => 
          managerInfo.sites?.includes(site.name)
        );
        setAvailableSites(managerSites);
        
        // Set selected site based on manager's site
        const defaultSite = managerSites.find(site => 
          site.name === managerInfo.site || site.name === managerInfo.sites?.[0]
        ) || managerSites[0];
        
        if (defaultSite) {
          setSelectedSite(defaultSite);
        }
      } else {
        // If no specific manager sites, use all sites
        setAvailableSites(sites);
        if (sites.length > 0) {
          setSelectedSite(sites[0]);
        }
      }
      
    } catch (error) {
      console.error("❌ Error fetching sites from TaskService:", error);
      toast.error("Failed to fetch sites from TaskService");
      
      // Fallback to previous method
      if (managerInfo.sites && managerInfo.sites.length > 0) {
        const fallbackSites = managerInfo.sites.map(site => ({
          _id: site,
          name: site,
          clientName: "Unknown",
          location: "Unknown",
          status: "active",
          managerCount: 0,
          supervisorCount: 0
        }));
        setAvailableSites(fallbackSites);
        if (fallbackSites.length > 0) {
          setSelectedSite(fallbackSites[0]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get manager info from auth context
  useEffect(() => {
    if (authUser && isAuthenticated) {
      const storedUser = localStorage.getItem('sk_user');
      let userData = authUser;
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          userData = { ...authUser, ...parsedUser };
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
      
      const managerData: ManagerInfo = {
        _id: userData._id || userData.id || `mgr_${Date.now()}`,
        employeeId: userData.employeeId || userData.id || `MGR${Date.now().toString().slice(-6)}`,
        name: userData.name || userData.firstName + " " + userData.lastName || "Manager",
        department: userData.department || "",
        contactNumber: userData.phone || userData.contactNumber || "0000000000",
        email: userData.email || "",
        role: userData.role || "manager",
        phone: userData.phone || userData.contactNumber || "",
        position: userData.position || "Manager",
        site: userData.site || "Main Site",
        sites: userData.sites || []
      };
      
      setManagerInfo(managerData);
      setFormData(prev => ({
        ...prev,
        appliedBy: managerData.name
      }));

      if (managerData.department) {
        setManagerDepartment(managerData.department);
      }

      // Fetch sites from TaskService after setting manager info
      fetchSitesFromTaskService();
    }
  }, [authUser, isAuthenticated]);

  // Fetch departments and other data on component mount
  useEffect(() => {
    fetchDepartments();
    fetchDelegation();
    fetchAnalytics();
    
    // Load pending actions from localStorage
    const storedActions = localStorage.getItem('pendingLeaveActions');
    if (storedActions) {
      setPendingActions(JSON.parse(storedActions));
      if (isOnline) {
        syncPendingActions();
      }
    }

    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("You're back online!");
      syncPendingActions();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline. Actions will be queued.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch employees and leave requests when department or site changes
  useEffect(() => {
    if (managerDepartment) {
      fetchEmployees();
      fetchLeaveRequests();
      fetchMyLeaves();
    }
  }, [managerDepartment, selectedSite]);

  useEffect(() => {
    if (leaveRequests.length > 0) {
      updateStats();
    }
  }, [leaveRequests]);

  const updateStats = () => {
    const stats = {
      total: leaveRequests.length,
      pending: leaveRequests.filter(l => l.status === 'pending').length,
      approved: leaveRequests.filter(l => l.status === 'approved').length,
      rejected: leaveRequests.filter(l => l.status === 'rejected').length,
      cancelled: leaveRequests.filter(l => l.status === 'cancelled').length,
      urgent: leaveRequests.filter(l => l.priority === 'urgent').length,
      escalated: leaveRequests.filter(l => (l.escalationLevel || 0) > 0).length
    };
    setStats(stats);
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves/departments`);
      if (response.ok) {
        const departments = await response.json();
        console.log("📋 Available departments:", departments);
        
        if (departments && departments.length > 0) {
          setAvailableDepartments(departments);
          if (!managerDepartment) {
            setManagerDepartment(departments[0]);
          }
        } else {
          const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
          setAvailableDepartments(defaultDepartments);
          if (!managerDepartment) {
            setManagerDepartment(defaultDepartments[0]);
          }
        }
      } else {
        throw new Error("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
      setAvailableDepartments(defaultDepartments);
      if (!managerDepartment) {
        setManagerDepartment(defaultDepartments[0]);
      }
    }
  };

  const fetchLeaveRequests = async () => {
    if (!managerDepartment) {
      return;
    }

    try {
      setIsLoading(true);
      let url = `${API_URL}/leaves/supervisor?department=${encodeURIComponent(managerDepartment)}`;
      
      // Use site ID instead of site name
      if (selectedSite && selectedSite._id) {
        url += `&siteId=${encodeURIComponent(selectedSite._id)}`;
      } else if (selectedSite && selectedSite.name) {
        // Fallback to site name if _id is not available
        url += `&site=${encodeURIComponent(selectedSite.name)}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaves');
      }
      
      const data = await response.json();
      console.log("✅ Team leaves data received:", data);
      
      const formattedData = data.map((leave: any) => ({
        ...leave,
        id: leave._id || leave.id,
        priority: leave.priority || 'medium',
        escalationLevel: leave.escalationLevel || 0
      }));
      setLeaveRequests(formattedData);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      toast.error(error.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyLeaves = async () => {
    if (!managerInfo._id) {
      console.log("Manager info not available yet");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/manager-leaves?managerId=${encodeURIComponent(managerInfo._id)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manager leaves: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const formattedData = data.leaves.map((leave: any) => ({
          ...leave,
          id: leave._id || leave.id,
          _id: leave._id || leave.id,
          isManagerLeave: true,
          employeeId: leave.managerId,
          employeeName: leave.managerName,
          department: leave.managerDepartment,
          contactNumber: leave.managerContact,
          appliedDate: leave.appliedDate || leave.createdAt
        }));
        
        setMyLeaves(formattedData);
      }
    } catch (error) {
      console.error("Error fetching manager's leaves:", error);
      setMyLeaves([]);
    }
  };

  const fetchEmployees = async () => {
    if (!managerDepartment) {
      return;
    }

    try {
      setIsLoadingEmployees(true);
      
      let url = `${API_URL}/leaves/supervisor/employees?department=${encodeURIComponent(managerDepartment)}`;
      // Use site ID instead of site name
      if (selectedSite && selectedSite._id) {
        url += `&siteId=${encodeURIComponent(selectedSite._id)}`;
      } else if (selectedSite && selectedSite.name) {
        // Fallback to site name if _id is not available
        url += `&site=${encodeURIComponent(selectedSite.name)}`;
      }
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        throw new Error(`API endpoint not found: ${url}. Check server routes.`);
      }
      
      const data = await response.json();
      
      if (data.message && data.message.includes("No active employees found")) {
        console.log(`ℹ️ No employees found in ${managerDepartment} department`);
        setEmployees([]);
        
        if (data.availableDepartments && data.availableDepartments.length > 0) {
          toast.info(`No employees in ${managerDepartment}. Try: ${data.availableDepartments.join(', ')}`, {
            duration: 5000,
          });
          setAvailableDepartments(data.availableDepartments);
        }
      } else if (Array.isArray(data)) {
        console.log(`✅ Found ${data.length} employees in ${managerDepartment}`);
        setEmployees(data);
      } else {
        throw new Error("Unexpected response format from server");
      }
    } catch (error: any) {
      console.error("❌ Error fetching employees:", error);
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchDelegation = async () => {
    try {
      const response = await fetch(`${API_URL}/delegation?managerId=${managerInfo._id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.delegation) {
          setDelegation(data.delegation);
        }
      }
    } catch (error) {
      console.error("Error fetching delegation:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves/analytics?managerId=${managerInfo._id}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const calculateTotalDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const handleApproveLeave = async (leaveId: string) => {
    if (!leaveId) {
      toast.error("Leave ID is required");
      return;
    }

    if (!isOnline) {
      queueAction('approve', leaveId);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'approved',
          managerId: managerInfo._id,
          managerName: managerInfo.name,
          managerDepartment: managerInfo.department,
          remarks: 'Approved by manager'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve leave');
      }
      
      const data = await response.json();
      toast.success(data.message || "Leave request approved!");
      
      setLeaveRequests(prev => 
        prev.map(leave => {
          const leaveIdToCompare = leave._id || leave.id;
          if (leaveIdToCompare === leaveId) {
            return { 
              ...leave, 
              status: 'approved',
              approvedBy: managerInfo.name,
              approvedAt: new Date().toISOString(),
              remarks: 'Approved by manager'
            };
          }
          return leave;
        })
      );
      
      setMyLeaves(prev =>
        prev.map(leave => {
          const leaveIdToCompare = leave._id || leave.id;
          if (leaveIdToCompare === leaveId) {
            return { 
              ...leave, 
              status: 'approved',
              approvedBy: managerInfo.name,
              approvedAt: new Date().toISOString(),
              remarks: 'Approved by manager'
            };
          }
          return leave;
        })
      );
      
      if (selectedLeave && (selectedLeave._id === leaveId || selectedLeave.id === leaveId)) {
        setViewDialogOpen(false);
      }
      
      fetchLeaveRequests();
      fetchMyLeaves();
    } catch (error: any) {
      console.error("❌ Error approving leave:", error);
      toast.error(error.message || "Failed to approve leave");
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    if (!leaveId) {
      toast.error("Leave ID is required");
      return;
    }

    if (!isOnline) {
      queueAction('reject', leaveId);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          managerId: managerInfo._id,
          managerName: managerInfo.name,
          managerDepartment: managerInfo.department,
          remarks: 'Rejected by manager'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject leave');
      }
      
      const data = await response.json();
      toast.success(data.message || "Leave request rejected!");
      
      setLeaveRequests(prev => 
        prev.map(leave => {
          const leaveIdToCompare = leave._id || leave.id;
          if (leaveIdToCompare === leaveId) {
            return { 
              ...leave, 
              status: 'rejected',
              rejectedBy: managerInfo.name,
              rejectedAt: new Date().toISOString(),
              remarks: 'Rejected by manager'
            };
          }
          return leave;
        })
      );
      
      setMyLeaves(prev =>
        prev.map(leave => {
          const leaveIdToCompare = leave._id || leave.id;
          if (leaveIdToCompare === leaveId) {
            return { 
              ...leave, 
              status: 'rejected',
              rejectedBy: managerInfo.name,
              rejectedAt: new Date().toISOString(),
              remarks: 'Rejected by manager'
            };
          }
          return leave;
        })
      );
      
      if (selectedLeave && (selectedLeave._id === leaveId || selectedLeave.id === leaveId)) {
        setViewDialogOpen(false);
      }
      
      fetchLeaveRequests();
      fetchMyLeaves();
    } catch (error: any) {
      console.error("❌ Error rejecting leave:", error);
      toast.error(error.message || "Failed to reject leave");
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedLeaves.length === 0) {
      toast.error("Please select at least one leave request");
      return;
    }

    if (!isOnline) {
      selectedLeaves.forEach(leaveId => {
        queueAction(action, leaveId);
      });
      setSelectedLeaves([]);
      setBulkDialogOpen(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/leaves/bulk/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          leaveIds: selectedLeaves,
          status: action === 'approve' ? 'approved' : 'rejected',
          managerId: managerInfo._id,
          managerName: managerInfo.name
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} leaves`);
      }
      
      const data = await response.json();
      toast.success(data.message || `Successfully ${action}d ${selectedLeaves.length} leave(s)`);
      
      // Update local state
      if (action === 'approve') {
        setLeaveRequests(prev => 
          prev.map(leave => {
            if (selectedLeaves.includes(leave._id || leave.id || '')) {
              return { 
                ...leave, 
                status: 'approved',
                approvedBy: managerInfo.name,
                approvedAt: new Date().toISOString()
              };
            }
            return leave;
          })
        );
      } else {
        setLeaveRequests(prev => 
          prev.map(leave => {
            if (selectedLeaves.includes(leave._id || leave.id || '')) {
              return { 
                ...leave, 
                status: 'rejected',
                rejectedBy: managerInfo.name,
                rejectedAt: new Date().toISOString()
              };
            }
            return leave;
          })
        );
      }
      
      setSelectedLeaves([]);
      setBulkDialogOpen(false);
      fetchLeaveRequests();
    } catch (error: any) {
      console.error(`Error ${action}ing leaves:`, error);
      toast.error(error.message || `Failed to ${action} leaves`);
    }
  };

  const queueAction = (action: 'approve' | 'reject', leaveId: string) => {
    const pendingAction = {
      action,
      leaveId,
      managerId: managerInfo._id,
      managerName: managerInfo.name,
      timestamp: new Date().toISOString()
    };
    
    const updatedActions = [...pendingActions, pendingAction];
    setPendingActions(updatedActions);
    localStorage.setItem('pendingLeaveActions', JSON.stringify(updatedActions));
    
    toast.warning(`Action queued. Will sync when online (${pendingActions.length + 1} pending)`, {
      duration: 5000,
    });
  };

  const syncPendingActions = async () => {
    if (pendingActions.length === 0 || !isOnline) return;
    
    toast.info(`Syncing ${pendingActions.length} pending actions...`);
    
    try {
      for (const action of pendingActions) {
        if (action.action === 'approve') {
          await handleApproveLeave(action.leaveId);
        } else {
          await handleRejectLeave(action.leaveId);
        }
      }
      
      // Clear pending actions after successful sync
      setPendingActions([]);
      localStorage.removeItem('pendingLeaveActions');
      toast.success("All pending actions synced successfully!");
    } catch (error) {
      console.error("Error syncing pending actions:", error);
      toast.error("Failed to sync some pending actions");
    }
  };

  const handleViewLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setViewDialogOpen(true);
    // Fetch comments for this leave
    fetchComments(leave._id || leave.id || '');
  };

  const fetchComments = async (leaveId: string) => {
    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/comments`);
      if (response.ok) {
        const data = await response.json();
        if (selectedLeave) {
          setSelectedLeave(prev => prev ? { ...prev, comments: data } : null);
        }
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedLeave) return;

    setIsAddingComment(true);
    try {
      const comment = {
        leaveId: selectedLeave._id || selectedLeave.id,
        userId: managerInfo._id,
        userName: managerInfo.name,
        comment: commentText,
        isManager: true,
        userRole: 'manager'
      };

      const response = await fetch(`${API_URL}/leaves/${selectedLeave._id || selectedLeave.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });

      if (response.ok) {
        const data = await response.json();
        if (selectedLeave) {
          setSelectedLeave(prev => prev ? {
            ...prev,
            comments: [...(prev.comments || []), data.comment]
          } : null);
        }
        setCommentText("");
        toast.success("Comment added successfully");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };

  // Test the manager leave API endpoint
  const testManagerLeaveAPI = async () => {
    try {
      toast.info("Testing manager leave API endpoint...");
      
      // First test if the endpoint exists
      const testResponse = await fetch(`${API_URL}/manager-leaves/apply`, {
        method: 'OPTIONS', // Use OPTIONS to check if endpoint exists without sending data
      });
      
      console.log("✅ Manager leave endpoint exists, status:", testResponse.status);
      
      // Test with minimal data
      const testData = {
        managerId: managerInfo._id || "test_manager_123",
        managerName: managerInfo.name || "Test Manager",
        managerDepartment: managerInfo.department || "Test Department",
        leaveType: "casual",
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        totalDays: 1,
        reason: "Test leave application",
        appliedBy: managerInfo.name || "Test Manager"
      };
      
      console.log("📤 Test data:", testData);
      
      // Make a test POST request
      const response = await fetch(`${API_URL}/manager-leaves/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ API test successful: ${result.message || "Endpoint working"}`);
      } else {
        const errorText = await response.text();
        console.error("❌ API test failed:", errorText);
        toast.error(`API test failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error("❌ API test error:", error);
      toast.error("Failed to test API endpoint. Check console for details.");
    }
  };

  // Fallback function using regular leaves endpoint
  const handleSubmitManagerLeaveFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.appliedBy.trim()) {
      toast.error("Manager name is required");
      return;
    }

    if (!formData.leaveType) {
      toast.error("Please select leave type");
      return;
    }

    if (!formData.fromDate || !formData.toDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for leave");
      return;
    }

    // Check leave balance
    const leaveTypeKey = formData.leaveType as keyof LeaveBalance;
    if (leaveBalance[leaveTypeKey] < totalDays) {
      toast.error(`Insufficient ${formData.leaveType} leave balance. Available: ${leaveBalance[leaveTypeKey]} days`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Use the regular leaves endpoint for managers
      const leaveData = {
        employeeId: managerInfo._id,
        employeeName: managerInfo.name,
        department: managerInfo.department || managerDepartment,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays: totalDays,
        reason: formData.reason,
        appliedBy: formData.appliedBy,
        contactNumber: managerInfo.contactNumber || managerInfo.phone || "0000000000",
        priority: formData.priority,
        handoverTo: formData.handoverTo,
        handoverRemarks: formData.handoverRemarks,
        isManagerLeave: true,
        managerId: managerInfo._id,
        site: managerInfo.site || (selectedSite ? selectedSite.name : "Main Site"),
        status: "pending"
      };

      console.log("📤 Submitting manager leave (fallback):", leaveData);

      const response = await fetch(`${API_URL}/leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveData),
      });
      
      const responseText = await response.text();
      console.log("📥 Raw response:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }
      
      toast.success(data.message || "Manager leave submitted successfully!");
      
      // Update leave balance
      setLeaveBalance(prev => ({
        ...prev,
        [leaveTypeKey]: prev[leaveTypeKey] - totalDays
      }));
      
      // Reset form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
        appliedBy: managerInfo.name,
        priority: "medium",
        handoverTo: "",
        handoverRemarks: "",
        attachment: null
      });
      
      setDialogOpen(false);
      fetchMyLeaves();
      setActiveTab('my-leaves');
      
    } catch (error: any) {
      console.error("❌ Error in fallback:", error);
      toast.error(error.message || "Failed to submit leave. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main function to submit manager leave
  const handleSubmitManagerLeaveMain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.appliedBy.trim()) {
      toast.error("Manager name is required");
      return;
    }

    if (!formData.leaveType) {
      toast.error("Please select leave type");
      return;
    }

    if (!formData.fromDate || !formData.toDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for leave");
      return;
    }

    // Check leave balance
    const leaveTypeKey = formData.leaveType as keyof LeaveBalance;
    if (leaveBalance[leaveTypeKey] < totalDays) {
      toast.error(`Insufficient ${formData.leaveType} leave balance. Available: ${leaveBalance[leaveTypeKey]} days`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const managerLeaveData = {
        managerId: managerInfo._id,
        managerName: managerInfo.name,
        managerDepartment: managerInfo.department || managerDepartment,
        managerPosition: managerInfo.position || "Manager",
        managerEmail: managerInfo.email || "",
        managerContact: managerInfo.contactNumber || managerInfo.phone || "0000000000",
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays: totalDays,
        reason: formData.reason,
        appliedBy: formData.appliedBy,
        priority: formData.priority,
        handoverTo: formData.handoverTo,
        handoverRemarks: formData.handoverRemarks,
        // Add site information if available
        site: managerInfo.site || (selectedSite ? selectedSite.name : "Main Site"),
        // Add current timestamp for backend
        appliedDate: new Date().toISOString(),
        status: "pending" // Default status
      };

      console.log("📤 Submitting manager leave data:", managerLeaveData);

      const response = await fetch(`${API_URL}/manager-leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(managerLeaveData),
      });
      
      // Get the response text first to see what's returned
      const responseText = await response.text();
      console.log("📥 Raw response:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        // Log detailed error information
        console.error("❌ API Error Details:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          data: data
        });
        
        throw new Error(data.message || data.error || `Server error: ${response.status} ${response.statusText}`);
      }
      
      console.log("✅ Manager leave submitted successfully:", data);
      
      toast.success(data.message || "Manager leave submitted successfully!");
      
      // Update leave balance
      setLeaveBalance(prev => ({
        ...prev,
        [leaveTypeKey]: prev[leaveTypeKey] - totalDays
      }));
      
      // Reset form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
        appliedBy: managerInfo.name,
        priority: "medium",
        handoverTo: "",
        handoverRemarks: "",
        attachment: null
      });
      
      setDialogOpen(false);
      
      // Refresh the manager's leaves
      await fetchMyLeaves();
      setActiveTab('my-leaves');
      
    } catch (error: any) {
      console.error("❌ Error submitting manager leave request:", error);
      
      // More detailed error message
      let errorMessage = "Failed to submit manager leave request.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.message?.includes("Failed to fetch")) {
        errorMessage = "Cannot connect to the server. Please check if the backend is running.";
      }
      
      if (error.message?.includes("404")) {
        errorMessage = "API endpoint not found. Please check the backend routes.";
      }
      
      throw error; // Re-throw to be caught by the combined handler
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combined handler that tries main endpoint first, then fallback
  const handleSubmitManagerLeave = async (e: React.FormEvent) => {
    try {
      // Try main endpoint first
      await handleSubmitManagerLeaveMain(e);
    } catch (mainError: any) {
      console.log("Main endpoint failed, trying fallback...", mainError.message);
      
      // If main endpoint fails with 404 or similar, try fallback
      if (mainError.message.includes("404") || mainError.message.includes("endpoint not found")) {
        toast.info("Trying alternative method...");
        await handleSubmitManagerLeaveFallback(e);
      } else {
        // If it's another error, show the original message
        toast.error(mainError.message || "Failed to submit leave. Please try again.");
      }
    }
  };

  const handleExport = async () => {
    const leavesToExport = activeTab === 'team-leaves' ? leaveRequests : myLeaves;
    const tabName = activeTab === 'team-leaves' ? 'team' : 'manager';
    
    if (leavesToExport.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      if (exportOptions.format === 'pdf') {
        // For PDF, use server-side generation
        toast.info("Generating PDF report...");
        const response = await fetch(`${API_URL}/export/leaves/pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leaves: leavesToExport,
            managerInfo,
            options: exportOptions
          })
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `leave-report-${tabName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          toast.success("PDF exported successfully!");
        }
      } else {
        // For CSV/Excel
        const headers = [
          'Employee ID', 'Employee Name', 'Department', 'Leave Type', 
          'From Date', 'To Date', 'Total Days', 'Status', 'Priority',
          'Reason', 'Applied By', 'Applied Date', 'Type', 'Site'
        ];
        
        const rows = leavesToExport.map(leave => [
          leave.employeeId,
          leave.employeeName,
          leave.department,
          leave.leaveType,
          leave.fromDate,
          leave.toDate,
          leave.totalDays.toString(),
          leave.status,
          leave.priority || 'medium',
          leave.reason,
          leave.appliedBy,
          leave.createdAt,
          leave.isManagerLeave ? 'Manager Leave' : 'Team Leave',
          leave.site || 'N/A'
        ]);

        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leave-requests-${tabName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success("Data exported successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
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

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getLeaveEvents = () => {
    const allLeaves = [...leaveRequests, ...myLeaves];
    return allLeaves.map(leave => ({
      id: leave._id || leave.id,
      title: `${leave.employeeName} - ${leave.leaveType}`,
      start: new Date(leave.fromDate),
      end: new Date(leave.toDate),
      status: leave.status,
      isManagerLeave: leave.isManagerLeave,
      priority: leave.priority
    }));
  };

  const filteredLeaves = leaveRequests.filter(leave => {
    if (filter !== 'all' && leave.status !== filter) return false;
    if (priorityFilter !== 'all' && leave.priority !== priorityFilter) return false;
    if (dateRange.from && dateRange.to) {
      const leaveStart = new Date(leave.fromDate);
      const leaveEnd = new Date(leave.toDate);
      if (!isWithinInterval(leaveStart, { start: dateRange.from, end: dateRange.to }) &&
          !isWithinInterval(leaveEnd, { start: dateRange.from, end: dateRange.to })) {
        return false;
      }
    }
    return true;
  });

  const filteredMyLeaves = myLeaves.filter(leave => {
    if (myLeavesFilter === 'all') return true;
    return leave.status === myLeavesFilter;
  });

  const getLeaveKey = (leave: LeaveRequest) => {
    return leave._id || leave.id || `${leave.employeeId}-${leave.fromDate}-${leave.toDate}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleLeaveSelection = (leaveId: string) => {
    setSelectedLeaves(prev => 
      prev.includes(leaveId) 
        ? prev.filter(id => id !== leaveId)
        : [...prev, leaveId]
    );
  };

  const selectAllLeaves = () => {
    if (selectedLeaves.length === filteredLeaves.length) {
      setSelectedLeaves([]);
    } else {
      setSelectedLeaves(filteredLeaves.map(leave => leave._id || leave.id || ''));
    }
  };

  const getCalendarEventsForMonth = () => {
    const events = getLeaveEvents();
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.map(day => ({
      date: day,
      events: events.filter(event => 
        isWithinInterval(day, { start: event.start, end: event.end })
      )
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Leave Management - Manager" 
        subtitle={`Welcome, ${managerInfo.name}! Manage team leaves and apply for your own leaves`}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Online Status Bar */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {isOnline ? "Online" : "Offline"}
            </Badge>
            {pendingActions.length > 0 && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                <CloudOff className="h-3 w-3 mr-1" />
                {pendingActions.length} pending
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Manager Info Badge */}
            <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-lg">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{managerInfo.name}</span>
              <Badge variant="outline" className="text-xs">
                {managerInfo.department || "No Department"}
              </Badge>
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                Manager
              </Badge>
            </div>
          </div>
        </div>

        {/* Statistics Cards with Icons */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <Users2 className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <Clock4 className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </div>
                <UserCheck className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-sm text-muted-foreground">Rejected</div>
                </div>
                <UserX className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{myLeaves.length}</div>
                  <div className="text-sm text-muted-foreground">My Leaves</div>
                </div>
                <User className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.urgent}</div>
                  <div className="text-sm text-muted-foreground">Urgent</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-pink-600">{stats.escalated}</div>
                  <div className="text-sm text-muted-foreground">Escalated</div>
                </div>
                <ShieldAlert className="h-8 w-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Balance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Your Leave Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              {Object.entries(leaveBalance).map(([type, days]) => (
                <div key={type} className="text-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="text-2xl font-bold text-primary">{days}</div>
                  <div className="text-sm text-muted-foreground capitalize">{type} Days</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Controls - Updated Layout */}
        <div className="space-y-4">
          {/* First Row: Department and Site Selectors with Refresh Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Department</Label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={managerDepartment}
                    onValueChange={setManagerDepartment}
                    disabled={availableDepartments.length === 0}
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
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm">Site</Label>
                <Select 
                  value={selectedSite?._id || "all"} 
                  onValueChange={(value) => {
                    if (value === "all") {
                      setSelectedSite(null);
                    } else {
                      const site = availableSites.find(s => s._id === value);
                      setSelectedSite(site || null);
                    }
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Site">
                      {selectedSite ? selectedSite.name : "All Sites"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {availableSites.map((site) => (
                      <SelectItem key={site._id} value={site._id}>
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          <div className="flex-1">
                            <div className="font-medium">{site.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {site.clientName} • {site.location}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSite && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Managers: {selectedSite.managerCount || 0} • Supervisors: {selectedSite.supervisorCount || 0} • Status: {selectedSite.status}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    fetchLeaveRequests();
                    fetchEmployees();
                    fetchMyLeaves();
                  }}
                  className="h-9"
                  disabled={isLoading || isLoadingEmployees}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchSitesFromTaskService}
                  className="h-9"
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Sites
                </Button>
              </div>
            </div>
            
         
          </div>

          {/* Second Row: Apply for Leave and Export Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Apply for My Leave
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Apply for Your Leave</DialogTitle>
                    <div className="text-sm text-muted-foreground">
                      Manager: <span className="font-medium">{managerInfo.name}</span>
                    </div>
                  </DialogHeader>
                  <form onSubmit={handleSubmitManagerLeave} className="space-y-4">
                    {/* Manager Info Display */}
                    <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-sm text-muted-foreground">Manager Name:</span>
                          <div className="font-medium">{managerInfo.name}</div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Department:</span>
                          <div className="font-medium">{managerInfo.department || managerDepartment}</div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Contact:</span>
                          <div className="font-medium">{managerInfo.contactNumber || "Not set"}</div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Site:</span>
                          <div className="font-medium">{managerInfo.site || "Main Site"}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Leave Balance Display */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Award className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">Available Leave Balance</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {Object.entries(leaveBalance).map(([type, days]) => (
                          <div key={type} className="text-center p-2 bg-white rounded">
                            <div className="font-semibold text-blue-700">{days}</div>
                            <div className="text-blue-600 capitalize">{type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="leaveType">Leave Type *</Label>
                      <Select
                        value={formData.leaveType}
                        onValueChange={(value) => handleInputChange('leaveType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Casual Leave ({leaveBalance.casual} days left)</SelectItem>
                          <SelectItem value="sick">Sick Leave ({leaveBalance.sick} days left)</SelectItem>
                          <SelectItem value="annual">Annual Leave ({leaveBalance.annual} days left)</SelectItem>
                          <SelectItem value="maternity">Maternity Leave ({leaveBalance.maternity} days left)</SelectItem>
                          <SelectItem value="paternity">Paternity Leave ({leaveBalance.paternity} days left)</SelectItem>
                          <SelectItem value="bereavement">Bereavement Leave ({leaveBalance.bereavement} days left)</SelectItem>
                          <SelectItem value="other">Other ({leaveBalance.other} days left)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fromDate">Start Date *</Label>
                        <Input
                          id="fromDate"
                          type="date"
                          value={formData.fromDate}
                          onChange={(e) => handleInputChange('fromDate', e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="toDate">End Date *</Label>
                        <Input
                          id="toDate"
                          type="date"
                          value={formData.toDate}
                          onChange={(e) => handleInputChange('toDate', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => handleInputChange('priority', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="handoverTo">Handover To (Optional)</Label>
                      <Input
                        id="handoverTo"
                        value={formData.handoverTo}
                        onChange={(e) => handleInputChange('handoverTo', e.target.value)}
                        placeholder="Name of person handling your responsibilities"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for Leave *</Label>
                      <Textarea
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => handleInputChange('reason', e.target.value)}
                        placeholder="Enter detailed reason for leave"
                        rows={4}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="handoverRemarks">Handover Remarks (Optional)</Label>
                      <Textarea
                        id="handoverRemarks"
                        value={formData.handoverRemarks}
                        onChange={(e) => handleInputChange('handoverRemarks', e.target.value)}
                        placeholder="Any special instructions or remarks"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Submit Manager Leave
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Export Button with Options */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Export Options</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Export Format</Label>
                      <Select
                        value={exportOptions.format}
                        onValueChange={(value: 'csv' | 'excel' | 'pdf') => 
                          setExportOptions(prev => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="pdf">PDF Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="includeManagerLeaves"
                          checked={exportOptions.includeManagerLeaves}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeManagerLeaves: !!checked }))
                          }
                        />
                        <Label htmlFor="includeManagerLeaves">Include Manager Leaves</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="includeComments"
                          checked={exportOptions.includeComments}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeComments: !!checked }))
                          }
                        />
                        <Label htmlFor="includeComments">Include Comments</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="includeAttachments"
                          checked={exportOptions.includeAttachments}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeAttachments: !!checked }))
                          }
                        />
                        <Label htmlFor="includeAttachments">Include Attachment Info</Label>
                      </div>
                    </div>
                    
                    <Button onClick={handleExport} className="w-full">
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <div className="flex space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange.from ? format(dateRange.from, 'PPP') : 'From'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange.to ? format(dateRange.to, 'PPP') : 'To'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Leave Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="casual">Casual Leave</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="annual">Annual Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setDateRange({});
                          setPriorityFilter('all');
                        }}
                        className="w-full"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Advanced Filters */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-muted-foreground"
          >
            {showAdvancedFilters ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
          </Button>
        </div>

        {/* Tabs for Team Leaves and My Leaves */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="team-leaves">
              <Users className="mr-2 h-4 w-4" />
              Team Leaves
            </TabsTrigger>
            <TabsTrigger value="my-leaves">
              <User className="mr-2 h-4 w-4" />
              My Leaves
            </TabsTrigger>
          </TabsList>

          {/* Team Leaves Tab */}
          <TabsContent value="team-leaves" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>
                      Team Leave Requests - {managerDepartment || "Select Department"}
                      {selectedSite && ` • ${selectedSite.name}`}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filteredLeaves.length} requests • {employees.length} employees
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedLeaves.length > 0 && (
                      <div className="flex items-center gap-2 mr-4">
                        <Badge variant="outline" className="bg-blue-50">
                          {selectedLeaves.length} selected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkDialogOpen(true)}
                          disabled={!isOnline}
                        >
                          <CheckSquare className="h-4 w-4 mr-1" />
                          Bulk Actions
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={filter === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('pending')}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={filter === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('approved')}
                      >
                        Approved
                      </Button>
                      <Button
                        variant={filter === 'rejected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('rejected')}
                      >
                        Rejected
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!managerDepartment ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">Select a Department</h3>
                    <p className="text-muted-foreground">
                      Please select a department to view team leave requests
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLeaves.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No Team Leave Requests</h3>
                      <p className="text-muted-foreground mb-4">
                        No team leave requests found for {managerDepartment} department
                        {selectedSite && ` at ${selectedSite.name}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Select All Checkbox */}
                    <div className="flex items-center space-x-2 p-2 border rounded-lg">
                      <Checkbox
                        id="select-all"
                        checked={selectedLeaves.length === filteredLeaves.length && filteredLeaves.length > 0}
                        onCheckedChange={selectAllLeaves}
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Select all {filteredLeaves.length} requests
                      </Label>
                    </div>

                    {/* Leave Requests List */}
                    {filteredLeaves.map((leave) => {
                      const leaveKey = getLeaveKey(leave);
                      const isSelected = selectedLeaves.includes(leave._id || leave.id || '');
                      
                      return (
                        <motion.div
                          key={leaveKey}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleLeaveSelection(leave._id || leave.id || '')}
                            />
                            
                            <div className="flex-1">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium">{leave.employeeName}</h3>
                                    <Badge variant={getStatusBadgeVariant(leave.status)}>
                                      {leave.status.toUpperCase()}
                                    </Badge>
                                    {leave.priority && leave.priority !== 'medium' && (
                                      <Badge variant={getPriorityBadgeVariant(leave.priority)}>
                                        {leave.priority.toUpperCase()}
                                      </Badge>
                                    )}
                                    {leave.escalationLevel && leave.escalationLevel > 0 && (
                                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                        <ShieldAlert className="h-3 w-3 mr-1" />
                                        Escalated
                                      </Badge>
                                    )}
                                    {selectedSite && (
                                      <Badge variant="outline" className="text-xs">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {selectedSite.name}
                                        {selectedSite.clientName && ` • ${selectedSite.clientName}`}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    <CalendarIcon className="inline mr-1 h-3 w-3" />
                                    {formatDate(leave.fromDate)} to {formatDate(leave.toDate)} ({leave.totalDays} days)
                                  </p>
                                  <div className="flex items-center gap-4 text-sm flex-wrap">
                                    <span className="text-muted-foreground flex items-center">
                                      <FileText className="mr-1 h-3 w-3" />
                                      <span className="font-medium capitalize">{leave.leaveType} Leave</span>
                                    </span>
                                    <span className="text-muted-foreground flex items-center">
                                      <Hash className="mr-1 h-3 w-3" />
                                      {leave.employeeId}
                                    </span>
                                    <span className="text-muted-foreground flex items-center">
                                      <Building className="mr-1 h-3 w-3" />
                                      {leave.department}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewLeave(leave)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {leave.status === 'pending' && (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleApproveLeave(leave._id || leave.id || '')}
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={!isOnline}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRejectLeave(leave._id || leave.id || '')}
                                        disabled={!isOnline}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="pt-2 border-t mt-2">
                                <p className="text-sm">
                                  <span className="font-medium">Reason:</span> {leave.reason}
                                </p>
                                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                  <span>Contact: {leave.contactNumber}</span>
                                  <span>Applied: {formatDate(leave.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Leaves Tab */}
          <TabsContent value="my-leaves" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>
                      My Leave Requests
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filteredMyLeaves.length} of your personal leave requests
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                      {filteredMyLeaves.length} personal requests
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant={myLeavesFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMyLeavesFilter('all')}
                        className={myLeavesFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                      >
                        All
                      </Button>
                      <Button
                        variant={myLeavesFilter === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMyLeavesFilter('pending')}
                        className={myLeavesFilter === 'pending' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={myLeavesFilter === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMyLeavesFilter('approved')}
                        className={myLeavesFilter === 'approved' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                      >
                        Approved
                      </Button>
                      <Button
                        variant={myLeavesFilter === 'rejected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMyLeavesFilter('rejected')}
                        className={myLeavesFilter === 'rejected' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                      >
                        Rejected
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredMyLeaves.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No Personal Leave Requests</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't applied for any personal leaves yet
                      </p>
                      <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Apply for My Leave
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMyLeaves.map((leave) => {
                      const leaveKey = getLeaveKey(leave);
                      return (
                        <motion.div
                          key={leaveKey}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border rounded-lg space-y-3 hover:border-purple-300 transition-colors bg-purple-50/50"
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium">Your Leave Request</h3>
                                <Badge variant={getStatusBadgeVariant(leave.status)}>
                                  {leave.status.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                                  Manager Leave
                                </Badge>
                                {leave.priority && leave.priority !== 'medium' && (
                                  <Badge variant={getPriorityBadgeVariant(leave.priority)}>
                                    {leave.priority.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <CalendarIcon className="inline mr-1 h-3 w-3" />
                                {formatDate(leave.fromDate)} to {formatDate(leave.toDate)} ({leave.totalDays} days)
                              </p>
                              <div className="flex items-center gap-4 text-sm flex-wrap">
                                <span className="text-muted-foreground flex items-center">
                                  <FileText className="mr-1 h-3 w-3" />
                                  <span className="font-medium capitalize">{leave.leaveType} Leave</span>
                                </span>
                                <span className="text-muted-foreground flex items-center">
                                  <Building className="mr-1 h-3 w-3" />
                                  {leave.department}
                                </span>
                                <span className="text-muted-foreground flex items-center">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Applied on {formatDate(leave.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewLeave(leave)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-sm">
                              <span className="font-medium">Reason:</span> {leave.reason}
                            </p>
                            {leave.handoverTo && (
                              <p className="text-sm mt-1">
                                <span className="font-medium">Handover to:</span> {leave.handoverTo}
                              </p>
                            )}
                            {leave.status === 'approved' && leave.approvedBy && (
                              <div className="mt-2 text-xs text-green-600">
                                Approved by {leave.approvedBy} on {formatDate(leave.approvedAt || '')}
                              </div>
                            )}
                            {leave.status === 'rejected' && leave.rejectedBy && (
                              <div className="mt-2 text-xs text-red-600">
                                Rejected by {leave.rejectedBy} on {formatDate(leave.rejectedAt || '')}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Leave Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Leave Request Details</DialogTitle>
              {selectedLeave?.isManagerLeave && (
                <div className="text-sm text-purple-600">
                  ⓘ This is a manager's personal leave request
                </div>
              )}
            </DialogHeader>
            {selectedLeave && (
              <div className="space-y-6">
                {/* Employee Information */}
                <div className={`p-4 rounded-lg space-y-3 ${selectedLeave.isManagerLeave ? 'bg-purple-50 border border-purple-200' : 'bg-muted/50'}`}>
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedLeave.isManagerLeave ? 'Manager Information' : 'Employee Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{selectedLeave.isManagerLeave ? 'Manager Name' : 'Employee Name'}</span>
                      </div>
                      <div className="font-medium">{selectedLeave.employeeName}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        <span>{selectedLeave.isManagerLeave ? 'Manager ID' : 'Employee ID'}</span>
                      </div>
                      <div className="font-medium">{selectedLeave.employeeId}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        <span>Department</span>
                      </div>
                      <div className="font-medium">{selectedLeave.department}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Contact Number</div>
                      <div className="font-medium">{selectedLeave.contactNumber}</div>
                    </div>
                    {selectedSite && (
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>Site</span>
                        </div>
                        <div className="font-medium">
                          {selectedSite.name}
                          {selectedSite.clientName && ` (${selectedSite.clientName})`}
                          {selectedSite.location && ` - ${selectedSite.location}`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Leave Details */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Leave Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Leave Type</div>
                      <div className="font-medium capitalize">{selectedLeave.leaveType} Leave</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getStatusBadgeVariant(selectedLeave.status)}>
                          {selectedLeave.status.toUpperCase()}
                        </Badge>
                        {selectedLeave.priority && selectedLeave.priority !== 'medium' && (
                          <Badge variant={getPriorityBadgeVariant(selectedLeave.priority)}>
                            {selectedLeave.priority.toUpperCase()}
                          </Badge>
                        )}
                        {selectedLeave.isManagerLeave && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                            Manager Leave
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>From Date</span>
                      </div>
                      <div className="font-medium">{formatDate(selectedLeave.fromDate)}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>To Date</span>
                      </div>
                      <div className="font-medium">{formatDate(selectedLeave.toDate)}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Total Days</span>
                      </div>
                      <div className="font-medium">{selectedLeave.totalDays} days</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Applied By</div>
                      <div className="font-medium">{selectedLeave.appliedBy}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Reason</div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      {selectedLeave.reason}
                    </div>
                  </div>
                  
                  {selectedLeave.handoverTo && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Handover Information</div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium">Handover to: {selectedLeave.handoverTo}</div>
                        {selectedLeave.handoverRemarks && (
                          <div className="text-sm mt-1">{selectedLeave.handoverRemarks}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Application Date</div>
                    <div className="font-medium">{formatDateTime(selectedLeave.createdAt)}</div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comments & Discussion
                  </h3>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto p-3 border rounded-lg">
                    {selectedLeave.comments && selectedLeave.comments.length > 0 ? (
                      selectedLeave.comments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                            <div className="font-medium">{comment.userName}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(comment.timestamp)}
                            </div>
                          </div>
                          <div className="mt-1 text-sm">{comment.comment}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {comment.userRole} • {comment.isManager ? 'Manager' : 'Employee'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No comments yet
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddComment} 
                      disabled={!commentText.trim() || isAddingComment}
                      className="w-full"
                    >
                      {isAddingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Add Comment
                    </Button>
                  </div>
                </div>

                {/* Action Buttons - Only for team leaves */}
                {selectedLeave.status === 'pending' && !selectedLeave.isManagerLeave && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setViewDialogOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => handleRejectLeave(selectedLeave._id || selectedLeave.id || '')}
                      disabled={!isOnline}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject Request
                    </Button>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApproveLeave(selectedLeave._id || selectedLeave.id || '')}
                      disabled={!isOnline}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve Request
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Actions Dialog */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Actions</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                You have selected {selectedLeaves.length} leave request(s).
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => handleBulkAction('approve')}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!isOnline}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve All Selected
                </Button>
                <Button 
                  onClick={() => handleBulkAction('reject')}
                  variant="destructive"
                  disabled={!isOnline}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject All Selected
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedLeaves([]);
                    setBulkDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Calendar View Dialog */}
        <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Leave Calendar View</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={(date) => date && setCalendarDate(date)}
                className="rounded-md border"
              />
              
              <div className="space-y-2">
                <h4 className="font-medium">Leaves for {format(calendarDate, 'MMMM yyyy')}</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getCalendarEventsForMonth()
                    .filter(day => day.events.length > 0)
                    .map(day => (
                      <div key={day.date.toISOString()} className="p-2 border rounded">
                        <div className="font-medium">{format(day.date, 'MMM d')}</div>
                        <div className="space-y-1 mt-1">
                          {day.events.map(event => (
                            <div key={event.id} className="text-sm p-1 rounded bg-muted">
                              {event.title} • {event.status}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Analytics Dialog */}
        <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Leave Analytics Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Monthly Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.monthlyTrend.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.monthlyTrend.map(item => (
                          <div key={item.month} className="flex justify-between">
                            <span>{item.month}</span>
                            <span className="font-medium">{item.leaves} leaves</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Leave Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.leaveTypeDistribution.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.leaveTypeDistribution.map(item => (
                          <div key={item.type} className="flex justify-between">
                            <span className="capitalize">{item.type}</span>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Approval Time Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.approvalTime.average.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.approvalTime.min}
                      </div>
                      <div className="text-sm text-muted-foreground">Min Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {analytics.approvalTime.max}
                      </div>
                      <div className="text-sm text-muted-foreground">Max Days</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delegation Dialog */}
        <Dialog open={delegationDialogOpen} onOpenChange={setDelegationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delegation Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {delegation && delegation.isActive ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <ShieldCheck className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium">Delegation Active</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div>To: {delegation.employeeName}</div>
                    <div>From: {formatDate(delegation.fromDate)}</div>
                    <div>To: {formatDate(delegation.toDate)}</div>
                  </div>
                  <Button variant="outline" className="w-full mt-3">
                    End Delegation
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Active Delegation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can delegate your approval authority to another employee for a specific period.
                  </p>
                  <Button>
                    <User className="mr-2 h-4 w-4" />
                    Setup Delegation
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default ManagerLeave;