// app/(dashboard)/admin/notifications/page.tsx
'use client';

import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Bell,
  BellOff, BellRing,
  Building,
  Calendar,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Edit,
  Filter,
  FilterX,
  Globe,
  Loader2,
  MapPin,
  Package,
  RefreshCw, Search,
  Settings,
  Square,
  Target,
  Trash2,
  User,
  X,
  XCircle,
  Sparkles,
  TrendingUp,
  BarChart3,
  Zap,
  ArrowRight,
  Eye,
  MoreVertical,
  Star,
  AlertCircle as Alert,
  CheckCircle2,
  XCircle as XCircleIcon,
  Activity,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Timer,
  CalendarDays,
  Users,
  FileText,
  ShoppingCart,
  Warehouse,
  PackageOpen,
  Layers
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Types for notifications
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'site' | 'leave' | 'task' | 'approval' | 'system' | 'site_activity' | 'inventory';
  timestamp: string;
  isRead: boolean;
  metadata?: {
    siteId?: string;
    siteName?: string;
    clientName?: string;
    location?: string;
    areaSqft?: number;
    contractValue?: number;
    status?: 'active' | 'inactive';
    action?: 'created' | 'updated' | 'deleted' | 'status_changed';
    previousStatus?: string;
    newStatus?: string;
    addedBy?: string;
    addedByRole?: string;
    services?: string[];
    totalStaff?: number;
    
    // Leave properties
    leaveId?: string;
    employeeName?: string;
    leaveType?: string;
    fromDate?: string;
    toDate?: string;
    totalDays?: number;
    remarks?: string;
    
    // Task properties
    taskId?: string;
    taskTitle?: string;
    assigneeName?: string;
    assigneeRole?: string;
    priority?: string;
    taskType?: string;
    isProcessed?: boolean;
    
    // Inventory properties
    itemId?: string;
    itemName?: string;
    sku?: string;
    quantity?: number;
    reorderLevel?: number;
    department?: string;
    supplier?: string;
    assignedManager?: string;
    site?: string;
    
    // Common properties
    timestamp?: string;
    [key: string]: any;
  };
}

// Types for tasks
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: {
    name: string;
    role: string;
    id: string;
  };
  siteId: string;
  siteName: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Types for leaves
interface Leave {
  id: string;
  employeeName: string;
  employeeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  siteId?: string;
  siteName?: string;
  appliedAt: string;
  processedAt?: string;
}

// Types for inventory items
interface InventoryItem {
  id: string;
  _id?: string;
  sku: string;
  name: string;
  department: string;
  category: string;
  site: string;
  assignedManager: string;
  quantity: number;
  price: number;
  costPrice: number;
  supplier: string;
  reorderLevel: number;
  description?: string;
  isLowStock?: boolean;
}

// API URLs
const API_URL = `http://${window.location.hostname}:5001/api`;

// Site Service Interface
interface Site {
  _id: string;
  name: string;
  clientId?: string;
  clientName: string;
  location: string;
  areaSqft: number;
  contractValue: number;
  services: string[];
  staffDeployment: Array<{ role: string; count: number }>;
  status: 'active' | 'inactive';
  addedBy?: string;
  addedByRole?: string;
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationItem[] = [];
  private subscribers: ((notifications: NotificationItem[]) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('admin-notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('admin-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback([...this.notifications]));
  }

  subscribe(callback: (notifications: NotificationItem[]) => void) {
    this.subscribers.push(callback);
    callback([...this.notifications]);
    
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 100 notifications to prevent storage overflow
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
    
    this.saveToStorage();
    this.notifySubscribers();

    return newNotification;
  }

  markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.saveToStorage();
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  markAllAsRead(): number {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    unreadNotifications.forEach(n => n.isRead = true);
    
    if (unreadNotifications.length > 0) {
      this.saveToStorage();
      this.notifySubscribers();
    }
    
    return unreadNotifications.length;
  }

  deleteNotification(id: string): boolean {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== id);
    
    if (this.notifications.length !== initialLength) {
      this.saveToStorage();
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  clearAllNotifications(): number {
    const count = this.notifications.length;
    this.notifications = [];
    this.saveToStorage();
    this.notifySubscribers();
    return count;
  }

  clearBySite(siteId: string): number {
    const filtered = this.notifications.filter(n => n.metadata?.siteId === siteId);
    this.notifications = this.notifications.filter(n => n.metadata?.siteId !== siteId);
    
    if (filtered.length > 0) {
      this.saveToStorage();
      this.notifySubscribers();
    }
    
    return filtered.length;
  }

  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  getNotificationsBySite(siteId: string): NotificationItem[] {
    return this.notifications.filter(n => n.metadata?.siteId === siteId);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getTypeCount(type: string): number {
    return this.notifications.filter(n => n.type === type).length;
  }

  // Add site activity notification
  addSiteNotification(site: Site, action: 'created' | 'updated' | 'deleted' | 'status_changed', previousData?: Partial<Site>) {
    let title = '';
    let message = '';
    const type: 'site_activity' = 'site_activity';

    switch (action) {
      case 'created':
        title = '🏢 New Site Added';
        message = `New site "${site.name}" has been added for client "${site.clientName}"`;
        break;
      case 'updated':
        title = '✏️ Site Updated';
        message = `Site "${site.name}" has been updated`;
        break;
      case 'deleted':
        title = '🗑️ Site Deleted';
        message = `Site "${site.name}" has been deleted`;
        break;
      case 'status_changed':
        const statusText = site.status === 'active' ? 'activated' : 'deactivated';
        title = site.status === 'active' ? '✅ Site Activated' : '⏸️ Site Deactivated';
        message = `Site "${site.name}" has been ${statusText}`;
        break;
    }

    this.addNotification({
      title,
      message,
      type,
      metadata: {
        siteId: site._id,
        siteName: site.name,
        clientName: site.clientName,
        location: site.location,
        areaSqft: site.areaSqft,
        contractValue: site.contractValue,
        status: site.status,
        action,
        previousStatus: previousData?.status,
        newStatus: site.status,
        addedBy: site.addedBy,
        addedByRole: site.addedByRole,
        services: site.services,
        totalStaff: site.staffDeployment?.reduce((sum, item) => sum + (item.count || 0), 0) || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Add inventory low stock notification
  addInventoryNotification(item: InventoryItem) {
    const title = '📦 Low Stock Alert';
    const message = `${item.name} (${item.sku}) is running low. Current quantity: ${item.quantity}, Reorder level: ${item.reorderLevel}`;
    
    this.addNotification({
      title,
      message,
      type: 'inventory',
      metadata: {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        department: item.department,
        supplier: item.supplier,
        assignedManager: item.assignedManager,
        site: item.site,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Create notifications from existing sites
  createNotificationsFromSites(sites: Site[]) {
    console.log('Creating notifications from sites:', sites.length);
    
    const existingSiteIds = new Set(
      this.notifications
        .filter(n => n.type === 'site_activity')
        .map(n => n.metadata?.siteId)
    );

    const newSites = sites.filter(site => !existingSiteIds.has(site._id));
    
    console.log('New sites to create notifications for:', newSites.length);

    newSites.forEach(site => {
      const siteCreatedAt = new Date(site.createdAt);
      const now = new Date();
      const timeDiff = now.getTime() - siteCreatedAt.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff <= 24) {
        this.addSiteNotification(site, 'created');
        console.log(`Created notification for site: ${site.name}`);
      } else {
        console.log(`Skipping older site: ${site.name} (created ${hoursDiff.toFixed(1)} hours ago)`);
      }
    });

    if (newSites.length > 0) {
      this.saveToStorage();
      this.notifySubscribers();
    }
  }

  // Create notifications from low stock items
  createNotificationsFromInventory(items: InventoryItem[]) {
    console.log('Creating notifications from inventory items:', items.length);
    
    const existingItemIds = new Set(
      this.notifications
        .filter(n => n.type === 'inventory')
        .map(n => n.metadata?.itemId)
    );

    const lowStockItems = items.filter(item => {
      const isLow = item.quantity <= item.reorderLevel;
      const isCritical = item.quantity <= item.reorderLevel * 0.25;
      const isNew = !existingItemIds.has(item.id);
      
      return isLow && isCritical && isNew;
    });
    
    console.log('Low stock items to create notifications for:', lowStockItems.length);

    lowStockItems.forEach(item => {
      this.addInventoryNotification(item);
      console.log(`Created notification for low stock item: ${item.name}`);
    });

    if (lowStockItems.length > 0) {
      this.saveToStorage();
      this.notifySubscribers();
    }
  }

  // Sync with current sites data
  syncWithSites(sites: Site[]) {
    this.createNotificationsFromSites(sites);
  }

  // Sync with inventory data
  syncWithInventory(items: InventoryItem[]) {
    this.createNotificationsFromInventory(items);
  }

  // Clear inventory notifications by item
  clearByItem(itemId: string): number {
    const filtered = this.notifications.filter(n => n.metadata?.itemId === itemId);
    this.notifications = this.notifications.filter(n => n.metadata?.itemId !== itemId);
    
    if (filtered.length > 0) {
      this.saveToStorage();
      this.notifySubscribers();
    }
    
    return filtered.length;
  }
}

// Create singleton instance
const notificationService = NotificationService.getInstance();

// Helper function to get auth token if available
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('auth_token') || 
                localStorage.getItem('token') ||
                sessionStorage.getItem('auth_token');
  
  return token;
};

// Fetch all sites from API
const fetchSites = async (): Promise<Site[]> => {
  try {
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/sites`, {
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized to fetch sites');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let sites: any[] = [];
    
    if (Array.isArray(data)) {
      sites = data;
    } else if (data.data && Array.isArray(data.data)) {
      sites = data.data;
    } else if (data.sites && Array.isArray(data.sites)) {
      sites = data.sites;
    } else if (data.success && data.data) {
      sites = Array.isArray(data.data) ? data.data : [];
    }
    
    return sites.map(site => ({
      _id: site._id || site.id,
      name: site.name || 'Unnamed Site',
      clientName: site.clientName || site.client?.name || 'Unknown Client',
      location: site.location || 'Unknown Location',
      areaSqft: site.areaSqft || site.area || 0,
      contractValue: site.contractValue || site.value || 0,
      services: Array.isArray(site.services) ? site.services : 
                (site.service ? [site.service] : []),
      staffDeployment: Array.isArray(site.staffDeployment) ? site.staffDeployment : 
                      (site.staff ? site.staff : []),
      status: (site.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      addedBy: site.addedBy || site.createdBy,
      addedByRole: site.addedByRole || site.createdByRole,
      createdAt: site.createdAt || site.createdDate || new Date().toISOString(),
      updatedAt: site.updatedAt || site.updatedDate || new Date().toISOString(),
      clientId: site.clientId || site.client?._id
    }));
  } catch (error) {
    console.error('Error fetching sites:', error);
    return [];
  }
};

// Fetch tasks by site
const fetchTasksBySite = async (siteId?: string): Promise<Task[]> => {
  try {
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${API_URL}/tasks`;
    if (siteId && siteId !== 'all') {
      url = `${API_URL}/tasks?siteId=${siteId}`;
    }

    const response = await fetch(url, {
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized to fetch tasks');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let tasks: any[] = [];
    
    if (Array.isArray(data)) {
      tasks = data;
    } else if (data.data && Array.isArray(data.data)) {
      tasks = data.data;
    } else if (data.tasks && Array.isArray(data.tasks)) {
      tasks = data.tasks;
    } else if (data.success && data.data) {
      tasks = Array.isArray(data.data) ? data.data : [];
    }
    
    return tasks.map(task => ({
      id: task._id || task.id,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      assignee: {
        name: task.assignee?.name || task.assigneeName || 'Unassigned',
        role: task.assignee?.role || task.assigneeRole || 'Staff',
        id: task.assignee?._id || task.assigneeId || ''
      },
      siteId: task.siteId || task.site?._id || '',
      siteName: task.siteName || task.site?.name || 'No Site',
      dueDate: task.dueDate || task.deadline || '',
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
      createdBy: task.createdBy || task.addedBy || ''
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

// Fetch leaves by site
const fetchLeavesBySite = async (siteId?: string): Promise<Leave[]> => {
  try {
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${API_URL}/leaves`;
    if (siteId && siteId !== 'all') {
      url = `${API_URL}/leaves?siteId=${siteId}`;
    }

    const response = await fetch(url, {
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized to fetch leaves');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let leaves: any[] = [];
    
    if (Array.isArray(data)) {
      leaves = data;
    } else if (data.data && Array.isArray(data.data)) {
      leaves = data.data;
    } else if (data.leaves && Array.isArray(data.leaves)) {
      leaves = data.leaves;
    } else if (data.success && data.data) {
      leaves = Array.isArray(data.data) ? data.data : [];
    }
    
    return leaves.map(leave => ({
      id: leave._id || leave.id,
      employeeName: leave.employeeName || leave.employee?.name || 'Unknown Employee',
      employeeId: leave.employeeId || leave.employee?._id || '',
      leaveType: leave.leaveType || 'Casual',
      fromDate: leave.fromDate || leave.startDate || '',
      toDate: leave.toDate || leave.endDate || '',
      totalDays: leave.totalDays || leave.days || 1,
      status: leave.status || 'pending',
      remarks: leave.remarks || leave.reason || '',
      siteId: leave.siteId || leave.site?._id || '',
      siteName: leave.siteName || leave.site?.name || '',
      appliedAt: leave.appliedAt || leave.createdAt || new Date().toISOString(),
      processedAt: leave.processedAt || leave.updatedAt
    }));
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return [];
  }
};

// Simplified inventory fetch - tries multiple endpoints
const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // First try the regular inventory endpoint
    let response;
    try {
      console.log('Trying to fetch inventory from /inventory endpoint');
      response = await fetch(`${API_URL}/inventory`, { headers });
      
      if (!response.ok) {
        console.warn('Inventory endpoint failed, trying /items');
        // Try alternative endpoint
        response = await fetch(`${API_URL}/items`, { headers });
      }
    } catch (error) {
      console.warn('All inventory endpoints failed, returning empty array');
      return [];
    }

    if (!response.ok) {
      console.warn('Failed to fetch inventory items, status:', response.status);
      return [];
    }

    const data = await response.json();
    
    let items: any[] = [];
    
    if (Array.isArray(data)) {
      items = data;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.success && data.data) {
      items = Array.isArray(data.data) ? data.data : [];
    } else if (data.inventory && Array.isArray(data.inventory)) {
      items = data.inventory;
    }
    
    // Convert to our format and filter for low stock items
    const inventoryItems = items.map(item => {
      const inventoryItem: InventoryItem = {
        id: item._id || item.id || `temp-${Date.now()}-${Math.random()}`,
        _id: item._id || item.id,
        sku: item.sku || 'N/A',
        name: item.name || 'Unnamed Item',
        department: item.department || 'General',
        category: item.category || 'Uncategorized',
        site: item.site || '',
        assignedManager: item.assignedManager || '',
        quantity: item.quantity || 0,
        price: item.price || 0,
        costPrice: item.costPrice || 0,
        supplier: item.supplier || '',
        reorderLevel: item.reorderLevel || 10,
        description: item.description,
        isLowStock: (item.quantity || 0) <= (item.reorderLevel || 10)
      };
      return inventoryItem;
    });

    // Return only low stock items
    return inventoryItems.filter(item => item.isLowStock);
    
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return []; // Return empty array
  }
};

// Format currency for display
const formatCurrency = (amount: number | undefined): string => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Format number with commas
const formatNumber = (num: number | undefined): string => {
  if (!num) return '0';
  return num.toLocaleString('en-IN');
};

// Format date
const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Format date time
const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Container animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const pulseAnimation = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.05, 1],
    transition: { 
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse" 
    }
  }
};

const shimmerAnimation = {
  initial: { backgroundPosition: '200% center' },
  animate: { 
    backgroundPosition: '-200% center',
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

const AdminNotifications = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sitesData, setSitesData] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState("notifications");
  
  const [viewNotification, setViewNotification] = useState<NotificationItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Animation states
  const [pulse, setPulse] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    siteActivity: 0,
    tasks: 0,
    leaves: 0,
    lowStock: 0
  });

  // Initialize notifications
  useEffect(() => {
    setNotifications(notificationService.getNotifications());
    
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    fetchAllData();

    const interval = setInterval(fetchAllData, 120000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Update stats when data changes
  useEffect(() => {
    setStats({
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      siteActivity: notifications.filter(n => n.type === 'site_activity').length,
      tasks: tasks.length,
      leaves: leaves.length,
      lowStock: inventoryItems.length
    });
  }, [notifications, tasks, leaves, inventoryItems]);

  // Fetch all data based on selected site
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setPulse(true);
      
      const sites = await fetchSites();
      setSitesData(sites);
      notificationService.syncWithSites(sites);

      const tasksData = await fetchTasksBySite(selectedSite === "all" ? undefined : selectedSite);
      setTasks(tasksData);

      const leavesData = await fetchLeavesBySite(selectedSite === "all" ? undefined : selectedSite);
      setLeaves(leavesData);

      const inventoryData = await fetchInventoryItems();
      setInventoryItems(inventoryData);
      notificationService.syncWithInventory(inventoryData);

    } catch (error) {
      console.error('Error fetching data:', error);
      
      toast({
        title: "Data Fetch Error",
        description: "Some data couldn't be loaded. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setPulse(false), 1000);
    }
  };

  // Handle site selection change
  useEffect(() => {
    fetchAllData();
  }, [selectedSite]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
    
    toast({
      title: "🎉 Refreshed Successfully!",
      description: "All data has been refreshed with the latest updates",
      variant: "default",
    });
  };

  const handleMarkAsRead = (id: string) => {
    const success = notificationService.markAsRead(id);
    if (success) {
      toast({
        title: "✅ Marked as Read",
        description: "Notification has been marked as read",
        variant: "default",
      });
    }
  };

  const handleMarkAllAsRead = () => {
    const markedCount = notificationService.markAllAsRead();
    toast({
      title: "📋 All Marked as Read",
      description: `${markedCount} notifications marked as read`,
      variant: "default",
    });
  };

  const handleDelete = (id: string) => {
    const success = notificationService.deleteNotification(id);
    if (success) {
      toast({
        title: "🗑️ Deleted",
        description: "Notification has been deleted",
        variant: "default",
      });
    }
  };

  const handleClearAll = () => {
    if (notifications.length === 0) {
      toast({
        title: "ℹ️ No Notifications",
        description: "There are no notifications to clear",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to clear all ${notifications.length} notifications?`)) {
      const clearedCount = notificationService.clearAllNotifications();
      toast({
        title: "🧹 All Cleared",
        description: `${clearedCount} notifications cleared`,
        variant: "default",
      });
    }
  };

  const handleViewDetails = (notification: NotificationItem) => {
    setViewNotification(notification);
    setDialogOpen(true);
    
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "site_activity": return <Building className="h-5 w-5" />;
      case "leave": return <Calendar className="h-5 w-5" />;
      case "task": return <Target className="h-5 w-5" />;
      case "inventory": return <Package className="h-5 w-5" />;
      case "approval": return <AlertTriangle className="h-5 w-5" />;
      case "system": return <Settings className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getUnreadCount = (): number => {
    return notifications.filter(n => !n.isRead).length;
  };

  // Enhanced search for notifications that finds all matches
  const getMatchingNotifications = (query: string): NotificationItem[] => {
    if (!query) return notifications;
    
    const lowerQuery = query.toLowerCase();
    
    return notifications.filter(notification => {
      if (notification.title.toLowerCase().includes(lowerQuery) ||
          notification.message.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      const metadata = notification.metadata || {};
      
      if ((metadata.siteName?.toLowerCase() || '').includes(lowerQuery) ||
          (metadata.site?.toLowerCase() || '').includes(lowerQuery) ||
          (metadata.clientName?.toLowerCase() || '').includes(lowerQuery) ||
          (metadata.location?.toLowerCase() || '').includes(lowerQuery)) {
        return true;
      }

      if (metadata.siteId) {
        const relatedSite = sitesData.find(s => s._id === metadata.siteId);
        if (relatedSite) {
          if (relatedSite.name.toLowerCase().includes(lowerQuery) ||
              relatedSite.clientName.toLowerCase().includes(lowerQuery) ||
              relatedSite.location.toLowerCase().includes(lowerQuery)) {
            return true;
          }
        }
      }

      switch (notification.type) {
        case 'inventory':
          if ((metadata.itemName?.toLowerCase() || '').includes(lowerQuery) ||
              (metadata.sku?.toLowerCase() || '').includes(lowerQuery) ||
              (metadata.department?.toLowerCase() || '').includes(lowerQuery) ||
              (metadata.supplier?.toLowerCase() || '').includes(lowerQuery)) {
            return true;
          }
          break;
        case 'task':
          if ((metadata.taskTitle?.toLowerCase() || '').includes(lowerQuery) ||
              (metadata.assigneeName?.toLowerCase() || '').includes(lowerQuery) ||
              (metadata.assigneeRole?.toLowerCase() || '').includes(lowerQuery)) {
            return true;
          }
          break;
        case 'leave':
          if ((metadata.employeeName?.toLowerCase() || '').includes(lowerQuery) ||
              (metadata.leaveType?.toLowerCase() || '').includes(lowerQuery)) {
            return true;
          }
          break;
      }

      return false;
    });
  };

  // Filter notifications based on selected site and other filters
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    if (selectedSite !== "all") {
      filtered = filtered.filter(notification => {
        const metadata = notification.metadata || {};
        
        if (metadata.siteId === selectedSite) {
          return true;
        }
        
        const selectedSiteData = sitesData.find(s => s._id === selectedSite);
        if (selectedSiteData) {
          const siteName = selectedSiteData.name.toLowerCase();
          const metadataSiteName = (metadata.siteName || '').toLowerCase();
          
          if (metadataSiteName.includes(siteName) || siteName.includes(metadataSiteName)) {
            return true;
          }
          
          const clientName = selectedSiteData.clientName.toLowerCase();
          const metadataClientName = (metadata.clientName || '').toLowerCase();
          
          if (metadataClientName.includes(clientName) || clientName.includes(metadataClientName)) {
            return true;
          }
        }
        
        if (notification.type === 'inventory') {
          const inventoryItem = inventoryItems.find(item => item.id === metadata.itemId);
          if (inventoryItem?.site === selectedSite) {
            return true;
          }
        }
        
        return false;
      });
    }
    
    if (filter === "unread") {
      filtered = filtered.filter(notification => !notification.isRead);
    } else if (filter !== "all") {
      filtered = filtered.filter(notification => notification.type === filter);
    }
    
    if (searchQuery) {
      filtered = getMatchingNotifications(searchQuery);
    }
    
    return filtered;
  }, [notifications, selectedSite, filter, searchQuery, inventoryItems, sitesData]);

  // Filter tasks based on selected site
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (selectedSite !== "all") {
      filtered = filtered.filter(task => task.siteId === selectedSite);
    }
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description.toLowerCase().includes(lowerQuery) ||
        task.siteName.toLowerCase().includes(lowerQuery) ||
        task.assignee.name.toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  }, [tasks, selectedSite, searchQuery]);

  // Filter leaves based on selected site
  const filteredLeaves = useMemo(() => {
    let filtered = leaves;
    
    if (selectedSite !== "all") {
      filtered = filtered.filter(leave => leave.siteId === selectedSite);
    }
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(leave =>
        leave.employeeName.toLowerCase().includes(lowerQuery) ||
        leave.leaveType.toLowerCase().includes(lowerQuery) ||
        (leave.siteName?.toLowerCase() || '').includes(lowerQuery)
      );
    }
    
    return filtered;
  }, [leaves, selectedSite, searchQuery]);

  // Filter inventory items based on selected site
  const filteredInventoryItems = useMemo(() => {
    let filtered = inventoryItems;
    
    if (selectedSite !== "all") {
      filtered = filtered.filter(item => item.site === selectedSite);
    }
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery) ||
        item.department.toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  }, [inventoryItems, selectedSite, searchQuery]);

  const unreadCount = getUnreadCount();
  const totalCount = notifications.length;

  // Get filter label for dropdown
  const getFilterLabel = () => {
    switch (filter) {
      case "all": return "All Notifications";
      case "unread": return "Unread Only";
      case "site_activity": return "Site Activity";
      case "task": return "Tasks";
      case "leave": return "Leave";
      case "inventory": return "Low Stock";
      case "approval": return "Approvals";
      case "system": return "System";
      default: return "All Notifications";
    }
  };

  // Get type count for dropdown badge
  const getTypeCount = (type: string) => {
    return notifications.filter(n => n.type === type).length;
  };

  // Get priority badge color
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  // Get leave status badge color
  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  // Get inventory severity badge color
  const getInventorySeverityBadge = (quantity: number, reorderLevel: number) => {
    const percentage = (quantity / reorderLevel) * 100;
    if (percentage <= 10) return 'destructive';
    if (percentage <= 25) return 'default';
    if (percentage <= 50) return 'secondary';
    return 'outline';
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedSite("all");
    setFilter("all");
    setSearchQuery("");
    
    toast({
      title: "🧹 Filters Cleared",
      description: "All filters have been cleared",
      variant: "default",
    });
  };

  // Get battery icon based on inventory level
  const getBatteryIcon = (quantity: number, reorderLevel: number) => {
    const percentage = (quantity / reorderLevel) * 100;
    if (percentage <= 10) return <BatteryLow className="h-4 w-4 text-red-500" />;
    if (percentage <= 25) return <BatteryMedium className="h-4 w-4 text-orange-500" />;
    if (percentage <= 50) return <BatteryMedium className="h-4 w-4 text-yellow-500" />;
    return <BatteryFull className="h-4 w-4 text-green-500" />;
  };

  // Site selector component for each tab
  const SiteSelector = () => (
    <motion.div 
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Select value={selectedSite} onValueChange={setSelectedSite}>
        <SelectTrigger className="w-[200px] bg-gradient-to-r from-white to-muted/50 border-primary/20 shadow-sm hover:shadow-md transition-all duration-300">
          <SelectValue placeholder="Select site">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>
                {selectedSite === "all" 
                  ? "All Sites" 
                  : sitesData.find(s => s._id === selectedSite)?.name || "Select site"}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border-primary/20 shadow-lg">
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <div>
                <span>All Sites</span>
                <p className="text-xs text-muted-foreground">
                  Show data from all sites
                </p>
              </div>
            </div>
          </SelectItem>
          {sitesData.map(site => (
            <SelectItem key={site._id} value={site._id}>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <div>
                  <span className="truncate">{site.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {site.clientName} • {site.location}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {(selectedSite !== "all" || filter !== "all" || searchQuery) && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
          >
            <FilterX className="h-4 w-4" />
            Clear Filters
          </Button>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-b from-background to-muted/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DashboardHeader 
        title={
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-xl blur-lg opacity-50" />
              <div className="relative p-2 bg-gradient-to-br from-primary to-blue-500 rounded-lg shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Notification Hub
              </h1>
            </div>
          </motion.div>
        }
        onMenuClick={onMenuClick}
        actions={
          <motion.div 
            className="flex gap-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="group relative overflow-hidden border-primary/20 bg-gradient-to-r from-white to-primary/5 hover:shadow-lg transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <RefreshCw className={cn("h-4 w-4 mr-2 transition-transform duration-300", isRefreshing && "animate-spin")} />
              Refresh All
            </Button>
          </motion.div>
        }
      />

      <motion.div 
        className="p-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Tabs for different sections */}
        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-gradient-to-r from-muted to-background p-1">
                  <TabsTrigger value="notifications" className="relative flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300">
                    <div className="relative">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2"
                        >
                          <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center animate-pulse">
                            {unreadCount}
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white transition-all duration-300">
                    <Target className="h-4 w-4" />
                    Tasks
                    {tasks.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                        {tasks.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="leaves" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white transition-all duration-300">
                    <Calendar className="h-4 w-4" />
                    Leaves
                    {leaves.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                        {leaves.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="low-stock" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300">
                    <Package className="h-4 w-4" />
                    Low Stock
                    {inventoryItems.length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center animate-pulse">
                        {inventoryItems.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </motion.div>
              
              {/* Site Selector */}
              <SiteSelector />
            </div>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-primary/20 shadow-lg overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-cyan-500" />
                  <CardHeader className="pb-3 bg-gradient-to-b from-white to-muted/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className="relative"
                          animate={pulse ? pulseAnimation.animate : pulseAnimation.initial}
                        >
                          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-xl blur-lg opacity-50" />
                          <div className="relative p-2 bg-gradient-to-br from-primary to-blue-500 rounded-lg shadow-lg">
                            <Bell className="h-6 w-6 text-white" />
                          </div>
                        </motion.div>
                        <div>
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                            Notification Center
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>
                              {selectedSite === "all" 
                                ? "All notifications across all sites"
                                : `Notifications for ${sitesData.find(s => s._id === selectedSite)?.name || 'selected site'}`}
                            </span>
                            {unreadCount > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="inline-block"
                              >
                                <Badge variant="destructive" className="animate-pulse">
                                  {unreadCount} New
                                </Badge>
                              </motion.span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Filter Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:border-primary/40 transition-all duration-300">
                              <Filter className="h-4 w-4" />
                              {getFilterLabel()}
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 border-primary/20 shadow-xl">
                            <DropdownMenuLabel className="flex items-center gap-2">
                              <Filter className="h-4 w-4" />
                              Filter Notifications
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem 
                                onClick={() => setFilter("all")} 
                                className="cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <Bell className="mr-2 h-4 w-4" />
                                  <span>All Notifications</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {notifications.length}
                                </Badge>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setFilter("unread")} 
                                className="cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <BellRing className="mr-2 h-4 w-4" />
                                  <span>Unread Only</span>
                                </div>
                                {unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {unreadCount}
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="flex items-center gap-2">
                              <Layers className="h-4 w-4" />
                              By Type
                            </DropdownMenuLabel>
                            <DropdownMenuGroup>
                              <DropdownMenuItem 
                                onClick={() => setFilter("site_activity")} 
                                className="cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <Building className="mr-2 h-4 w-4" />
                                  <span>Site Activity</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {getTypeCount("site_activity")}
                                </Badge>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setFilter("task")} 
                                className="cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <Target className="mr-2 h-4 w-4" />
                                  <span>Tasks</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {getTypeCount("task")}
                                </Badge>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setFilter("leave")} 
                                className="cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4" />
                                  <span>Leave</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {getTypeCount("leave")}
                                </Badge>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setFilter("inventory")} 
                                className="cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <Package className="mr-2 h-4 w-4" />
                                  <span>Low Stock</span>
                                </div>
                                <Badge variant="destructive" className="text-xs">
                                  {getTypeCount("inventory")}
                                </Badge>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Action Buttons */}
                        {unreadCount > 0 && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="gap-2 border-green-500/20 hover:bg-green-500/10 hover:text-green-600 transition-all duration-300">
                              <CheckCheck className="h-4 w-4" />
                              Mark All Read
                            </Button>
                          </motion.div>
                        )}
                        {totalCount > 0 && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button onClick={handleClearAll} variant="destructive" size="sm" className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300">
                              <Trash2 className="h-4 w-4" />
                              Clear All
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Search */}
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-primary/20 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                      />
                      {searchQuery && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchQuery("")}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <CardContent className="pt-6">
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="text-center py-12"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-xl" />
                            <Loader2 className="relative h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                            Loading notifications...
                          </h3>
                          <p className="text-muted-foreground">Fetching the latest updates</p>
                        </motion.div>
                      ) : filteredNotifications.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="text-center py-12"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted/50 rounded-full blur-xl opacity-50" />
                            <BellOff className="relative h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            {selectedSite !== "all" 
                              ? `No notifications found for selected site.`
                              : searchQuery 
                              ? `No notifications match "${searchQuery}". Try a different search.`
                              : filter !== "all"
                              ? `No ${filter === "unread" ? "unread" : filter} notifications found.`
                              : "You're all caught up! New notifications will appear here."}
                          </p>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">
                              Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                              {filter !== "all" && ` (${filter === "unread" ? "unread" : filter})`}
                              {selectedSite !== "all" && ` for ${sitesData.find(s => s._id === selectedSite)?.name || 'selected site'}`}
                            </p>
                          </div>
                          
                          <AnimatePresence>
                            {filteredNotifications.map((notification, index) => (
                              <motion.div
                                key={notification.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{ delay: index * 0.03, type: "spring" }}
                                whileHover={{ 
                                  scale: 1.02,
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                                }}
                                className={cn(
                                  "p-4 rounded-lg border transition-all duration-300 cursor-pointer",
                                  notification.isRead 
                                    ? "bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/30" 
                                    : "bg-gradient-to-r from-primary/5 to-blue-500/5 border-primary/20 shadow-lg"
                                )}
                                onClick={() => handleViewDetails(notification)}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-start gap-3">
                                      <motion.div 
                                        className={cn(
                                          "p-2 rounded-lg relative overflow-hidden",
                                          notification.isRead 
                                            ? "bg-gradient-to-br from-muted to-muted/50" 
                                            : notification.type === 'inventory'
                                            ? "bg-gradient-to-br from-red-500/10 to-pink-500/10"
                                            : notification.type === 'site_activity'
                                            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10"
                                            : "bg-gradient-to-br from-primary/10 to-blue-500/10"
                                        )}
                                        whileHover={{ rotate: 5 }}
                                      >
                                        {getTypeIcon(notification.type)}
                                        {!notification.isRead && (
                                          <div className="absolute -top-1 -right-1">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                                          </div>
                                        )}
                                      </motion.div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <h4 className={cn(
                                            "font-semibold text-sm",
                                            !notification.isRead && "bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent",
                                            notification.type === 'inventory' && "text-red-600",
                                            notification.type === 'site_activity' && "text-green-600"
                                          )}>
                                            {notification.title}
                                          </h4>
                                          {!notification.isRead && (
                                            <motion.div
                                              initial={{ scale: 0 }}
                                              animate={{ scale: 1 }}
                                            >
                                              <Badge variant="destructive" className="text-xs animate-pulse">
                                                New
                                              </Badge>
                                            </motion.div>
                                          )}
                                          <motion.div
                                            className="ml-auto"
                                            whileHover={{ scale: 1.1 }}
                                          >
                                            <Badge variant="outline" className="text-xs capitalize bg-gradient-to-r from-white to-muted/50">
                                              {notification.type.replace('_', ' ')}
                                            </Badge>
                                          </motion.div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {notification.message}
                                        </p>
                                        
                                        {/* Site Activity Metadata */}
                                        {notification.type === 'site_activity' && (
                                          <motion.div 
                                            className="mt-3 space-y-2"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                          >
                                            {notification.metadata?.siteName && (
                                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                  <Building className="h-3 w-3" />
                                                  <span className="font-medium">{notification.metadata.siteName}</span>
                                                </div>
                                                {notification.metadata.clientName && (
                                                  <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    <span>Client: {notification.metadata.clientName}</span>
                                                  </div>
                                                )}
                                                {notification.metadata.location && (
                                                  <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{notification.metadata.location}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            
                                            <div className="flex flex-wrap gap-2">
                                              {notification.metadata?.areaSqft && (
                                                <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                                  <Square className="h-3 w-3 mr-1" />
                                                  {formatNumber(notification.metadata.areaSqft)} sqft
                                                </Badge>
                                              )}
                                              {notification.metadata?.contractValue && (
                                                <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                                  <DollarSign className="h-3 w-3 mr-1" />
                                                  {formatCurrency(notification.metadata.contractValue)}
                                                </Badge>
                                              )}
                                              {notification.metadata?.status && (
                                                <Badge variant={
                                                  notification.metadata.status === 'active' ? 'default' : 'secondary'
                                                } className="text-xs">
                                                  {notification.metadata.status}
                                                </Badge>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                        
                                        {/* Inventory Metadata */}
                                        {notification.type === 'inventory' && (
                                          <motion.div 
                                            className="mt-3 space-y-2"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                          >
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                              <div className="flex items-center gap-1">
                                                <Package className="h-3 w-3" />
                                                <span className="font-medium">{notification.metadata?.itemName}</span>
                                              </div>
                                              {notification.metadata?.sku && (
                                                <div className="flex items-center gap-1">
                                                  <span className="font-mono">SKU: {notification.metadata.sku}</span>
                                                </div>
                                              )}
                                              {notification.metadata?.department && (
                                                <div className="flex items-center gap-1">
                                                  <span>Dept: {notification.metadata.department}</span>
                                                </div>
                                              )}
                                              {notification.metadata?.site && (
                                                <div className="flex items-center gap-1">
                                                  <Building className="h-3 w-3" />
                                                  <span>Site: {notification.metadata.site}</span>
                                                </div>
                                              )}
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2">
                                              <Badge variant={
                                                getInventorySeverityBadge(
                                                  notification.metadata?.quantity || 0,
                                                  notification.metadata?.reorderLevel || 10
                                                )
                                              } className="text-xs">
                                                {getBatteryIcon(
                                                  notification.metadata?.quantity || 0,
                                                  notification.metadata?.reorderLevel || 10
                                                )}
                                                <span className="ml-1">
                                                  {notification.metadata?.quantity || 0} / {notification.metadata?.reorderLevel || 10}
                                                </span>
                                              </Badge>
                                              
                                              {notification.metadata?.supplier && (
                                                <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                                  Supplier: {notification.metadata.supplier}
                                                </Badge>
                                              )}
                                              
                                              {notification.metadata?.assignedManager && (
                                                <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                                  Manager: {notification.metadata.assignedManager}
                                                </Badge>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                        
                                        {/* Common Metadata */}
                                        <div className="flex items-center gap-4 mt-2">
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {notification.timestamp}
                                          </div>
                                          {notification.metadata?.action && (
                                            <Badge variant="outline" className="text-xs capitalize bg-gradient-to-r from-white to-muted/50">
                                              {notification.metadata.action.replace('_', ' ')}
                                            </Badge>
                                          )}
                                          {notification.metadata?.siteName && notification.type !== 'inventory' && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Building className="h-3 w-3" />
                                              {notification.metadata.siteName}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {!notification.isRead && (
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkAsRead(notification.id);
                                          }}
                                          title="Mark as read"
                                          className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-600 transition-colors"
                                        >
                                          <CheckCheck className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                    )}
                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(notification.id);
                                        }}
                                        title="Delete notification"
                                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </motion.div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-blue-500/20 shadow-lg overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                  <CardHeader className="pb-3 bg-gradient-to-b from-white to-blue-500/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className="relative"
                          animate={pulse ? pulseAnimation.animate : pulseAnimation.initial}
                        >
                          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-lg opacity-50" />
                          <div className="relative p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg">
                            <Target className="h-6 w-6 text-white" />
                          </div>
                        </motion.div>
                        <div>
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                            Task Management
                          </CardTitle>
                          <CardDescription>
                            {selectedSite === "all" 
                              ? `All tasks (${tasks.length} total)`
                              : `Tasks for ${sitesData.find(s => s._id === selectedSite)?.name || 'selected site'} (${filteredTasks.length})`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-gradient-to-r from-white to-muted/50">
                          {filteredTasks.filter(t => t.status === 'completed').length} Completed
                        </Badge>
                        <Badge variant="secondary">
                          {filteredTasks.filter(t => t.status === 'in_progress').length} In Progress
                        </Badge>
                        <Badge variant="destructive">
                          {filteredTasks.filter(t => t.priority === 'urgent').length} Urgent
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Search for Tasks */}
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-blue-500/20 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl" />
                          <Loader2 className="relative h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                          Loading tasks...
                        </h3>
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted/50 rounded-full blur-xl opacity-50" />
                          <Target className="relative h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {selectedSite !== "all" 
                            ? `No tasks found for selected site.`
                            : searchQuery
                            ? `No tasks match "${searchQuery}".`
                            : "No tasks available."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {filteredTasks.map((task, index) => (
                            <motion.div
                              key={task.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05, type: "spring" }}
                              whileHover={{ 
                                scale: 1.02,
                                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1)"
                              }}
                              className="p-4 rounded-lg border bg-gradient-to-r from-white to-blue-500/5 hover:from-blue-500/10 hover:to-cyan-500/10 transition-all duration-300"
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start gap-3">
                                    <motion.div 
                                      className={cn(
                                        "p-2 rounded-lg relative",
                                        task.status === 'completed' ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10" :
                                        task.status === 'in_progress' ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/10" :
                                        "bg-gradient-to-br from-muted to-muted/50"
                                      )}
                                      whileHover={{ rotate: 5 }}
                                    >
                                      <Target className={cn(
                                        "h-4 w-4",
                                        task.status === 'completed' ? "text-green-500" :
                                        task.status === 'in_progress' ? "text-blue-500" :
                                        "text-muted-foreground"
                                      )} />
                                      {task.priority === 'urgent' && (
                                        <div className="absolute -top-1 -right-1">
                                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        </div>
                                      )}
                                    </motion.div>
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-sm">{task.title}</h4>
                                        <Badge variant={getPriorityBadge(task.priority)} className="text-xs capitalize">
                                          {task.priority}
                                        </Badge>
                                        <Badge variant={getStatusBadge(task.status)} className="text-xs capitalize">
                                          {task.status.replace('_', ' ')}
                                        </Badge>
                                        {task.siteName && (
                                          <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                            <Building className="h-3 w-3 mr-1" />
                                            {task.siteName}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {task.description}
                                      </p>
                                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span>{task.assignee.name}</span>
                                          <span className="text-xs opacity-75">({task.assignee.role})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          <span>Due: {formatDate(task.dueDate)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button size="sm" variant="outline" className="border-green-500/20 hover:bg-green-500/10 hover:text-green-600 transition-colors">
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Complete
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Button size="sm" variant="ghost" className="hover:bg-blue-500/10 transition-colors">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Leaves Tab */}
            <TabsContent value="leaves">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-amber-500/20 shadow-lg overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <CardHeader className="pb-3 bg-gradient-to-b from-white to-amber-500/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className="relative"
                          animate={pulse ? pulseAnimation.animate : pulseAnimation.initial}
                        >
                          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl blur-lg opacity-50" />
                          <div className="relative p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow-lg">
                            <Calendar className="h-6 w-6 text-white" />
                          </div>
                        </motion.div>
                        <div>
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                            Leave Management
                          </CardTitle>
                          <CardDescription>
                            {selectedSite === "all" 
                              ? `All leave applications (${leaves.length} total)`
                              : `Leaves for ${sitesData.find(s => s._id === selectedSite)?.name || 'selected site'} (${filteredLeaves.length})`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          {filteredLeaves.filter(l => l.status === 'approved').length} Approved
                        </Badge>
                        <Badge variant="secondary">
                          {filteredLeaves.filter(l => l.status === 'pending').length} Pending
                        </Badge>
                        <Badge variant="destructive">
                          {filteredLeaves.filter(l => l.status === 'rejected').length} Rejected
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Search for Leaves */}
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search leaves..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-amber-500/20 focus:border-amber-500 focus:ring-amber-500/20 transition-all duration-300"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full blur-xl" />
                          <Loader2 className="relative h-12 w-12 text-amber-500 mx-auto mb-4 animate-spin" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                          Loading leaves...
                        </h3>
                      </div>
                    ) : filteredLeaves.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted/50 rounded-full blur-xl opacity-50" />
                          <Calendar className="relative h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No leaves found</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {selectedSite !== "all" 
                            ? `No leaves found for selected site.`
                            : searchQuery
                            ? `No leaves match "${searchQuery}".`
                            : "No leave applications available."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {filteredLeaves.map((leave, index) => (
                            <motion.div
                              key={leave.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05, type: "spring" }}
                              whileHover={{ 
                                scale: 1.02,
                                boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.1)"
                              }}
                              className="p-4 rounded-lg border bg-gradient-to-r from-white to-amber-500/5 hover:from-amber-500/10 hover:to-orange-500/10 transition-all duration-300"
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start gap-3">
                                    <motion.div 
                                      className={cn(
                                        "p-2 rounded-lg relative",
                                        leave.status === 'approved' ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10" :
                                        leave.status === 'rejected' ? "bg-gradient-to-br from-red-500/10 to-pink-500/10" :
                                        "bg-gradient-to-br from-amber-500/10 to-orange-500/10"
                                      )}
                                      whileHover={{ rotate: 5 }}
                                    >
                                      <Calendar className={cn(
                                        "h-4 w-4",
                                        leave.status === 'approved' ? "text-green-500" :
                                        leave.status === 'rejected' ? "text-red-500" :
                                        "text-amber-500"
                                      )} />
                                      {leave.status === 'pending' && (
                                        <div className="absolute -top-1 -right-1">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                        </div>
                                      )}
                                    </motion.div>
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-sm">{leave.employeeName}</h4>
                                        <Badge variant={getLeaveStatusBadge(leave.status)} className="text-xs capitalize">
                                          {leave.status}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                          {leave.leaveType}
                                        </Badge>
                                        {leave.siteName && (
                                          <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                            <Building className="h-3 w-3 mr-1" />
                                            {leave.siteName}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">From:</span>
                                          <span className="font-medium">{formatDate(leave.fromDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">To:</span>
                                          <span className="font-medium">{formatDate(leave.toDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Days:</span>
                                          <span className="font-medium">{leave.totalDays}</span>
                                        </div>
                                      </div>
                                      {leave.remarks && (
                                        <p className="text-sm text-muted-foreground">
                                          {leave.remarks}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          <span>Applied: {formatDate(leave.appliedAt)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {leave.status === 'pending' && (
                                    <>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button size="sm" variant="default" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Approve
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button size="sm" variant="destructive" className="shadow-lg hover:shadow-xl">
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </motion.div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Low Stock Tab */}
            <TabsContent value="low-stock">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-red-500/20 shadow-lg overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-500" />
                  <CardHeader className="pb-3 bg-gradient-to-b from-white to-red-500/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className="relative"
                          animate={pulse ? pulseAnimation.animate : pulseAnimation.initial}
                        >
                          <div className="absolute -inset-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-xl blur-lg opacity-50" />
                          <div className="relative p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg shadow-lg">
                            <Package className="h-6 w-6 text-white" />
                          </div>
                        </motion.div>
                        <div>
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                            Low Stock Alerts
                          </CardTitle>
                          <CardDescription>
                            {selectedSite === "all" 
                              ? `All low stock items (${inventoryItems.length} total)`
                              : `Low stock items for ${sitesData.find(s => s._id === selectedSite)?.name || 'selected site'} (${filteredInventoryItems.length})`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          {filteredInventoryItems.filter(i => i.quantity <= i.reorderLevel * 0.25).length} Critical
                        </Badge>
                        <Badge variant="default">
                          {filteredInventoryItems.filter(i => i.quantity <= i.reorderLevel * 0.5 && i.quantity > i.reorderLevel * 0.25).length} Urgent
                        </Badge>
                        <Badge variant="secondary">
                          {filteredInventoryItems.filter(i => i.quantity <= i.reorderLevel && i.quantity > i.reorderLevel * 0.5).length} Warning
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Search for Low Stock Items */}
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search low stock items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-red-500/20 focus:border-red-500 focus:ring-red-500/20 transition-all duration-300"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full blur-xl" />
                          <Loader2 className="relative h-12 w-12 text-red-500 mx-auto mb-4 animate-spin" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                          Loading low stock items...
                        </h3>
                      </div>
                    ) : filteredInventoryItems.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-xl opacity-50" />
                          <Package className="relative h-16 w-16 text-green-500 mx-auto mb-4" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">All items are well stocked!</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {selectedSite !== "all" 
                            ? `No low stock items found for selected site.`
                            : searchQuery
                            ? `No items match "${searchQuery}".`
                            : "All inventory items are above their reorder levels."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {filteredInventoryItems.map((item, index) => {
                            const severity = item.quantity <= item.reorderLevel * 0.25 ? 'critical' :
                                            item.quantity <= item.reorderLevel * 0.5 ? 'urgent' : 'warning';
                            
                            return (
                              <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05, type: "spring" }}
                                whileHover={{ 
                                  scale: 1.02,
                                  boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.1)"
                                }}
                                className="p-4 rounded-lg border bg-gradient-to-r from-white to-red-500/5 hover:from-red-500/10 hover:to-pink-500/10 transition-all duration-300"
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-start gap-3">
                                      <motion.div 
                                        className={cn(
                                          "p-2 rounded-lg relative",
                                          severity === 'critical' ? "bg-gradient-to-br from-red-500/10 to-pink-500/10" :
                                          severity === 'urgent' ? "bg-gradient-to-br from-orange-500/10 to-amber-500/10" :
                                          "bg-gradient-to-br from-yellow-500/10 to-amber-500/10"
                                        )}
                                        whileHover={{ rotate: 5 }}
                                      >
                                        <Package className={cn(
                                          "h-4 w-4",
                                          severity === 'critical' ? "text-red-500" :
                                          severity === 'urgent' ? "text-orange-500" :
                                          "text-yellow-500"
                                        )} />
                                        <div className="absolute -top-1 -right-1">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full animate-ping",
                                            severity === 'critical' ? "bg-red-500" :
                                            severity === 'urgent' ? "bg-orange-500" :
                                            "bg-yellow-500"
                                          )} />
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            severity === 'critical' ? "bg-red-500" :
                                            severity === 'urgent' ? "bg-orange-500" :
                                            "bg-yellow-500"
                                          )} />
                                        </div>
                                      </motion.div>
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="font-semibold text-sm">{item.name}</h4>
                                          <Badge variant={getInventorySeverityBadge(item.quantity, item.reorderLevel)} className="text-xs">
                                            {severity === 'critical' ? 'Critical' : 
                                             severity === 'urgent' ? 'Urgent' : 'Warning'}
                                          </Badge>
                                          <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                            {item.department}
                                          </Badge>
                                          {item.site && (
                                            <Badge variant="outline" className="text-xs bg-gradient-to-r from-white to-muted/50">
                                              <Building className="h-3 w-3 mr-1" />
                                              {item.site}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">SKU:</span>
                                            <span className="font-mono font-medium">{item.sku}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Current:</span>
                                            <span className={`font-medium ${
                                              severity === 'critical' ? 'text-red-600' :
                                              severity === 'urgent' ? 'text-orange-600' :
                                              'text-yellow-600'
                                            }`}>
                                              {item.quantity}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Reorder Level:</span>
                                            <span className="font-medium">{item.reorderLevel}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Price:</span>
                                            <span className="font-medium">{formatCurrency(item.price)}</span>
                                          </div>
                                        </div>
                                        {item.description && (
                                          <p className="text-sm text-muted-foreground">
                                            {item.description}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                          {item.supplier && (
                                            <div className="flex items-center gap-1">
                                              <span>Supplier: {item.supplier}</span>
                                            </div>
                                          )}
                                          {item.assignedManager && (
                                            <div className="flex items-center gap-1">
                                              <User className="h-3 w-3" />
                                              <span>Manager: {item.assignedManager}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1">
                                            <span>Category: {item.category}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                      <Button size="sm" variant="outline" className="border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 transition-colors">
                                        <Edit className="h-4 w-4 mr-2" />
                                        Reorder
                                      </Button>
                                    </motion.div>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                      <Button size="sm" variant="destructive" onClick={() => {
                                        const count = notificationService.clearByItem(item.id);
                                        if (count > 0) {
                                          toast({
                                            title: "✅ Acknowledged",
                                            description: `Low stock alert for ${item.name} has been cleared`,
                                            variant: "default",
                                          });
                                        }
                                      }}>
                                        <CheckCheck className="h-4 w-4 mr-2" />
                                        Acknowledge
                                      </Button>
                                    </motion.div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* Notification Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Notification Details
            </DialogTitle>
          </DialogHeader>
          {viewNotification && (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-lg relative overflow-hidden",
                  viewNotification.isRead 
                    ? "bg-gradient-to-br from-muted to-muted/50" 
                    : viewNotification.type === 'inventory'
                    ? "bg-gradient-to-br from-red-500/10 to-pink-500/10"
                    : viewNotification.type === 'site_activity'
                    ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10"
                    : "bg-gradient-to-br from-primary/10 to-blue-500/10"
                )}>
                  {getTypeIcon(viewNotification.type)}
                  {!viewNotification.isRead && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{viewNotification.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize bg-gradient-to-r from-white to-muted/50">
                      {viewNotification.type.replace('_', ' ')}
                    </Badge>
                    {!viewNotification.isRead && (
                      <Badge variant="secondary" className="text-xs animate-pulse">New</Badge>
                    )}
                    {viewNotification.metadata?.priority && (
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(viewNotification.metadata.priority)}`} />
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Message</h4>
                <div className="p-4 border rounded-lg bg-gradient-to-br from-muted/30 to-background">
                  <p className="text-sm">{viewNotification.message}</p>
                </div>
              </div>
              
              {/* Site Activity Metadata */}
              {viewNotification.type === 'site_activity' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Site Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewNotification.metadata?.siteName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Site Name</p>
                        <p className="font-medium">{viewNotification.metadata.siteName}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.clientName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Client</p>
                        <p className="font-medium">{viewNotification.metadata.clientName}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.location && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Location</p>
                        <p className="font-medium">{viewNotification.metadata.location}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.areaSqft && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Area</p>
                        <p className="font-medium">{formatNumber(viewNotification.metadata.areaSqft)} sqft</p>
                      </div>
                    )}
                    {viewNotification.metadata?.contractValue && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Contract Value</p>
                        <p className="font-medium">{formatCurrency(viewNotification.metadata.contractValue)}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.status && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge variant={
                          viewNotification.metadata.status === 'active' ? 'default' : 'secondary'
                        }>
                          {viewNotification.metadata.status}
                        </Badge>
                      </div>
                    )}
                    {viewNotification.metadata?.action && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Action</p>
                        <Badge variant="outline" className="capitalize bg-gradient-to-r from-white to-muted/50">
                          {viewNotification.metadata.action.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                    {viewNotification.metadata?.totalStaff && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Staff</p>
                        <p className="font-medium">{viewNotification.metadata.totalStaff}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Inventory Metadata */}
              {viewNotification.type === 'inventory' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Inventory Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewNotification.metadata?.itemName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Item Name</p>
                        <p className="font-medium">{viewNotification.metadata.itemName}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.sku && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">SKU</p>
                        <p className="font-medium font-mono">{viewNotification.metadata.sku}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.quantity !== undefined && viewNotification.metadata?.reorderLevel !== undefined && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Stock Level</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Current: {viewNotification.metadata.quantity}</span>
                              <span>Reorder: {viewNotification.metadata.reorderLevel}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div 
                                className={`h-2 rounded-full ${
                                  viewNotification.metadata.quantity === 0 ? 'bg-red-500' :
                                  viewNotification.metadata.quantity <= Math.floor(viewNotification.metadata.reorderLevel * 0.3) ? 'bg-orange-500' :
                                  viewNotification.metadata.quantity <= viewNotification.metadata.reorderLevel ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${Math.min(100, (viewNotification.metadata.quantity / (viewNotification.metadata.reorderLevel * 2)) * 100)}%` 
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {viewNotification.metadata?.department && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Department</p>
                        <p className="font-medium">{viewNotification.metadata.department}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.supplier && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Supplier</p>
                        <p className="font-medium">{viewNotification.metadata.supplier}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.assignedManager && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Assigned Manager</p>
                        <p className="font-medium">{viewNotification.metadata.assignedManager}</p>
                      </div>
                    )}
                    {viewNotification.metadata?.site && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Site</p>
                        <p className="font-medium">{viewNotification.metadata.site}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Task Metadata */}
              {viewNotification.type === 'task' && viewNotification.metadata && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Task Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewNotification.metadata.taskTitle && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Task Title</p>
                        <p className="font-medium">{viewNotification.metadata.taskTitle}</p>
                      </div>
                    )}
                    {viewNotification.metadata.assigneeName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Assignee</p>
                        <p className="font-medium">{viewNotification.metadata.assigneeName}</p>
                        {viewNotification.metadata.assigneeRole && (
                          <p className="text-xs text-muted-foreground">({viewNotification.metadata.assigneeRole})</p>
                        )}
                      </div>
                    )}
                    {viewNotification.metadata.priority && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Priority</p>
                        <Badge variant={getPriorityBadge(viewNotification.metadata.priority)} className="capitalize">
                          {viewNotification.metadata.priority}
                        </Badge>
                      </div>
                    )}
                    {viewNotification.metadata.taskType && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Type</p>
                        <p className="font-medium">{viewNotification.metadata.taskType}</p>
                      </div>
                    )}
                    {viewNotification.metadata.isProcessed !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Processed</p>
                        <Badge variant={viewNotification.metadata.isProcessed ? 'default' : 'secondary'}>
                          {viewNotification.metadata.isProcessed ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Leave Metadata */}
              {viewNotification.type === 'leave' && viewNotification.metadata && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Leave Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewNotification.metadata.employeeName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Employee Name</p>
                        <p className="font-medium">{viewNotification.metadata.employeeName}</p>
                      </div>
                    )}
                    {viewNotification.metadata.leaveType && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
                        <Badge variant="outline" className="capitalize bg-gradient-to-r from-white to-muted/50">
                          {viewNotification.metadata.leaveType}
                        </Badge>
                      </div>
                    )}
                    {viewNotification.metadata.fromDate && viewNotification.metadata.toDate && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Leave Dates</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(viewNotification.metadata.fromDate)}</span>
                          </div>
                          <span>to</span>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(viewNotification.metadata.toDate)}</span>
                          </div>
                          {viewNotification.metadata.totalDays && (
                            <Badge variant="secondary" className="ml-auto">
                              {viewNotification.metadata.totalDays} days
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {viewNotification.metadata.remarks && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                        <div className="p-3 border rounded-lg bg-gradient-to-br from-muted/30 to-background">
                          <p className="text-sm">{viewNotification.metadata.remarks}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Time</p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{viewNotification.timestamp}</span>
                  </div>
                </div>
                
                {viewNotification.metadata?.timestamp && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created At</p>
                    <p className="font-medium text-sm">{formatDateTime(viewNotification.metadata.timestamp)}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-4">
                {!viewNotification.isRead ? (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        handleMarkAsRead(viewNotification.id);
                        setDialogOpen(false);
                      }}
                      className="w-full border-green-500/20 hover:bg-green-500/10 hover:text-green-600 transition-colors"
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark as Read
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      Close
                    </Button>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleDelete(viewNotification.id);
                      setDialogOpen(false);
                    }}
                    className="w-full shadow-lg hover:shadow-xl"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminNotifications;