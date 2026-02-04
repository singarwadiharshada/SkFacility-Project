import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Plus, Edit, Trash2, Phone, Mail, Calendar, Eye, MapPin, Building, 
  Loader2, Users, Target, MessageSquare, DollarSign, ArrowUpRight, TrendingUp,
  CheckCircle, XCircle, Filter, MoreVertical, ChevronRight, Clock, Bell, Sun,
  FileText, Download, Upload
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Base URL for your backend
const API_URL = `http://${window.location.hostname}:5001/api`;

interface Client {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: "active" | "inactive";
  value: string;
  industry: string;
  contactPerson: string;
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
  value: string;
  assignedTo: string;
  followUpDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Communication {
  _id: string;
  clientName: string;
  clientId: {
    _id: string;
    name: string;
    company: string;
    email: string;
  } | string;
  type: "call" | "email" | "meeting" | "demo";
  date: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: string;
  createdAt: string;
}

interface CRMStats {
  totalClients: number;
  activeLeads: number;
  totalCommunications: number;
  totalValue: string;
}

// API Service Functions for your backend (Simplified for Admin)
const api = {
  // CRM Stats
  async getCRMStats() {
    const res = await fetch(`${API_URL}/crm/clients/crm-stats`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to fetch CRM stats');
    }
    return res.json();
  },

  // Clients
  async getClients(search?: string) {
    const url = search 
      ? `${API_URL}/crm/clients?search=${encodeURIComponent(search)}` 
      : `${API_URL}/crm/clients`;
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to fetch clients');
    }
    return res.json();
  },

  async createClient(data: Omit<Client, '_id' | 'createdAt' | 'updatedAt'>) {
    const res = await fetch(`${API_URL}/crm/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to create client');
    }
    return res.json();
  },

  // Leads
  async getLeads(search?: string) {
    const url = search 
      ? `${API_URL}/crm/leads?search=${encodeURIComponent(search)}` 
      : `${API_URL}/crm/leads`;
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to fetch leads');
    }
    return res.json();
  },

  async createLead(data: Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>) {
    const res = await fetch(`${API_URL}/crm/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to create lead');
    }
    return res.json();
  },

  async updateLeadStatus(id: string, status: Lead['status']) {
    const res = await fetch(`${API_URL}/crm/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update lead status');
    }
    return res.json();
  },

  // Communications
  async getCommunications(search?: string) {
    const url = search 
      ? `${API_URL}/crm/communications?search=${encodeURIComponent(search)}` 
      : `${API_URL}/crm/communications`;
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to fetch communications');
    }
    return res.json();
  },

  async createCommunication(data: Omit<Communication, '_id' | 'createdAt'>) {
    const res = await fetch(`${API_URL}/crm/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to create communication');
    }
    return res.json();
  },
};

// Indian Data constants
const indianCities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"];
const industries = ["IT Services", "Manufacturing", "Banking", "Healthcare", "Education", "Real Estate", "Retail", "Automobile"];
const leadSources = ["Website", "Referral", "Cold Call", "Social Media", "Email Campaign", "Trade Show"];
const communicationTypes = ["call", "email", "meeting", "demo"];

