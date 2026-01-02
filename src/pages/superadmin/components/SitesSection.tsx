import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Eye, Trash2, Edit, MapPin, Building, DollarSign, Square, 
  Search, Users, Filter, BarChart, Calendar, RefreshCw, User, Briefcase,
  Loader2, AlertCircle, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "./shared";
import { Label } from "@/components/ui/label";

// Define Site interface
export interface Site {
  _id: string;
  name: string;
  clientId?: string;
  clientName: string;
  clientDetails?: {
    company: string;
    email: string;
    phone: string;
    city: string;
    state: string;
  };
  location: string;
  areaSqft: number;
  services: string[];
  staffDeployment: Array<{ role: string; count: number }>;
  contractValue: number;
  contractEndDate: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

// Define Client interface
interface Client {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

const ServicesList = [
  "Housekeeping",
  "Security",
  "Parking",
  "Waste Management"
];

const StaffRoles = [
  "Manager",
  "Supervisor",
  "Housekeeping Staff",
  "Security Guard",
  "Parking Attendant",
  "Waste Collector"
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const SitesSection = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffDeployment, setStaffDeployment] = useState<Array<{ role: string; count: number }>>([]);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    totalSites: 0,
    totalStaff: 0,
    activeSites: 0,
    inactiveSites: 0,
    totalContractValue: 0
  });
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");

  // Fetch sites and clients on component mount
  useEffect(() => {
    fetchSites();
    fetchStats();
    fetchClients();
  }, []);

  // Fetch sites from backend with error handling
  const fetchSites = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching sites from:", `${API_URL}/sites`);
      
      const response = await fetch(`${API_URL}/sites`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch sites: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Sites data received:", data);
      
      // Validate and transform data - ensure it's always an array
      const validatedSites = (Array.isArray(data) ? data : [])
        .map((site: any) => ({
          _id: site._id || site.id || '',
          name: site.name || 'Unnamed Site',
          clientId: site.clientId || '',
          clientName: site.clientName || 'Unknown Client',
          clientDetails: site.clientDetails,
          location: site.location || 'Unknown Location',
          areaSqft: Number(site.areaSqft) || 0,
          services: Array.isArray(site.services) ? site.services : [],
          staffDeployment: Array.isArray(site.staffDeployment) ? site.staffDeployment : [],
          contractValue: Number(site.contractValue) || 0,
          contractEndDate: site.contractEndDate || new Date().toISOString(),
          status: (site.status === 'active' || site.status === 'inactive') ? site.status : 'active',
          createdAt: site.createdAt,
          updatedAt: site.updatedAt
        }))
        .filter(Boolean); // Remove any null/undefined entries
      
      setSites(validatedSites);
      console.log("Validated sites:", validatedSites);
      
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error(error.message || "Failed to load sites");
      setSites([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch clients from backend with proper error handling
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      console.log("Fetching clients from:", `${API_URL}/clients`);
      
      const response = await fetch(`${API_URL}/clients`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching clients response:", errorText);
        
        // If endpoint doesn't exist, return empty array
        if (response.status === 404) {
          console.warn("Clients endpoint not found. Using empty clients list.");
          setClients([]);
          return;
        }
        
        throw new Error(`Failed to fetch clients: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Clients data received:", result);
      
      // Extract data from response - handle both formats
      const clientsData = result.data || result || [];
      
      // Ensure clients is always an array
      const clientsArray = Array.isArray(clientsData) ? clientsData : [];
      setClients(clientsArray);
      
      // Auto-select first client if available
      if (clientsArray.length > 0) {
        setSelectedClient(clientsArray[0]._id);
      }
      
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients. Using manual input.");
      setClients([]); // Set to empty array on error
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Search clients function
  const searchClients = async (searchTerm: string) => {
    try {
      const response = await fetch(`${API_URL}/clients/search?query=${encodeURIComponent(searchTerm)}`);
      
      if (response.ok) {
        const result = await response.json();
        // Extract data from response
        const clientsData = result.data || result || [];
        // Ensure data is always an array
        const clientsArray = Array.isArray(clientsData) ? clientsData : [];
        setClients(clientsArray);
      } else {
        // If search fails, keep current clients
        console.warn("Client search failed, keeping current clients");
      }
    } catch (error) {
      console.error("Error searching clients:", error);
      // Don't update clients on error
    }
  };

  // Fetch site statistics
  const fetchStats = async () => {
    try {
      console.log("Fetching stats from:", `${API_URL}/sites/stats`);
      
      const response = await fetch(`${API_URL}/sites/stats`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Stats data received:", data);
        
        setStats({
          totalSites: data.totalSites || 0,
          totalStaff: data.totalStaff || 0,
          activeSites: data.stats?.find((s: any) => s._id === 'active')?.count || 0,
          inactiveSites: data.stats?.find((s: any) => s._id === 'inactive')?.count || 0,
          totalContractValue: data.stats?.reduce((sum: number, stat: any) => sum + (stat.totalContractValue || 0), 0) || 0
        });
      } else {
        console.warn("Failed to fetch stats, using defaults");
        // Use calculated stats
        setStats({
          totalSites: sites.length,
          totalStaff: sites.reduce((total, site) => total + getTotalStaff(site), 0),
          activeSites: sites.filter(s => s.status === 'active').length,
          inactiveSites: sites.filter(s => s.status === 'inactive').length,
          totalContractValue: sites.reduce((sum, site) => sum + (site.contractValue || 0), 0)
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Use default stats on error
      setStats({
        totalSites: sites.length,
        totalStaff: sites.reduce((total, site) => total + getTotalStaff(site), 0),
        activeSites: sites.filter(s => s.status === 'active').length,
        inactiveSites: sites.filter(s => s.status === 'inactive').length,
        totalContractValue: sites.reduce((sum, site) => sum + (site.contractValue || 0), 0)
      });
    }
  };

  // Search sites
  const searchSites = async () => {
    try {
      setIsLoading(true);
      let url = `${API_URL}/sites/search`;
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append('query', searchQuery);
      }
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log("Searching sites with URL:", url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to search sites');
      }
      
      const data = await response.json();
      
      // Validate and transform search results - ensure it's always an array
      const validatedSites = (Array.isArray(data) ? data : [])
        .map((site: any) => ({
          _id: site._id || site.id || '',
          name: site.name || 'Unnamed Site',
          clientId: site.clientId || '',
          clientName: site.clientName || 'Unknown Client',
          clientDetails: site.clientDetails,
          location: site.location || 'Unknown Location',
          areaSqft: Number(site.areaSqft) || 0,
          services: Array.isArray(site.services) ? site.services : [],
          staffDeployment: Array.isArray(site.staffDeployment) ? site.staffDeployment : [],
          contractValue: Number(site.contractValue) || 0,
          contractEndDate: site.contractEndDate || new Date().toISOString(),
          status: (site.status === 'active' || site.status === 'inactive') ? site.status : 'active',
          createdAt: site.createdAt,
          updatedAt: site.updatedAt
        }))
        .filter(Boolean); // Remove any null/undefined entries
      
      setSites(validatedSites);
      
    } catch (error: any) {
      console.error("Error searching sites:", error);
      toast.error(error.message || "Failed to search sites");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const updateStaffCount = (role: string, count: number) => {
    setStaffDeployment(prev => {
      const existing = prev.find(item => item.role === role);
      if (existing) {
        return prev.map(item =>
          item.role === role ? { ...item, count: Math.max(0, count) } : item
        );
      }
      return [...prev, { role, count }];
    });
  };

  const resetForm = () => {
    setSelectedServices([]);
    setStaffDeployment([]);
    setEditMode(false);
    setEditingSiteId(null);
    setSelectedClient("");
    setClientSearch("");
  };

  const handleViewSite = (site: Site) => {
    setSelectedSite(site);
    setViewDialogOpen(true);
  };

  const handleEditSite = (site: Site) => {
    setEditMode(true);
    setEditingSiteId(site._id);
    setSelectedServices(site.services || []);
    setStaffDeployment(site.staffDeployment || []);
    
    // Set client if exists in clients list
    if (site.clientId) {
      const client = clients.find(c => c._id === site.clientId);
      if (client) {
        setSelectedClient(client._id);
      }
    }
    
    // Set form values for editing
    setTimeout(() => {
      const form = document.getElementById('site-form') as HTMLFormElement;
      if (form) {
        const safeAreaSqft = site.areaSqft || 0;
        const safeContractValue = site.contractValue || 0;
        const safeContractDate = site.contractEndDate 
          ? new Date(site.contractEndDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        (form.elements.namedItem('site-name') as HTMLInputElement).value = site.name || '';
        (form.elements.namedItem('location') as HTMLInputElement).value = site.location || '';
        (form.elements.namedItem('area-sqft') as HTMLInputElement).value = safeAreaSqft.toString();
        (form.elements.namedItem('contract-value') as HTMLInputElement).value = safeContractValue.toString();
        (form.elements.namedItem('contract-end-date') as HTMLInputElement).value = safeContractDate;
        
        // Set manual client name if no client selected
        if (!selectedClient) {
          (form.elements.namedItem('client-name-manual') as HTMLInputElement).value = site.clientName || '';
        }
      }
    }, 0);
    
    setDialogOpen(true);
  };

  const handleAddOrUpdateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let clientName = "";
    let clientId = "";

    if (selectedClient) {
      // Use selected client from dropdown
      const client = clients.find(c => c._id === selectedClient);
      if (client) {
        clientName = client.name;
        clientId = client._id;
      }
    } else {
      // Use manual input
      clientName = formData.get("client-name-manual") as string;
    }

    if (!clientName.trim()) {
      toast.error("Please select or enter a client name");
      return;
    }

    // Prepare site data WITHOUT any id fields
    const siteData: any = {
      name: formData.get("site-name") as string,
      clientName: clientName.trim(),
      location: formData.get("location") as string,
      areaSqft: Number(formData.get("area-sqft")) || 0,
      contractValue: Number(formData.get("contract-value")) || 0,
      contractEndDate: formData.get("contract-end-date") as string,
      services: selectedServices,
      staffDeployment: staffDeployment.filter(item => item.count > 0),
      status: 'active'
    };

    // Only include clientId if it's not empty
    if (clientId && clientId.trim() !== '') {
      siteData.clientId = clientId;
    }

    console.log("📤 Submitting CLEAN site data:", siteData);
    
    // Double-check: ensure no id fields are present
    const finalPayload = { ...siteData };
    delete finalPayload._id;
    delete finalPayload.id;
    delete finalPayload.__v;
    
    console.log("📤 Final payload to send:", JSON.stringify(finalPayload, null, 2));
    console.log("📤 Checking for hidden id fields...");
    
    // Debug: Check if there are any hidden id fields
    Object.keys(finalPayload).forEach(key => {
      if (key.toLowerCase().includes('id') && key !== 'clientId') {
        console.error(`❌ Found unexpected id field: ${key} = ${finalPayload[key]}`);
      }
    });

    try {
      let response;
      let url;
      
      if (editMode && editingSiteId) {
        // Update existing site
        url = `${API_URL}/sites/${editingSiteId}`;
        console.log("🔄 Updating site at:", url);
        response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalPayload),
        });
      } else {
        // Create new site
        url = `${API_URL}/sites`;
        console.log("➕ Creating new site at:", url);
        
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalPayload),
        });
      }
      
      console.log("📥 Response status:", response.status);
      console.log("📥 Response ok:", response.ok);
      
      const responseText = await response.text();
      console.log("📥 Response text:", responseText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        console.error("❌ Error response data:", errorData);
        throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`);
      }
      
      const data = JSON.parse(responseText);
      console.log("✅ Success response:", data);
      
      toast.success(data.message || (editMode ? "Site updated successfully!" : "Site added successfully!"));

      setDialogOpen(false);
      resetForm();
      (e.target as HTMLFormElement).reset();
      
      // Refresh sites list and stats
      await fetchSites();
      await fetchStats();
      
    } catch (error: any) {
      console.error("❌ Error saving site:", error);
      
      // Check for duplicate entry error
      if (error.message.includes('Duplicate entry') || error.message.includes('duplicate')) {
        toast.error("Site name might already exist. Please try a different name.");
      } else if (error.message.includes('id')) {
        toast.error("There was an issue with the site ID. Please try again.");
      } else {
        toast.error(error.message || "Failed to save site");
      }
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Are you sure you want to delete this site?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/sites/${siteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete site: ${response.status}`);
      }
      
      toast.success("Site deleted successfully!");
      
      // Refresh sites list and stats
      await fetchSites();
      await fetchStats();
    } catch (error: any) {
      console.error("Error deleting site:", error);
      toast.error(error.message || "Failed to delete site");
    }
  };

  const handleToggleStatus = async (siteId: string) => {
    try {
      const response = await fetch(`${API_URL}/sites/${siteId}/toggle-status`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update site status: ${response.status}`);
      }
      
      const data = await response.json();
      toast.success(data.message || "Site status updated!");
      
      // Refresh sites list and stats
      await fetchSites();
      await fetchStats();
    } catch (error: any) {
      console.error("Error toggling site status:", error);
      toast.error(error.message || "Failed to update site status");
    }
  };

  const getTotalStaff = (site: Site): number => {
    if (!site || !Array.isArray(site.staffDeployment)) return 0;
    return site.staffDeployment.reduce((total, item) => {
      const count = Number(item.count) || 0;
      return total + count;
    }, 0);
  };

  const formatCurrency = (amount: number | undefined): string => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  const formatDate = (dateString: string | undefined): string => {
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

  const formatNumber = (num: number | undefined): string => {
    const safeNum = Number(num) || 0;
    return safeNum.toLocaleString();
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setDialogOpen(open);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSites();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    fetchSites();
  };

  // Calculate average area safely
  const calculateAverageArea = (): string => {
    if (sites.length === 0) return "0";
    
    const totalArea = sites.reduce((sum, site) => {
      return sum + (Number(site.areaSqft) || 0);
    }, 0);
    
    const average = totalArea / sites.length;
    return Math.round(average / 1000).toString();
  };

  // Helper function to safely render clients dropdown
  const renderClientsDropdown = () => {
    // Ensure clients is always an array
    const safeClients = Array.isArray(clients) ? clients : [];
    
    if (isLoadingClients) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading clients...</span>
        </div>
      );
    }
    
    return (
      <>
        <div className="relative">
          <Input
            placeholder="Search clients..."
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              if (e.target.value.length >= 2) {
                searchClients(e.target.value);
              }
            }}
            className="mb-2"
          />
        </div>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">Select a client...</option>
          {safeClients.length === 0 ? (
            <option value="" disabled>
              No clients found. Add clients in the Clients section.
            </option>
          ) : (
            safeClients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name} - {client.company} ({client.city})
              </option>
            ))
          )}
        </select>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Debug Info - Remove in production */}
      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <strong>Debug Info:</strong> API URL: {API_URL} | Sites: {sites.length} | Clients: {Array.isArray(clients) ? clients.length : 'Invalid'}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sites</p>
                <p className="text-2xl font-bold">{stats.totalSites}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm">
              <span className="text-green-600 font-medium">{stats.activeSites} active</span>
              <span className="mx-2">•</span>
              <span className="text-gray-600">{stats.inactiveSites} inactive</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{stats.totalStaff}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contract Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalContractValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Area</p>
                <p className="text-2xl font-bold">{calculateAverageArea()}K sqft</p>
              </div>
              <BarChart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sites by name, client, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button type="button" variant="outline" onClick={() => { fetchSites(); fetchStats(); fetchClients(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh All
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Site Management</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit Site" : "Add New Site"}</DialogTitle>
              </DialogHeader>

              <form id="site-form" onSubmit={handleAddOrUpdateSite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Site Name" id="site-name" required>
                    <Input 
                      id="site-name" 
                      name="site-name" 
                      placeholder="Enter site name" 
                      required 
                      defaultValue=""
                    />
                  </FormField>

                  <div className="space-y-2">
                    <Label htmlFor="client-select" className="text-sm font-medium">
                      Select Client <span className="text-muted-foreground text-xs">(or enter manually below)</span>
                    </Label>
                    {renderClientsDropdown()}
                  </div>

                  <FormField label="Location" id="location" required>
                    <Input 
                      id="location" 
                      name="location" 
                      placeholder="Enter location" 
                      required 
                      defaultValue=""
                    />
                  </FormField>
                  <FormField label="Area (sqft)" id="area-sqft" required>
                    <Input 
                      id="area-sqft" 
                      name="area-sqft" 
                      type="number" 
                      placeholder="Enter area in sqft" 
                      required 
                      min="1"
                      defaultValue="1000"
                    />
                  </FormField>
                  <FormField label="Contract Value (₹)" id="contract-value" required>
                    <Input 
                      id="contract-value" 
                      name="contract-value" 
                      type="number" 
                      placeholder="Enter contract value" 
                      required 
                      min="0"
                      defaultValue="100000"
                    />
                  </FormField>
                  <FormField label="Contract End Date" id="contract-end-date" required>
                    <Input 
                      id="contract-end-date" 
                      name="contract-end-date" 
                      type="date" 
                      required 
                      min={new Date().toISOString().split('T')[0]}
                      defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                  </FormField>
                </div>

                {/* Manual client input for when no client is selected */}
                {!selectedClient && (
                  <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-md">
                    <FormField label="Client Name (Manual Entry)" id="client-name-manual" required>
                      <Input 
                        id="client-name-manual" 
                        name="client-name-manual" 
                        placeholder="Enter client name if not in list above" 
                        required 
                        defaultValue=""
                      />
                    </FormField>
                    <p className="text-xs text-yellow-700 mt-1">
                      Client will be saved as a text field. For better tracking, add the client to the Clients section first.
                    </p>
                  </div>
                )}

                <div className="border p-4 rounded-md">
                  <p className="font-medium mb-3">Services for this Site</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ServicesList.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={selectedServices.includes(service)}
                          onCheckedChange={() => toggleService(service)}
                        />
                        <label htmlFor={`service-${service}`} className="cursor-pointer">
                          {service}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border p-4 rounded-md">
                  <p className="font-medium mb-3">Staff Deployment</p>
                  <div className="space-y-3">
                    {StaffRoles.map((role) => {
                      const deployment = staffDeployment.find(item => item.role === role);
                      const count = deployment?.count || 0;
                      return (
                        <div key={role} className="flex items-center justify-between">
                          <span>{role}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateStaffCount(role, count - 1)}
                              disabled={count <= 0}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={count}
                              onChange={(e) => updateStaffCount(role, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="0"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateStaffCount(role, count + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editMode ? "Update Site" : "Add Site"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Loading sites...</span>
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sites Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search filters'
                  : 'Get started by adding your first site'
                }
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Site
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Area (sqft)</TableHead>
                    <TableHead>Contract Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => {
                    // Safely get values
                    const safeAreaSqft = site.areaSqft || 0;
                    const safeContractValue = site.contractValue || 0;
                    const safeStaffDeployment = Array.isArray(site.staffDeployment) ? site.staffDeployment : [];
                    const safeServices = Array.isArray(site.services) ? site.services : [];
                    
                    return (
                      <TableRow key={site._id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{site.name || 'Unnamed Site'}</div>
                            <div className="text-xs text-muted-foreground">
                              Added: {formatDate(site.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{site.clientName || 'Unknown Client'}</div>
                            {site.clientDetails && (
                              <div className="text-xs text-muted-foreground">
                                {site.clientDetails.company}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{site.location || 'Unknown Location'}</TableCell>
                        <TableCell className="w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {safeServices.map((srv, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {srv}
                              </Badge>
                            ))}
                            {safeServices.length === 0 && (
                              <span className="text-xs text-muted-foreground">No services</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="mr-1">
                              Total: {getTotalStaff(site)}
                            </Badge>
                            {safeStaffDeployment.slice(0, 2).map((deploy, i) => (
                              <div key={i} className="text-xs text-muted-foreground">
                                {deploy.role}: {deploy.count}
                              </div>
                            ))}
                            {safeStaffDeployment.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{safeStaffDeployment.length - 2} more
                              </div>
                            )}
                            {safeStaffDeployment.length === 0 && (
                              <div className="text-xs text-muted-foreground">No staff assigned</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(safeAreaSqft)}</TableCell>
                        <TableCell>{formatCurrency(safeContractValue)}</TableCell>
                        <TableCell>
                          <Badge variant={site.status === "active" ? "default" : "secondary"}>
                            {site.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewSite(site)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSite(site)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(site._id)}
                            >
                              {site.status === "active" ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSite(site._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Site Details</DialogTitle>
          </DialogHeader>
          
          {selectedSite && (
            <div className="space-y-6">
              {/* Site Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Site Name</h3>
                    <p className="text-lg font-semibold">{selectedSite.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
                    <p className="text-lg font-semibold">{selectedSite.clientName}</p>
                    {selectedSite.clientDetails && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <div>{selectedSite.clientDetails.company}</div>
                        <div>{selectedSite.clientDetails.email}</div>
                        <div>{selectedSite.clientDetails.phone}</div>
                        <div>{selectedSite.clientDetails.city}, {selectedSite.clientDetails.state}</div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{selectedSite.location}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Area</h3>
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{formatNumber(selectedSite.areaSqft)} sqft</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contract Value</h3>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{formatCurrency(selectedSite.contractValue)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contract End Date</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">{formatDate(selectedSite.contractEndDate)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <Badge variant={selectedSite.status === "active" ? "default" : "secondary"}>
                      {selectedSite.status?.toUpperCase() || 'ACTIVE'}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                    <p className="text-sm">{formatDate(selectedSite.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              {/* Services Section */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Services</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedSite.services) && selectedSite.services.length > 0 ? (
                    selectedSite.services.map((service, index) => (
                      <Badge key={index} variant="secondary">
                        {service}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No services assigned</p>
                  )}
                </div>
              </div>
              
              {/* Staff Deployment Section */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Staff Deployment</h3>
                <div className="space-y-3">
                  {Array.isArray(selectedSite.staffDeployment) && selectedSite.staffDeployment.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSite.staffDeployment.map((deploy, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                            <span className="text-sm font-medium">{deploy.role}</span>
                            <Badge variant="outline">{deploy.count} staff</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Total Staff:</span>
                          <span className="text-lg font-bold">{getTotalStaff(selectedSite)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No staff deployed</p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEditSite(selectedSite);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Site
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleStatus(selectedSite._id)}
                >
                  {selectedSite.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleDeleteSite(selectedSite._id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Site
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SitesSection;