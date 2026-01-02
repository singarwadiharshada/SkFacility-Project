import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
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
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inventoryService, type FrontendInventoryItem } from '@/services/inventoryService';

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
}

// Use the FrontendInventoryItem type from service
type InventoryItem = FrontendInventoryItem;

const InventoryPage = () => {
  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSite, setSelectedSite] = useState("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [changeHistoryDialogOpen, setChangeHistoryDialogOpen] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
  });
  
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

  // Helper function to calculate stats from items
  const calculateStats = (itemsList: InventoryItem[]): InventoryStats => {
    const totalItems = itemsList.length;
    const lowStockItems = itemsList.filter(item => item.quantity <= item.reorderLevel).length;
    const totalValue = itemsList.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    
    return {
      totalItems,
      lowStockItems,
      totalValue
    };
  };

  // Fetch data from backend on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch items only (no stats endpoint needed)
      const itemsData = await inventoryService.getItems();
      
      setItems(itemsData || []);
      
      // Calculate stats locally from the items data
      const calculatedStats = calculateStats(itemsData || []);
      setStats(calculatedStats);
      
    } catch (error) {
      console.error('Failed to fetch data from backend:', error);
      toast.error("Could not connect to backend");
      
      // Set empty arrays if backend fails
      setItems([]);
      setStats({ totalItems: 0, lowStockItems: 0, totalValue: 0 });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await fetchData();
      toast.success("Data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
      toast.error("Failed to delete item from backend");
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
    } catch (error: any) {
      console.error('Failed to add item:', error);
      
      if (error.message?.includes('SKU already exists')) {
        toast.error("SKU already exists. Please use a different SKU.");
      } else {
        toast.error("Failed to add item to backend");
      }
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
    } catch (error: any) {
      console.error('Failed to update item:', error);
      
      if (error.message?.includes('SKU already exists')) {
        toast.error("SKU already exists. Please use a different SKU.");
      } else {
        toast.error("Failed to update item in backend");
      }
    }
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

  // Simple CSV import implementation (frontend only)
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Skip header row
        const dataLines = lines.slice(1);
        
        let importedCount = 0;
        let failedCount = 0;
        
        for (const line of dataLines) {
          if (!line.trim()) continue;
          
          const columns = line.split(',');
          if (columns.length < 10) {
            failedCount++;
            continue;
          }
          
          try {
            const itemData: Omit<InventoryItem, 'id' | '_id' | 'createdAt' | 'updatedAt'> = {
              sku: columns[0].trim().toUpperCase(),
              name: columns[1].trim(),
              department: columns[2].trim().toLowerCase(),
              category: columns[3].trim(),
              site: columns[4].trim(),
              assignedManager: columns[5].trim(),
              quantity: parseInt(columns[6].trim()) || 0,
              price: parseFloat(columns[7].trim()) || 0,
              costPrice: parseFloat(columns[8].trim()) || 0,
              supplier: columns[9].trim(),
              reorderLevel: parseInt(columns[10]?.trim()) || 10,
              description: columns[11]?.trim() || "",
              changeHistory: [{
                date: new Date().toISOString().split('T')[0],
                change: "Created",
                user: "Supervisor",
                quantity: parseInt(columns[6].trim()) || 0
              }]
            };
            
            await inventoryService.createItem(itemData);
            importedCount++;
            
          } catch (error) {
            failedCount++;
            console.error('Failed to import row:', line, error);
          }
        }
        
        toast.success(`Imported ${importedCount} items successfully!`);
        if (failedCount > 0) {
          toast.error(`${failedCount} items failed to import`);
        }
        
        setImportDialogOpen(false);
        await fetchData(); // Refresh data
        
      } catch (error) {
        console.error('Failed to parse CSV:', error);
        toast.error("Failed to import items. Check CSV format.");
      }
    };
    
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    
    reader.readAsText(file);
  };

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

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading inventory from backend...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage and track your inventory across all sites</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={items.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => {
            setEditItem(null);
            setItemDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">
            <Package className="mr-2 h-4 w-4" />
            Inventory ({items.length})
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Low Stock ({stats.lowStockItems})
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="sites">
            <MapPin className="mr-2 h-4 w-4" />
            Sites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardContent className="pt-6">
              {/* Filters */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => {
                      const Icon = dept.icon;
                      return (
                        <SelectItem key={dept.value} value={dept.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
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
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {selectedDepartment !== "all" && 
                      getCategoriesForDepartment(selectedDepartment).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {site.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-lg font-medium">No items found</p>
                          <p className="text-muted-foreground">
                            {items.length === 0 
                              ? "No items in database. Add your first item!" 
                              : "Try adjusting your search or filters"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => {
                        const DeptIcon = getDepartmentIcon(item.department);
                        const isLowStock = item.quantity <= item.reorderLevel;
                        const siteName = sites.find(s => s.id === item.site)?.name;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{item.name}</span>
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {item.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <DeptIcon className="h-3 w-3" />
                                {departments.find(d => d.value === item.department)?.label}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">{item.category}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {siteName || `Site ${item.site}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                {item.assignedManager}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isLowStock ? 'text-amber-600' : ''}`}>
                                  {item.quantity}
                                </span>
                                {isLowStock && (
                                  <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Low
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Reorder: {item.reorderLevel}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{formatCurrency(item.price)}</div>
                              <div className="text-xs text-muted-foreground">
                                Cost: {formatCurrency(item.costPrice)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isLowStock ? (
                                <Badge variant="destructive" className="text-xs">
                                  Low Stock
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  In Stock
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Item Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div><strong>SKU:</strong> {item.sku}</div>
                                        <div><strong>Name:</strong> {item.name}</div>
                                        <div><strong>Department:</strong> {departments.find(d => d.value === item.department)?.label}</div>
                                        <div><strong>Category:</strong> {item.category}</div>
                                        <div><strong>Quantity:</strong> {item.quantity}</div>
                                        <div><strong>Price:</strong> {formatCurrency(item.price)}</div>
                                        <div><strong>Cost Price:</strong> {formatCurrency(item.costPrice)}</div>
                                        <div><strong>Supplier:</strong> {item.supplier}</div>
                                        <div><strong>Reorder Level:</strong> {item.reorderLevel}</div>
                                        <div><strong>Site:</strong> {siteName || `Site ${item.site}`}</div>
                                        <div><strong>Manager:</strong> {item.assignedManager}</div>
                                        {item.description && (
                                          <div className="col-span-2">
                                            <strong>Description:</strong> {item.description}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Change History */}
                                      <div>
                                        <h4 className="font-semibold mb-2">Change History</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                          {item.changeHistory && item.changeHistory.length > 0 ? (
                                            item.changeHistory.map((change, index) => (
                                              <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                                <span>{change.date}</span>
                                                <span>{change.change}</span>
                                                <span>by {change.user}</span>
                                                <span className={`font-medium ${change.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  {change.quantity > 0 ? '+' : ''}{change.quantity}
                                                </span>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-sm text-muted-foreground text-center py-2">
                                              No change history available
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setChangeHistoryDialogOpen(item.id)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Low Stock Tab */}
        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items that need reordering</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.lowStockItems === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-lg font-medium">All items are in stock!</p>
                  <p className="text-muted-foreground">No items need reordering at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items
                    .filter(item => item.quantity <= item.reorderLevel)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.sku}</div>
                            <div className="text-sm">{item.supplier}</div>
                          </div>
                        </div>
                        <div className="text-amber-600 font-medium">
                          {item.quantity} / {item.reorderLevel}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Item categories by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map(dept => {
                  const Icon = dept.icon;
                  const deptItems = items.filter(item => item.department === dept.value);
                  const deptCategories = [...new Set(deptItems.map(item => item.category))];
                  
                  return (
                    <Card key={dept.value}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-lg">{dept.label}</CardTitle>
                        </div>
                        <CardDescription>
                          {deptItems.length} items • {deptCategories.length} categories
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {deptCategories.length > 0 ? (
                            deptCategories.map(category => {
                              const categoryItems = deptItems.filter(item => item.category === category);
                              return (
                                <div key={category} className="flex justify-between items-center">
                                  <span>{category}</span>
                                  <Badge variant="secondary">{categoryItems.length}</Badge>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No items in this department</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sites Tab */}
        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <CardTitle>Sites</CardTitle>
              <CardDescription>Inventory distribution across sites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sites.map(site => {
                  const siteItems = items.filter(item => item.site === site.id);
                  const siteValue = siteItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
                  
                  return (
                    <Card key={site.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          <CardTitle className="text-lg">{site.name}</CardTitle>
                        </div>
                        <CardDescription>
                          {siteItems.length} items • Value: {formatCurrency(siteValue)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {siteItems.length > 0 ? (
                            <div className="text-sm">
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="font-medium">Department</div>
                                <div className="font-medium text-right">Items</div>
                              </div>
                              {Object.entries(
                                siteItems.reduce((acc, item) => {
                                  acc[item.department] = (acc[item.department] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([dept, count]) => (
                                <div key={dept} className="flex justify-between items-center">
                                  <span className="capitalize">{dept}</span>
                                  <Badge variant="secondary">{count}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No items at this site</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={editItem ? editItem.department : newItem.department}
                onValueChange={(value) => 
                  editItem 
                    ? setEditItem({...editItem, department: value, category: ''})
                    : setNewItem({...newItem, department: value, category: ''})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => {
                    const Icon = dept.icon;
                    return (
                      <SelectItem key={dept.value} value={dept.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {dept.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={editItem ? editItem.category : newItem.category}
                onValueChange={(value) => 
                  editItem 
                    ? setEditItem({...editItem, category: value})
                    : setNewItem({...newItem, category: value})
                }
                disabled={!editItem?.department && !newItem.department}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(editItem ? getCategoriesForDepartment(editItem.department) : 
                    getCategoriesForDepartment(newItem.department || '')).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="site">Site *</Label>
              <Select
                value={editItem ? editItem.site : newItem.site}
                onValueChange={(value) => 
                  editItem 
                    ? setEditItem({...editItem, site: value})
                    : setNewItem({...newItem, site: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {site.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignedManager">Assigned Manager *</Label>
              <Select
                value={editItem ? editItem.assignedManager : newItem.assignedManager}
                onValueChange={(value) => 
                  editItem 
                    ? setEditItem({...editItem, assignedManager: value})
                    : setNewItem({...newItem, assignedManager: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map(manager => (
                    <SelectItem key={manager} value={manager}>{manager}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level *</Label>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price *</Label>
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
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label htmlFor="supplier">Supplier *</Label>
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
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
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
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editItem ? handleEditItem : handleAddItem}>
              {editItem ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-4">Drop your CSV file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Supports .csv files with item data</p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="mt-4 mx-auto max-w-xs"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold">CSV Format:</p>
              <p>SKU,Name,Department,Category,Site,AssignedManager,Quantity,Price,CostPrice,Supplier,ReorderLevel</p>
              <p className="mt-2 text-xs">Note: SKU must be unique</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change History Dialog */}
      <Dialog open={!!changeHistoryDialogOpen} onOpenChange={() => setChangeHistoryDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
          </DialogHeader>
          {changeHistoryDialogOpen && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(() => {
                const item = items.find(item => item.id === changeHistoryDialogOpen);
                return item?.changeHistory && item.changeHistory.length > 0 ? (
                  item.changeHistory.map((change, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <span>{change.date}</span>
                      <span>{change.change}</span>
                      <span>by {change.user}</span>
                      <span className={`font-medium ${change.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change.quantity > 0 ? '+' : ''}{change.quantity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
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