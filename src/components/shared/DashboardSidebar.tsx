import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut,
  Building2,
  ClipboardList,
  UserCog,
  Shield,
  Briefcase,
  BarChart3,
  DollarSign,
  Bell,
  Menu,
  X,
  Workflow,
  Package // Added for Inventory
} from "lucide-react";
import { useRole, UserRole } from "@/context/RoleContext";
import { motion } from "framer-motion";

// Separate component for Inventory button
const InventoryNavItem = ({ 
  collapsed, 
  mobileOpen, 
  basePath 
}: { 
  collapsed: boolean; 
  mobileOpen: boolean; 
  basePath: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }} // Adjusted delay to fit in sequence
    >
      <NavLink
        to={`${basePath}/inventory`}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/50"
          )
        }
      >
        <Package className="h-5 w-5 flex-shrink-0" />
        {(!collapsed || mobileOpen) && <span className="text-sm font-medium">Inventory</span>}
      </NavLink>
    </motion.div>
  );
};

const getSidebarItems = (role: UserRole) => {
  const baseItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "dashboard" },
  ];

  switch (role) {
    case "superadmin":
      return [
        ...baseItems,
        { name: "Users & Roles", icon: UserCog, path: "users" },
        { name: "HRMS", icon: Users, path: "hrms" },
        { name: "CRM", icon: Building2, path: "crm" },
        { name: "ERP", icon: ClipboardList, path: "erp" },
        { name: "Billing & Finance", icon: DollarSign, path: "billing" },
        { name: "Operations", icon: ClipboardList, path: "operations" },
        { name: "Reports", icon: BarChart3, path: "reports" },
        { name: "Documents", icon: FileText, path: "documents" },
        { name: "Notifications", icon: Bell, path: "notifications" },
        { name: "Settings", icon: Settings, path: "settings" },
      ];

    case "admin":
      return [
        ...baseItems,
        { name: "Profile", icon: UserCog, path: "profile" },
        { name: "Team", icon: Users, path: "team" },
        { name: "Tasks", icon: ClipboardList, path: "tasks" },
        { name: "CRM", icon: Building2, path: "crm" },
        { name: "Attendance", icon: ClipboardList, path: "attendance" },
        { name: "Reports", icon: BarChart3, path: "reports" },
        { name: "Leave", icon: Calendar, path: "leave" },
        { name: "Notifications", icon: Bell, path: "notifications" },
        { name: "Settings", icon: Settings, path: "settings" },
      ];

    case "manager":
      return [
        ...baseItems,
        { name: "Profile", icon: UserCog, path: "profile" },
        { name: "Supervisors", icon: Shield, path: "supervisors" },
        { name: "Team & Tasks", icon: ClipboardList, path: "tasks" },
        { name: "Reports", icon: BarChart3, path: "reports" },
        { name: "Leave", icon: Calendar, path: "leave" },
        { name: "Operations", icon: ClipboardList, path: "operations" },
        { name: "Attendance", icon: Calendar, path: "managerattendance" },
        { name: "Notifications", icon: Bell, path: "notifications" },
        { name: "Settings", icon: Settings, path: "settings" },
      ];

    case "supervisor":
      return [
        ...baseItems,
        { name: "Profile", icon: UserCog, path: "profile" },
        { name: "My Tasks", icon: ClipboardList, path: "tasks" },
        { name: "Work Query", icon: Workflow, path: "query" },
        // Inventory will be added separately in the navigation render
        { name: "Employees", icon: Users, path: "employees" },
        { name: "Attendance", icon: Calendar, path: "attendance" },
        { name: "Leave", icon: Calendar, path: "leave" },
        { name: "Reports", icon: FileText, path: "reports" },
        { name: "Notifications", icon: Bell, path: "notifications" },
        { name: "Settings", icon: Settings, path: "settings" },
      ];

    case "employee":
      return [
        ...baseItems,
        { name: "My Tasks", icon: ClipboardList, path: "tasks" },
        { name: "Attendance", icon: Calendar, path: "attendance" },
        { name: "Documents", icon: FileText, path: "documents" },
        { name: "Salary Slip", icon: DollarSign, path: "salary" },
        { name: "Apply Leave", icon: Calendar, path: "leave" },
        { name: "Notifications", icon: Bell, path: "notifications" },
      ];

    default:
      return baseItems;
  }
};

interface DashboardSidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const DashboardSidebar = ({ 
  collapsed: initialCollapsed = false,
  mobileOpen = false,
  onMobileClose 
}: DashboardSidebarProps) => {
  const { role, user, logout } = useRole();
  const sidebarItems = getSidebarItems(role);
  const basePath = `/${role}`;
  
  // Manage collapsed state with localStorage persistence (desktop only)
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored ? JSON.parse(stored) : initialCollapsed;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ 
          x: mobileOpen ? 0 : (window.innerWidth < 1024 ? -280 : 0),
          opacity: 1,
          width: collapsed && window.innerWidth >= 1024 ? "4rem" : "16rem"
        }}
        transition={{ duration: 0.3 }}
        className={cn(
          "h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col relative z-50",
          "fixed lg:sticky top-0 left-0",
          !mobileOpen && "hidden lg:flex"
        )}
      >
        {/* Toggle Button (Desktop Only) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md hover:bg-sidebar-accent",
            "transition-all duration-300 hidden lg:flex"
          )}
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>

        {/* Header */}
        <div className="p-4 md:p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            {(!collapsed || mobileOpen) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="font-bold text-lg">SK PROJECT</h2>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {sidebarItems.map((item, index) => {
              // For supervisor role, insert Inventory button after "Work Query"
              if (role === "supervisor" && item.path === "query") {
                return (
                  <div key="supervisor-navigation-group">
                    {/* Work Query item */}
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <NavLink
                        to={`${basePath}/${item.path}`}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent/50"
                          )
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {(!collapsed || mobileOpen) && <span className="text-sm font-medium">{item.name}</span>}
                      </NavLink>
                    </motion.div>
                    
                    {/* Inventory button - using separate component */}
                    <InventoryNavItem 
                      collapsed={collapsed} 
                      mobileOpen={mobileOpen} 
                      basePath={basePath}
                    />
                  </div>
                );
              }
              
              // For other items, render normally
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NavLink
                    to={`${basePath}/${item.path}`}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {(!collapsed || mobileOpen) && <span className="text-sm font-medium">{item.name}</span>}
                  </NavLink>
                </motion.div>
              );
            })}
            
            {/* For other roles, if you want to add Inventory elsewhere, you can conditionally render here */}
          </nav>
        </ScrollArea>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {(!collapsed || mobileOpen) && user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 text-sm"
            >
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            </motion.div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {(!collapsed || mobileOpen) && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </motion.aside>
    </>
  );
};