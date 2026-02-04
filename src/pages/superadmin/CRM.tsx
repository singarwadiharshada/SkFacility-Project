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
  Loader2, Upload, Download, Users, TrendingUp, Target, BarChart3, MessageSquare,
  ChevronRight, Filter, MoreVertical, CheckCircle, XCircle, AlertCircle,
  ArrowUpRight, Users as UsersIcon, FileText, Clock, Bell, Sun, Moon,
  DollarSign, Check, X, Menu, DownloadCloud, UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { 
  crmService, 
  Client, 
  Lead, 
  Communication,
  CRMStats 
} from "../../services/crmService";

// Indian Data constants
const indianCities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"];
const industries = ["MALL", "COMMERCIAL", "Banking", "Healthcare", "Education", "Real Estate", "Retail", "Automobile"];
const leadSources = ["Website", "Referral", "Cold Call", "Social Media", "Email Campaign", "Trade Show"];
const communicationTypes = ["call", "email", "meeting", "demo"];

const CRM = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [importClientDialogOpen, setImportClientDialogOpen] = useState(false);
  const [importLeadDialogOpen, setImportLeadDialogOpen] = useState(false);
  const [viewClientDialog, setViewClientDialog] = useState<string | null>(null);
  const [viewLeadDialog, setViewLeadDialog] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");
  const [loading, setLoading] = useState({
    clients: false,
    leads: false,
    communications: false,
    stats: false
  });

  const [stats, setStats] = useState<CRMStats>({
    totalClients: 0,
    activeLeads: 0,
    totalValue: "₹0",
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
    setLoading({
      clients: true,
      leads: true,
      communications: true,
      stats: true
    });

    try {
      const data = await crmService.fetchAllData(searchQuery);
      setStats(data.stats);
      setClients(data.clients);
      setLeads(data.leads);
      setCommunications(data.communications);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading({
        clients: false,
        leads: false,
        communications: false,
        stats: false
      });
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const statsData = await crmService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Fetch Clients
  const fetchClients = async () => {
    try {
      setLoading(prev => ({ ...prev, clients: true }));
      const clientsData = await crmService.clients.getAll(searchQuery);
      setClients(clientsData);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  };

  // Fetch Leads
  const fetchLeads = async () => {
    try {
      setLoading(prev => ({ ...prev, leads: true }));
      const leadsData = await crmService.leads.getAll(searchQuery);
      setLeads(leadsData);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(prev => ({ ...prev, leads: false }));
    }
  };

  // Fetch Communications
  const fetchCommunications = async () => {
    try {
      setLoading(prev => ({ ...prev, communications: true }));
      const communicationsData = await crmService.communications.getAll(searchQuery);
      setCommunications(communicationsData);
    } catch (error) {
      console.error("Failed to fetch communications:", error);
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

  // Common function to read Excel file
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { 
            header: 1,
            blankrows: false,
            defval: ''
          });
          
          if (jsonData.length < 2) {
            resolve([]);
            return;
          }
          
          const headers = (jsonData[0] as string[]).map(h => h?.toString().trim() || '');
          const rows = jsonData.slice(1) as any[];
          
          const formattedData = rows
            .filter(row => {
              return row.some((cell: any) => cell !== null && cell !== undefined && cell.toString().trim() !== '');
            })
            .map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                if (header && row[index] !== undefined && row[index] !== null) {
                  obj[header] = row[index]?.toString().trim();
                } else {
                  obj[header] = '';
                }
              });
              return obj;
            });
          
          resolve(formattedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsBinaryString(file);
    });
  };

  // Client Import Functions
  const handleImportExcel = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }
    
    setImportLoading(true);
    
    try {
      const importedData = await readExcelFile(importFile);
      const validData = validateImportData(importedData);
      
      if (validData.length === 0) {
        toast.error("No valid data found in the file");
        return;
      }
      
      console.log('Data to be imported:', validData);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Import each valid client
      for (const clientData of validData) {
        try {
          // Remove the temporary _id before sending to API
          const { _id, createdAt, updatedAt, ...clientToCreate } = clientData;
          await crmService.clients.create(clientToCreate);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to import client ${clientData.name}:`, error);
          errors.push(`${clientData.name}: ${error.message || 'Unknown error'}`);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} clients${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        if (errors.length > 0) {
          console.error('Import errors:', errors);
        }
        setImportClientDialogOpen(false);
        setImportFile(null);
        fetchAllData();
      } else {
        toast.error(`Failed to import any clients. ${errors[0] || 'Check the template format.'}`);
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import file. Please check the format.");
    } finally {
      setImportLoading(false);
    }
  };

  const validateImportData = (data: any[]): Client[] => {
    const validClients: Client[] = [];
    
    data.forEach((row, index) => {
      if (!row['Client Name'] && !row['Company']) {
        console.warn(`Skipping row ${index + 1}: Missing client name and company`);
        return;
      }
      
      // Generate placeholder data for missing required fields
      const clientName = row['Client Name'] || '';
      const companyName = row['Company'] || '';
      
      // Generate email from client name if empty
      let email = row['Email'] || '';
      if (!email && clientName) {
        const emailName = clientName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '.');
        email = `${emailName}@company.com`;
      }
      
      // Generate phone number if empty
      let phone = row['Phone']?.toString() || '';
      if (!phone) {
        // Generate a random Indian phone number
        const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
        phone = `9${randomNum.toString().slice(0, 9)}`;
      }
      
      // Generate expected value if empty
      let expectedValue = row['Expected Value'] || '';
      if (!expectedValue) {
        const randomValue = Math.floor(10 + Math.random() * 90) * 100000;
        expectedValue = `₹${randomValue.toLocaleString('en-IN')}`;
      }
      
      // Set industry if empty
      const industry = row['Industry'] || 'COMMERCIAL';
      
      // Create client object from Excel data
      const client: Client = {
        _id: `temp-${Date.now()}-${index}`,
        name: clientName,
        company: companyName,
        email: email,
        phone: phone,
        industry: industry,
        city: row['City'] || 'Pune',
        value: expectedValue,
        address: row['Address'] || '',
        contactPerson: row['Contact Person'] || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (!client.name.trim()) {
        console.warn(`Skipping row ${index + 1}: Missing client name`);
        return;
      }
      
      if (!client.company.trim()) {
        console.warn(`Skipping row ${index + 1}: Missing company name`);
        return;
      }
      
      validClients.push(client);
    });
    
    return validClients;
  };

  const downloadClientTemplate = () => {
    const templateData = [
      ['SR. NO.', 'Client Name', 'Company', 'Email', 'Phone', 'Industry', 'City', 'Expected Value', 'Address', 'Contact Person (Optional)'],
      ['1', 'PHOENIX MALL', 'ALYSSUM DEVELOPERS PVT LTD', 'contact@phoenixmall.com', '9876543210', 'MALL', 'PUNE', '₹50,00,000', 'WAKAD. PUNE', ''],
      ['2', 'HIGHSTREET MALL', 'HARKRISH PROPERTIES PVT LTD', 'info@highstreetmall.com', '9876543211', 'MALL', 'PUNE', '₹75,00,000', 'HINJEWADI, PUNE', ''],
      ['3', 'WESTEND MALL', 'CHITRALI PROPERTIES PVT LTD', 'admin@westendmall.com', '9876543212', 'MALL', 'PUNE', '₹60,00,000', 'AUNDH PUNE', ''],
      ['4', 'GLOBAL GROUP', 'GLOBAL SQUARE REALTY LLP', 'contact@globalgroup.com', '9876543213', 'COMMERCIAL', 'PUNE', '₹80,00,000', 'YERWADA, PUNE', ''],
      ['5', 'K RAHEJA GROUP', 'KRC INFRASTRUCTURE', 'info@kraheja.com', '9876543214', 'COMMERCIAL', 'PUNE', '₹90,00,000', 'KHARADI, PUNE', ''],
      ['6', 'T-ONE', 'ASTITVA ASSET MANAGEMENT LLP', 'contact@t-one.com', '9876543215', 'COMMERCIAL', 'PUNE', '₹40,00,000', 'HINJEWADI, PUNE', ''],
      ['7', 'GANGA TRUENO', 'KAPPA REALTORS PVT LTD', 'info@ganguatrueno.com', '9876543216', 'COMMERCIAL', 'PUNE', '₹55,00,000', 'VIMAN NAGAR, PUNE', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['Note:', 'Required', 'Required', 'Required', 'Required', 'Required (Options: MALL, COMMERCIAL, etc.)', 'Optional', 'Required (e.g. ₹50,00,000)', 'Optional', 'Optional'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Client Details');
    XLSX.writeFile(wb, 'Client_Import_Template.xlsx');
  };

  // Lead Import Functions
  const handleImportLeadExcel = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }
    
    setImportLoading(true);
    
    try {
      const importedData = await readExcelFile(importFile);
      console.log('Raw imported data:', importedData);
      
      const validData = validateLeadImportData(importedData);
      console.log('Valid lead data:', validData);
      
      if (validData.length === 0) {
        toast.error("No valid lead data found in the file");
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Import each valid lead
      for (const leadData of validData) {
        try {
          // Remove the temporary _id before sending to API
          const { _id, createdAt, updatedAt, ...leadToCreate } = leadData;
          await crmService.leads.create(leadToCreate);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to import lead ${leadData.name}:`, error);
          errors.push(`${leadData.name}: ${error.message || 'Unknown error'}`);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} leads${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        if (errors.length > 0) {
          console.error('Lead import errors:', errors);
        }
        setImportLeadDialogOpen(false);
        setImportFile(null);
        fetchAllData();
      } else {
        toast.error(`Failed to import any leads. ${errors[0] || 'Check the template format.'}`);
      }
    } catch (error) {
      console.error("Lead import failed:", error);
      toast.error("Failed to import file. Please check the format.");
    } finally {
      setImportLoading(false);
    }
  };

  const validateLeadImportData = (data: any[]): Lead[] => {
    const validLeads: Lead[] = [];
    
    console.log('Validating lead data, total rows:', data.length);
    
    data.forEach((row, index) => {
      console.log(`Row ${index}:`, row);
      
      // Get values from row (case-insensitive column names)
      const leadName = row['Lead Name'] || row['Lead Name*'] || row['LEAD NAME'] || row['lead name'] || '';
      const companyName = row['Company'] || row['Company*'] || row['COMPANY'] || row['company'] || '';
      const email = row['Email'] || row['Email*'] || row['EMAIL'] || row['email'] || '';
      const phone = row['Phone'] || row['Phone*'] || row['PHONE'] || row['phone'] || '';
      const source = row['Source'] || row['Source*'] || row['SOURCE'] || row['source'] || 'Website';
      const expectedValue = row['Expected Value'] || row['Expected Value*'] || row['EXPECTED VALUE'] || row['expected value'] || row['Value'] || '';
      const assignedTo = row['Assigned To'] || row['Assigned To*'] || row['ASSIGNED TO'] || row['assigned to'] || 'Sales Team';
      const followUpDate = row['Follow-up Date'] || row['Follow-up Date*'] || row['FOLLOW-UP DATE'] || row['follow-up date'] || row['Follow Up Date'] || '';
      const notes = row['Notes'] || row['NOTES'] || row['notes'] || '';
      
      console.log(`Row ${index} parsed:`, {
        leadName, companyName, email, phone, source, expectedValue, assignedTo, followUpDate, notes
      });
      
      // Skip if both lead name and company are empty
      if (!leadName.trim() && !companyName.trim()) {
        console.log(`Skipping row ${index + 1}: Missing both lead name and company`);
        return;
      }
      
      // Generate missing required data
      let finalLeadName = leadName.trim();
      let finalCompanyName = companyName.trim();
      let finalEmail = email.trim();
      let finalPhone = phone.toString().trim();
      let finalValue = expectedValue.trim();
      
      // If lead name is empty but company exists, use company name
      if (!finalLeadName && finalCompanyName) {
        finalLeadName = `Contact at ${finalCompanyName}`;
      }
      
      // If company is empty but lead name exists, use lead name
      if (!finalCompanyName && finalLeadName) {
        finalCompanyName = `${finalLeadName}'s Company`;
      }
      
      // Generate email if empty
      if (!finalEmail && finalLeadName) {
        const emailName = finalLeadName.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '.');
        finalEmail = `${emailName}@company.com`;
      }
      
      // Generate phone number if empty
      if (!finalPhone) {
        const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
        finalPhone = `9${randomNum.toString().slice(0, 9)}`;
      }
      
      // Generate expected value if empty
      if (!finalValue) {
        const randomValue = Math.floor(10 + Math.random() * 90) * 100000;
        finalValue = `₹${randomValue.toLocaleString('en-IN')}`;
      }
      
      // Validate source
      const validSources = ['Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Trade Show'];
      const finalSource = validSources.includes(source) ? source : 'Website';
      
      // Format follow-up date if provided
      let formattedFollowUpDate = '';
      if (followUpDate) {
        try {
          // Try to parse the date
          const date = new Date(followUpDate);
          if (!isNaN(date.getTime())) {
            formattedFollowUpDate = date.toISOString();
          }
        } catch (e) {
          console.log('Invalid follow-up date format:', followUpDate);
        }
      }
      
      // Create lead object
      const lead: Lead = {
        _id: `temp-${Date.now()}-${index}`,
        name: finalLeadName,
        company: finalCompanyName,
        email: finalEmail,
        phone: finalPhone,
        source: finalSource,
        status: 'new',
        value: finalValue,
        assignedTo: assignedTo.trim() || 'Sales Team',
        followUpDate: formattedFollowUpDate,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log(`Validated lead ${index}:`, lead);
      validLeads.push(lead);
    });
    
    console.log('Total valid leads:', validLeads.length);
    return validLeads;
  };

  const downloadLeadTemplate = () => {
    const templateData = [
      ['Lead Name*', 'Company*', 'Email*', 'Phone*', 'Source*', 'Expected Value*', 'Assigned To*', 'Follow-up Date', 'Notes'],
      ['Amit Sharma', 'Sharma Enterprises', 'amit@sharma.com', '9876543210', 'Website', '₹30,00,000', 'Sales Team', '2024-01-20', 'Interested in commercial space'],
      ['Priya Patel', 'Patel Group', 'priya@patelgroup.com', '9876543211', 'Referral', '₹45,00,000', 'Marketing Team', '2024-01-25', 'Follow up for meeting'],
      ['Raj Kumar', 'Kumar Industries', 'raj@kumar.com', '9876543212', 'Cold Call', '₹25,00,000', 'Sales Team', '2024-01-22', 'Requested proposal'],
      ['Sneha Gupta', 'Gupta Retail', 'sneha@gupta.com', '9876543213', 'Social Media', '₹35,00,000', 'Marketing Team', '2024-01-28', 'Initial inquiry'],
      ['Vikram Singh', 'Singh Builders', 'vikram@singh.com', '9876543214', 'Trade Show', '₹50,00,000', 'Sales Team', '2024-01-30', 'High priority lead'],
      ['', '', '', '', '', '', '', '', ''],
      ['*Required fields: Lead Name, Company, Email, Phone, Source, Expected Value, Assigned To'],
      ['Source options: Website, Referral, Cold Call, Social Media, Email Campaign, Trade Show'],
      ['Date format: YYYY-MM-DD'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lead Details');
    XLSX.writeFile(wb, 'Lead_Import_Template.xlsx');
  };

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

      await crmService.clients.create(newClient);
      setClientDialogOpen(false);
      fetchAllData();
      toast.success("Client added successfully!");
    } catch (error) {
      console.error("Failed to add client:", error);
      toast.error("Failed to add client. Please try again.");
    }
  };

  const handleEditClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient) return;
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const updateData = {
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address: formData.get("address") as string,
        city: formData.get("city") as string,
        value: formData.get("value") as string,
        industry: formData.get("industry") as string,
        contactPerson: formData.get("contactPerson") as string,
      };

      await crmService.clients.update(editingClient._id, updateData);
      setEditingClient(null);
      fetchAllData();
      toast.success("Client updated successfully!");
    } catch (error) {
      console.error("Failed to update client:", error);
      toast.error("Failed to update client. Please try again.");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    
    try {
      await crmService.clients.delete(clientId);
      fetchAllData();
      toast.success("Client deleted successfully!");
    } catch (error) {
      console.error("Failed to delete client:", error);
      toast.error("Failed to delete client. Please try again.");
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

      await crmService.leads.create(newLead);
      setLeadDialogOpen(false);
      fetchAllData();
      toast.success("Lead added successfully!");
    } catch (error) {
      console.error("Failed to add lead:", error);
      toast.error("Failed to add lead. Please try again.");
    }
  };

  const handleEditLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead) return;
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const updateData = {
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        source: formData.get("source") as string,
        value: formData.get("value") as string,
        assignedTo: formData.get("assignedTo") as string,
        followUpDate: formData.get("followUpDate") as string,
        notes: formData.get("notes") as string,
      };

      await crmService.leads.update(editingLead._id, updateData);
      setEditingLead(null);
      fetchAllData();
      toast.success("Lead updated successfully!");
    } catch (error) {
      console.error("Failed to update lead:", error);
      toast.error("Failed to update lead. Please try again.");
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    
    try {
      await crmService.leads.delete(leadId);
      fetchAllData();
      toast.success("Lead deleted successfully!");
    } catch (error) {
      console.error("Failed to delete lead:", error);
      toast.error("Failed to delete lead. Please try again.");
    }
  };

  const handleLeadStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      await crmService.leads.updateStatus(leadId, newStatus);
      fetchAllData();
      toast.success("Lead status updated!");
    } catch (error) {
      console.error("Failed to update lead status:", error);
      toast.error("Failed to update lead status. Please try again.");
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

      await crmService.communications.create(newComm);
      setCommDialogOpen(false);
      fetchAllData();
      toast.success("Communication logged successfully!");
    } catch (error) {
      console.error("Failed to log communication:", error);
      toast.error("Failed to log communication. Please try again.");
    }
  };

  const handleDeleteCommunication = async (commId: string) => {
    if (!confirm("Are you sure you want to delete this communication?")) return;
    
    try {
      await crmService.communications.delete(commId);
      fetchAllData();
      toast.success("Communication deleted successfully!");
    } catch (error) {
      console.error("Failed to delete communication:", error);
      toast.error("Failed to delete communication. Please try again.");
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CRM Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your clients, leads, and communications</p>
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
              <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <Sun className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
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
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-blue-500" /> : stats.totalClients}
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
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-blue-500" /> : stats.activeLeads}
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
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-green-50 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Value</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-green-500" /> : stats.totalValue}
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
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Communications</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-purple-500" /> : stats.communications}
                    </p>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Client Import Dialog */}
        <Dialog open={importClientDialogOpen} onOpenChange={setImportClientDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">Import Clients from Excel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-excel-file" className="text-sm font-medium text-gray-700">Upload Excel File</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                  <Input 
                    id="client-excel-file"
                    type="file" 
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Label htmlFor="client-excel-file" className="cursor-pointer">
                    <UploadCloud className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Drag & drop or click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports .xlsx, .xls, .csv files
                    </p>
                  </Label>
                  {importFile && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {importFile.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">Template Format</h4>
                <div className="text-sm space-y-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Required fields marked with *</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div><span className="font-medium">Client Name</span> <span className="text-red-500">*</span></div>
                    <div><span className="font-medium">Company</span> <span className="text-red-500">*</span></div>
                    <div><span className="font-medium">Email</span> <span className="text-red-500">*</span></div>
                    <div><span className="font-medium">Phone</span> <span className="text-red-500">*</span></div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={downloadClientTemplate}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
                
                <Button 
                  onClick={handleImportExcel}
                  disabled={!importFile || importLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Clients'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lead Import Dialog */}
        <Dialog open={importLeadDialogOpen} onOpenChange={setImportLeadDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">Import Leads from Excel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lead-excel-file" className="text-sm font-medium text-gray-700">Upload Excel File</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                  <Input 
                    id="lead-excel-file"
                    type="file" 
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Label htmlFor="lead-excel-file" className="cursor-pointer">
                    <UploadCloud className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Drag & drop or click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports .xlsx, .xls, .csv files
                    </p>
                  </Label>
                  {importFile && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {importFile.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">Important Notes</h4>
                <div className="text-sm space-y-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span>Required fields: Lead Name, Company, Email, Phone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Optional: Follow-up Date, Notes</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={downloadLeadTemplate}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
                
                <Button 
                  onClick={handleImportLeadExcel}
                  disabled={!importFile || importLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Leads'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

          {/* Clients Tab */}
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
                        <CardTitle className="text-xl font-bold text-gray-900">Client List</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Manage your valuable client relationships</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline"
                          onClick={() => setImportClientDialogOpen(true)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Import Clients
                        </Button>
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
                                  <Select name="industry" defaultValue="MALL">
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
                          Add your first client or import from Excel to get started
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
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Actions</TableHead>
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
                                  <div className="flex items-center justify-end gap-2">
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
                                    
                                    <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => setEditingClient(client)}
                                          className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                          title="Edit"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      {editingClient && editingClient._id === client._id && (
                                        <DialogContent className="max-w-2xl bg-white rounded-2xl">
                                          <DialogHeader>
                                            <DialogTitle className="text-lg font-semibold text-gray-900">Edit Client</DialogTitle>
                                          </DialogHeader>
                                          <form onSubmit={handleEditClient} className="space-y-5">
                                            <div className="grid grid-cols-2 gap-5">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Client Name</Label>
                                                <Input 
                                                  id="edit-name" 
                                                  name="name" 
                                                  defaultValue={editingClient.name} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-company" className="text-sm font-medium text-gray-700">Company</Label>
                                                <Input 
                                                  id="edit-company" 
                                                  name="company" 
                                                  defaultValue={editingClient.company} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">Email</Label>
                                                <Input 
                                                  id="edit-email" 
                                                  name="email" 
                                                  type="email" 
                                                  defaultValue={editingClient.email} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">Phone</Label>
                                                <Input 
                                                  id="edit-phone" 
                                                  name="phone" 
                                                  defaultValue={editingClient.phone} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-contactPerson" className="text-sm font-medium text-gray-700">Contact Person</Label>
                                                <Input 
                                                  id="edit-contactPerson" 
                                                  name="contactPerson" 
                                                  defaultValue={editingClient.contactPerson || ""} 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-industry" className="text-sm font-medium text-gray-700">Industry</Label>
                                                <Select name="industry" defaultValue={editingClient.industry}>
                                                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                                    <SelectValue />
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
                                                <Label htmlFor="edit-city" className="text-sm font-medium text-gray-700">City</Label>
                                                <Select name="city" defaultValue={editingClient.city}>
                                                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent className="rounded-lg">
                                                    {indianCities.map(city => (
                                                      <SelectItem key={city} value={city} className="rounded-md">{city}</SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-value" className="text-sm font-medium text-gray-700">Expected Value</Label>
                                                <Input 
                                                  id="edit-value" 
                                                  name="value" 
                                                  defaultValue={editingClient.value} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="edit-address" className="text-sm font-medium text-gray-700">Address</Label>
                                              <Textarea 
                                                id="edit-address" 
                                                name="address" 
                                                defaultValue={editingClient.address || ""} 
                                                className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                                              />
                                            </div>
                                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                              Update Client
                                            </Button>
                                          </form>
                                        </DialogContent>
                                      )}
                                    </Dialog>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeleteClient(client._id)}
                                      className="w-8 h-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Leads Tab */}
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
                        <CardTitle className="text-xl font-bold text-gray-900">Lead Tracker</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Track and convert potential opportunities</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline"
                          onClick={() => setImportLeadDialogOpen(true)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Import Leads
                        </Button>
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
                          Add your first lead or import from Excel to get started
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
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Actions</TableHead>
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
                                  <div className="flex items-center justify-end gap-2">
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
                                    
                                    <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => setEditingLead(lead)}
                                          className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                          title="Edit"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      {editingLead && editingLead._id === lead._id && (
                                        <DialogContent className="max-w-2xl bg-white rounded-2xl">
                                          <DialogHeader>
                                            <DialogTitle className="text-lg font-semibold text-gray-900">Edit Lead</DialogTitle>
                                          </DialogHeader>
                                          <form onSubmit={handleEditLead} className="space-y-5">
                                            <div className="grid grid-cols-2 gap-5">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-lead-name" className="text-sm font-medium text-gray-700">Lead Name</Label>
                                                <Input 
                                                  id="edit-lead-name" 
                                                  name="name" 
                                                  defaultValue={editingLead.name} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-lead-company" className="text-sm font-medium text-gray-700">Company</Label>
                                                <Input 
                                                  id="edit-lead-company" 
                                                  name="company" 
                                                  defaultValue={editingLead.company} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-lead-email" className="text-sm font-medium text-gray-700">Email</Label>
                                                <Input 
                                                  id="edit-lead-email" 
                                                  name="email" 
                                                  type="email" 
                                                  defaultValue={editingLead.email} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-lead-phone" className="text-sm font-medium text-gray-700">Phone</Label>
                                                <Input 
                                                  id="edit-lead-phone" 
                                                  name="phone" 
                                                  defaultValue={editingLead.phone} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-source" className="text-sm font-medium text-gray-700">Source</Label>
                                                <Select name="source" defaultValue={editingLead.source}>
                                                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent className="rounded-lg">
                                                    {leadSources.map(source => (
                                                      <SelectItem key={source} value={source} className="rounded-md">{source}</SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-lead-value" className="text-sm font-medium text-gray-700">Expected Value</Label>
                                                <Input 
                                                  id="edit-lead-value" 
                                                  name="value" 
                                                  defaultValue={editingLead.value} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-assignedTo" className="text-sm font-medium text-gray-700">Assign To</Label>
                                                <Input 
                                                  id="edit-assignedTo" 
                                                  name="assignedTo" 
                                                  defaultValue={editingLead.assignedTo} 
                                                  required 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-followUpDate" className="text-sm font-medium text-gray-700">Follow-up Date</Label>
                                                <Input 
                                                  id="edit-followUpDate" 
                                                  name="followUpDate" 
                                                  type="date" 
                                                  defaultValue={editingLead.followUpDate ? editingLead.followUpDate.split('T')[0] : ''} 
                                                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="edit-lead-notes" className="text-sm font-medium text-gray-700">Notes</Label>
                                              <Textarea 
                                                id="edit-lead-notes" 
                                                name="notes" 
                                                defaultValue={editingLead.notes || ""} 
                                                className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                                              />
                                            </div>
                                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                              Update Lead
                                            </Button>
                                          </form>
                                        </DialogContent>
                                      )}
                                    </Dialog>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeleteLead(lead._id)}
                                      className="w-8 h-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Communications Tab */}
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
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Actions</TableHead>
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
                                <TableCell className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeleteCommunication(comm._id)}
                                      className="w-8 h-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CRM;