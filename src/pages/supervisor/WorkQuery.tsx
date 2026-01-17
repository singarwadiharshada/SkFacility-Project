import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  Plus, 
  Upload, 
  FileText, 
  Image, 
  Video, 
  X, 
  Eye, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  MessageCircle, 
  Paperclip, 
  User, 
  Sparkles,
  Trash2,
  Car,
  Shield,
  Wrench,
  Download,
  Calendar,
  MapPin,
  Filter,
  RefreshCw,
  MoreVertical,
  Loader2,
  AlertTriangle,
  File
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useWorkQuery } from "@/hooks/useWorkQuery";
import { format } from "date-fns";
import { useRole } from "@/context/RoleContext";

// Types matching the API
interface WorkQueryProofFile {
  name: string;
  type: 'image' | 'video' | 'document' | 'other';
  url: string;
  public_id: string;
  size: string;
  format?: string;
  bytes?: number;
  uploadDate: string;
}

interface WorkQuery {
  _id: string;
  queryId: string;
  title: string;
  description: string;
  type: 'service' | 'task';
  serviceId?: string;
  serviceTitle?: string;
  serviceType?: string;
  serviceStaffId?: string;
  serviceStaffName?: string;
  employeeId?: string;
  employeeName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  category: string;
  proofFiles: WorkQueryProofFile[];
  reportedBy: {
    userId: string;
    name: string;
    role: string;
  };
  assignedTo?: {
    userId: string;
    name: string;
    role: string;
  };
  supervisorId: string;
  supervisorName: string;
  superadminResponse?: string;
  responseDate?: string;
  comments: Array<{
    userId: string;
    name: string;
    comment: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Fix: Use the API Service type directly
interface Service {
  _id: string;
  serviceId: string;
  type: string;
  title: string;
  description: string;
  location: string;
  assignedTo: string;
  assignedToName: string;
  status: string;
  schedule: string;
  supervisorId: string;
}

// Helper function to safely convert string to service type
const getServiceType = (type: string): 'cleaning' | 'waste-management' | 'parking-management' | 'security' | 'maintenance' => {
  switch(type.toLowerCase()) {
    case 'cleaning':
    case 'waste-management':
    case 'parking-management':
    case 'security':
    case 'maintenance':
      return type.toLowerCase() as any;
    default:
      return 'cleaning'; // default fallback
  }
};

// Fallback static data for dropdowns (in case API fails)
const FALLBACK_CATEGORIES = [
  { value: "service-quality", label: "Service Quality Issue", description: "Issues with the quality of service provided" },
  { value: "service-delay", label: "Service Delay", description: "Services not completed on time" },
  { value: "safety-issue", label: "Safety Issue", description: "Safety concerns or violations" },
  { value: "equipment-failure", label: "Equipment Failure", description: "Equipment not working properly" },
  { value: "staff-behavior", label: "Staff Behavior", description: "Issues with staff conduct or behavior" },
  { value: "cleanliness", label: "Cleanliness Issue", description: "Poor cleaning or maintenance" },
  { value: "communication", label: "Communication Issue", description: "Poor communication from service staff" },
  { value: "other", label: "Other", description: "Other types of issues" }
];

const FALLBACK_PRIORITIES = [
  { value: "low", label: "Low Priority", description: "Minor issue, can be addressed later", color: "green" },
  { value: "medium", label: "Medium Priority", description: "Standard issue, address within 24-48 hours", color: "yellow" },
  { value: "high", label: "High Priority", description: "Urgent issue, address within 24 hours", color: "orange" },
  { value: "critical", label: "Critical Priority", description: "Critical issue, address immediately", color: "red" }
];

const FALLBACK_STATUSES = [
  { value: "pending", label: "Pending", description: "Query submitted, awaiting review", color: "yellow" },
  { value: "in-progress", label: "In Progress", description: "Query is being investigated", color: "blue" },
  { value: "resolved", label: "Resolved", description: "Query has been resolved", color: "green" },
  { value: "rejected", label: "Rejected", description: "Query was rejected", color: "red" }
];

const FALLBACK_SERVICE_TYPES = [
  { value: "cleaning", label: "Cleaning Service", icon: "sparkles", color: "blue" },
  { value: "waste-management", label: "Waste Management", icon: "trash-2", color: "green" },
  { value: "parking-management", label: "Parking Management", icon: "car", color: "purple" },
  { value: "security", label: "Security Service", icon: "shield", color: "orange" },
  { value: "maintenance", label: "Maintenance", icon: "wrench", color: "red" }
];

const FALLBACK_SERVICES = [
  {
    _id: '1',
    serviceId: 'CLEAN001',
    type: 'cleaning',
    title: 'Office Floor Deep Cleaning',
    description: 'Complete deep cleaning of office floor',
    location: 'Floor 3',
    assignedTo: 'STAFF001',
    assignedToName: 'Ramesh Kumar',
    status: 'in-progress',
    schedule: '2024-02-15T09:00:00',
    supervisorId: 'SUP001'
  },
  {
    _id: '2',
    serviceId: 'WASTE001',
    type: 'waste-management',
    title: 'Biomedical Waste Collection',
    description: 'Urgent collection and disposal',
    location: 'Clinic Wing',
    assignedTo: 'STAFF002',
    assignedToName: 'Suresh Patel',
    status: 'pending',
    schedule: '2024-02-15T14:00:00',
    supervisorId: 'SUP001'
  },
  {
    _id: '3',
    serviceId: 'PARK001',
    type: 'parking-management',
    title: 'Parking Lot Management',
    description: 'Parking slot allocation and management',
    location: 'Main Parking Lot',
    assignedTo: 'STAFF003',
    assignedToName: 'Anil Sharma',
    status: 'completed',
    schedule: '2024-02-14T10:00:00',
    supervisorId: 'SUP001'
  }
];

// Reusable Components
const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles = {
    low: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200"
  };

  const icons = {
    low: <CheckCircle className="h-3 w-3" />,
    medium: <Clock className="h-3 w-3" />,
    high: <AlertCircle className="h-3 w-3" />,
    critical: <AlertCircle className="h-3 w-3" />
  };

  return (
    <Badge variant="outline" className={`${styles[priority as keyof typeof styles]} flex items-center gap-1`}>
      {icons[priority as keyof typeof icons]}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };

  const icons = {
    pending: <Clock className="h-3 w-3" />,
    "in-progress": <AlertCircle className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />,
    rejected: <X className="h-3 w-3" />
  };

  return (
    <Badge variant="outline" className={`${styles[status as keyof typeof styles]} flex items-center gap-1`}>
      {icons[status as keyof typeof icons]}
      {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
    </Badge>
  );
};

const ServiceTypeBadge = ({ type }: { type: string }) => {
  const styles = {
    cleaning: "bg-blue-100 text-blue-800 border-blue-200",
    "waste-management": "bg-green-100 text-green-800 border-green-200",
    "parking-management": "bg-purple-100 text-purple-800 border-purple-200",
    "security": "bg-orange-100 text-orange-800 border-orange-200",
    "maintenance": "bg-red-100 text-red-800 border-red-200"
  };

  const icons = {
    cleaning: Sparkles,
    "waste-management": Trash2,
    "parking-management": Car,
    "security": Shield,
    "maintenance": Wrench
  };

  const safeType = getServiceType(type);
  const Icon = icons[safeType];

  return (
    <Badge variant="outline" className={`${styles[safeType]} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {safeType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
    </Badge>
  );
};

const FileIcon = ({ type }: { type: string }) => {
  const icons = {
    image: <Image className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    other: <Paperclip className="h-4 w-4" />
  };

  return icons[type as keyof typeof icons] || <Paperclip className="h-4 w-4" />;
};

const FilePreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const getFileType = (fileType: string): "image" | "video" | "document" | "other" => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return 'document';
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fileType = getFileType(file.type);

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg border">
          <FileIcon type={fileType} />
        </div>
        <div>
          <div className="font-medium text-sm truncate max-w-xs">{file.name}</div>
          <div className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} • {fileType.charAt(0).toUpperCase() + fileType.slice(1)}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

// Main Component
const WorkQueryPage = () => {
  const { user, role, isAuthenticated, loading: authLoading } = useRole();
  
  // Check if user is a supervisor
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || role !== 'supervisor')) {
      toast.error("Access denied. Only supervisors can access this page.");
    }
  }, [isAuthenticated, role, authLoading]);

  // Get supervisor information from logged in user
  const supervisorId = user?._id || user?.id || "SUP001";
  const supervisorName = user?.name || "Supervisor User";
  
  const {
    workQueries,
    services,
    statistics,
    categories,
    serviceTypes,
    priorities,
    statuses,
    loading,
    createWorkQuery,
    deleteWorkQuery,
    fetchWorkQueries,
    fetchServices,
    fetchStatistics,
    validateFile,
    downloadFile,
    previewFile,
    pagination,
    changePage,
    changeLimit
  } = useWorkQuery({
    supervisorId,
    autoFetch: true,
    initialFilters: {
      page: 1,
      limit: 10
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedQueryForView, setSelectedQueryForView] = useState<WorkQuery | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // New query form state
  const [newQuery, setNewQuery] = useState({
    title: "",
    description: "",
    serviceId: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    category: "service-quality",
    supervisorId: supervisorId,
    supervisorName: supervisorName
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Use fallback data if API data is empty
  const displayCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const displayPriorities = priorities.length > 0 ? priorities : FALLBACK_PRIORITIES;
  const displayStatuses = statuses.length > 0 ? statuses : FALLBACK_STATUSES;
  const displayServiceTypes = serviceTypes.length > 0 ? serviceTypes : FALLBACK_SERVICE_TYPES;
  const displayServices = services.length > 0 ? services : FALLBACK_SERVICES;

  // Debug log
  useEffect(() => {
    console.log('📊 Data state:', {
      categories: categories,
      priorities: priorities,
      statuses: statuses,
      serviceTypes: serviceTypes,
      services: services,
      displayCategories,
      displayPriorities,
      displayStatuses,
      displayServiceTypes,
      displayServices
    });
  }, [categories, priorities, statuses, serviceTypes, services]);

  // Update newQuery when supervisor data changes
  useEffect(() => {
    if (supervisorId && supervisorName) {
      setNewQuery(prev => ({
        ...prev,
        supervisorId,
        supervisorName
      }));
    }
  }, [supervisorId, supervisorName]);

  // Filter work queries
  const filteredQueries = workQueries.filter(query => {
    const matchesSearch = 
      query.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.queryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || query.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || query.priority === priorityFilter;
    const matchesServiceType = serviceTypeFilter === "all" || query.serviceType === serviceTypeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesServiceType;
  });

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const invalidFiles: string[] = [];
    
    // Validate each file
    newFiles.forEach(file => {
      if (!validateFile(file)) {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`Invalid files: ${invalidFiles.join(', ')}. Allowed: Images, Videos, PDFs, Docs (Max 25MB)`);
      return;
    }

    // Check total files count (max 10 files)
    if (uploadedFiles.length + newFiles.length > 10) {
      toast.error("Maximum 10 files allowed per query");
      return;
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} file(s) uploaded successfully`);
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    if (!serviceId) {
      setSelectedService(null);
      setNewQuery(prev => ({ ...prev, serviceId: "" }));
      return;
    }
    
    const service = displayServices.find(s => s.serviceId === serviceId);
    setSelectedService(service || null);
    setNewQuery(prev => ({ ...prev, serviceId }));
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    // Reset form with a small delay to avoid UI flickering
    setTimeout(() => {
      setNewQuery({
        title: "",
        description: "",
        serviceId: "",
        priority: "medium",
        category: "service-quality",
        supervisorId,
        supervisorName
      });
      setUploadedFiles([]);
      setSelectedService(null);
    }, 300);
  };

  // Handle form submission
  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated as supervisor
    if (!isAuthenticated || role !== 'supervisor') {
      toast.error("You must be logged in as a supervisor to create a work query");
      return;
    }

    // Validate required fields
    if (!newQuery.title.trim()) {
      toast.error("Please enter a query title");
      return;
    }

    if (!newQuery.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!newQuery.serviceId) {
      toast.error("Please select a service");
      return;
    }

    if (!selectedService) {
      toast.error("Please select a valid service");
      return;
    }

    try {
      const result = await createWorkQuery({
        ...newQuery,
        serviceTitle: selectedService.title,
        serviceTeam: selectedService.type
      }, uploadedFiles);
      
      if (result.success) {
        toast.success("Work query created successfully!");
        handleDialogClose();
      } else {
        toast.error(result.error || "Failed to create work query");
      }
    } catch (error) {
      console.error("Error creating work query:", error);
      toast.error("Failed to create work query. Please try again.");
    }
  };

  // Handle delete query
  const handleDeleteQuery = async (queryId: string, queryTitle: string) => {
    try {
      const result = await deleteWorkQuery(queryId);
      
      if (result.success) {
        toast.success(`Work query "${queryTitle}" deleted successfully`);
      } else {
        toast.error(result.error || "Failed to delete work query");
      }
    } catch (error) {
      console.error("Error deleting work query:", error);
      toast.error("Failed to delete work query. Please try again.");
    }
  };

  // Handle view query details
  const handleViewQuery = (query: WorkQuery) => {
    setSelectedQueryForView(query);
    setIsViewDialogOpen(true);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchWorkQueries();
    fetchServices();
    fetchStatistics();
    toast.success("Data refreshed successfully");
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not a supervisor
  if (!isAuthenticated || role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Only supervisors can access the Work Query Management page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">
              Please log in with a supervisor account to continue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        title="Work Query Management" 
        subtitle={`Report and track issues with facility services - ${supervisorName}`}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 space-y-6"
      >
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading.statistics ? "Loading..." : statistics?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">All queries</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {loading.statistics ? "..." : statistics?.statusCounts?.pending || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading.statistics ? "..." : statistics?.statusCounts?.['in-progress'] || 0}
              </div>
              <p className="text-xs text-muted-foreground">Being investigated</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading.statistics ? "..." : statistics?.statusCounts?.resolved || 0}
              </div>
              <p className="text-xs text-muted-foreground">Completed queries</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Work Queries</CardTitle>
                <CardDescription>
                  Manage and track issues with facility services
                </CardDescription>
              </div>
             <div className="flex flex-wrap gap-2">
  <Button variant="outline" onClick={handleRefresh} disabled={loading.queries}>
    <RefreshCw className={`h-4 w-4 mr-2 ${loading.queries ? 'animate-spin' : ''}`} />
    Refresh
  </Button>
  
  {/* Fixed: Removed disabled prop from New Query button */}
  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
    <DialogTrigger asChild>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        New Query
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Work Query</DialogTitle>
        <DialogDescription>
          Report an issue with a facility service
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmitQuery} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Query Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Query Title *</Label>
              <Input
                id="title"
                value={newQuery.title}
                onChange={(e) => setNewQuery(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the issue"
                required
                disabled={loading.creating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={newQuery.category} 
                onValueChange={(value) => setNewQuery(prev => ({ ...prev, category: value }))}
                disabled={loading.creating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category">
                    {displayCategories.find(c => c.value === newQuery.category)?.label || "Select category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {displayCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex flex-col">
                        <span>{category.label}</span>
                        {category.description && (
                          <span className="text-xs text-muted-foreground">
                            {category.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              value={newQuery.description}
              onChange={(e) => setNewQuery(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Provide detailed information about the issue..."
              rows={4}
              required
              disabled={loading.creating}
            />
          </div>
        </div>

        {/* Service Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Related Service</h3>
          
          <div className="space-y-2">
            <Label htmlFor="service">Select Service *</Label>
            <Select 
              value={newQuery.serviceId} 
              onValueChange={handleServiceSelect}
              disabled={loading.creating || loading.services}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a service">
                  {selectedService ? selectedService.title : "Select a service"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {displayServices.length > 0 ? (
                  displayServices.map(service => (
                    <SelectItem key={service.serviceId} value={service.serviceId}>
                      <div className="flex flex-col">
                        <span>{service.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {service.serviceId} • {service.type}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mx-auto mb-1" />
                    <span>No services available</span>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Service Details */}
          {selectedService && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Service Details</Label>
                <ServiceTypeBadge type={selectedService.type} />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span><strong>Location:</strong> {selectedService.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span><strong>Assigned To:</strong> {selectedService.assignedToName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span><strong>Schedule:</strong> {formatDate(selectedService.schedule)}</span>
                </div>
                <div>
                  <strong>Description:</strong> {selectedService.description}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority Level *</Label>
          <Select 
            value={newQuery.priority} 
            onValueChange={(value) => setNewQuery(prev => ({ ...prev, priority: value as any }))}
            disabled={loading.creating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority">
                {displayPriorities.find(p => p.value === newQuery.priority)?.label || "Select priority"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {displayPriorities.map(priority => (
                <SelectItem key={priority.value} value={priority.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      priority.value === 'low' ? 'bg-green-500' :
                      priority.value === 'medium' ? 'bg-yellow-500' :
                      priority.value === 'high' ? 'bg-orange-500' : 'bg-red-500'
                    }`} />
                    <div className="flex flex-col">
                      <span>{priority.label}</span>
                      {priority.description && (
                        <span className="text-xs text-muted-foreground">
                          {priority.description}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Supporting Evidence</h3>
          
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Upload screenshots, photos, documents, or other proof (Max 10 files, 25MB each)
            </p>
            <Input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
              disabled={loading.creating}
            />
            <Label htmlFor="file-upload">
              <Button 
                variant="outline" 
                className="mt-4" 
                type="button"
                disabled={loading.creating}
              >
                Choose Files
              </Button>
            </Label>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <Label>Uploaded Files ({uploadedFiles.length}/10)</Label>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <FilePreview 
                    key={index} 
                    file={file} 
                    onRemove={() => handleRemoveFile(index)} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsCreateDialogOpen(false)}
            className="flex-1"
            disabled={loading.creating}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={loading.creating}
          >
            {loading.creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : "Submit Query"}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search queries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status">
                      {statusFilter === "all" ? "All Status" : displayStatuses.find(s => s.value === statusFilter)?.label || statusFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {displayStatuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            status.value === 'pending' ? 'bg-yellow-500' :
                            status.value === 'in-progress' ? 'bg-blue-500' :
                            status.value === 'resolved' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="flex flex-col">
                            <span>{status.label}</span>
                            {status.description && (
                              <span className="text-xs text-muted-foreground">
                                {status.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types">
                      {serviceTypeFilter === "all" ? "All Types" : displayServiceTypes.find(t => t.value === serviceTypeFilter)?.label || serviceTypeFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {displayServiceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.value === 'cleaning' && <Sparkles className="h-4 w-4 text-blue-600" />}
                          {type.value === 'waste-management' && <Trash2 className="h-4 w-4 text-green-600" />}
                          {type.value === 'parking-management' && <Car className="h-4 w-4 text-purple-600" />}
                          {type.value === 'security' && <Shield className="h-4 w-4 text-orange-600" />}
                          {type.value === 'maintenance' && <Wrench className="h-4 w-4 text-red-600" />}
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Actions</Label>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setServiceTypeFilter("all");
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Queries Table */}
            {loading.queries ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading work queries...</p>
              </div>
            ) : filteredQueries.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No queries found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                    ? "No work queries match your current filters." 
                    : "No work queries have been created yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Query ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Files</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQueries.map((query) => (
                        <TableRow key={query._id}>
                          <TableCell className="font-mono text-sm">
                            {query.queryId}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="font-medium truncate">{query.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {query.description.substring(0, 50)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="font-medium text-sm">{query.serviceTitle || query.serviceId}</div>
                              {query.serviceType && (
                                <Badge variant="outline" className="mt-1">
                                  {query.serviceType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {displayCategories.find(c => c.value === query.category)?.label || query.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <PriorityBadge priority={query.priority} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={query.status} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(query.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{query.proofFiles.length}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewQuery(query)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    disabled={
                                      (query.status === 'in-progress' || query.status === 'resolved') ||
                                      loading.deleting
                                    }
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Work Query</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this work query? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => handleDeleteQuery(query._id, query.title)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* View Query Details Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {selectedQueryForView && (
                      <>
                        <DialogHeader>
                          <DialogTitle>Query Details - {selectedQueryForView.queryId}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Query Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-semibold">Title</Label>
                              <p className="mt-1">{selectedQueryForView.title}</p>
                            </div>
                            <div>
                              <Label className="font-semibold">Category</Label>
                              <Badge className="mt-1">
                                {displayCategories.find(c => c.value === selectedQueryForView.category)?.label || selectedQueryForView.category}
                              </Badge>
                            </div>
                            <div>
                              <Label className="font-semibold">Priority</Label>
                              <div className="mt-1">
                                <PriorityBadge priority={selectedQueryForView.priority} />
                              </div>
                            </div>
                            <div>
                              <Label className="font-semibold">Status</Label>
                              <div className="mt-1">
                                <StatusBadge status={selectedQueryForView.status} />
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <Label className="font-semibold">Description</Label>
                            <p className="mt-1 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                              {selectedQueryForView.description}
                            </p>
                          </div>

                          {/* Service Information */}
                          <div>
                            <Label className="font-semibold">Service Information</Label>
                            <div className="mt-1 p-3 border rounded-lg">
                              <div className="font-medium">{selectedQueryForView.serviceTitle || selectedQueryForView.serviceId}</div>
                              {selectedQueryForView.serviceType && (
                                <div className="mt-2">
                                  <ServiceTypeBadge type={selectedQueryForView.serviceType} />
                                </div>
                              )}
                              {selectedQueryForView.serviceStaffName && (
                                <div className="mt-2 text-sm">
                                  <strong>Service Staff:</strong> {selectedQueryForView.serviceStaffName}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Proof Files */}
                          {selectedQueryForView.proofFiles.length > 0 && (
                            <div>
                              <Label className="font-semibold">Supporting Evidence ({selectedQueryForView.proofFiles.length})</Label>
                              <div className="grid gap-2 mt-2">
                                {selectedQueryForView.proofFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-gray-100 rounded-lg">
                                        <FileIcon type={file.type} />
                                      </div>
                                      <div>
                                        <div className="font-medium">{file.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {file.size} • {file.type} • {formatDate(file.uploadDate)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => previewFile(file.url)}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => downloadFile(file.url, file.name)}
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Superadmin Response */}
                          {selectedQueryForView.superadminResponse && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <Label className="font-semibold text-blue-900">Superadmin Response</Label>
                              <p className="mt-1 text-sm text-blue-800 whitespace-pre-wrap">
                                {selectedQueryForView.superadminResponse}
                              </p>
                              {selectedQueryForView.responseDate && (
                                <div className="text-xs text-blue-600 mt-2">
                                  Responded on: {formatDate(selectedQueryForView.responseDate)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Created Info */}
                          <div className="text-sm text-muted-foreground">
                            Created by {selectedQueryForView.reportedBy.name} on {formatDate(selectedQueryForView.createdAt)}
                          </div>

                          {/* Actions in View Dialog */}
                          <DialogFooter>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive"
                                  disabled={
                                    (selectedQueryForView.status === 'in-progress' || selectedQueryForView.status === 'resolved') ||
                                    loading.deleting
                                  }
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Query
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Work Query</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this work query? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => {
                                      handleDeleteQuery(selectedQueryForView._id, selectedQueryForView.title);
                                      setIsViewDialogOpen(false);
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DialogFooter>
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} queries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => changePage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default WorkQueryPage;