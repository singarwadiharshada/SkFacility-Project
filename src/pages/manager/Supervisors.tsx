import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOutletContext } from "react-router-dom";
import { useRole } from "@/context/RoleContext"; // CHANGE: Use useRole instead of useAuth
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
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Users, Briefcase, Mail, Phone, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import supervisorService, { Supervisor, CreateSupervisorData, UpdateSupervisorData } from "@/services/supervisorService";
import managerService, { Manager } from "@/services/managerService";

// Simplified schema for manager dashboard
const supervisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  password: z.string().min(6, "Password must be at least 6 characters"),
  department: z.string().optional(),
  site: z.string().optional(),
  reportsTo: z.string().optional(),
});

type SupervisorFormData = z.infer<typeof supervisorSchema>;

const departments = ['Operations', 'IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Admin'];
const sites = ['Mumbai Office', 'Delhi Branch', 'Bangalore Tech Park', 'Chennai Center', 'Hyderabad Campus'];

const Supervisors = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { role, user: currentManager } = useRole(); // CHANGE: Get user from useRole
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supervisorToDelete, setSupervisorToDelete] = useState<string | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  const form = useForm<SupervisorFormData>({
    resolver: zodResolver(supervisorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      department: "Operations",
      site: "Mumbai Office",
      reportsTo: "",
    },
  });

  // Debug function to check localStorage
  const debugLocalStorage = () => {
    console.log("=== LOCALSTORAGE DEBUG ===");
    console.log("Current role:", role);
    console.log("Current user from context:", currentManager);
    
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log("User from localStorage:", user);
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
    console.log("==========================");
  };

  // Fetch supervisors
  const fetchSupervisors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("=== FETCHING SUPERVISORS ===");
      console.log("Current role:", role);
      console.log("Current user:", currentManager);
      
      // Get all supervisors
      const allSupervisors = await supervisorService.getAllSupervisors();
      console.log("Total supervisors in system:", allSupervisors.length);
      
      // Filter supervisors based on current manager
      let filteredSupervisors = allSupervisors;
      
      if (currentManager && currentManager.email) {
        console.log(`Filtering for manager: ${currentManager.email} (${currentManager.name})`);
        
        // Filter 1: Supervisors who report to this manager
        const supervisorsReportingToManager = allSupervisors.filter(s => 
          s.reportsTo && s.reportsTo.toLowerCase() === currentManager.email.toLowerCase()
        );
        console.log(`Direct reports to ${currentManager.email}:`, supervisorsReportingToManager.length);
        
        // Filter 2: Supervisors at same site
        const supervisorsAtSameSite = allSupervisors.filter(s => 
          s.site === currentManager.site
        );
        console.log(`Supervisors at ${currentManager.site} site:`, supervisorsAtSameSite.length);
        
        // Combine both filters (remove duplicates)
        const combinedSupervisors = [...supervisorsReportingToManager];
        supervisorsAtSameSite.forEach(supervisor => {
          if (!combinedSupervisors.find(s => s._id === supervisor._id)) {
            combinedSupervisors.push(supervisor);
          }
        });
        
        filteredSupervisors = combinedSupervisors;
      } else {
        console.log("No current manager, showing all supervisors");
      }
      
      console.log("Filtered supervisors:", filteredSupervisors.length);
      setSupervisors(filteredSupervisors);
      
      // Update stats
      const active = filteredSupervisors.filter(s => s.isActive).length;
      const inactive = filteredSupervisors.length - active;
      setStats({
        total: filteredSupervisors.length,
        active,
        inactive
      });
      
    } catch (error) {
      console.error("❌ Error fetching supervisors:", error);
      setError("Failed to load supervisors. Please try again.");
      toast.error("Failed to fetch supervisors");
      
      // Set empty state
      setSupervisors([]);
      setStats({ total: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, [currentManager]); // Refetch when currentManager changes

  const handleOpenDialog = (supervisor?: Supervisor) => {
    if (supervisor) {
      setEditingSupervisor(supervisor);
      form.reset({
        name: supervisor.name,
        email: supervisor.email,
        phone: supervisor.phone,
        department: supervisor.department,
        site: supervisor.site,
        reportsTo: supervisor.reportsTo || "",
        password: "", // Don't show existing password for editing
      });
    } else {
      setEditingSupervisor(null);
      form.reset({
        name: "",
        email: "",
        phone: "",
        password: "",
        department: "Operations",
        site: currentManager?.site || "Mumbai Office",
        reportsTo: currentManager?.email || "", // Auto-fill reportsTo with manager's email
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (values: SupervisorFormData) => {
    try {
      if (editingSupervisor) {
        // Update supervisor
        const updateData: UpdateSupervisorData = {
          name: values.name,
          email: values.email,
          phone: values.phone,
          department: values.department,
          site: values.site,
          reportsTo: values.reportsTo || currentManager?.email,
        };
        
        const updatedSupervisor = await supervisorService.updateSupervisor(
          editingSupervisor._id,
          updateData
        );
        
        setSupervisors(supervisors.map(s => 
          s._id === editingSupervisor._id ? updatedSupervisor : s
        ));
        toast.success("Supervisor updated successfully!");
      } else {
        // Create new supervisor - auto-assign to current manager
        const createData: CreateSupervisorData = {
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
          department: values.department,
          site: values.site || currentManager?.site,
          reportsTo: values.reportsTo || currentManager?.email,
        };
        
        const newSupervisor = await supervisorService.createSupervisor(createData);
        setSupervisors([newSupervisor, ...supervisors]);
        toast.success("Supervisor added successfully!");
      }
      
      setDialogOpen(false);
      form.reset();
      fetchSupervisors(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save supervisor");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!supervisorToDelete) return;
    
    try {
      await supervisorService.deleteSupervisor(supervisorToDelete);
      setSupervisors(supervisors.filter(s => s._id !== supervisorToDelete));
      toast.success("Supervisor deleted successfully!");
      setDeleteDialogOpen(false);
      setSupervisorToDelete(null);
      fetchSupervisors(); // Refresh stats
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete supervisor");
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const updatedSupervisor = await supervisorService.toggleSupervisorStatus(id);
      setSupervisors(supervisors.map(s => 
        s._id === id ? updatedSupervisor : s
      ));
      
      // Update stats
      const active = supervisors.filter(s => s._id !== id && s.isActive).length + (updatedSupervisor.isActive ? 1 : 0);
      const inactive = supervisors.length - active;
      setStats({
        ...stats,
        active,
        inactive
      });
      
      toast.success("Supervisor status updated!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const filteredSupervisors = supervisors.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.site.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === "active" ? "default" : "secondary";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Supervisors" 
        subtitle={
          currentManager 
            ? `Managing supervisors for ${currentManager.name}`
            : "Supervisor Management"
        }
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <h3 className="font-semibold">Error Loading Data</h3>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setError(null);
                  fetchSupervisors();
                }}
              >
                Retry
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={debugLocalStorage}
              >
                Debug localStorage
              </Button>
            </div>
          </div>
        )}

        {/* Manager Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manager Information</CardTitle>
            {!currentManager && (
              <p className="text-sm text-yellow-600">
                Note: Could not identify current manager. Showing all supervisors.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {currentManager ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Manager Name</p>
                  <p className="text-lg font-semibold">{currentManager.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg font-semibold break-all">{currentManager.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Assigned Site</p>
                  <Badge variant="outline" className="text-lg">
                    {currentManager.site || "Not assigned"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <Badge variant="outline" className="text-lg">
                    {currentManager.department || "Operations"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No manager information found. Please log in as a manager.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchSupervisors}
                  >
                    Retry
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={debugLocalStorage}
                  >
                    Debug
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {currentManager ? "My Supervisors" : "All Supervisors"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {currentManager 
                  ? "Supervisors under your management" 
                  : "Total supervisors"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Supervisors</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Supervisors</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
              <p className="text-xs text-muted-foreground">Currently inactive</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Supervisors List</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {loading 
                  ? "Loading supervisors..." 
                  : currentManager
                    ? `Showing ${filteredSupervisors.length} supervisors under ${currentManager.name}'s management`
                    : `Showing ${filteredSupervisors.length} of ${supervisors.length} supervisors`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={debugLocalStorage} size="sm">
                Debug
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Supervisor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search supervisors by name, email, department, or site..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading supervisors...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Reports To</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupervisors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchQuery 
                          ? "No supervisors found matching your search" 
                          : currentManager
                            ? `No supervisors assigned to ${currentManager.name} yet`
                            : "No supervisors in the system"}
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={fetchSupervisors}
                          >
                            Refresh Data
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSupervisors.map((supervisor) => (
                      <TableRow key={supervisor._id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{supervisor.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ID: {supervisor._id.slice(-6)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{supervisor.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{supervisor.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {supervisor.department}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {supervisor.site}
                          </div>
                        </TableCell>
                        <TableCell>
                          {supervisor.reportsTo ? (
                            <Badge variant="secondary">
                              {currentManager && supervisor.reportsTo.toLowerCase() === currentManager.email.toLowerCase() 
                                ? "You" 
                                : supervisor.reportsTo}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{supervisor.employees} employees</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{supervisor.tasks} tasks</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(supervisor.joinDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(supervisor.status)}>
                            {supervisor.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenDialog(supervisor)}
                              title="Edit"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toggleStatus(supervisor._id)}
                              title={supervisor.isActive ? "Deactivate" : "Activate"}
                            >
                              {supervisor.isActive ? (
                                <UserX className="h-3 w-3 text-destructive" />
                              ) : (
                                <UserCheck className="h-3 w-3 text-primary" />
                              )}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                setSupervisorToDelete(supervisor._id);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add/Edit Supervisor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSupervisor ? "Edit Supervisor" : "Add New Supervisor"}
              {currentManager && (
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  This supervisor will report to {currentManager.name}
                </p>
              )}
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} />
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
              </div>

              {!editingSupervisor && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
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
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                      <FormLabel>Site</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || currentManager?.site}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select site" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sites.map(site => (
                            <SelectItem key={site} value={site}>{site}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {currentManager && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Supervisor will report to:</p>
                  <p className="text-sm text-blue-700">{currentManager.name} ({currentManager.email})</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSupervisor ? "Update Supervisor" : "Create Supervisor"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supervisor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this supervisor? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Supervisor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Supervisors;