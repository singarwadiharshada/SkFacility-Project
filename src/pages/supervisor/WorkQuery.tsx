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
  DialogFooter,
  DialogDescription
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
  Trash2,
  Download,
  Filter,
  RefreshCw,
  Building2,
  Loader2,
  Mail,
  MapPin,
  File,
  HardHat,
  Shield,
  Car,
  Sparkles,
  Truck,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useWorkQuery } from "@/hooks/useWorkQuery";
import { format } from "date-fns";
import { useRole } from "@/context/RoleContext";

// Types
interface WorkQueryProofFile {
  name: string;
  type: 'image' | 'video' | 'document' | 'other';
  url: string;
  public_id: string;
  size: string;
  uploadDate: string;
}

interface WorkQuery {
  _id: string;
  queryId: string;
  title: string;
  description: string;
  serviceId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  category: string;
  proofFiles: WorkQueryProofFile[];
  reportedBy: {
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

const FileIcon = ({ type }: { type: string }) => {
  const icons = {
    image: <Image className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    other: <File className="h-4 w-4" />
  };

  return icons[type as keyof typeof icons] || <File className="h-4 w-4" />;
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

const ServiceIcon = ({ type }: { type: string }) => {
  const icons = {
    cleaning: <Sparkles className="h-4 w-4" />,
    "waste-management": <Trash2 className="h-4 w-4" />,
    "parking-management": <Car className="h-4 w-4" />,
    security: <Shield className="h-4 w-4" />,
    maintenance: <HardHat className="h-4 w-4" />,
    default: <Truck className="h-4 w-4" />
  };

  return icons[type as keyof typeof icons] || icons.default;
};

// Service Examples - for guidance only
const SERVICE_EXAMPLES = [
  { id: "CLEAN001", name: "Office Cleaning Service", type: "cleaning" },
  { id: "WASTE001", name: "Biomedical Waste Collection", type: "waste-management" },
  { id: "PARK001", name: "Parking Lot Management", type: "parking-management" },
  { id: "SEC001", name: "Security Patrol Service", type: "security" },
  { id: "MAINT001", name: "HVAC Maintenance", type: "maintenance" },
  { id: "CLEAN002", name: "Restroom Sanitization", type: "cleaning" },
  { id: "WASTE002", name: "Recycling Collection", type: "waste-management" }
];

// Main Component
const WorkQueryPage = () => {
  const { user: authUser, role, isAuthenticated, loading: authLoading } = useRole();
  const [currentSupervisor, setCurrentSupervisor] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    site?: string;
  }>({
    id: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    site: ""
  });
  
  const [loadingSupervisor, setLoadingSupervisor] = useState(true);
  
  const {
    workQueries,
    statistics,
    categories,
    priorities,
    statuses,
    loading: workQueryLoading,
    createWorkQuery,
    deleteWorkQuery,
    fetchWorkQueries,
    fetchStatistics,
    validateFile,
    downloadFile,
    previewFile,
    pagination,
    changePage,
    changeLimit
  } = useWorkQuery({
    supervisorId: currentSupervisor.id,
    autoFetch: currentSupervisor.id !== "",
    initialFilters: {
      page: 1,
      limit: 10
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
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
    supervisorId: "",
    supervisorName: ""
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string>("other");

  // Service types for radio buttons
  const serviceTypes = [
    { value: "cleaning", label: "Cleaning", icon: <Sparkles className="h-4 w-4" /> },
    { value: "waste-management", label: "Waste Management", icon: <Trash2 className="h-4 w-4" /> },
    { value: "parking-management", label: "Parking Management", icon: <Car className="h-4 w-4" /> },
    { value: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
    { value: "maintenance", label: "Maintenance", icon: <HardHat className="h-4 w-4" /> },
    { value: "other", label: "Other", icon: <Truck className="h-4 w-4" /> }
  ];

  // Fetch current supervisor data
  useEffect(() => {
    const fetchCurrentSupervisor = async () => {
      try {
        setLoadingSupervisor(true);
        
        if (!authUser || !isAuthenticated) {
          throw new Error("User not authenticated");
        }
        
        // Use authenticated user data
        console.log("👤 Auth User:", authUser);
        
        setCurrentSupervisor({
          id: authUser._id || authUser.id || "",
          name: authUser.name || "Supervisor",
          email: authUser.email || "",
          phone: authUser.phone || "",
          department: authUser.department || "",
          site: authUser.site || ""
        });
        
        // Update new query with supervisor info
        setNewQuery(prev => ({
          ...prev,
          supervisorId: authUser._id || authUser.id || "",
          supervisorName: authUser.name || "Supervisor"
        }));
        
      } catch (error: any) {
        console.error("❌ Error fetching supervisor data:", error);
        
        // Fallback to localStorage
        try {
          const storedUser = localStorage.getItem('sk_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentSupervisor({
              id: parsedUser._id || parsedUser.id || "SUP001",
              name: parsedUser.name || "Supervisor User",
              email: parsedUser.email || "",
              phone: parsedUser.phone || "",
              department: parsedUser.department || "",
              site: parsedUser.site || ""
            });
            
            setNewQuery(prev => ({
              ...prev,
              supervisorId: parsedUser._id || parsedUser.id || "SUP001",
              supervisorName: parsedUser.name || "Supervisor User"
            }));
          } else {
            throw new Error("No user data found");
          }
        } catch (localError) {
          console.error("❌ Error getting user from localStorage:", localError);
          toast.error("Failed to load user data. Please log in again.");
        }
      } finally {
        setLoadingSupervisor(false);
      }
    };

    if (isAuthenticated && !authLoading) {
      fetchCurrentSupervisor();
    }
  }, [authUser, isAuthenticated, authLoading]);

  // Check if user is a supervisor
  useEffect(() => {
    if (!authLoading && !loadingSupervisor && (!isAuthenticated || role !== 'supervisor')) {
      toast.error("Access denied. Only supervisors can access this page.");
    }
  }, [isAuthenticated, role, authLoading, loadingSupervisor]);

  // Filter work queries
  const filteredQueries = workQueries.filter(query => {
    const matchesSearch = 
      query.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.queryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || query.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || query.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
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

  // Reset form
  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setTimeout(() => {
      setNewQuery({
        title: "",
        description: "",
        serviceId: "",
        priority: "medium",
        category: "service-quality",
        supervisorId: currentSupervisor.id,
        supervisorName: currentSupervisor.name
      });
      setUploadedFiles([]);
      setSelectedServiceType("other");
    }, 300);
  };

  // Handle form submission
  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || role !== 'supervisor') {
      toast.error("You must be logged in as a supervisor to create a work query");
      return;
    }

    if (!newQuery.title.trim()) {
      toast.error("Please enter a query title");
      return;
    }

    if (!newQuery.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!newQuery.serviceId.trim()) {
      toast.error("Please enter a Service ID or Name");
      return;
    }

    if (!currentSupervisor.id || !currentSupervisor.name) {
      toast.error("Supervisor information is missing");
      return;
    }

    try {
      // Extract service ID from input (if format is "ID - Name", just take the ID part)
      let serviceId = newQuery.serviceId;
      let serviceTitle = newQuery.serviceId;
      
      // If input contains " - ", split it (assuming format: "ID - Name")
      if (serviceId.includes(" - ")) {
        const parts = serviceId.split(" - ");
        serviceId = parts[0]; // Take the ID part
        serviceTitle = parts.slice(1).join(" - "); // Take the name part
      }
      
      // Clean up service ID (remove any extra spaces)
      serviceId = serviceId.trim().toUpperCase();
      
      const result = await createWorkQuery({
        title: newQuery.title,
        description: newQuery.description,
        serviceId: serviceId,
        priority: newQuery.priority,
        category: newQuery.category,
        supervisorId: currentSupervisor.id,
        supervisorName: currentSupervisor.name,
        serviceTitle: serviceTitle,
        serviceType: selectedServiceType
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
        fetchWorkQueries();
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

  // Show loading state
  if (authLoading || loadingSupervisor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading supervisor data...</p>
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
        subtitle={`Report and track issues with facility services - ${currentSupervisor.name}`}
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
                {workQueryLoading.statistics ? "Loading..." : statistics?.total || 0}
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
                {workQueryLoading.statistics ? "..." : statistics?.statusCounts?.pending || 0}
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
                {workQueryLoading.statistics ? "..." : statistics?.statusCounts?.['in-progress'] || 0}
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
                {workQueryLoading.statistics ? "..." : statistics?.statusCounts?.resolved || 0}
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
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center">
                    <User className="inline h-3 w-3 mr-1" />
                    <span className="font-medium mr-1">Supervisor:</span> {currentSupervisor.name}
                  </div>
                  {currentSupervisor.department && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Building2 className="inline h-3 w-3 mr-1" />
                      <span className="font-medium mr-1">Department:</span> {currentSupervisor.department}
                    </div>
                  )}
                  {currentSupervisor.site && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      <span className="font-medium mr-1">Site:</span> {currentSupervisor.site}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleRefresh} disabled={workQueryLoading.queries}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${workQueryLoading.queries ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Query
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Work Query</DialogTitle>
                      <DialogDescription>
                        Report an issue with a facility service
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmitQuery} className="space-y-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Query Title *</Label>
                          <Input
                            id="title"
                            value={newQuery.title}
                            onChange={(e) => setNewQuery(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Brief description of the issue"
                            required
                            disabled={workQueryLoading.creating}
                          />
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
                            disabled={workQueryLoading.creating}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* SERVICE INPUT FIELD - CHANGED FROM DROPDOWN TO INPUT */}
                          <div className="space-y-2">
                            <Label htmlFor="serviceId">Service ID/Name *</Label>
                            <Input
                              id="serviceId"
                              value={newQuery.serviceId}
                              onChange={(e) => setNewQuery(prev => ({ ...prev, serviceId: e.target.value }))}
                              placeholder="Enter Service ID or Name (e.g., CLEAN001 or 'Office Cleaning')"
                              required
                              disabled={workQueryLoading.creating}
                            />
                            <div className="text-xs text-muted-foreground">
                              <Info className="inline h-3 w-3 mr-1" />
                              Enter the Service ID or Name you want to report an issue for
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select 
                              value={newQuery.category} 
                              onValueChange={(value) => setNewQuery(prev => ({ ...prev, category: value }))}
                              disabled={workQueryLoading.creating}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category">
                                  {categories.find(c => c.value === newQuery.category)?.label || "Select category"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category.value} value={category.value}>
                                    <div className="flex flex-col">
                                      <span>{category.label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {category.description}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Service Type Selection - Optional but helpful */}
                        <div className="space-y-2">
                          <Label>Service Type (Optional)</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Select the type of service you're reporting an issue for
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {serviceTypes.map((serviceType) => (
                              <Button
                                key={serviceType.value}
                                type="button"
                                variant={selectedServiceType === serviceType.value ? "default" : "outline"}
                                className="justify-start h-auto py-2"
                                onClick={() => setSelectedServiceType(serviceType.value)}
                              >
                                <div className="flex items-center gap-2">
                                  {serviceType.icon}
                                  <span>{serviceType.label}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority Level *</Label>
                          <Select 
                            value={newQuery.priority} 
                            onValueChange={(value) => setNewQuery(prev => ({ ...prev, priority: value as any }))}
                            disabled={workQueryLoading.creating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority">
                                {priorities.find(p => p.value === newQuery.priority)?.label || "Select priority"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {priorities.map(priority => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                      priority.value === 'low' ? 'bg-green-500' :
                                      priority.value === 'medium' ? 'bg-yellow-500' :
                                      priority.value === 'high' ? 'bg-orange-500' : 'bg-red-500'
                                    }`} />
                                    <div className="flex flex-col">
                                      <span>{priority.label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {priority.description}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* File Upload Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Supporting Evidence (Optional)</h3>
                        
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Upload screenshots, photos, or documents (Max 10 files, 25MB each)
                          </p>
                          <Input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            disabled={workQueryLoading.creating}
                          />
                          <Label htmlFor="file-upload">
                            <Button 
                              variant="outline" 
                              className="mt-4" 
                              type="button"
                              disabled={workQueryLoading.creating}
                            >
                              Choose Files
                            </Button>
                          </Label>
                        </div>

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

                      {/* Service Examples (for guidance) */}
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          <Label className="font-medium text-gray-900">Service Examples</Label>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Here are some examples of service IDs/Names you can use:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {SERVICE_EXAMPLES.map((service, index) => (
                            <div 
                              key={index}
                              className="text-xs p-2 border rounded bg-white hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                setNewQuery(prev => ({ 
                                  ...prev, 
                                  serviceId: `${service.id} - ${service.name}` 
                                }));
                                setSelectedServiceType(service.type);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <ServiceIcon type={service.type} />
                                <div>
                                  <div className="font-medium">{service.id}</div>
                                  <div className="text-muted-foreground truncate">{service.name}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Tip: Click on any example to auto-fill the Service field
                        </p>
                      </div>

                      {/* Supervisor Info Display */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <Label className="font-semibold text-blue-900">Supervisor Information</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-blue-800 font-medium">Name</div>
                            <div>{currentSupervisor.name}</div>
                          </div>
                          <div>
                            <div className="text-blue-800 font-medium">ID</div>
                            <div className="font-mono text-xs">{currentSupervisor.id}</div>
                          </div>
                          {currentSupervisor.department && (
                            <div>
                              <div className="text-blue-800 font-medium">Department</div>
                              <div>{currentSupervisor.department}</div>
                            </div>
                          )}
                          {currentSupervisor.site && (
                            <div>
                              <div className="text-blue-800 font-medium">Site</div>
                              <div>{currentSupervisor.site}</div>
                            </div>
                          )}
                        </div>
                        {currentSupervisor.email && (
                          <div className="mt-2 text-xs text-blue-700 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {currentSupervisor.email}
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <DialogFooter className="gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                          disabled={workQueryLoading.creating}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={workQueryLoading.creating}
                        >
                          {workQueryLoading.creating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : "Submit Query"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                      {statusFilter === "all" ? "All Status" : statuses.find(s => s.value === statusFilter)?.label || statusFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            status.value === 'pending' ? 'bg-yellow-500' :
                            status.value === 'in-progress' ? 'bg-blue-500' :
                            status.value === 'resolved' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span>{status.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities">
                      {priorityFilter === "all" ? "All Priorities" : priorities.find(p => p.value === priorityFilter)?.label || priorityFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            priority.value === 'low' ? 'bg-green-500' :
                            priority.value === 'medium' ? 'bg-yellow-500' :
                            priority.value === 'high' ? 'bg-orange-500' : 'bg-red-500'
                          }`} />
                          <span>{priority.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Queries Table */}
            {workQueryLoading.queries ? (
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
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
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
                              <div className="font-medium text-sm">{query.serviceId}</div>
                            </div>
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
                                      workQueryLoading.deleting
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
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                              <Label className="font-semibold">Service</Label>
                              <div className="mt-1">
                                <div className="font-medium">{selectedQueryForView.serviceId}</div>
                              </div>
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
                            <div>
                              <Label className="font-semibold">Category</Label>
                              <p className="mt-1">
                                {categories.find(c => c.value === selectedQueryForView.category)?.label || selectedQueryForView.category}
                              </p>
                            </div>
                            <div>
                              <Label className="font-semibold">Created</Label>
                              <p className="mt-1">{formatDate(selectedQueryForView.createdAt)}</p>
                            </div>
                          </div>

                          {/* Supervisor Information */}
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-5 w-5 text-blue-600" />
                              <Label className="font-semibold text-blue-900">Reported By</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <div className="text-sm text-blue-800 font-medium">Supervisor</div>
                                <div className="text-sm">{selectedQueryForView.reportedBy?.name || selectedQueryForView.supervisorName}</div>
                              </div>
                              <div>
                                <div className="text-sm text-blue-800 font-medium">Role</div>
                                <div className="text-sm">{selectedQueryForView.reportedBy?.role || 'Supervisor'}</div>
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
                                          {file.size} • {formatDate(file.uploadDate)}
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
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <Label className="font-semibold text-green-900">Superadmin Response</Label>
                              <p className="mt-1 text-sm text-green-800 whitespace-pre-wrap">
                                {selectedQueryForView.superadminResponse}
                              </p>
                              {selectedQueryForView.responseDate && (
                                <div className="text-xs text-green-600 mt-2">
                                  Responded on: {formatDate(selectedQueryForView.responseDate)}
                                </div>
                              )}
                            </div>
                          )}
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