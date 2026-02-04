import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Paperclip, 
  Download, 
  Eye, 
  Building, 
  User, 
  Calendar, 
  Clock, 
  Filter, 
  Loader2, 
  AlertCircle,
  Search,
  RefreshCw,
  FileText,
  Users,
  Check,
  X,
  Shield,
  Crown
} from "lucide-react";
import { toast } from "sonner";
import { LeaveRequest } from "./types";
import StatCard from "./StatCard";
import Pagination from "./Pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaveManagementTabProps {
  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
}

interface ApiLeaveRequest {
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
  managerRemarks?: string;
  emergencyContact?: string;
  handoverTo?: string;
  handoverCompleted?: boolean;
  handoverRemarks?: string;
  attachmentUrl?: string;
  requestType?: 'employee' | 'supervisor' | 'manager' | 'admin-leave';
  isManagerLeave?: boolean;
  managerId?: string;
  managerName?: string;
  managerDepartment?: string;
  managerContact?: string;
  managerEmail?: string;
  managerPosition?: string;
}

interface ApiAdminLeaveRequest {
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
  appliedDate: string;
  contactNumber?: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  superadminRemarks?: string;
  cancellationReason?: string;
  requestType: 'admin-leave';
  isManagerLeave?: boolean;
}

interface ApiManagerLeaveRequest {
  _id: string;
  id?: string;
  managerId: string;
  managerName: string;
  managerDepartment: string;
  managerPosition: string;
  managerEmail: string;
  managerContact: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  appliedBy: string;
  appliedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  superadminRemarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  requestType: 'manager-leave';
  isManagerLeave?: boolean;
}

const API_URL = `http://${window.location.hostname}:5001/api`;

const LeaveManagementTab = ({ leaveRequests, setLeaveRequests }: LeaveManagementTabProps) => {
  const [activeTab, setActiveTab] = useState<string>("supervisor-employee");
  
  // For supervisor/employee leaves
  const [supervisorEmployeeLeaves, setSupervisorEmployeeLeaves] = useState<ApiLeaveRequest[]>([]);
  const [supervisorEmployeeStats, setSupervisorEmployeeStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });
  
  // For manager/admin leaves
  const [managerAdminLeaves, setManagerAdminLeaves] = useState<(ApiManagerLeaveRequest | ApiAdminLeaveRequest)[]>([]);
  const [managerAdminStats, setManagerAdminStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<(ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest) | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // SIMPLIFIED: Fetch supervisor and employee leaves
  const fetchSupervisorEmployeeLeaves = async (page = 1) => {
    try {
      setIsLoading(true);
      
      // Fetch ALL leaves from regular endpoint
      const response = await fetch(`${API_URL}/leaves`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }
      
      const allLeaves = await response.json();
      
      // Filter client-side for supervisor/employee leaves (NOT manager leaves)
      const filteredLeaves = allLeaves.filter((leave: any) => {
        // Exclude manager leaves
        if (leave.isManagerLeave === true) return false;
        if (leave.requestType === 'manager-leave') return false;
        
        // Apply status filter
        if (statusFilter !== 'all' && leave.status !== statusFilter) return false;
        
        // Apply department filter
        if (departmentFilter !== 'all' && leave.department !== departmentFilter) return false;
        
        // Apply search filter
        if (searchQuery) {
          const matchesId = leave.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesName = leave.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchesId && !matchesName) return false;
        }
        
        return true;
      });
      
      // Apply pagination client-side
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);
      
      setSupervisorEmployeeLeaves(paginatedLeaves);
      
      // Calculate stats
      const stats = {
        total: filteredLeaves.length,
        pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
        approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
        rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
        cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
      };
      
      setSupervisorEmployeeStats(stats);
      setTotalItems(filteredLeaves.length);
      setTotalPages(Math.ceil(filteredLeaves.length / itemsPerPage));
      setCurrentPage(page);
      
    } catch (error) {
      console.error("Error fetching supervisor/employee leaves:", error);
      toast.error("Failed to load leave requests");
      setSupervisorEmployeeLeaves([]);
    } finally {
      setIsLoading(false);
    }
  };

