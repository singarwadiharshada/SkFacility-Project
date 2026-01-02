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
import { Search, Plus, Edit, Trash2, Phone, Mail, Calendar, Eye, MapPin, Building, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Base URL for your backend
const API_BASE_URL = "http://localhost:5001/api";

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

// API Service Functions for your backend (Simplified for Admin)
const api = {
  // Clients
  async getClients(search?: string) {
    const url = search 
      ? `${API_BASE_URL}/crm/clients?search=${encodeURIComponent(search)}` 
      : `${API_BASE_URL}/crm/clients`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch clients');
    return res.json();
  },

  async createClient(data: Omit<Client, '_id' | 'createdAt' | 'updatedAt'>) {
    const res = await fetch(`${API_BASE_URL}/crm/clients`, {
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
      ? `${API_BASE_URL}/crm/leads?search=${encodeURIComponent(search)}` 
      : `${API_BASE_URL}/crm/leads`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  async createLead(data: Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>) {
    const res = await fetch(`${API_BASE_URL}/crm/leads`, {
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
    const res = await fetch(`${API_BASE_URL}/crm/leads/${id}/status`, {
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
      ? `${API_BASE_URL}/crm/communications?search=${encodeURIComponent(search)}` 
      : `${API_BASE_URL}/crm/communications`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch communications');
    return res.json();
  },

  async createCommunication(data: Omit<Communication, '_id' | 'createdAt'>) {
    const res = await fetch(`${API_BASE_URL}/crm/communications`, {
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
  const [loading, setLoading] = useState({
    clients: false,
    leads: false,
    communications: false
  });

  const [stats, setStats] = useState({
    totalClients: 0,
    activeLeads: 0,
    communications: 0
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
    await Promise.all([
      fetchClients(),
      fetchLeads(),
      fetchCommunications()
    ]);
    updateStats();
  };

  // Update stats from current data
  const updateStats = () => {
    setStats({
      totalClients: clients.length,
      activeLeads: leads.filter(l => !l.status.includes('closed')).length,
      communications: communications.length
    });
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
        fetchAllData();
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
        fetchAllData();
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
        fetchAllData();
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
        fetchAllData();
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="CRM Management" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Stats Cards - Simplified for Admin */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading.clients ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalClients}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {loading.leads ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.activeLeads}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Communications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading.communications ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.communications}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
          </TabsList>

          {/* Clients Tab - Admin can only add and view */}
          <TabsContent value="clients">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Client Management</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="mr-2 h-4 w-4" />Add Client</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Client</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddClient} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Client Name *</Label>
                            <Input id="name" name="name" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="company">Company *</Label>
                            <Input id="company" name="company" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" name="email" type="email" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input id="phone" name="phone" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input id="contactPerson" name="contactPerson" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Select name="industry" defaultValue="IT Services">
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                              <SelectContent>
                                {industries.map(industry => (
                                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Select name="city" defaultValue="Mumbai">
                              <SelectTrigger>
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                              <SelectContent>
                                {indianCities.map(city => (
                                  <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="value">Expected Value *</Label>
                            <Input id="value" name="value" placeholder="₹50,00,000" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Textarea id="address" name="address" />
                        </div>
                        <Button type="submit" className="w-full">Add Client</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading.clients ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No clients found. Add your first client!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client._id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {client.company}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{client.industry}</TableCell>
                          <TableCell className="font-semibold">{client.value}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(client.status)}>
                              {client.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setViewClientDialog(client._id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Client Details</DialogTitle>
                                </DialogHeader>
                                {viewClientDialog && getClientById(viewClientDialog) && (() => {
                                  const client = getClientById(viewClientDialog)!;
                                  return (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div><strong>Name:</strong> {client.name}</div>
                                        <div><strong>Company:</strong> {client.company}</div>
                                        <div><strong>Email:</strong> {client.email}</div>
                                        <div><strong>Phone:</strong> {client.phone}</div>
                                        <div><strong>Industry:</strong> {client.industry}</div>
                                        <div><strong>City:</strong> {client.city}</div>
                                        <div><strong>Value:</strong> {client.value}</div>
                                        <div><strong>Status:</strong> {client.status}</div>
                                        <div><strong>Contact Person:</strong> {client.contactPerson || "N/A"}</div>
                                        <div><strong>Created:</strong> {formatDate(client.createdAt)}</div>
                                        <div><strong>Updated:</strong> {formatDate(client.updatedAt)}</div>
                                      </div>
                                      {client.address && (
                                        <div>
                                          <strong>Address:</strong>
                                          <div className="flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {client.address}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads Tab - Admin can add and update status */}
          <TabsContent value="leads">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Lead Management</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Lead</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddLead} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="leadName">Lead Name *</Label>
                            <Input id="leadName" name="name" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="leadCompany">Company *</Label>
                            <Input id="leadCompany" name="company" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="leadEmail">Email *</Label>
                            <Input id="leadEmail" name="email" type="email" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="leadPhone">Phone *</Label>
                            <Input id="leadPhone" name="phone" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="source">Source *</Label>
                            <Select name="source" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                              <SelectContent>
                                {leadSources.map(source => (
                                  <SelectItem key={source} value={source}>{source}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="leadValue">Expected Value *</Label>
                            <Input id="leadValue" name="value" placeholder="₹30,00,000" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="assignedTo">Assign To *</Label>
                            <Input id="assignedTo" name="assignedTo" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="followUpDate">Follow-up Date</Label>
                            <Input id="followUpDate" name="followUpDate" type="date" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leadNotes">Notes</Label>
                          <Textarea id="leadNotes" name="notes" />
                        </div>
                        <Button type="submit" className="w-full">Add Lead</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading.leads ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads found. Add your first lead!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Follow-up</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead._id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.company}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="text-sm">{lead.email}</div>
                              <div className="text-sm">{lead.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>{lead.source}</TableCell>
                          <TableCell>
                            <Select 
                              value={lead.status} 
                              onValueChange={(value) => handleLeadStatusChange(lead._id, value as Lead['status'])}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="proposal">Proposal Sent</SelectItem>
                                <SelectItem value="negotiation">Negotiation</SelectItem>
                                <SelectItem value="closed-won">Won</SelectItem>
                                <SelectItem value="closed-lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="font-semibold">{lead.value}</TableCell>
                          <TableCell>
                            {lead.followUpDate ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(lead.followUpDate)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No follow-up</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setViewLeadDialog(lead._id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Lead Details</DialogTitle>
                                </DialogHeader>
                                {viewLeadDialog && getLeadById(viewLeadDialog) && (() => {
                                  const lead = getLeadById(viewLeadDialog)!;
                                  return (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div><strong>Name:</strong> {lead.name}</div>
                                        <div><strong>Company:</strong> {lead.company}</div>
                                        <div><strong>Email:</strong> {lead.email}</div>
                                        <div><strong>Phone:</strong> {lead.phone}</div>
                                        <div><strong>Source:</strong> {lead.source}</div>
                                        <div><strong>Status:</strong> {getStatusText(lead.status)}</div>
                                        <div><strong>Value:</strong> {lead.value}</div>
                                        <div><strong>Assigned To:</strong> {lead.assignedTo}</div>
                                        <div><strong>Created:</strong> {formatDate(lead.createdAt)}</div>
                                        <div><strong>Updated:</strong> {formatDate(lead.updatedAt)}</div>
                                      </div>
                                      {lead.followUpDate && (
                                        <div>
                                          <strong>Follow-up Date:</strong> {formatDate(lead.followUpDate)}
                                        </div>
                                      )}
                                      {lead.notes && (
                                        <div>
                                          <strong>Notes:</strong>
                                          <div className="mt-1 p-2 border rounded">{lead.notes}</div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communications Tab - Admin can add only */}
          <TabsContent value="communications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Communication Logs</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search communications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="mr-2 h-4 w-4" />Log Communication</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Log Communication</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddCommunication} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="commClientName">Client Name *</Label>
                            <Select name="clientName" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map(client => (
                                  <SelectItem key={client._id} value={client.name}>
                                    {client.name} - {client.company}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="commType">Type *</Label>
                            <Select name="type" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {communicationTypes.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="commDate">Date *</Label>
                            <Input 
                              id="commDate" 
                              name="date" 
                              type="date" 
                              defaultValue={new Date().toISOString().split('T')[0]} 
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="commClientId">Client ID</Label>
                            <Select name="clientId">
                              <SelectTrigger>
                                <SelectValue placeholder="Select client ID" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map(client => (
                                  <SelectItem key={client._id} value={client._id}>
                                    {client._id.slice(-6)} - {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="commNotes">Notes *</Label>
                          <Textarea id="commNotes" name="notes" required />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="followUpRequired" 
                            name="followUpRequired" 
                            className="rounded" 
                          />
                          <Label htmlFor="followUpRequired">Follow-up Required</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="commFollowUpDate">Follow-up Date</Label>
                          <Input id="commFollowUpDate" name="followUpDate" type="date" />
                        </div>
                        <Button type="submit" className="w-full">Log Communication</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading.communications ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : communications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No communications found. Log your first communication!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Follow-up</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communications.map((comm) => (
                        <TableRow key={comm._id}>
                          <TableCell className="font-medium">
                            {comm.clientName}
                            {typeof comm.clientId === 'object' && comm.clientId && (
                              <div className="text-sm text-muted-foreground">
                                {comm.clientId.company}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getCommunicationTypeIcon(comm.type)}
                              {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(comm.date)}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate">{comm.notes}</div>
                          </TableCell>
                          <TableCell>
                            {comm.followUpRequired ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {comm.followUpDate ? formatDate(comm.followUpDate) : "Pending"}
                              </div>
                            ) : (
                              <Badge variant="outline">Not Required</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default AdminCRM;