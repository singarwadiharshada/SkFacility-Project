import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Plus,
  Search,
  Package,
  UserCheck,
  AlertTriangle,
  Eye,
  Trash2,
  Download,
  Edit,
  History,
  Building,
  Shield,
  Wrench,
  Printer,
  Palette,
  ShoppingBag,
  Coffee,
  BarChart3,
  Tag,
  MapPin,
  RefreshCw,
  Cpu,
  Settings,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Database,
  Filter,
  MoreVertical,
  ChevronRight,
  FileText,
  UploadCloud,
  DownloadCloud,
  Sun,
  Moon,
  Bell,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  MessageSquare,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inventoryService, type FrontendInventoryItem } from '@/services/inventoryService';
import { machineService, type FrontendMachine, type MachineStats, type MaintenanceRecordDTO } from '@/services/machineService';
import { motion, AnimatePresence } from "framer-motion";

// Types
interface Site {
  id: string;
  name: string;
}

interface Department {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  itemsValueChange: number;
}

// Use the FrontendInventoryItem type from service
type InventoryItem = FrontendInventoryItem;

// Use the FrontendMachine type from service
type Machine = FrontendMachine;

const InventoryPage = () => {
  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSite, setSelectedSite] = useState("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [changeHistoryDialogOpen, setChangeHistoryDialogOpen] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState({
    items: true,
    machines: true,
    stats: true
  });
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
    itemsValueChange: 0,
  });
  
  // Machine states
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [machineSearchQuery, setMachineSearchQuery] = useState("");
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedMachineForMaintenance, setSelectedMachineForMaintenance] = useState<string | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  
  // Track active tab
  const [activeTab, setActiveTab] = useState("inventory");
  
  // New state for tracking data source
  const [usingLocalMachineStats, setUsingLocalMachineStats] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);
  
  // New item form state
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: "",
    sku: "",
    department: "cleaning",
    category: "",
    site: "1",
    assignedManager: "",
    quantity: 0,
    price: 0,
    costPrice: 0,
    supplier: "",
    reorderLevel: 10,
    description: "",
  });

  // New machine form state
  const [newMachine, setNewMachine] = useState<Partial<Machine>>({
    name: "",
    cost: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    description: "",
    status: 'operational',
    location: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    department: "",
    assignedTo: "",
  });

  // Maintenance form state
  const [maintenanceRecord, setMaintenanceRecord] = useState<MaintenanceRecordDTO>({
    type: "Routine",
    description: "",
    cost: 0,
    performedBy: "",
  });

  // Data
  const departments: Department[] = [
    { value: "cleaning", label: "Cleaning", icon: Shield },
    { value: "maintenance", label: "Maintenance", icon: Wrench },
    { value: "office", label: "Office Supplies", icon: Printer },
    { value: "paint", label: "Paint", icon: Palette },
    { value: "tools", label: "Tools", icon: ShoppingBag },
    { value: "canteen", label: "Canteen", icon: Coffee },
  ];

  const sites: Site[] = [
    { id: "1", name: "Main Site" },
    { id: "2", name: "Branch Office" },
    { id: "3", name: "Warehouse A" },
    { id: "4", name: "Construction Site B" },
  ];

  const managers = ["John Doe", "Jane Smith", "Robert Johnson", "Sarah Wilson", "Michael Brown"];
  
  const categories = {
    cleaning: ["Tools", "Chemicals", "Equipment", "Supplies"],
    maintenance: ["Tools", "Safety", "Equipment", "Parts"],
    office: ["Furniture", "Stationery", "Electronics", "Supplies"],
    paint: ["Paints", "Brushes", "Rollers", "Accessories"],
    tools: ["Power Tools", "Hand Tools", "Safety Gear", "Consumables"],
    canteen: ["Food Items", "Beverages", "Utensils", "Cleaning"],
  };

  const machineStatusOptions = [
    { value: 'operational', label: 'Operational', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    { value: 'maintenance', label: 'Under Maintenance', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    { value: 'out-of-service', label: 'Out of Service', color: 'bg-red-100 text-red-800', icon: XCircle },
  ];

  const maintenanceTypes = [
    "Routine",
    "Preventive",
    "Corrective",
    "Emergency",
    "Scheduled",
    "Overhaul"
  ];

  // Helper function to calculate stats from items
  const calculateStats = (itemsList: InventoryItem[]): InventoryStats => {
    const totalItems = itemsList.length;
    const lowStockItems = itemsList.filter(item => item.quantity <= item.reorderLevel).length;
    const totalValue = itemsList.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    
    return {
      totalItems,
      lowStockItems,
      totalValue,
      itemsValueChange: 0 // We can implement change tracking later
    };
  };

  // Format currency - INDIAN RUPEES
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate machine statistics locally if API fails
  const calculateLocalMachineStats = () => {
    const totalMachines = machines.length;
    const totalMachineValue = machines.reduce((sum, machine) => sum + (machine.cost * machine.quantity), 0);
    const operationalMachines = machines.filter(m => m.status === 'operational').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const outOfServiceMachines = machines.filter(m => m.status === 'out-of-service').length;
    const averageMachineCost = totalMachines > 0 ? totalMachineValue / totalMachines : 0;
    
    // Count machines needing maintenance soon (within next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    
    const upcomingMaintenanceCount = machines.filter(machine => {
      if (!machine.nextMaintenanceDate) return false;
      try {
        const nextMaintenanceDate = new Date(machine.nextMaintenanceDate);
        return nextMaintenanceDate <= thirtyDaysFromNow && nextMaintenanceDate >= today;
      } catch (error) {
        console.error('Error parsing maintenance date:', machine.nextMaintenanceDate, error);
        return false;
      }
    }).length;

    // Calculate machines by department
    const machinesByDepartment = machines.reduce((acc, machine) => {
      const dept = machine.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate machines by location
    const machinesByLocation = machines.reduce((acc, machine) => {
      const location = machine.location || 'Unassigned';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMachines,
      totalMachineValue,
      operationalMachines,
      maintenanceMachines,
      outOfServiceMachines,
      averageMachineCost,
      machinesByDepartment,
      machinesByLocation,
      upcomingMaintenanceCount
    };
  };

  // Fetch data from backend on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading({
        items: true,
        machines: true,
        stats: true
      });
      setUsingLocalMachineStats(false);
      setBackendConnected(true);
      
      // Fetch items and machines in parallel
      const [itemsData, machinesData] = await Promise.all([
        inventoryService.getItems(),
        machineService.getMachines()
      ]);
      
      setItems(itemsData || []);
      setMachines(machinesData || []);
      
      // Try to fetch machine stats
      try {
        const statsData = await machineService.getMachineStats();
        setMachineStats(statsData);
        setUsingLocalMachineStats(false);
      } catch (statsError: any) {
        // Check if it's a stats endpoint error
        if (statsError.isStatsEndpointError) {
          console.warn('Stats endpoint unavailable, using local calculation');
          setUsingLocalMachineStats(true);
          const localStats = calculateLocalMachineStats();
          setMachineStats(localStats);
        } else {
          // Other errors
          console.error('Error fetching machine stats:', statsError);
          setUsingLocalMachineStats(true);
          const localStats = calculateLocalMachineStats();
          setMachineStats(localStats);
        }
      }
      
      // Calculate inventory stats locally
      const calculatedStats = calculateStats(itemsData || []);
      setStats(calculatedStats);
      
    } catch (error) {
      console.error('Failed to fetch data from backend:', error);
      setBackendConnected(false);
      
      // Set empty arrays if backend fails
      setItems([]);
      setMachines([]);
      setUsingLocalMachineStats(true);
      
      // Calculate local machine stats even if machines array is empty
      setMachineStats(calculateLocalMachineStats());
      setStats({ totalItems: 0, lowStockItems: 0, totalValue: 0, itemsValueChange: 0 });
      
      // Show warning toast
      toast.warning("Backend connection issue. Using local data.", {
        description: "Some features may be limited."
      });
    } finally {
      setLoading({
        items: false,
        machines: false,
        stats: false
      });
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await fetchData();
      toast.success("Data refreshed successfully!");
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Functions
  const getDepartmentIcon = (department: string) => {
    const dept = departments.find(d => d.value === department);
    return dept ? dept.icon : Package;
  };

  const getCategoriesForDepartment = (dept: string) => {
    return categories[dept as keyof typeof categories] || [];
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDept = selectedDepartment === "all" || item.department === selectedDepartment;
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSite = selectedSite === "all" || item.site === selectedSite;
    
    return matchesSearch && matchesDept && matchesCategory && matchesSite;
  });

  // Filter machines
  const filteredMachines = machines.filter(machine => {
    const matchesSearch = 
      machine.name.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.manufacturer?.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.model?.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.location?.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.serialNumber?.toLowerCase().includes(machineSearchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Handle item actions
  const handleDeleteItem = async (itemId: string) => {
    try {
      await inventoryService.deleteItem(itemId);
      const updatedItems = items.filter(item => item.id !== itemId);
      setItems(updatedItems);
      
      // Recalculate stats from updated items
      setStats(calculateStats(updatedItems));
      
      toast.success("Item deleted successfully!");
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.sku) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const itemData: Omit<InventoryItem, 'id' | '_id' | 'createdAt' | 'updatedAt'> = {
        sku: newItem.sku.toUpperCase(),
        name: newItem.name,
        department: newItem.department || "cleaning",
        category: newItem.category || "Tools",
        site: newItem.site || "1",
        assignedManager: newItem.assignedManager || "John Doe",
        quantity: newItem.quantity || 0,
        price: newItem.price || 0,
        costPrice: newItem.costPrice || 0,
        supplier: newItem.supplier || "",
        reorderLevel: newItem.reorderLevel || 10,
        description: newItem.description,
        changeHistory: [{
          date: new Date().toISOString().split('T')[0],
          change: "Created",
          user: "Supervisor",
          quantity: newItem.quantity || 0
        }],
      };

      const createdItem = await inventoryService.createItem(itemData);
    
      // Add to local state
      const updatedItems = [...items, createdItem];
      setItems(updatedItems);
      
      // Recalculate stats from updated items
      setStats(calculateStats(updatedItems));
      
      setItemDialogOpen(false);
      resetNewItemForm();
      toast.success("Item added successfully!");
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error("Failed to add item");
    }
  };

  const handleEditItem = async () => {
    if (!editItem) return;

    try {
      // Create a clean update object without id and timestamps
      const { id, createdAt, updatedAt, ...updateData } = editItem;
      
      // Add change history entry for quantity changes
      const originalItem = items.find(item => item.id === editItem.id);
      if (originalItem && editItem.quantity !== originalItem.quantity) {
        updateData.changeHistory = [
          ...(editItem.changeHistory || []),
          {
            date: new Date().toISOString().split('T')[0],
            change: "Updated",
            user: "Supervisor",
            quantity: editItem.quantity - originalItem.quantity
          }
        ];
      }

      const updatedItem = await inventoryService.updateItem(editItem.id, updateData);
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      setItems(updatedItems);
      
      // Recalculate stats from updated items
      setStats(calculateStats(updatedItems));
      
      setEditItem(null);
      setItemDialogOpen(false);
      toast.success("Item updated successfully!");
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error("Failed to update item");
    }
  };

  // Machine functions
  const handleAddMachine = async () => {
    if (!newMachine.name || !newMachine.cost || !newMachine.purchaseDate) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const machineData = {
        name: newMachine.name,
        cost: newMachine.cost || 0,
        purchaseDate: newMachine.purchaseDate,
        quantity: newMachine.quantity || 1,
        description: newMachine.description,
        status: newMachine.status || 'operational',
        location: newMachine.location,
        manufacturer: newMachine.manufacturer,
        model: newMachine.model,
        serialNumber: newMachine.serialNumber,
        department: newMachine.department,
        assignedTo: newMachine.assignedTo,
        lastMaintenanceDate: newMachine.lastMaintenanceDate,
        nextMaintenanceDate: newMachine.nextMaintenanceDate,
      };

      if (editMachine) {
        // Update existing machine
        const updatedMachine = await machineService.updateMachine(editMachine.id, machineData);
        const updatedMachines = machines.map(machine => 
          machine.id === editMachine.id ? updatedMachine : machine
        );
        setMachines(updatedMachines);
        toast.success("Machine updated successfully!");
      } else {
        // Add new machine
        const createdMachine = await machineService.createMachine(machineData);
        setMachines([...machines, createdMachine]);
        toast.success("Machine added successfully!");
      }

      // Refresh machine stats
      try {
        const statsData = await machineService.getMachineStats();
        setMachineStats(statsData);
        setUsingLocalMachineStats(false);
      } catch (statsError) {
        setUsingLocalMachineStats(true);
        const localStats = calculateLocalMachineStats();
        setMachineStats(localStats);
      }
      
      setMachineDialogOpen(false);
      resetNewMachineForm();
      setEditMachine(null);
    } catch (error) {
      console.error('Failed to save machine:', error);
      toast.error("Failed to save machine");
    }
  };

  const handleEditMachine = (machine: Machine) => {
    setEditMachine(machine);
    setNewMachine({
      name: machine.name,
      cost: machine.cost,
      purchaseDate: machine.purchaseDate,
      quantity: machine.quantity,
      description: machine.description,
      status: machine.status,
      location: machine.location,
      manufacturer: machine.manufacturer,
      model: machine.model,
      serialNumber: machine.serialNumber,
      department: machine.department,
      assignedTo: machine.assignedTo,
      lastMaintenanceDate: machine.lastMaintenanceDate,
      nextMaintenanceDate: machine.nextMaintenanceDate,
    });
    setMachineDialogOpen(true);
  };

  const handleViewMachine = async (machineId: string) => {
    try {
      const machine = await machineService.getMachineById(machineId);
      setViewMachine(machine);
    } catch (error) {
      console.error('Failed to fetch machine details:', error);
      toast.error("Failed to fetch machine details");
    }
  };

  const handleDeleteMachine = async (machineId: string) => {
    try {
      await machineService.deleteMachine(machineId);
      const updatedMachines = machines.filter(machine => machine.id !== machineId);
      setMachines(updatedMachines);
      
      // Refresh machine stats
      try {
        const statsData = await machineService.getMachineStats();
        setMachineStats(statsData);
        setUsingLocalMachineStats(false);
      } catch (statsError) {
        setUsingLocalMachineStats(true);
        const localStats = calculateLocalMachineStats();
        setMachineStats(localStats);
      }
      
      toast.success("Machine deleted successfully!");
    } catch (error) {
      console.error('Failed to delete machine:', error);
      toast.error("Failed to delete machine");
    }
  };

  const handleAddMaintenance = async () => {
    if (!selectedMachineForMaintenance || !maintenanceRecord.type || !maintenanceRecord.description || !maintenanceRecord.performedBy) {
      toast.error("Please fill in all maintenance record fields");
      return;
    }

    try {
      setMaintenanceLoading(true);
      const updatedMachine = await machineService.addMaintenanceRecord(
        selectedMachineForMaintenance,
        maintenanceRecord
      );
      
      // Update local state
      const updatedMachines = machines.map(machine => 
        machine.id === selectedMachineForMaintenance ? updatedMachine : machine
      );
      setMachines(updatedMachines);
      
      // Refresh machine stats
      try {
        const statsData = await machineService.getMachineStats();
        setMachineStats(statsData);
        setUsingLocalMachineStats(false);
      } catch (statsError) {
        setUsingLocalMachineStats(true);
        const localStats = calculateLocalMachineStats();
        setMachineStats(localStats);
      }
      
      // Reset form
      setMaintenanceRecord({
        type: "Routine",
        description: "",
        cost: 0,
        performedBy: "",
      });
      setSelectedMachineForMaintenance(null);
      setMaintenanceDialogOpen(false);
      toast.success("Maintenance record added successfully!");
    } catch (error) {
      console.error('Failed to add maintenance record:', error);
      toast.error("Failed to add maintenance record");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const resetNewMachineForm = () => {
    setNewMachine({
      name: "",
      cost: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      quantity: 1,
      description: "",
      status: 'operational',
      location: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      department: "",
      assignedTo: "",
    });
  };

  const resetNewItemForm = () => {
    setNewItem({
      name: "",
      sku: "",
      department: "cleaning",
      category: "",
      site: "1",
      assignedManager: "",
      quantity: 0,
      price: 0,
      costPrice: 0,
      supplier: "",
      reorderLevel: 10,
      description: "",
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditItem(item);
    setItemDialogOpen(true);
  };

  // Handle export
  const handleExport = () => {
    if (items.length === 0) {
      toast.error("No items to export");
      return;
    }

    const csvContent = [
      ["SKU", "Name", "Department", "Category", "Site", "Manager", "Quantity", "Price", "Supplier", "Reorder Level"],
      ...items.map(item => [
        item.sku,
        item.name,
        departments.find(d => d.value === item.department)?.label || item.department,
        item.category,
        sites.find(s => s.id === item.site)?.name || item.site,
        item.assignedManager,
        item.quantity.toString(),
        item.price.toString(),
        item.supplier,
        item.reorderLevel.toString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Inventory exported successfully!");
  };

  // Export machines to CSV
  const handleExportMachines = async () => {
    try {
      if (machines.length === 0) {
        toast.error("No machines to export");
        return;
      }

      const csvContent = [
        ["Name", "Cost", "Purchase Date", "Quantity", "Status", "Location", "Manufacturer", "Model", "Serial Number", "Department", "Assigned To"],
        ...machines.map(machine => [
          machine.name,
          machine.cost.toString(),
          new Date(machine.purchaseDate).toISOString().split('T')[0],
          machine.quantity.toString(),
          machine.status,
          machine.location || '',
          machine.manufacturer || '',
          machine.model || '',
          machine.serialNumber || '',
          machine.department || '',
          machine.assignedTo || ''
        ])
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `machines-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Machines exported successfully!");
    } catch (error) {
      console.error('Failed to export machines:', error);
      toast.error("Failed to export machines");
    }
  };

  // Calculate machine age
  const calculateMachineAge = (purchaseDate: string) => {
    const purchase = new Date(purchaseDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - purchase.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(diffYears);
  };

  // Get machine stats for display
  const machineStatsDisplay = machineStats || calculateLocalMachineStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Inventory Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage inventory, machinery, and equipment across sites</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search inventory, machines..."
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
        {/* Stats Cards - Animated like CRM */}
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
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Items</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-blue-500" /> : stats.totalItems}
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
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-amber-50 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Low Stock</p>
                    <p className="text-3xl font-bold text-amber-600">
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-amber-500" /> : stats.lowStockItems}
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
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-green-500" /> : formatCurrency(stats.totalValue)}
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
                    <Cpu className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Machines</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading.stats ? <Loader2 className="h-7 w-7 animate-spin text-purple-500" /> : machineStatsDisplay.totalMachines}
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
            <Tabs defaultValue="inventory" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-transparent p-0">
                <TabsTrigger 
                  value="inventory" 
                  className="relative px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 transition-all"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Inventory ({items.length})
                  {activeTab === "inventory" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 z-[-1]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="low-stock" 
                  className="relative px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 transition-all"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Low Stock ({stats.lowStockItems})
                  {activeTab === "low-stock" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 z-[-1]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="machines" 
                  className="relative px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 transition-all"
                >
                  <Cpu className="mr-2 h-4 w-4" />
                  Machines ({machines.length})
                  {activeTab === "machines" && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 z-[-1]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="categories" 
                  className="relative px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 transition-all"
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Categories
                  {activeTab === "categories" && (
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

          {/* INVENTORY TAB */}
          <AnimatePresence mode="wait">
            {activeTab === "inventory" && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Inventory Items</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Manage all inventory items across departments</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline"
                          onClick={() => setImportDialogOpen(true)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Import Items
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={refreshData}
                          disabled={refreshing}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                        <Button 
                          onClick={() => {
                            setEditItem(null);
                            setItemDialogOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Filters */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 rounded-lg border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                          <SelectTrigger className="rounded-lg border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <SelectValue placeholder="All Departments" />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map(dept => {
                              const Icon = dept.icon;
                              return (
                                <SelectItem key={dept.value} value={dept.value} className="rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-blue-500" />
                                    {dept.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        
                        <Select 
                          value={selectedCategory} 
                          onValueChange={setSelectedCategory}
                          disabled={selectedDepartment === "all"}
                        >
                          <SelectTrigger className="rounded-lg border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            <SelectItem value="all">All Categories</SelectItem>
                            {selectedDepartment !== "all" && 
                              getCategoriesForDepartment(selectedDepartment).map(cat => (
                                <SelectItem key={cat} value={cat} className="rounded-md">{cat}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        
                        <Select value={selectedSite} onValueChange={setSelectedSite}>
                          <SelectTrigger className="rounded-lg border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <SelectValue placeholder="All Sites" />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            <SelectItem value="all">All Sites</SelectItem>
                            {sites.map(site => (
                              <SelectItem key={site.id} value={site.id} className="rounded-md">{site.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Table */}
                    {loading.items ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                          <p className="text-gray-500 mt-3">Loading inventory items...</p>
                        </div>
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No items found</h3>
                        <p className="text-gray-500 mt-2">
                          Add your first item or import from CSV to get started
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow className="hover:bg-gray-50">
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Item</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map((item, index) => {
                              const DeptIcon = getDepartmentIcon(item.department);
                              const isLowStock = item.quantity <= item.reorderLevel;
                              
                              return (
                                <TableRow 
                                  key={item.id} 
                                  className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                >
                                  <TableCell className="py-4 px-6">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                        <span className="text-blue-600 font-semibold">{item.name.charAt(0)}</span>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">{item.name}</div>
                                        <div className="text-sm text-gray-500">{item.supplier}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <div className="font-mono text-sm text-blue-600">{item.sku}</div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit border-gray-300 bg-gray-50 text-gray-700">
                                      <DeptIcon className="h-3 w-3" />
                                      {departments.find(d => d.value === item.department)?.label}
                                    </Badge>
                                    <div className="text-xs text-gray-500 mt-1">{item.category}</div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium ${isLowStock ? 'text-amber-600' : 'text-blue-600'}`}>
                                        {item.quantity}
                                      </span>
                                      <div className="text-xs text-gray-500">
                                        Reorder: {item.reorderLevel}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <div className="font-medium text-blue-600">{formatCurrency(item.price)}</div>
                                    <div className="text-xs text-gray-500">
                                      Cost: {formatCurrency(item.costPrice)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    {isLowStock ? (
                                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                        Low Stock
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-green-100 text-green-800 border-green-200">
                                        In Stock
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditDialog(item)}
                                        className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                        title="Edit"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                            title="View Details"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl border-gray-200 rounded-2xl">
                                          <DialogHeader>
                                            <DialogTitle className="text-lg font-semibold text-gray-900">Item Details</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-blue-600 font-bold text-xl">{item.name.charAt(0)}</span>
                                              </div>
                                              <div>
                                                <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                                                <p className="text-gray-500">{item.sku}</p>
                                              </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-6">
                                              <div className="space-y-4">
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Department</Label>
                                                  <div className="flex items-center gap-2 text-gray-900">
                                                    <DeptIcon className="h-4 w-4 text-gray-400" />
                                                    {departments.find(d => d.value === item.department)?.label}
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Category</Label>
                                                  <p className="text-gray-900">{item.category}</p>
                                                </div>
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Manager</Label>
                                                  <p className="text-gray-900">{item.assignedManager}</p>
                                                </div>
                                              </div>
                                              <div className="space-y-4">
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Quantity</Label>
                                                  <p className="text-lg font-bold text-blue-600">{item.quantity}</p>
                                                </div>
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Price</Label>
                                                  <p className="text-lg font-bold text-green-600">{formatCurrency(item.price)}</p>
                                                </div>
                                                <div>
                                                  <Label className="text-xs text-gray-500 uppercase font-medium">Status</Label>
                                                  <Badge 
                                                    className={`px-3 py-1 rounded-full ${
                                                      isLowStock
                                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                        : 'bg-green-100 text-green-800 border-green-200'
                                                    }`}
                                                  >
                                                    {isLowStock ? 'Low Stock' : 'In Stock'}
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {item.description && (
                                              <div>
                                                <Label className="text-xs text-gray-500 uppercase font-medium">Description</Label>
                                                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                                  <p className="text-gray-900">{item.description}</p>
                                                </div>
                                              </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                                              <span>Supplier: {item.supplier}</span>
                                              <span>Reorder Level: {item.reorderLevel}</span>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setChangeHistoryDialogOpen(item.id)}
                                        className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                        title="History"
                                      >
                                        <History className="h-4 w-4" />
                                      </Button>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="w-8 h-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                        title="Delete"
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOW STOCK TAB */}
          <AnimatePresence mode="wait">
            {activeTab === "low-stock" && (
              <motion.div
                key="low-stock"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Low Stock Items</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Items that need immediate reordering</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline"
                          onClick={handleExport}
                          disabled={stats.lowStockItems === 0}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {stats.lowStockItems === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">All items are in stock!</h3>
                        <p className="text-gray-500 mt-2">No items need reordering at this time.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader className="bg-amber-50">
                            <TableRow className="hover:bg-amber-50">
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Item</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Current Stock</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Reorder Level</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Deficit</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Urgency</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items
                              .filter(item => item.quantity <= item.reorderLevel)
                              .map((item, index) => {
                                const deficit = item.reorderLevel - item.quantity;
                                const urgency = deficit >= 10 ? 'High' : deficit >= 5 ? 'Medium' : 'Low';
                                
                                return (
                                  <TableRow 
                                    key={item.id} 
                                    className={`hover:bg-amber-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}`}
                                  >
                                    <TableCell className="py-4 px-6">
                                      <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                                          <span className="text-amber-600 font-semibold">{item.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                          <div className="font-medium text-gray-900">{item.name}</div>
                                          <div className="text-sm text-gray-500">{item.sku}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                      <div className="text-lg font-bold text-amber-600">{item.quantity}</div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                      <div className="text-gray-700">{item.reorderLevel}</div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                      <div className="font-bold text-red-600">-{deficit}</div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                      <Badge 
                                        className={`${
                                          urgency === 'High' 
                                            ? 'bg-red-100 text-red-800 border-red-200'
                                            : urgency === 'Medium'
                                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                                            : 'bg-blue-100 text-blue-800 border-blue-200'
                                        } border-0`}
                                      >
                                        {urgency} Priority
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openEditDialog(item)}
                                          className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                          title="Edit"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setChangeHistoryDialogOpen(item.id)}
                                          className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                          title="History"
                                        >
                                          <History className="h-4 w-4" />
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* MACHINES TAB */}
          <AnimatePresence mode="wait">
            {activeTab === "machines" && (
              <motion.div
                key="machines"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Machinery & Equipment</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Manage all machinery and equipment across sites</p>
                        {usingLocalMachineStats && (
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                              <Database className="h-3 w-3 mr-1" />
                              Using locally calculated statistics
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline"
                          onClick={handleExportMachines}
                          disabled={machines.length === 0}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export Machines
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setMaintenanceDialogOpen(true)}
                          disabled={machines.length === 0}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          <Wrench className="mr-2 h-4 w-4" />
                          Add Maintenance
                        </Button>
                        <Button 
                          onClick={() => {
                            setEditMachine(null);
                            resetNewMachineForm();
                            setMachineDialogOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Machine
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Machine Search */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search machines by name, model, manufacturer, or location..."
                          value={machineSearchQuery}
                          onChange={(e) => setMachineSearchQuery(e.target.value)}
                          className="pl-10 rounded-lg border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Machines Table */}
                    {loading.machines ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                          <p className="text-gray-500 mt-3">Loading machines...</p>
                        </div>
                      </div>
                    ) : filteredMachines.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Cpu className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No machines found</h3>
                        <p className="text-gray-500 mt-2">
                          {machines.length === 0 
                            ? "No machines in database. Add your first machine!" 
                            : "Try adjusting your search"}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow className="hover:bg-gray-50">
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Machine</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Model & Serial</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Purchase Date</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</TableHead>
                              <TableHead className="py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMachines.map((machine, index) => {
                              const statusOption = machineStatusOptions.find(s => s.value === machine.status);
                              const StatusIcon = statusOption?.icon || CheckCircle;
                              const machineAge = calculateMachineAge(machine.purchaseDate);
                              
                              return (
                                <TableRow 
                                  key={machine.id} 
                                  className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                >
                                  <TableCell className="py-4 px-6">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                        <span className="text-blue-600 font-semibold">{machine.name.charAt(0)}</span>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">{machine.name}</div>
                                        <div className="text-sm text-gray-500">{machine.manufacturer}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <div className="text-gray-700">{machine.model || 'N/A'}</div>
                                    {machine.serialNumber && (
                                      <div className="text-xs text-gray-500">SN: {machine.serialNumber}</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <div className="font-medium text-blue-600">{formatCurrency(machine.cost)}</div>
                                    <div className="text-xs text-gray-500">
                                      Total: {formatCurrency(machine.cost * machine.quantity)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-700">{formatDate(machine.purchaseDate)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Age: {machineAge} year{machineAge !== 1 ? 's' : ''}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <Badge className={`${statusOption?.color} border-0 flex items-center gap-1`}>
                                      <StatusIcon className="h-3 w-3" />
                                      {statusOption?.label}
                                    </Badge>
                                    {machine.nextMaintenanceDate && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Next: {formatDate(machine.nextMaintenanceDate)}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewMachine(machine.id)}
                                        className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                        title="View Details"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditMachine(machine)}
                                        className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                        title="Edit"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedMachineForMaintenance(machine.id);
                                          setMaintenanceDialogOpen(true);
                                        }}
                                        className="w-8 h-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                        title="Maintenance"
                                      >
                                        <Wrench className="h-4 w-4" />
                                      </Button>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteMachine(machine.id)}
                                        className="w-8 h-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                        title="Delete"
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* CATEGORIES TAB */}
          <AnimatePresence mode="wait">
            {activeTab === "categories" && (
              <motion.div
                key="categories"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Categories & Departments</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Browse inventory by categories and departments</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {departments.map(dept => {
                        const Icon = dept.icon;
                        const deptItems = items.filter(item => item.department === dept.value);
                        const deptCategories = [...new Set(deptItems.map(item => item.category))];
                        const deptValue = deptItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
                        
                        return (
                          <Card key={dept.value} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg text-gray-900">{dept.label}</CardTitle>
                                  <CardDescription>
                                    {deptItems.length} items • {deptCategories.length} categories
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">Total Value:</span>
                                  <span className="font-semibold text-blue-600">{formatCurrency(deptValue)}</span>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-gray-700">Categories:</div>
                                  {deptCategories.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {deptCategories.map(category => {
                                        const categoryItems = deptItems.filter(item => item.category === category);
                                        return (
                                          <Badge key={category} variant="outline" className="bg-gray-50 text-gray-700">
                                            {category} ({categoryItems.length})
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">No items in this department</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ADD/EDIT ITEM DIALOG */}
      <Dialog open={itemDialogOpen} onOpenChange={(open) => {
        setItemDialogOpen(open);
        if (!open) {
          setEditItem(null);
          resetNewItemForm();
        }
      }}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {editItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            editItem ? handleEditItem() : handleAddItem();
          }} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Item Name *</Label>
                <Input
                  id="name"
                  value={editItem ? editItem.name : newItem.name}
                  onChange={(e) => 
                    editItem 
                      ? setEditItem({...editItem, name: e.target.value})
                      : setNewItem({...newItem, name: e.target.value})
                  }
                  placeholder="Enter item name"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm font-medium text-gray-700">SKU *</Label>
                <Input
                  id="sku"
                  value={editItem ? editItem.sku : newItem.sku}
                  onChange={(e) => 
                    editItem 
                      ? setEditItem({...editItem, sku: e.target.value.toUpperCase()})
                      : setNewItem({...newItem, sku: e.target.value.toUpperCase()})
                  }
                  placeholder="Enter SKU (e.g., INV-001)"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department *</Label>
                <Select
                  value={editItem ? editItem.department : newItem.department}
                  onValueChange={(value) => 
                    editItem 
                      ? setEditItem({...editItem, department: value, category: ''})
                      : setNewItem({...newItem, department: value, category: ''})
                  }
                >
                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {departments.map(dept => {
                      const Icon = dept.icon;
                      return (
                        <SelectItem key={dept.value} value={dept.value} className="rounded-md">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-blue-500" />
                            {dept.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category *</Label>
                <Select
                  value={editItem ? editItem.category : newItem.category}
                  onValueChange={(value) => 
                    editItem 
                      ? setEditItem({...editItem, category: value})
                      : setNewItem({...newItem, category: value})
                  }
                  disabled={!editItem?.department && !newItem.department}
                >
                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {(editItem ? getCategoriesForDepartment(editItem.department) : 
                      getCategoriesForDepartment(newItem.department || '')).map(cat => (
                      <SelectItem key={cat} value={cat} className="rounded-md">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={editItem ? editItem.quantity : newItem.quantity}
                  onChange={(e) => 
                    editItem 
                      ? setEditItem({...editItem, quantity: parseInt(e.target.value) || 0})
                      : setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})
                  }
                  placeholder="Enter quantity"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reorderLevel" className="text-sm font-medium text-gray-700">Reorder Level *</Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  min="0"
                  value={editItem ? editItem.reorderLevel : newItem.reorderLevel}
                  onChange={(e) => 
                    editItem 
                      ? setEditItem({...editItem, reorderLevel: parseInt(e.target.value) || 0})
                      : setNewItem({...newItem, reorderLevel: parseInt(e.target.value) || 0})
                  }
                  placeholder="Enter reorder level"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-medium text-gray-700">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editItem ? editItem.price : newItem.price}
                  onChange={(e) => 
                    editItem 
                      ? setEditItem({...editItem, price: parseFloat(e.target.value) || 0})
                      : setNewItem({...newItem, price: parseFloat(e.target.value) || 0})
                  }
                  placeholder="Enter price"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-sm font-medium text-gray-700">Cost Price *</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editItem ? editItem.costPrice : newItem.costPrice}
                  onChange={(e) => 
                    editItem 
                      ? setEditItem({...editItem, costPrice: parseFloat(e.target.value) || 0})
                      : setNewItem({...newItem, costPrice: parseFloat(e.target.value) || 0})
                  }
                  placeholder="Enter cost price"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="assignedManager" className="text-sm font-medium text-gray-700">Assigned Manager</Label>
                <Select
                  value={editItem ? editItem.assignedManager : newItem.assignedManager}
                  onValueChange={(value) => 
                    editItem 
                      ? setEditItem({...editItem, assignedManager: value})
                      : setNewItem({...newItem, assignedManager: value})
                  }
                >
                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {managers.map(manager => (
                      <SelectItem key={manager} value={manager} className="rounded-md">{manager}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-sm font-medium text-gray-700">Supplier *</Label>
                <Input
                  id="supplier"
                  value={editItem ? editItem.supplier : newItem.supplier}
                  onChange={(e) => 
                    editItem 
                      ? setEditItem({...editItem, supplier: e.target.value})
                      : setNewItem({...newItem, supplier: e.target.value})
                  }
                  placeholder="Enter supplier name"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="description"
                value={editItem ? editItem.description : newItem.description}
                onChange={(e) => 
                  editItem 
                    ? setEditItem({...editItem, description: e.target.value})
                    : setNewItem({...newItem, description: e.target.value})
                }
                placeholder="Enter item description"
                rows={3}
                className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setItemDialogOpen(false);
                  setEditItem(null);
                  resetNewItemForm();
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                {editItem ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT MACHINE DIALOG */}
      <Dialog open={machineDialogOpen} onOpenChange={(open) => {
        setMachineDialogOpen(open);
        if (!open) {
          setEditMachine(null);
          resetNewMachineForm();
        }
      }}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {editMachine ? 'Edit Machine' : 'Add New Machine'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddMachine();
          }} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="machineName" className="text-sm font-medium text-gray-700">Machine Name *</Label>
                <Input
                  id="machineName"
                  value={newMachine.name}
                  onChange={(e) => setNewMachine({...newMachine, name: e.target.value})}
                  placeholder="Enter machine name"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="machineCost" className="text-sm font-medium text-gray-700">Cost/Price *</Label>
                <Input
                  id="machineCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newMachine.cost}
                  onChange={(e) => setNewMachine({...newMachine, cost: parseFloat(e.target.value) || 0})}
                  placeholder="Enter cost"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate" className="text-sm font-medium text-gray-700">Purchase Date *</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={newMachine.purchaseDate}
                  onChange={(e) => setNewMachine({...newMachine, purchaseDate: e.target.value})}
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="machineQuantity" className="text-sm font-medium text-gray-700">Quantity *</Label>
                <Input
                  id="machineQuantity"
                  type="number"
                  min="1"
                  value={newMachine.quantity}
                  onChange={(e) => setNewMachine({...newMachine, quantity: parseInt(e.target.value) || 1})}
                  placeholder="Enter quantity"
                  required
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="machineStatus" className="text-sm font-medium text-gray-700">Status *</Label>
                <Select
                  value={newMachine.status}
                  onValueChange={(value: 'operational' | 'maintenance' | 'out-of-service') => 
                    setNewMachine({...newMachine, status: value})
                  }
                >
                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {machineStatusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value} className="rounded-md">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="machineLocation" className="text-sm font-medium text-gray-700">Location</Label>
                <Input
                  id="machineLocation"
                  value={newMachine.location}
                  onChange={(e) => setNewMachine({...newMachine, location: e.target.value})}
                  placeholder="Enter location"
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="manufacturer" className="text-sm font-medium text-gray-700">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={newMachine.manufacturer}
                  onChange={(e) => setNewMachine({...newMachine, manufacturer: e.target.value})}
                  placeholder="Enter manufacturer"
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model" className="text-sm font-medium text-gray-700">Model</Label>
                <Input
                  id="model"
                  value={newMachine.model} 
                  onChange={(e) => setNewMachine({...newMachine, model: e.target.value})} 
                  placeholder="Enter model"
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="text-sm font-medium text-gray-700">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={newMachine.serialNumber}
                  onChange={(e) => setNewMachine({...newMachine, serialNumber: e.target.value})}
                  placeholder="Enter serial number"
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department</Label>
                <Input
                  id="department"
                  value={newMachine.department}
                  onChange={(e) => setNewMachine({...newMachine, department: e.target.value})}
                  placeholder="Enter department"
                  className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machineDescription" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="machineDescription"
                value={newMachine.description}
                onChange={(e) => setNewMachine({...newMachine, description: e.target.value})}
                placeholder="Enter machine description"
                rows={3}
                className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setMachineDialogOpen(false);
                  setEditMachine(null);
                  resetNewMachineForm();
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                {editMachine ? 'Update Machine' : 'Add Machine'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW MACHINE DETAILS DIALOG */}
      <Dialog open={!!viewMachine} onOpenChange={() => setViewMachine(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Machine Details</DialogTitle>
          </DialogHeader>
          {viewMachine && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">{viewMachine.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{viewMachine.name}</h3>
                  <p className="text-gray-500">{viewMachine.manufacturer} • {viewMachine.model}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 uppercase font-medium">Cost</Label>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(viewMachine.cost)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase font-medium">Total Value</Label>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(viewMachine.cost * viewMachine.quantity)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase font-medium">Quantity</Label>
                    <p className="text-gray-900">{viewMachine.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase font-medium">Purchase Date</Label>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{formatDate(viewMachine.purchaseDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 uppercase font-medium">Status</Label>
                    <Badge className={`${machineStatusOptions.find(s => s.value === viewMachine.status)?.color} border-0`}>
                      {machineStatusOptions.find(s => s.value === viewMachine.status)?.label}
                    </Badge>
                  </div>
                  {viewMachine.location && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase font-medium">Location</Label>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{viewMachine.location}</span>
                      </div>
                    </div>
                  )}
                  {viewMachine.department && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase font-medium">Department</Label>
                      <p className="text-gray-900">{viewMachine.department}</p>
                    </div>
                  )}
                  {viewMachine.assignedTo && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase font-medium">Assigned To</Label>
                      <p className="text-gray-900">{viewMachine.assignedTo}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {viewMachine.description && (
                <div>
                  <Label className="text-xs text-gray-500 uppercase font-medium">Description</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{viewMachine.description}</p>
                  </div>
                </div>
              )}
              
              {/* Maintenance History */}
              {viewMachine.maintenanceHistory && viewMachine.maintenanceHistory.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900">Maintenance History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewMachine.maintenanceHistory.map((record, index) => (
                      <div key={index} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-blue-700">{record.type}</span>
                          <span className="text-blue-600">{formatDate(record.date)}</span>
                        </div>
                        <div className="text-gray-600 mt-1">{record.description}</div>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-gray-500">Performed by: {record.performedBy}</span>
                          <span className="text-blue-600">Cost: {formatCurrency(record.cost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD MAINTENANCE RECORD DIALOG */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={(open) => {
        setMaintenanceDialogOpen(open);
        if (!open) {
          setSelectedMachineForMaintenance(null);
          setMaintenanceRecord({
            type: "Routine",
            description: "",
            cost: 0,
            performedBy: "",
          });
        }
      }}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Add Maintenance Record</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddMaintenance();
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maintenanceMachine" className="text-sm font-medium text-gray-700">Select Machine</Label>
              <Select
                value={selectedMachineForMaintenance || ""}
                onValueChange={setSelectedMachineForMaintenance}
              >
                <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {machines.map(machine => (
                    <SelectItem key={machine.id} value={machine.id} className="rounded-md">
                      {machine.name} {machine.model ? `(${machine.model})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedMachineForMaintenance && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="maintenanceType" className="text-sm font-medium text-gray-700">Maintenance Type *</Label>
                  <Select
                    value={maintenanceRecord.type}
                    onValueChange={(value) => setMaintenanceRecord({...maintenanceRecord, type: value})}
                  >
                    <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {maintenanceTypes.map(type => (
                        <SelectItem key={type} value={type} className="rounded-md">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maintenanceDescription" className="text-sm font-medium text-gray-700">Description *</Label>
                  <Textarea
                    id="maintenanceDescription"
                    value={maintenanceRecord.description}
                    onChange={(e) => setMaintenanceRecord({...maintenanceRecord, description: e.target.value})}
                    placeholder="Describe the maintenance performed"
                    rows={3}
                    className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceCost" className="text-sm font-medium text-gray-700">Cost</Label>
                    <Input
                      id="maintenanceCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={maintenanceRecord.cost}
                      onChange={(e) => setMaintenanceRecord({...maintenanceRecord, cost: parseFloat(e.target.value) || 0})}
                      placeholder="Enter maintenance cost"
                      className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="performedBy" className="text-sm font-medium text-gray-700">Performed By *</Label>
                    <Input
                      id="performedBy"
                      value={maintenanceRecord.performedBy}
                      onChange={(e) => setMaintenanceRecord({...maintenanceRecord, performedBy: e.target.value})}
                      placeholder="Enter technician name"
                      className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setMaintenanceDialogOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={!selectedMachineForMaintenance || maintenanceLoading}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                {maintenanceLoading ? "Adding..." : "Add Maintenance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* IMPORT DIALOG */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Import Data from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file" className="text-sm font-medium text-gray-700">Upload CSV File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                <Input 
                  id="csv-file"
                  type="file" 
                  accept=".csv"
                  className="hidden"
                />
                <Label htmlFor="csv-file" className="cursor-pointer">
                  <UploadCloud className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Drag & drop or click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports .csv files
                  </p>
                </Label>
              </div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">CSV Format (Inventory)</h4>
              <div className="text-sm space-y-2 text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Required fields: SKU, Name, Department, Category</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div><span className="font-medium">SKU</span> <span className="text-red-500">*</span></div>
                  <div><span className="font-medium">Name</span> <span className="text-red-500">*</span></div>
                  <div><span className="font-medium">Department</span> <span className="text-red-500">*</span></div>
                  <div><span className="font-medium">Category</span> <span className="text-red-500">*</span></div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleExport}
                disabled={items.length === 0}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Template
              </Button>
              
              <Button 
                disabled={true}
                className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Import Data
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Note: Import functionality is under development
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* CHANGE HISTORY DIALOG */}
      <Dialog open={!!changeHistoryDialogOpen} onOpenChange={() => setChangeHistoryDialogOpen(null)}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Change History</DialogTitle>
          </DialogHeader>
          {changeHistoryDialogOpen && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(() => {
                const item = items.find(item => item.id === changeHistoryDialogOpen);
                return item?.changeHistory && item.changeHistory.length > 0 ? (
                  item.changeHistory.map((change, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                      <span className="text-blue-600">{change.date}</span>
                      <span className="text-gray-700">{change.change}</span>
                      <span className="text-gray-600">by {change.user}</span>
                      <span className={`font-medium ${change.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change.quantity > 0 ? '+' : ''}{change.quantity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No change history available for this item
                  </p>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;