const AdminCRM = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [viewClientDialog, setViewClientDialog] = useState<string | null>(null);
  const [viewLeadDialog, setViewLeadDialog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("clients");
  const [loading, setLoading] = useState({
    stats: false,
    clients: false,
    leads: false,
    communications: false
  });

  const [stats, setStats] = useState<CRMStats>({
    totalClients: 0,
    activeLeads: 0,
    totalCommunications: 0,
    totalValue: "₹0"
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch all data
  const fetchAllData = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const statsResult = await api.getCRMStats();
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error: any) {
      console.error('Error fetching CRM stats:', error);
      // Don't show error toast for stats, use fallback UI
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
    
    await Promise.all([
      fetchClients(),
      fetchLeads(),
      fetchCommunications()
    ]);
  };

  // Fetch Clients
  const fetchClients = async () => {
    try {
      setLoading(prev => ({ ...prev, clients: true }));
      const result = await api.getClients(searchQuery);
      if (result.success) {
        setClients(result.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch clients");
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  };

  // Fetch Leads
  const fetchLeads = async () => {
    try {
      setLoading(prev => ({ ...prev, leads: true }));
      const result = await api.getLeads(searchQuery);
      if (result.success) {
        setLeads(result.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch leads");
    } finally {
      setLoading(prev => ({ ...prev, leads: false }));
    }
  };

  // Fetch Communications
  const fetchCommunications = async () => {
    try {
      setLoading(prev => ({ ...prev, communications: true }));
      const result = await api.getCommunications(searchQuery);
      if (result.success) {
        setCommunications(result.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch communications");
    } finally {
      setLoading(prev => ({ ...prev, communications: false }));
    }
  };

  // Handle search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
      fetchLeads();
      fetchCommunications();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Client Functions
  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const newClient = {
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address: formData.get("address") as string || "",
        city: formData.get("city") as string || "Mumbai",
        status: "active" as const,
        value: formData.get("value") as string,
        industry: formData.get("industry") as string || "IT Services",
        contactPerson: formData.get("contactPerson") as string || "",
      };

      const result = await api.createClient(newClient);
      if (result.success) {
        toast.success("Client added successfully!");
        setClientDialogOpen(false);
        fetchAllData(); // Refresh all data including stats
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add client");
    }
  };

  // Lead Functions
  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const newLead = {
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        source: formData.get("source") as string,
        status: "new" as const,
        value: formData.get("value") as string,
        assignedTo: formData.get("assignedTo") as string,
        followUpDate: formData.get("followUpDate") as string || "",
        notes: formData.get("notes") as string || "",
      };

      const result = await api.createLead(newLead);
      if (result.success) {
        toast.success("Lead added successfully!");
        setLeadDialogOpen(false);
        fetchAllData(); // Refresh all data including stats
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add lead");
    }
  };

  const handleLeadStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const result = await api.updateLeadStatus(leadId, newStatus);
      if (result.success) {
        toast.success("Lead status updated!");
        fetchAllData(); // Refresh all data including stats
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update lead status");
    }
  };

  // Communication Functions
  const handleAddCommunication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const newComm = {
        clientName: formData.get("clientName") as string,
        clientId: formData.get("clientId") as string,
        type: formData.get("type") as "call" | "email" | "meeting" | "demo",
        date: formData.get("date") as string,
        notes: formData.get("notes") as string,
        followUpRequired: formData.get("followUpRequired") === "on",
        followUpDate: formData.get("followUpDate") as string || undefined,
      };

      const result = await api.createCommunication(newComm);
      if (result.success) {
        toast.success("Communication logged successfully!");
        setCommDialogOpen(false);
        fetchAllData(); // Refresh all data including stats
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to log communication");
    }
  };

  // Utility Functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "qualified": return "default";
      case "proposal": return "secondary";
      case "negotiation": return "outline";
      case "closed-won": return "default";
      case "closed-lost": return "destructive";
      case "active": return "default";
      case "inactive": return "outline";
      default: return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new": return "New";
      case "contacted": return "Contacted";
      case "qualified": return "Qualified";
      case "proposal": return "Proposal Sent";
      case "negotiation": return "Negotiation";
      case "closed-won": return "Won";
      case "closed-lost": return "Lost";
      default: return status;
    }
  };

  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-3 w-3 mr-1" />;
      case "email": return <Mail className="h-3 w-3 mr-1" />;
      case "meeting": return <Calendar className="h-3 w-3 mr-1" />;
      case "demo": return <Eye className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  const getClientById = (id: string) => clients.find(client => client._id === id);
  const getLeadById = (id: string) => leads.find(lead => lead._id === id);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Fallback stats calculation if API fails
  const getFallbackStats = (): CRMStats => {
    return {
      totalClients: clients.length,
      activeLeads: leads.filter(l => !l.status.includes('closed')).length,
      totalCommunications: communications.length,
      totalValue: `₹${clients
        .filter(c => c.status === 'active')
        .reduce((sum, client) => {
          const value = parseFloat(client.value.replace(/[^0-9.-]+/g, '')) || 0;
          return sum + value;
        }, 0)
        .toLocaleString('en-IN')}`
    };
  };

  // Use actual stats or fallback
  const displayStats = loading.stats ? stats : stats.totalClients > 0 ? stats : getFallbackStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM Management</h1>
            <p className="text-sm text-gray-500 mt-1">Admin Panel - Manage your CRM data</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients, leads, communications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 rounded-full border-gray-300 bg-gray-100 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards with Premium Look */}
        <div className="grid gap-6 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Clients</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading.stats ? (
                        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                      ) : (
                        displayStats.totalClients.toLocaleString('en-IN')
                      )}
                    </p>
                  </div>
                </div>
               
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Active Leads</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {loading.stats ? (
                        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                      ) : (
                        displayStats.activeLeads.toLocaleString('en-IN')
                      )}
                    </p>
                  </div>
                </div>
               
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Communications</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading.stats ? (
                        <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
                      ) : (
                        displayStats.totalCommunications.toLocaleString('en-IN')
                      )}
                    </p>
                  </div>
                </div>
               
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-green-50 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Value</p>
                    <p className="text-3xl font-bold text-green-600">
                      {loading.stats ? (
                        <Loader2 className="h-7 w-7 animate-spin text-green-500" />
                      ) : (
                        displayStats.totalValue
                      )}
                    </p>
                  </div>
                </div>
               
              </CardContent>
            </Card>
          </motion.div>
        </div>

        
        {/* Tabs Section */}
        <div className="space-y-6">
          <div className="border-b border-gray-200">
            <Tabs defaultValue="clients" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-transparent p-0">
                <TabsTrigger 
                  value="clients" 
                  className="relative px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 transition-all"
                >
                  <Building className="mr-2 h-4 w-4" />
                  Clients
                  {activeTab === "clients" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 z-[-1]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="leads" 
                  className="relative px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 transition-all"
                >
                  <Target className="mr-2 h-4 w-4" />
                  Leads
                  {activeTab === "leads" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 z-[-1]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="communications" 
                  className="relative px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 transition-all"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Communications
                  {activeTab === "communications" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 z-[-1]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Clients Tab - Admin can only add and view */}
          <AnimatePresence mode="wait">
            {activeTab === "clients" && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Client Management</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Manage your client database</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Client
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-white rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-semibold text-gray-900">Add New Client</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddClient} className="space-y-5">
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Client Name *</Label>
                                  <Input id="name" name="name" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="company" className="text-sm font-medium text-gray-700">Company *</Label>
                                  <Input id="company" name="company" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                                  <Input id="email" name="email" type="email" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone *</Label>
                                  <Input id="phone" name="phone" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700">Contact Person</Label>
                                  <Input id="contactPerson" name="contactPerson" className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="industry" className="text-sm font-medium text-gray-700">Industry</Label>
                                  <Select name="industry" defaultValue="IT Services">
                                    <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select industry" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      {industries.map(industry => (
                                        <SelectItem key={industry} value={industry} className="rounded-md">{industry}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                                  <Select name="city" defaultValue="Mumbai">
                                    <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select city" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      {indianCities.map(city => (
                                        <SelectItem key={city} value={city} className="rounded-md">{city}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="value" className="text-sm font-medium text-gray-700">Expected Value *</Label>
                                  <Input id="value" name="value" placeholder="₹50,00,000" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
                                <Textarea id="address" name="address" className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]" />
                              </div>
                              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Add Client
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading.clients ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                          <p className="text-gray-500 mt-3">Loading clients...</p>
                        </div>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No clients found</h3>
                        <p className="text-gray-500 mt-2">
                          Add your first client to get started
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Industry</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clients.map((client, index) => (
                              <TableRow 
                                key={client._id} 
                                className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                              >
                                <TableCell className="py-4 px-6">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                      <span className="text-blue-600 font-semibold">{client.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{client.name}</div>
                                      <div className="text-sm text-gray-500">{client.city}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div className="flex items-center text-gray-700">
                                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                                    {client.company}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div className="space-y-1">
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Mail className="h-3 w-3 mr-2 text-gray-400" />
                                      {client.email}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Phone className="h-3 w-3 mr-2 text-gray-400" />
                                      {client.phone}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge variant="outline" className="border-gray-300 text-gray-700 font-normal px-3 py-1 rounded-full">
                                    {client.industry}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-right">
                                  <div className="font-bold text-green-600">{client.value}</div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge 
                                    className={`px-3 py-1 rounded-full ${
                                      client.status === 'active' 
                                        ? 'bg-green-100 text-green-800 border-green-200' 
                                        : 'bg-gray-100 text-gray-800 border-gray-200'
                                    }`}
                                  >
                                    {client.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => setViewClientDialog(client._id)}
                                          className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                          title="View Details"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl bg-white rounded-2xl">
                                        <DialogHeader>
                                          <DialogTitle className="text-lg font-semibold text-gray-900">Client Details</DialogTitle>
                                        </DialogHeader>
                                        {viewClientDialog && getClientById(viewClientDialog) && (() => {
                                          const client = getClientById(viewClientDialog)!;
                                          return (
                                            <div className="space-y-6">
                                              <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                                                  <span className="text-blue-600 font-bold text-xl">{client.name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                  <h3 className="text-xl font-bold text-gray-900">{client.name}</h3>
                                                  <p className="text-gray-500">{client.company}</p>
                                                </div>
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Email</Label>
                                                    <p className="flex items-center gap-2 text-gray-900">
                                                      <Mail className="h-4 w-4 text-gray-400" />
                                                      {client.email}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Phone</Label>
                                                    <p className="flex items-center gap-2 text-gray-900">
                                                      <Phone className="h-4 w-4 text-gray-400" />
                                                      {client.phone}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Industry</Label>
                                                    <p className="text-gray-900">{client.industry}</p>
                                                  </div>
                                                </div>
                                                <div className="space-y-4">
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">City</Label>
                                                    <p className="flex items-center gap-2 text-gray-900">
                                                      <MapPin className="h-4 w-4 text-gray-400" />
                                                      {client.city}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Value</Label>
                                                    <p className="text-lg font-bold text-green-600">{client.value}</p>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Status</Label>
                                                    <Badge 
                                                      className={`px-3 py-1 rounded-full ${
                                                        client.status === 'active' 
                                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                                          : 'bg-gray-100 text-gray-800 border-gray-200'
                                                      }`}
                                                    >
                                                      {client.status}
                                                    </Badge>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {client.address && (
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Address</Label>
                                                  <div className="flex items-start gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                                                    <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                                                    <p className="text-gray-900">{client.address}</p>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                                                <span>Created: {formatDate(client.createdAt)}</span>
                                                <span>Updated: {formatDate(client.updatedAt)}</span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </DialogContent>
                                    </Dialog>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Leads Tab - Admin can add and update status */}
          <AnimatePresence mode="wait">
            {activeTab === "leads" && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Lead Management</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Track and convert potential opportunities</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Lead
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-white rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-semibold text-gray-900">Add New Lead</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddLead} className="space-y-5">
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="leadName" className="text-sm font-medium text-gray-700">Lead Name *</Label>
                                  <Input id="leadName" name="name" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="leadCompany" className="text-sm font-medium text-gray-700">Company *</Label>
                                  <Input id="leadCompany" name="company" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="leadEmail" className="text-sm font-medium text-gray-700">Email *</Label>
                                  <Input id="leadEmail" name="email" type="email" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="leadPhone" className="text-sm font-medium text-gray-700">Phone *</Label>
                                  <Input id="leadPhone" name="phone" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="source" className="text-sm font-medium text-gray-700">Source *</Label>
                                  <Select name="source" required>
                                    <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      {leadSources.map(source => (
                                        <SelectItem key={source} value={source} className="rounded-md">{source}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="leadValue" className="text-sm font-medium text-gray-700">Expected Value *</Label>
                                  <Input id="leadValue" name="value" placeholder="₹30,00,000" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="assignedTo" className="text-sm font-medium text-gray-700">Assign To *</Label>
                                  <Input id="assignedTo" name="assignedTo" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="followUpDate" className="text-sm font-medium text-gray-700">Follow-up Date</Label>
                                  <Input id="followUpDate" name="followUpDate" type="date" className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="leadNotes" className="text-sm font-medium text-gray-700">Notes</Label>
                                <Textarea id="leadNotes" name="notes" className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]" />
                              </div>
                              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Add Lead
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading.leads ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                          <p className="text-gray-500 mt-3">Loading leads...</p>
                        </div>
                      </div>
                    ) : leads.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Target className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No leads found</h3>
                        <p className="text-gray-500 mt-2">
                          Add your first lead to get started
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Lead</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Source</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Follow-up</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leads.map((lead, index) => (
                              <TableRow 
                                key={lead._id} 
                                className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                              >
                                <TableCell className="py-4 px-6">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                      <span className="text-blue-600 font-semibold">{lead.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{lead.name}</div>
                                      <div className="text-sm text-gray-500">Added {formatDate(lead.createdAt)}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div className="flex items-center text-gray-700">
                                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                                    {lead.company}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div className="space-y-1">
                                    <div className="text-sm text-gray-600">{lead.email}</div>
                                    <div className="text-sm text-gray-600">{lead.phone}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge variant="outline" className="border-gray-300 text-gray-700 font-normal px-3 py-1 rounded-full">
                                    {lead.source}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Select 
                                    value={lead.status} 
                                    onValueChange={(value) => handleLeadStatusChange(lead._id, value as Lead['status'])}
                                  >
                                    <SelectTrigger className="w-36 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      <SelectItem value="new" className="rounded-md">New</SelectItem>
                                      <SelectItem value="contacted" className="rounded-md">Contacted</SelectItem>
                                      <SelectItem value="qualified" className="rounded-md">Qualified</SelectItem>
                                      <SelectItem value="proposal" className="rounded-md">Proposal Sent</SelectItem>
                                      <SelectItem value="negotiation" className="rounded-md">Negotiation</SelectItem>
                                      <SelectItem value="closed-won" className="rounded-md">Won</SelectItem>
                                      <SelectItem value="closed-lost" className="rounded-md">Lost</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div className="font-bold text-blue-600">{lead.value}</div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  {lead.followUpDate ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-700">{formatDate(lead.followUpDate)}</span>
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="border-gray-300 text-gray-500 font-normal px-3 py-1 rounded-full">
                                      No follow-up
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => setViewLeadDialog(lead._id)}
                                          className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                          title="View Details"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl bg-white rounded-2xl">
                                        <DialogHeader>
                                          <DialogTitle className="text-lg font-semibold text-gray-900">Lead Details</DialogTitle>
                                        </DialogHeader>
                                        {viewLeadDialog && getLeadById(viewLeadDialog) && (() => {
                                          const lead = getLeadById(viewLeadDialog)!;
                                          return (
                                            <div className="space-y-6">
                                              <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                                                  <span className="text-blue-600 font-bold text-xl">{lead.name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                  <h3 className="text-xl font-bold text-gray-900">{lead.name}</h3>
                                                  <p className="text-gray-500">{lead.company}</p>
                                                </div>
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Email</Label>
                                                    <p className="flex items-center gap-2 text-gray-900">
                                                      <Mail className="h-4 w-4 text-gray-400" />
                                                      {lead.email}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Phone</Label>
                                                    <p className="flex items-center gap-2 text-gray-900">
                                                      <Phone className="h-4 w-4 text-gray-400" />
                                                      {lead.phone}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Source</Label>
                                                    <p className="text-gray-900">{lead.source}</p>
                                                  </div>
                                                </div>
                                                <div className="space-y-4">
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Status</Label>
                                                    <div>
                                                      <Badge 
                                                        className={`px-3 py-1 rounded-full ${
                                                          lead.status === 'new' 
                                                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                                            : lead.status === 'closed-won'
                                                            ? 'bg-green-100 text-green-800 border-green-200'
                                                            : 'bg-gray-100 text-gray-800 border-gray-200'
                                                        }`}
                                                      >
                                                        {getStatusText(lead.status)}
                                                      </Badge>
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Value</Label>
                                                    <p className="text-lg font-bold text-blue-600">{lead.value}</p>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-500 uppercase font-medium">Assigned To</Label>
                                                    <p className="text-gray-900">{lead.assignedTo}</p>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {lead.followUpDate && (
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Follow-up Date</Label>
                                                  <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span className="text-gray-900">{formatDate(lead.followUpDate)}</span>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {lead.notes && (
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Notes</Label>
                                                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-gray-900">{lead.notes}</p>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                                                <span>Created: {formatDate(lead.createdAt)}</span>
                                                <span>Updated: {formatDate(lead.updatedAt)}</span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </DialogContent>
                                    </Dialog>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Communications Tab - Admin can add only */}
          <AnimatePresence mode="wait">
            {activeTab === "communications" && (
              <motion.div
                key="communications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Communication Logs</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Track all client interactions and engagements</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow">
                              <Plus className="mr-2 h-4 w-4" />
                              Log Communication
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-white rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-semibold text-gray-900">Log Communication</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddCommunication} className="space-y-5">
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="commClientName" className="text-sm font-medium text-gray-700">Client Name *</Label>
                                  <Select name="clientName" required>
                                    <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      {clients.map(client => (
                                        <SelectItem key={client._id} value={client.name} className="rounded-md">
                                          {client.name} - {client.company}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="commType" className="text-sm font-medium text-gray-700">Type *</Label>
                                  <Select name="type" required>
                                    <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      {communicationTypes.map(type => (
                                        <SelectItem key={type} value={type} className="rounded-md">
                                          {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <Label htmlFor="commDate" className="text-sm font-medium text-gray-700">Date *</Label>
                                  <Input 
                                    id="commDate" 
                                    name="date" 
                                    type="date" 
                                    defaultValue={new Date().toISOString().split('T')[0]} 
                                    required 
                                    className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="commClientId">Client ID</Label>
                                  <Select name="clientId">
                                    <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select client ID" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      {clients.map(client => (
                                        <SelectItem key={client._id} value={client._id} className="rounded-md">
                                          {client._id.slice(-6)} - {client.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="commNotes" className="text-sm font-medium text-gray-700">Notes *</Label>
                                <Textarea id="commNotes" name="notes" required className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px]" />
                              </div>
                              <div className="flex items-center space-x-2">
                                <input 
                                  type="checkbox" 
                                  id="followUpRequired" 
                                  name="followUpRequired" 
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                />
                                <Label htmlFor="followUpRequired" className="text-sm text-gray-700">Follow-up Required</Label>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="commFollowUpDate">Follow-up Date</Label>
                                <Input id="commFollowUpDate" name="followUpDate" type="date" className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                              </div>
                              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Log Communication
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading.communications ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                          <p className="text-gray-500 mt-3">Loading communications...</p>
                        </div>
                      </div>
                    ) : communications.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <MessageSquare className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No communications found</h3>
                        <p className="text-gray-500 mt-2">
                          Log your first communication to start tracking client interactions
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Notes</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Follow-up</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {communications.map((comm, index) => (
                              <TableRow 
                                key={comm._id} 
                                className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                              >
                                <TableCell className="py-4 px-6">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                      <span className="text-blue-600 font-semibold">{comm.clientName.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{comm.clientName}</div>
                                      {typeof comm.clientId === 'object' && comm.clientId && (
                                        <div className="text-sm text-gray-500">
                                          {comm.clientId.company}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge 
                                    variant="outline" 
                                    className="gap-1 border-gray-300 text-gray-700 font-normal px-3 py-1 rounded-full"
                                  >
                                    {getCommunicationTypeIcon(comm.type)}
                                    {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div className="text-sm text-gray-700">
                                    {formatDateTime(comm.date)}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 max-w-xs">
                                  <div className="truncate text-gray-600" title={comm.notes}>{comm.notes}</div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  {comm.followUpRequired ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      {comm.followUpDate ? (
                                        <span className="text-sm text-gray-700">{formatDate(comm.followUpDate)}</span>
                                      ) : (
                                        <Badge 
                                          variant="outline" 
                                          className="border-orange-200 text-orange-600 font-normal px-3 py-1 rounded-full"
                                        >
                                          Pending
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge 
                                      variant="outline" 
                                      className="border-gray-300 text-gray-500 font-normal px-3 py-1 rounded-full"
                                    >
                                      Not Required
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminCRM;