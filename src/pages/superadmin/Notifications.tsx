// app/superadmin/notifications/page.tsx
"use client";

import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Trash2, Phone, Mail, Calendar, Eye, Volume2, VolumeX, Settings, Building, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import notificationService from "@/lib/notificationService";

const API_URL = `http://${window.location.hostname}:5001/api`;

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

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "warning" | "info" | "urgent";
  read: boolean;
  followUpDate?: string;
  communicationType?: string;
  clientName?: string;
  notes?: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  siteName?: string;
  location?: string;
  oldStatus?: string;
  newStatus?: string;
  notificationType?: "site_addition" | "site_status" | "site_deletion" | "site_update" | "communication_followup";
}

interface NotificationSettings {
  desktopNotifications: boolean;
  soundNotifications: boolean;
  soundVolume: number;
  notificationFrequency: 'realtime' | '5min' | '15min' | '30min';
  showOverdue: boolean;
  showToday: boolean;
  showUpcoming: boolean;
  showSiteAdditions: boolean;
  showSiteStatusChanges: boolean;
  showSiteDeletions: boolean;
  showSiteUpdates: boolean;
}

const api = {
  async getCommunications() {
    const timestamp = new Date().getTime();
    const res = await fetch(`${API_URL}/crm/communications?t=${timestamp}`);
    if (!res.ok) throw new Error('Failed to fetch communications');
    return res.json();
  },

  async getUnreadNotifications() {
    const res = await fetch(`${API_URL}/notifications/unread`);
    if (!res.ok) throw new Error('Failed to fetch unread notifications');
    return res.json();
  },

  async markNotificationAsRead(id: string) {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  async deleteNotification(id: string) {
    const res = await fetch(`${API_URL}/notifications/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete notification');
    return res.json();
  },

  async markAllNotificationsAsRead() {
    const res = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to mark all notifications as read');
    return res.json();
  },

  async createNotification(data: Partial<Notification>) {
    const res = await fetch(`${API_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create notification');
    return res.json();
  }
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewNotification, setViewNotification] = useState<Notification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const [settings, setSettings] = useState<NotificationSettings>({
    desktopNotifications: true,
    soundNotifications: true,
    soundVolume: 70,
    notificationFrequency: 'realtime',
    showOverdue: true,
    showToday: true,
    showUpcoming: true,
    showSiteAdditions: true,
    showSiteStatusChanges: true,
    showSiteDeletions: true,
    showSiteUpdates: true,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    notificationService.requestNotificationPermission();

    // Listen for real-time site notifications
    const cleanup = notificationService.setupBroadcastListener((data) => {
      if (data.type === 'SITE_ADDED' || data.type === 'NEW_NOTIFICATION') {
        // Refresh notifications when a new site is added
        fetchNotifications(true);
      }
    });

    return () => {
      cleanup();
      notificationService.stopPeriodicCheck();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isFollowUpToday = (followUpDate?: string) => {
    if (!followUpDate) return false;
    const today = new Date();
    const followUp = new Date(followUpDate);
    return (
      followUp.getDate() === today.getDate() &&
      followUp.getMonth() === today.getMonth() &&
      followUp.getFullYear() === today.getFullYear()
    );
  };

  const isFollowUpOverdue = (followUpDate?: string) => {
    if (!followUpDate) return false;
    const today = new Date();
    const followUp = new Date(followUpDate);
    today.setHours(0, 0, 0, 0);
    followUp.setHours(0, 0, 0, 0);
    return followUp < today;
  };

  const isFollowUpUrgent = (followUpDate?: string) => {
    if (!followUpDate) return false;
    const today = new Date();
    const followUp = new Date(followUpDate);
    const diffHours = (followUp.getTime() - today.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 2;
  };

  const getSiteNotifications = async (): Promise<Notification[]> => {
    try {
      const cachedNotifications = notificationService.getCachedNotifications();
      const siteNotifications = cachedNotifications.filter(
        n => n.notificationType && n.notificationType.includes('site_')
      );
      
      return siteNotifications.map(notification => {
        const siteNotif: Notification = {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          time: formatTimeAgo(notification.createdAt),
          type: notification.type as any,
          read: notification.read,
          followUpDate: undefined,
          communicationType: undefined,
          clientName: notification.metadata?.clientName || notification.clientName,
          notes: notification.message,
          priority: 'medium' as any,
          createdAt: notification.createdAt,
          siteName: notification.metadata?.siteName || notification.siteName,
          location: notification.metadata?.location,
          oldStatus: notification.metadata?.oldStatus,
          newStatus: notification.metadata?.newStatus,
          notificationType: notification.notificationType
        };
        
        // Set priority based on notification type
        if (notification.notificationType === 'site_deletion') {
          siteNotif.priority = 'high';
          siteNotif.type = 'warning';
        } else if (notification.notificationType === 'site_addition') {
          siteNotif.priority = 'medium';
          siteNotif.type = 'success';
        } else if (notification.notificationType === 'site_status') {
          siteNotif.priority = 'medium';
          siteNotif.type = 'info';
        } else if (notification.notificationType === 'site_update') {
          siteNotif.priority = 'low';
          siteNotif.type = 'info';
        }
        
        return siteNotif;
      });
    } catch (error) {
      console.error("Failed to get site notifications:", error);
      return [];
    }
  };

  const convertToNotifications = (communications: Communication[]): Notification[] => {
    const today = new Date().toISOString().split('T')[0];
    
    return communications
      .filter(comm => comm.followUpRequired && comm.followUpDate)
      .map(comm => {
        const followUpDate = comm.followUpDate || "";
        const isToday = isFollowUpToday(followUpDate);
        const isOverdue = isFollowUpOverdue(followUpDate);
        const isUrgent = isFollowUpUrgent(followUpDate);
        
        let type: "success" | "warning" | "info" | "urgent" = "info";
        let title = "";
        let priority: "low" | "medium" | "high" = "medium";

        if (isOverdue) {
          type = "warning";
          title = "⚠️ Follow-up Overdue";
          priority = "high";
        } else if (isUrgent) {
          type = "urgent";
          title = "🚨 Urgent Follow-up";
          priority = "high";
        } else if (isToday) {
          type = "success";
          title = "✓ Follow-up Today";
          priority = "medium";
        } else {
          type = "info";
          title = "📅 Follow-up Scheduled";
          priority = "low";
        }

        const formattedDate = new Date(followUpDate).toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          id: comm._id,
          title: `${title} - ${comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}`,
          message: `Follow-up with ${comm.clientName} for ${comm.type}`,
          time: formatTimeAgo(comm.createdAt),
          type,
          read: false,
          followUpDate: formattedDate,
          communicationType: comm.type,
          clientName: comm.clientName,
          notes: comm.notes,
          priority,
          createdAt: comm.createdAt,
          notificationType: "communication_followup"
        };
      })
      .filter(notification => {
        if (!settings.showOverdue && notification.type === 'warning') return false;
        if (!settings.showToday && notification.type === 'success') return false;
        if (!settings.showUpcoming && notification.type === 'info') return false;
        if (notification.type === 'urgent') return true;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { 'urgent': 0, 'warning': 1, 'success': 2, 'info': 3 };
        if (priorityOrder[a.type] !== priorityOrder[b.type]) {
          return priorityOrder[a.type] - priorityOrder[b.type];
        }
        
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  };

  const showSystemNotificationForNew = (newNotifications: Notification[]) => {
    if (!settings.desktopNotifications) return;

    newNotifications.forEach(notification => {
      if (notification.priority === 'high' || notification.type === 'urgent') {
        notificationService.showSystemNotification(notification.title, {
          body: notification.message,
          tag: notification.id,
          data: { url: window.location.href }
        });
      }
    });
  };

  const fetchNotifications = async (showNewIndicator = true) => {
    if (!isOnline) {
      toast.error("You are offline. Please check your internet connection.");
      return;
    }

    try {
      setLoading(true);
      
      let allNotifications: Notification[] = [];
      
      // Fetch follow-up notifications from API
      try {
        const result = await api.getCommunications();
        if (result.success) {
          const communications = result.data as Communication[];
          const followUpNotifications = convertToNotifications(communications);
          allNotifications = [...followUpNotifications];
        }
      } catch (error) {
        console.error("Error fetching communications:", error);
      }
      
      // Get site notifications from notification service
      const siteNotifications = await getSiteNotifications();
      
      // Filter site notifications based on settings
      const filteredSiteNotifications = siteNotifications.filter(notification => {
        if (!notification.notificationType) return false;
        if (notification.notificationType === 'site_addition' && !settings.showSiteAdditions) return false;
        if (notification.notificationType === 'site_status' && !settings.showSiteStatusChanges) return false;
        if (notification.notificationType === 'site_deletion' && !settings.showSiteDeletions) return false;
        if (notification.notificationType === 'site_update' && !settings.showSiteUpdates) return false;
        return true;
      });
      
      // Combine all notifications
      allNotifications = [...allNotifications, ...filteredSiteNotifications];
      
      // Sort by priority and date
      allNotifications.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      const oldIds = new Set(notifications.map(n => n.id));
      const trulyNew = allNotifications.filter(n => !oldIds.has(n.id));
      
      setNotifications(allNotifications);
      
      if (showNewIndicator && trulyNew.length > 0 && settings.desktopNotifications) {
        showSystemNotificationForNew(trulyNew);
        setNewNotificationsCount(trulyNew.length);
        
        if (settings.soundNotifications && trulyNew.some(n => n.priority === 'high' || n.type === 'urgent')) {
          notificationService.showSystemNotification("New High Priority Notifications", {
            body: `You have ${trulyNew.length} new notifications`
          });
        }
      }
      
      setLastChecked(new Date());
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);
    
    const frequencyMap = {
      'realtime': 10000,
      '5min': 300000,
      '15min': 900000,
      '30min': 1800000
    };

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, frequencyMap[settings.notificationFrequency]);

    return () => clearInterval(interval);
  }, [settings.notificationFrequency]);

  const handleMarkAllRead = async () => {
    try {
      // Mark API notifications as read
      await api.markAllNotificationsAsRead();
      
      // Mark site notifications as read
      notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setNewNotificationsCount(0);
      toast.success("All notifications marked as read!");
    } catch (error: any) {
      toast.error(error.message || "Failed to mark all notifications as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (id.includes('site_')) {
        notificationService.deleteNotification(id);
        setNotifications(notifications.filter(n => n.id !== id));
        toast.success("Notification deleted!");
      } else {
        await api.deleteNotification(id);
        setNotifications(notifications.filter(n => n.id !== id));
        toast.success("Notification deleted!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete notification");
    }
  };

  const handleViewDetails = (notification: Notification) => {
    setViewNotification(notification);
    setDialogOpen(true);
    
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      if (id.includes('site_')) {
        notificationService.markAsRead(id);
        setNotifications(notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        ));
      } else {
        await api.markNotificationAsRead(id);
        setNotifications(notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        ));
      }
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case "success": return "default";
      case "warning": return "destructive";
      case "urgent": return "destructive";
      case "info": return "secondary";
      default: return "outline";
    }
  };

  const getCommunicationIcon = (type?: string, notificationType?: string) => {
    if (notificationType === 'site_addition') return <Building className="h-4 w-4 mr-2" />;
    if (notificationType === 'site_status') return <RefreshCw className="h-4 w-4 mr-2" />;
    if (notificationType === 'site_deletion') return <Trash2 className="h-4 w-4 mr-2" />;
    if (notificationType === 'site_update') return <Building className="h-4 w-4 mr-2" />;
    
    switch(type) {
      case "call": return <Phone className="h-4 w-4 mr-2" />;
      case "email": return <Mail className="h-4 w-4 mr-2" />;
      case "meeting": return <Calendar className="h-4 w-4 mr-2" />;
      case "demo": return <Eye className="h-4 w-4 mr-2" />;
      default: return <Bell className="h-4 w-4 mr-2" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const testNotification = () => {
    if (settings.desktopNotifications) {
      notificationService.showSystemNotification("Test Notification", {
        body: "This is a test notification from your CRM system.",
        icon: "/favicon.ico"
      });
      toast.success("Test notification sent!");
    } else {
      toast.error("Please enable desktop notifications first");
    }
  };

  const clearAllSiteNotifications = () => {
    if (confirm("Are you sure you want to clear all site notifications?")) {
      notificationService.clearAllNotifications();
      setNotifications(notifications.filter(n => !n.id.includes('site_')));
      toast.success("Site notifications cleared!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Notifications" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <span className="text-lg font-semibold">
                {unreadCount} Unread Notification{unreadCount !== 1 && "s"}
              </span>
              {newNotificationsCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {newNotificationsCount} New
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {!isOnline && (
                <Badge variant="outline" className="text-destructive">
                  Offline
                </Badge>
              )}
              <span>Last checked: {lastChecked.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Notification Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="desktop">Desktop Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show system notifications
                      </p>
                    </div>
                    <Switch
                      id="desktop"
                      checked={settings.desktopNotifications}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, desktopNotifications: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound">Sound Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound for new notifications
                      </p>
                    </div>
                    <Switch
                      id="sound"
                      checked={settings.soundNotifications}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, soundNotifications: checked})
                      }
                    />
                  </div>

                  {settings.soundNotifications && (
                    <div className="space-y-2">
                      <Label htmlFor="volume">Sound Volume</Label>
                      <div className="flex items-center gap-2">
                        <VolumeX className="h-4 w-4" />
                        <Slider
                          id="volume"
                          min={0}
                          max={100}
                          step={1}
                          value={[settings.soundVolume]}
                          onValueChange={([value]) => 
                            setSettings({...settings, soundVolume: value})
                          }
                          className="flex-1"
                        />
                        <Volume2 className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Check Frequency</Label>
                    <Select
                      value={settings.notificationFrequency}
                      onValueChange={(value: any) => 
                        setSettings({...settings, notificationFrequency: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Realtime (10s)</SelectItem>
                        <SelectItem value="5min">Every 5 minutes</SelectItem>
                        <SelectItem value="15min">Every 15 minutes</SelectItem>
                        <SelectItem value="30min">Every 30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Show Follow-up Types</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="overdue"
                          checked={settings.showOverdue}
                          onCheckedChange={(checked) => 
                            setSettings({...settings, showOverdue: checked})
                          }
                        />
                        <Label htmlFor="overdue" className="cursor-pointer">
                          Overdue Follow-ups
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="today"
                          checked={settings.showToday}
                          onCheckedChange={(checked) => 
                            setSettings({...settings, showToday: checked})
                          }
                        />
                        <Label htmlFor="today" className="cursor-pointer">
                          Today's Follow-ups
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="upcoming"
                          checked={settings.showUpcoming}
                          onCheckedChange={(checked) => 
                            setSettings({...settings, showUpcoming: checked})
                          }
                        />
                        <Label htmlFor="upcoming" className="cursor-pointer">
                          Upcoming Follow-ups
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Show Site Activity</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="site-additions"
                          checked={settings.showSiteAdditions}
                          onCheckedChange={(checked) => 
                            setSettings({...settings, showSiteAdditions: checked})
                          }
                        />
                        <Label htmlFor="site-additions" className="cursor-pointer">
                          New Site Additions
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="site-status"
                          checked={settings.showSiteStatusChanges}
                          onCheckedChange={(checked) => 
                            setSettings({...settings, showSiteStatusChanges: checked})
                          }
                        />
                        <Label htmlFor="site-status" className="cursor-pointer">
                          Site Status Changes
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="site-deletions"
                          checked={settings.showSiteDeletions}
                          onCheckedChange={(checked) => 
                            setSettings({...settings, showSiteDeletions: checked})
                          }
                        />
                        <Label htmlFor="site-deletions" className="cursor-pointer">
                          Site Deletions
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="site-updates"
                          checked={settings.showSiteUpdates}
                          onCheckedChange={(checked) => 
                            setSettings({...settings, showSiteUpdates: checked})
                          }
                        />
                        <Label htmlFor="site-updates" className="cursor-pointer">
                          Site Updates
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      onClick={testNotification}
                    >
                      Test Notification
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={clearAllSiteNotifications}
                    >
                      Clear Site Notifications
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={() => fetchNotifications(true)} 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
            
            <Button 
              onClick={handleMarkAllRead} 
              disabled={unreadCount === 0}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground mb-4">
                {settings.showOverdue || settings.showToday || settings.showUpcoming || 
                 settings.showSiteAdditions || settings.showSiteStatusChanges || 
                 settings.showSiteDeletions || settings.showSiteUpdates
                  ? "No notifications matching your filters."
                  : "All notification types are disabled. Enable them in settings."}
              </p>
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Adjust Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.005 }}
              >
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? "border-l-4 border-l-primary bg-primary/5" : ""
                  } ${
                    notification.type === 'urgent' ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" :
                    notification.type === 'warning' ? "border-orange-500/50 bg-orange-50 dark:bg-orange-950/20" :
                    notification.type === 'success' ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" : ""
                  } ${
                    notification.notificationType === 'site_addition' ? "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20" :
                    notification.notificationType === 'site_status' ? "border-purple-500/50 bg-purple-50 dark:bg-purple-950/20" :
                    notification.notificationType === 'site_deletion' ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" :
                    notification.notificationType === 'site_update' ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20" : ""
                  }`}
                  onClick={() => handleViewDetails(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getCommunicationIcon(notification.communicationType, notification.notificationType)}
                          <h4 className="font-semibold">{notification.title}</h4>
                          <Badge variant={getTypeColor(notification.type)}>
                            {notification.type}
                          </Badge>
                          {notification.notificationType && (
                            <Badge variant="outline" className="text-xs">
                              {notification.notificationType.replace('site_', 'Site ').replace('_', ' ')}
                            </Badge>
                          )}
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                          {!notification.read && (
                            <Badge variant="default" className="animate-pulse text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {notification.notificationType?.includes('site') ? (
                              <Building className="h-3 w-3" />
                            ) : (
                              <Calendar className="h-3 w-3" />
                            )}
                            {notification.followUpDate || new Date(notification.createdAt).toLocaleDateString('en-IN') || "Just now"}
                          </span>
                          <span>•</span>
                          <span>{notification.time}</span>
                          {notification.clientName && (
                            <>
                              <span>•</span>
                              <span className="font-medium">Client: {notification.clientName}</span>
                            </>
                          )}
                          {notification.siteName && (
                            <>
                              <span>•</span>
                              <span className="font-medium">Site: {notification.siteName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className={notification.read ? "text-muted-foreground" : "text-primary"}
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Low Priority</span>
            </div>
          </div>
          <div>
            Showing {notifications.length} of {notifications.length} notifications
          </div>
        </div>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          {viewNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getCommunicationIcon(viewNotification.communicationType, viewNotification.notificationType)}
                <h3 className="text-lg font-semibold">{viewNotification.title}</h3>
                <Badge variant={getTypeColor(viewNotification.type)}>
                  {viewNotification.type}
                </Badge>
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(viewNotification.priority)}`} />
              </div>
              
              {viewNotification.notificationType?.includes('site_') ? (
                <div className="grid grid-cols-2 gap-4">
                  {viewNotification.siteName && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Site Name</h4>
                      <p className="font-medium">{viewNotification.siteName}</p>
                    </div>
                  )}
                  {viewNotification.clientName && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Client</h4>
                      <p className="font-medium">{viewNotification.clientName}</p>
                    </div>
                  )}
                  {viewNotification.location && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Location</h4>
                      <p className="font-medium">{viewNotification.location}</p>
                    </div>
                  )}
                  {viewNotification.oldStatus && viewNotification.newStatus && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Status Change</h4>
                      <p className="font-medium">
                        <Badge variant="outline" className="mr-2">{viewNotification.oldStatus}</Badge>
                        →
                        <Badge variant="outline" className="ml-2">{viewNotification.newStatus}</Badge>
                      </p>
                    </div>
                  )}
                  {viewNotification.createdAt && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Created</h4>
                      <p className="font-medium">{new Date(viewNotification.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {viewNotification.clientName && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Client</h4>
                      <p className="font-medium">{viewNotification.clientName}</p>
                    </div>
                  )}
                  {viewNotification.followUpDate && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Follow-up Date</h4>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{viewNotification.followUpDate}</span>
                      </div>
                    </div>
                  )}
                  {viewNotification.communicationType && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Type</h4>
                      <p className="font-medium capitalize">{viewNotification.communicationType}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Received</h4>
                    <p className="font-medium">{viewNotification.time}</p>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Message</h4>
                <div className="p-3 border rounded-md bg-muted/50">
                  <p className="text-sm">{viewNotification.message}</p>
                </div>
              </div>
              
              {viewNotification.notes && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Notes</h4>
                  <div className="p-3 border rounded-md bg-muted/50">
                    <p className="text-sm">{viewNotification.notes}</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (!viewNotification.read) {
                      handleMarkAsRead(viewNotification.id);
                    }
                    setDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  Mark as Read
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDelete(viewNotification.id);
                    setDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;