// In LeaveManagementTab.tsx - update the fetchManagerAdminLeaves function:
const fetchManagerAdminLeaves = async (page = 1) => {
  try {
    setIsLoading(true);
    
    // Fetch manager leaves from the correct endpoint
    let managerLeaves: ApiManagerLeaveRequest[] = [];
    const managerResponse = await fetch(
      `${API_URL}/manager-leaves/superadmin/all?status=${
        statusFilter === 'all' ? '' : statusFilter
      }&page=${page}&limit=${itemsPerPage}`
    );
    
    if (managerResponse.ok) {
      const managerData = await managerResponse.json();
      console.log("📋 Manager leaves data:", managerData);
      if (managerData.success) {
        managerLeaves = managerData.leaves.map((leave: any) => ({
          ...leave,
          type: 'manager',
          // Ensure required fields exist
          appliedDate: leave.appliedDate || leave.createdAt,
          contactNumber: leave.managerContact || leave.contactNumber || 'N/A',
          employeeId: leave.managerId || leave.employeeId,
          employeeName: leave.managerName || leave.employeeName,
          department: leave.managerDepartment || leave.department
        }));
      }
    } else {
      console.warn("Could not fetch manager leaves, trying fallback...");
      // Fallback: Try to get manager leaves from regular leaves endpoint
      const leavesResponse = await fetch(`${API_URL}/leaves`);
      const allLeaves = leavesResponse.ok ? await leavesResponse.json() : [];
      managerLeaves = allLeaves
        .filter((leave: any) => leave.isManagerLeave === true)
        .map((leave: any) => ({
          ...leave,
          type: 'manager',
          managerId: leave.managerId || leave.employeeId,
          managerName: leave.managerName || leave.employeeName,
          managerDepartment: leave.managerDepartment || leave.department,
          managerContact: leave.managerContact || leave.contactNumber || 'N/A',
          appliedDate: leave.appliedDate || leave.createdAt
        }));
    }
    
    // Fetch admin leaves
    let adminLeaves: ApiAdminLeaveRequest[] = [];
    const adminResponse = await fetch(`${API_URL}/admin-leaves`);
    
    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      adminLeaves = (adminData.leaves || adminData || []).map((leave: any) => ({ 
        ...leave, 
        type: 'admin',
        appliedDate: leave.appliedDate || leave.createdAt,
        contactNumber: leave.contactNumber || 'N/A'
      }));
    }
    
    // Combine manager and admin leaves
    let combinedLeaves = [
      ...managerLeaves,
      ...adminLeaves
    ];
    
    // Apply search filter client-side
    if (searchQuery) {
      combinedLeaves = combinedLeaves.filter((leave: any) => 
        leave.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.managerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.managerId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply department filter for manager leaves
    if (departmentFilter !== 'all') {
      combinedLeaves = combinedLeaves.filter((leave: any) => {
        if (leave.type === 'manager') {
          return leave.managerDepartment === departmentFilter || leave.department === departmentFilter;
        }
        return true; // Admin leaves don't have departments
      });
    }
    
    // Calculate stats
    const stats = {
      total: combinedLeaves.length,
      pending: combinedLeaves.filter((l: any) => l.status === 'pending').length,
      approved: combinedLeaves.filter((l: any) => l.status === 'approved').length,
      rejected: combinedLeaves.filter((l: any) => l.status === 'rejected').length,
      cancelled: combinedLeaves.filter((l: any) => l.status === 'cancelled').length
    };
    
    setManagerAdminLeaves(combinedLeaves);
    setManagerAdminStats(stats);
    setTotalItems(combinedLeaves.length);
    setTotalPages(Math.ceil(combinedLeaves.length / itemsPerPage));
    setCurrentPage(page);
    
  } catch (error) {
    console.error("Error fetching manager/admin leaves:", error);
    toast.error("Failed to load manager/admin leaves");
    setManagerAdminLeaves([]);
  } finally {
    setIsLoading(false);
  }
};

  // Helper function to determine if a leave is from a manager
  const isManagerLeave = (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest): boolean => {
    if ('requestType' in leave && leave.requestType === 'manager-leave') {
      return true;
    }
    
    return (
      leave.isManagerLeave === true ||
      ('managerName' in leave && leave.managerName) ||
      ('managerId' in leave && leave.managerId) ||
      (leave.appliedBy && leave.appliedBy.toLowerCase().includes('manager')) ||
      (leave.employeeName && leave.employeeName.toLowerCase().includes('manager')) ||
      (leave.department && leave.department.toLowerCase().includes('management'))
    );
  };

  // Helper function to determine if a leave is from an admin
  const isAdminLeave = (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest): boolean => {
    return 'requestType' in leave && leave.requestType === 'admin-leave';
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(1);
    } else if (activeTab === "manager-admin") {
      fetchManagerAdminLeaves(1);
    }
  }, [activeTab, statusFilter, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(page);
    } else if (activeTab === "manager-admin") {
      fetchManagerAdminLeaves(page);
    }
  };

  const handleLeaveAction = async (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest, action: "approved" | "rejected") => {
    try {
      setIsUpdating(true);
      setSelectedLeave(leave);
      
      let response;
      let endpoint = '';
      let requestBody = {};
      
      const leaveId = leave._id || leave.id || '';
      
      // Determine which endpoint to call based on leave type
      if (isAdminLeave(leave)) {
        // This is an admin leave
        endpoint = `${API_URL}/admin-leaves/superadmin/${leaveId}/status`;
        requestBody = {
          status: action,
          [action === 'approved' ? 'approvedBy' : 'rejectedBy']: 'Super Admin',
          superadminRemarks: remarks || `${action} by super admin`
        };
      } else if (isManagerLeave(leave)) {
        // This is a manager leave
        endpoint = `${API_URL}/manager-leaves/superadmin/${leaveId}/status`;
        requestBody = {
          status: action,
          [action === 'approved' ? 'approvedBy' : 'rejectedBy']: 'Super Admin',
          superadminRemarks: remarks || `${action} by super admin`
        };
      } else {
        // This is a regular employee/supervisor leave
        endpoint = `${API_URL}/leaves/${leaveId}/status`;
        requestBody = { 
          status: action,
          managerName: 'Super Admin',
          remarks: remarks || `${action} by super admin`
        };
      }

      console.log(`Updating leave at ${endpoint}`, requestBody);
      
      response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update leave status';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Update local state based on active tab
      if (activeTab === "supervisor-employee") {
        setSupervisorEmployeeLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              return { 
                ...l, 
                status: action,
                approvedBy: action === 'approved' ? 'Super Admin' : undefined,
                rejectedBy: action === 'rejected' ? 'Super Admin' : undefined,
                approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
                rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined,
                remarks: remarks || `${action} by super admin`
              };
            }
            return l;
          })
        );
        
        // Update stats
        setSupervisorEmployeeStats(prev => {
          const newStats = { ...prev };
          if (action === 'approved') {
            newStats.approved++;
            newStats.pending--;
          } else if (action === 'rejected') {
            newStats.rejected++;
            newStats.pending--;
          }
          return newStats;
        });
      } else if (activeTab === "manager-admin") {
        setManagerAdminLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              const updatedLeave = { 
                ...l, 
                status: action,
                approvedBy: action === 'approved' ? 'Super Admin' : undefined,
                rejectedBy: action === 'rejected' ? 'Super Admin' : undefined,
                approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
                rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined
              };
              
              // Add remarks based on leave type
              if (isAdminLeave(l)) {
                (updatedLeave as ApiAdminLeaveRequest).superadminRemarks = remarks || `${action} by super admin`;
              } else if (isManagerLeave(l)) {
                (updatedLeave as ApiManagerLeaveRequest).superadminRemarks = remarks || `${action} by super admin`;
              } else {
                (updatedLeave as ApiLeaveRequest).remarks = remarks || `${action} by super admin`;
              }
              
              return updatedLeave;
            }
            return l;
          })
        );
        
        // Update stats
        setManagerAdminStats(prev => {
          const newStats = { ...prev };
          if (action === 'approved') {
            newStats.approved++;
            newStats.pending--;
          } else if (action === 'rejected') {
            newStats.rejected++;
            newStats.pending--;
          }
          return newStats;
        });
      }

      toast.success(data.message || `Leave request ${action} successfully!`);
      setViewDialogOpen(false);
      setRemarks("");
      
      // Refresh the list
      if (activeTab === "supervisor-employee") {
        fetchSupervisorEmployeeLeaves(currentPage);
      } else if (activeTab === "manager-admin") {
        fetchManagerAdminLeaves(currentPage);
      }
    } catch (error: any) {
      console.error("Error updating leave status:", error);
      toast.error(error.message || "Failed to update leave status");
    } finally {
      setIsUpdating(false);
      setSelectedLeave(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "approved": return "default";
      case "rejected": return "destructive";
      case "pending": return "secondary";
      case "cancelled": return "outline";
      default: return "outline";
    }
  };

  const getRequestTypeBadge = (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest) => {
    if (isAdminLeave(leave)) {
      return (
        <Badge variant="default" className="bg-purple-600">
          <Crown className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    
    if (isManagerLeave(leave)) {
      return (
        <Badge variant="default" className="bg-blue-600">
          <Shield className="h-3 w-3 mr-1" />
          Manager
        </Badge>
      );
    }
    
    // Check if it's a supervisor
    const isSupervisor = 
      (leave.appliedBy && leave.appliedBy.toLowerCase().includes('supervisor')) ||
      (leave.employeeName && leave.employeeName.toLowerCase().includes('supervisor'));
    
    if (isSupervisor) {
      return (
        <Badge variant="default" className="bg-green-600">
          <User className="h-3 w-3 mr-1" />
          Supervisor
        </Badge>
      );
    }
    
    // Default to employee
    return (
      <Badge variant="default" className="bg-gray-600">
        <Users className="h-3 w-3 mr-1" />
        Employee
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
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

  const handleViewDetails = (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest) => {
    setSelectedLeave(leave);
    setRemarks(
      isAdminLeave(leave) 
        ? (leave as ApiAdminLeaveRequest).superadminRemarks || "" 
        : isManagerLeave(leave)
        ? (leave as ApiManagerLeaveRequest).superadminRemarks || ""
        : (leave as ApiLeaveRequest).remarks || ""
    );
    setViewDialogOpen(true);
  };

  const handleClearFilters = () => {
    setDepartmentFilter('all');
    setStatusFilter('pending');
    setSearchQuery('');
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(1);
    } else if (activeTab === "manager-admin") {
      fetchManagerAdminLeaves(1);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(1);
    } else if (activeTab === "manager-admin") {
      fetchManagerAdminLeaves(1);
    }
  };

  const handleRefresh = () => {
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(1);
    } else if (activeTab === "manager-admin") {
      fetchManagerAdminLeaves(1);
    }
  };

  // Get current data based on active tab
  const getCurrentLeaves = () => {
    if (activeTab === "supervisor-employee") {
      return supervisorEmployeeLeaves;
    } else if (activeTab === "manager-admin") {
      return managerAdminLeaves;
    }
    return [];
  };

  // Get current stats based on active tab
  const getCurrentStats = () => {
    if (activeTab === "supervisor-employee") {
      return supervisorEmployeeStats;
    } else if (activeTab === "manager-admin") {
      return managerAdminStats;
    }
    return { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  };

  // Get display name for leave
  const getDisplayName = (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest) => {
    if (isManagerLeave(leave) && 'managerName' in leave) {
      return leave.managerName;
    }
    return leave.employeeName || 'N/A';
  };

  // Get display ID for leave
  const getDisplayId = (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest) => {
    if (isManagerLeave(leave) && 'managerId' in leave) {
      return leave.managerId;
    }
    return leave.employeeId || 'N/A';
  };

  // Get display department for leave
  const getDisplayDepartment = (leave: ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest) => {
    if (isManagerLeave(leave) && 'managerDepartment' in leave) {
      return leave.managerDepartment;
    }
    return leave.department || 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Tabs for switching between leave types */}
      <Tabs defaultValue="supervisor-employee" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="supervisor-employee" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Supervisor & Employee Leaves
            <Badge variant="secondary" className="ml-2">
              {supervisorEmployeeStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="manager-admin" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Manager & Admin Leaves
            <Badge variant="secondary" className="ml-2">
              {managerAdminStats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Supervisor/Employee Leaves Tab Content */}
        <TabsContent value="supervisor-employee" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard 
              title="Total Requests" 
              value={supervisorEmployeeStats.total}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard 
              title="Pending" 
              value={supervisorEmployeeStats.pending} 
              className="text-yellow-600" 
              icon={<AlertCircle className="h-4 w-4" />}
            />
            <StatCard 
              title="Approved" 
              value={supervisorEmployeeStats.approved} 
              className="text-green-600" 
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <StatCard 
              title="Rejected" 
              value={supervisorEmployeeStats.rejected} 
              className="text-red-600" 
              icon={<XCircle className="h-4 w-4" />}
            />
            <StatCard 
              title="Cancelled" 
              value={supervisorEmployeeStats.cancelled} 
              className="text-gray-600" 
              icon={<XCircle className="h-4 w-4" />}
            />
          </div>
        </TabsContent>

        {/* Manager/Admin Leaves Tab Content */}
        <TabsContent value="manager-admin" className="space-y-6">
          {/* Stats Cards for Manager/Admin Leaves */}
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard 
              title="Total Requests" 
              value={managerAdminStats.total}
              icon={<Shield className="h-4 w-4" />}
            />
            <StatCard 
              title="Pending" 
              value={managerAdminStats.pending} 
              className="text-yellow-600" 
              icon={<AlertCircle className="h-4 w-4" />}
            />
            <StatCard 
              title="Approved" 
              value={managerAdminStats.approved} 
              className="text-green-600" 
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <StatCard 
              title="Rejected" 
              value={managerAdminStats.rejected} 
              className="text-red-600" 
              icon={<XCircle className="h-4 w-4" />}
            />
            <StatCard 
              title="Cancelled" 
              value={managerAdminStats.cancelled} 
              className="text-gray-600" 
              icon={<XCircle className="h-4 w-4" />}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>
              {activeTab === "supervisor-employee" 
                ? "Supervisor & Employee Leave Requests" 
                : "Manager & Admin Leave Requests"}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder={
                  activeTab === "supervisor-employee" 
                    ? "Search by Employee ID or Name..." 
                    : "Search by Manager/Admin Name..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTab === "supervisor-employee" && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Consumables Management">Consumables Management</SelectItem>
                      <SelectItem value="Housekeeping Management">Housekeeping Management</SelectItem>
                      <SelectItem value="Security Management">Security Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTab === "manager-admin" && (
                <div className="space-y-2">
                  <Label htmlFor="department">Manager Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Consumables Management">Consumables Management</SelectItem>
                      <SelectItem value="Housekeeping Management">Housekeeping Management</SelectItem>
                      <SelectItem value="Security Management">Security Management</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="all">All Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>
              {activeTab === "supervisor-employee" 
                ? "Supervisor & Employee Leave Requests" 
                : "Manager & Admin Leave Requests"}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {getCurrentLeaves().length} of {totalItems} requests
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : getCurrentLeaves().length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No Leave Requests Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCurrentLeaves().map((leave) => (
                      <TableRow key={leave._id || leave.id}>
                        <TableCell>
                          {getRequestTypeBadge(leave)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{getDisplayName(leave)}</span>
                            <span className="text-xs text-muted-foreground">
                              ID: {getDisplayId(leave)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Applied by: {leave.appliedBy || 'N/A'}
                            </span>
                            {isManagerLeave(leave) && (
                              <span className="text-xs text-blue-600 font-medium">
                                Manager Leave
                              </span>
                            )}
                            {isAdminLeave(leave) && (
                              <span className="text-xs text-purple-600 font-medium">
                                Admin Leave
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {getDisplayDepartment(leave)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {leave.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{formatDate(leave.fromDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{formatDate(leave.toDate)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {leave.totalDays} days
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(leave.status)} className="capitalize">
                            {leave.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewDetails(leave)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                        
                            {leave.status === "pending" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleLeaveAction(leave, "approved")}
                                  disabled={isUpdating}
                                >
                                  {isUpdating && selectedLeave && (selectedLeave._id || selectedLeave.id) === (leave._id || leave.id) ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="mr-1 h-3 w-3" />
                                  )}
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleLeaveAction(leave, "rejected")}
                                  disabled={isUpdating}
                                >
                                  {isUpdating && selectedLeave && (selectedLeave._id || selectedLeave.id) === (leave._id || leave.id) ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="mr-1 h-3 w-3" />
                                  )}
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Leave Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedLeave && isAdminLeave(selectedLeave) 
                ? "Admin Leave Request Details" 
                : selectedLeave && isManagerLeave(selectedLeave)
                ? "Manager Leave Request Details"
                : "Leave Request Details"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="space-y-6">
              {/* Header with basic info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-lg">{getDisplayName(selectedLeave)}</h3>
                    {getRequestTypeBadge(selectedLeave)}
                    <Badge variant={getStatusColor(selectedLeave.status)} className="capitalize">
                      {selectedLeave.status}
                    </Badge>
                    {isManagerLeave(selectedLeave) && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        Manager
                      </Badge>
                    )}
                    {isAdminLeave(selectedLeave) && (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>ID: {getDisplayId(selectedLeave)}</span>
                    <span>Dept: {getDisplayDepartment(selectedLeave)}</span>
                    <span>Applied by: {selectedLeave.appliedBy || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Leave Dates
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.fromDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.toDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Days:</span>
                        <span className="font-medium">{selectedLeave.totalDays} days</span>
                      </div>
                      {'appliedDate' in selectedLeave && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Applied Date:</span>
                          <span className="font-medium">{formatDate(selectedLeave.appliedDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manager Specific Info */}
                  {isManagerLeave(selectedLeave) && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Manager Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Manager ID:</span>
                          <span className="font-medium">{getDisplayId(selectedLeave)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Position:</span>
                          <span className="font-medium">{'managerPosition' in selectedLeave ? selectedLeave.managerPosition : 'Manager'}</span>
                        </div>
                        {'managerContact' in selectedLeave && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Contact:</span>
                            <span className="font-medium">{selectedLeave.managerContact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Leave Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Leave Type:</span>
                        <Badge variant="outline" className="capitalize">
                          {selectedLeave.leaveType}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Applied Date:</span>
                        <span className="font-medium">
                          {'appliedDate' in selectedLeave 
                            ? formatDate(selectedLeave.appliedDate) 
                            : formatDate(selectedLeave.createdAt)}
                        </span>
                      </div>
                      {'approvedBy' in selectedLeave && selectedLeave.approvedBy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Approved By:</span>
                          <span className="font-medium">{selectedLeave.approvedBy}</span>
                        </div>
                      )}
                      {'rejectedBy' in selectedLeave && selectedLeave.rejectedBy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rejected By:</span>
                          <span className="font-medium">{selectedLeave.rejectedBy}</span>
                        </div>
                      )}
                      {isManagerLeave(selectedLeave) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Leave Category:</span>
                          <span className="font-medium text-blue-600">Manager Leave</span>
                        </div>
                      )}
                      {isAdminLeave(selectedLeave) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Leave Category:</span>
                          <span className="font-medium text-purple-600">Admin Leave</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason Section */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Reason for Leave</h4>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    {selectedLeave.reason || 'No reason provided'}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Requests */}
              {selectedLeave.status === "pending" && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                    <Textarea
                      id="remarks"
                      placeholder="Add remarks for approval/rejection..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setViewDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => handleLeaveAction(selectedLeave, "rejected")}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Reject Request
                    </Button>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleLeaveAction(selectedLeave, "approved")}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Approve Request
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagementTab;