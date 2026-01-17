// lib/notificationService.ts

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "site" | "leave" | "task" | "system" | "approval";
  isRead: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

class NotificationService {
  private static instance: NotificationService;
  private audioContext: AudioContext | null = null;
  private notificationSound: HTMLAudioElement | null = null;
  private notificationInterval: NodeJS.Timeout | null = null;
  private lastNotificationTime: number = 0;
  private notificationCooldown = 10000; // 10 seconds cooldown
  private notifications: NotificationItem[] = [];
  private listeners: ((notifications: NotificationItem[]) => void)[] = [];
  private isInitialized = false;
  private broadcastChannel: BroadcastChannel | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize Web Audio API
      if (typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
        }
        
        // Initialize Broadcast Channel for cross-tab communication
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('notifications');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data.type === 'NEW_NOTIFICATION') {
              const newNotification = event.data.notification;
              this.notifications.unshift(newNotification);
              this.saveNotificationsToStorage();
              this.notifyListeners();
            } else if (event.data.type === 'MARK_AS_READ') {
              const notificationId = event.data.notificationId;
              this.markAsRead(notificationId);
            } else if (event.data.type === 'DELETE_NOTIFICATION') {
              const notificationId = event.data.notificationId;
              this.deleteNotification(notificationId);
            } else if (event.data.type === 'MARK_ALL_READ') {
              this.markAllAsRead();
            }
          };
        }
      }
      
      // Load notifications from localStorage
      this.loadNotificationsFromStorage();
      this.requestNotificationPermission();
      
      this.isInitialized = true;
      console.log('NotificationService initialized');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    try {
      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Add a new notification
  addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): NotificationItem {
    this.initialize();
    
    const newNotification: NotificationItem = {
      id: `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: false,
      timestamp: new Date().toISOString(),
      metadata: notification.metadata
    };

    this.notifications.unshift(newNotification); // Add to beginning
    this.saveNotificationsToStorage();
    this.notifyListeners();
    
    // Broadcast to other tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'NEW_NOTIFICATION',
        notification: newNotification
      });
    }
    
    // Show system notification if permission is granted
    this.showSystemNotification(newNotification.title, {
      body: newNotification.message,
      icon: '/favicon.ico',
      tag: newNotification.id
    }).catch(console.error);

    return newNotification;
  }

  // Site-related notifications
  notifySiteAddition(siteName: string, clientName: string, addedBy: string = 'Admin', metadata?: any) {
    const notification = this.addNotification({
      title: '🚀 New Site Added',
      message: `"${siteName}" has been added for client "${clientName}" by ${addedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        addedBy, 
        notificationType: 'site_addition',
        ...metadata 
      }
    });
    
    // Broadcast to all tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'SITE_ADDED',
        siteName,
        clientName,
        notification
      });
    }
    
    return notification;
  }

  notifySiteUpdate(siteName: string, clientName: string, updatedBy: string = 'Admin', metadata?: any) {
    return this.addNotification({
      title: '✏️ Site Updated',
      message: `"${siteName}" for client "${clientName}" has been updated by ${updatedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        updatedBy, 
        notificationType: 'site_update',
        ...metadata 
      }
    });
  }

  notifySiteDeletion(siteName: string, clientName: string, deletedBy: string = 'Admin', metadata?: any) {
    return this.addNotification({
      title: '🗑️ Site Deleted',
      message: `"${siteName}" for client "${clientName}" has been deleted by ${deletedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        deletedBy, 
        notificationType: 'site_deletion',
        ...metadata 
      }
    });
  }

  notifySiteStatusChange(siteName: string, clientName: string, oldStatus: string, newStatus: string, changedBy: string = 'Admin') {
    return this.addNotification({
      title: '🔄 Site Status Changed',
      message: `"${siteName}" for "${clientName}" status changed from ${oldStatus} to ${newStatus} by ${changedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        oldStatus, 
        newStatus, 
        changedBy,
        notificationType: 'site_status' 
      }
    });
  }

  async showSystemNotification(title: string, options?: NotificationOptions): Promise<Notification | null> {
    const now = Date.now();
    
    // Apply cooldown to prevent spam
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return null;
    }

    this.lastNotificationTime = now;

    // Play sound
    this.playNotificationSound();

    // Show desktop notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: false,
          silent: false,
          ...options
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        notification.onerror = (error) => {
          console.error('Notification error:', error);
        };

        // Auto close after 8 seconds
        setTimeout(() => {
          try {
            notification.close();
          } catch (error) {
            console.error('Error closing notification:', error);
          }
        }, 8000);

        // Also show browser tab notification
        this.showTabNotification(title, options?.body || '');

        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
        // Fallback to tab notification only
        this.showTabNotification(title, options?.body || '');
      }
    } else {
      // If no desktop notification permission, show tab notification
      this.showTabNotification(title, options?.body || '');
    }

    return null;
  }

  private showTabNotification(title: string, body: string) {
    if (typeof document === 'undefined') return;

    if (document.hidden) {
      const originalTitle = document.title;
      const hasNotification = document.title.includes('🔔');
      
      if (!hasNotification) {
        document.title = `🔔 ${originalTitle}`;
        
        // Blink the title for attention
        let blinkCount = 0;
        const maxBlinks = 4;
        
        const blinkInterval = setInterval(() => {
          document.title = document.title.includes('🔔') 
            ? originalTitle 
            : `🔔 ${originalTitle}`;
          
          blinkCount++;
          if (blinkCount >= maxBlinks * 2) {
            clearInterval(blinkInterval);
            document.title = originalTitle;
          }
        }, 500);
      }
    }
  }

  private playNotificationSound() {
    if (!this.audioContext) {
      this.playFallbackSound();
      return;
    }

    try {
      // Ensure audio context is running (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Pleasant notification sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.2);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
      this.playFallbackSound();
    }
  }

  private playFallbackSound() {
    try {
      // Simple beep using a data URL for a short beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Failed to play fallback sound:', error);
    }
  }

  // Storage methods
  private saveNotificationsToStorage() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('site_notifications', JSON.stringify(this.notifications.slice(0, 100))); // Limit to 100
      }
    } catch (error) {
      console.error('Failed to save notifications to storage:', error);
    }
  }

  private loadNotificationsFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('site_notifications');
        if (stored) {
          this.notifications = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications from storage:', error);
      this.notifications = [];
    }
  }

  // Public API methods
  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  getNotificationsByType(type: string): NotificationItem[] {
    return this.notifications.filter(n => n.type === type);
  }

  getUnreadNotifications(): NotificationItem[] {
    return this.notifications.filter(n => !n.isRead);
  }

  markAsRead(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications[index].isRead = true;
      this.saveNotificationsToStorage();
      this.notifyListeners();
      
      // Broadcast to other tabs
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'MARK_AS_READ',
          notificationId: id
        });
      }
      return true;
    }
    return false;
  }

  markAllAsRead(): number {
    const unreadCount = this.getUnreadCount();
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.saveNotificationsToStorage();
    this.notifyListeners();
    
    // Broadcast to other tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'MARK_ALL_READ'
      });
    }
    return unreadCount;
  }

  deleteNotification(id: string): boolean {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== id);
    if (this.notifications.length !== initialLength) {
      this.saveNotificationsToStorage();
      this.notifyListeners();
      
      // Broadcast to other tabs
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'DELETE_NOTIFICATION',
          notificationId: id
        });
      }
      return true;
    }
    return false;
  }

  clearAllNotifications(): number {
    const count = this.notifications.length;
    this.notifications = [];
    this.saveNotificationsToStorage();
    this.notifyListeners();
    return count;
  }

  clearByType(type: string): number {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.type !== type);
    const removed = initialLength - this.notifications.length;
    if (removed > 0) {
      this.saveNotificationsToStorage();
      this.notifyListeners();
    }
    return removed;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getTotalCount(): number {
    return this.notifications.length;
  }

  // Subscribe to notifications changes
  subscribe(listener: (notifications: NotificationItem[]) => void): () => void {
    this.listeners.push(listener);
    // Immediately notify with current state
    listener([...this.notifications]);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const notificationsCopy = [...this.notifications];
    this.listeners.forEach(listener => {
      try {
        listener(notificationsCopy);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Setup broadcast listener for cross-tab communication
  setupBroadcastListener(callback: (data: any) => void): () => void {
    const handleMessage = (event: MessageEvent) => {
      callback(event.data);
    };
    
    if (this.broadcastChannel) {
      this.broadcastChannel.addEventListener('message', handleMessage);
    }
    
    return () => {
      if (this.broadcastChannel) {
        this.broadcastChannel.removeEventListener('message', handleMessage);
      }
    };
  }

  // Test method to add sample notifications
  addSampleNotifications() {
    this.addNotification({
      title: '🚀 New Site Added',
      message: 'City Mall has been added for client John Smith by Admin',
      type: 'site',
      metadata: { notificationType: 'site_addition' }
    });
    
    this.addNotification({
      title: '🔄 Site Status Changed',
      message: 'Office Complex status changed from inactive to active by Admin',
      type: 'site',
      metadata: { notificationType: 'site_status' }
    });
    
    this.addNotification({
      title: '🗑️ Site Deleted',
      message: 'Park Plaza for client ABC Corp has been deleted by Admin',
      type: 'site',
      metadata: { notificationType: 'site_deletion' }
    });
  }

  // Get cached notifications for the notification page
  getCachedNotifications(): any[] {
    return this.notifications.map(notif => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      time: notif.timestamp,
      type: notif.type === 'site' ? 'info' : 'info',
      read: notif.isRead,
      metadata: notif.metadata,
      notificationType: notif.metadata?.notificationType || 'site_update',
      clientName: notif.metadata?.clientName,
      siteName: notif.metadata?.siteName,
      location: notif.metadata?.location,
      oldStatus: notif.metadata?.oldStatus,
      newStatus: notif.metadata?.newStatus,
      priority: 'medium',
      createdAt: notif.timestamp
    }));
  }

  clearCachedNotifications(): void {
    this.clearAllNotifications();
  }

  startPeriodicCheck(checkFunction: () => Promise<void>, interval = 30000) {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
    
    this.notificationInterval = setInterval(async () => {
      try {
        await checkFunction();
      } catch (error) {
        console.error('Error in periodic check:', error);
      }
    }, interval);
  }

  stopPeriodicCheck() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  destroy() {
    this.stopPeriodicCheck();
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default NotificationService.getInstance();
