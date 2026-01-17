import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Calendar, Download, Edit, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addWeeks, subWeeks, addDays, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import { FormField } from "./shared";
import { cn } from "@/lib/utils";
import { siteService, Site } from "@/services/SiteService";
import { supervisorService, Supervisor } from "@/services/supervisorService";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Define interfaces
interface RosterEntry {
  id: string;
  _id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  shift: string;
  shiftTiming: string;
  assignedTask: string;
  hours: number;
  remark: string;
  type: "daily" | "weekly" | "fortnightly" | "monthly";
  siteClient: string;
  supervisor: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  designation?: string;
  status: "active" | "inactive" | "left";
  siteName?: string;
}

const RosterSection = () => {
  const [selectedRoster, setSelectedRoster] = useState<"daily" | "weekly" | "fortnightly" | "monthly">("daily");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState({
    sites: true,
    supervisors: true,
    employees: true,
    roster: true
  });
  
  // Date states for different roster types
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Data states
  const [sites, setSites] = useState<Site[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Form state
  const [newRosterEntry, setNewRosterEntry] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    employeeName: "",
    employeeId: "",
    department: "",
    designation: "",
    shift: "",
    shiftTiming: "",
    assignedTask: "",
    hours: 8,
    remark: "",
    type: "daily" as "daily" | "weekly" | "fortnightly" | "monthly",
    siteClient: "",
    supervisor: ""
  });

  // Helper to create unique values for Select
  const createUniqueValue = (type: string, item: any) => {
    if (!item || !item._id) return "";
    
    if (type === 'site') {
      return `${item._id}-${item.name || ''}-${item.clientName || ''}`;
    } else if (type === 'supervisor') {
      return `${item._id}-${item.name || ''}-${item.department || ''}`;
    } else if (type === 'employee') {
      return `${item._id}-${item.name || ''}-${item.employeeId || ''}`;
    }
    return item._id || "";
  };

  // Helper to find item by unique value
  const findItemByUniqueValue = (type: string, uniqueValue: string) => {
    if (!uniqueValue) return null;
    
    if (type === 'site') {
      return sites.find(site => createUniqueValue('site', site) === uniqueValue);
    } else if (type === 'supervisor') {
      return supervisors.find(sup => createUniqueValue('supervisor', sup) === uniqueValue);
    } else if (type === 'employee') {
      return employees.find(emp => createUniqueValue('employee', emp) === uniqueValue);
    }
    return null;
  };

  // Get current value for Select components
  const getCurrentSelectValue = (type: 'site' | 'supervisor' | 'employee') => {
    if (type === 'site' && newRosterEntry.siteClient) {
      const site = sites.find(s => s.name === newRosterEntry.siteClient);
      return site ? createUniqueValue('site', site) : "";
    }
    
    if (type === 'supervisor' && newRosterEntry.supervisor) {
      const supervisor = supervisors.find(s => s.name === newRosterEntry.supervisor);
      return supervisor ? createUniqueValue('supervisor', supervisor) : "";
    }
    
    if (type === 'employee' && newRosterEntry.employeeId) {
      const employee = employees.find(e => e._id === newRosterEntry.employeeId);
      return employee ? createUniqueValue('employee', employee) : "";
    }
    
    return "";
  };

  // Check for duplicate entry locally
  const checkDuplicateEntry = (employeeId: string, date: string, shift: string) => {
    return roster.some(entry => 
      entry.employeeId === employeeId && 
      entry.date === date && 
      entry.shift === shift
    );
  };

  // Check if date is within current selected range
  const isDateInCurrentRange = (dateStr: string) => {
    const dateRange = getDateRange();
    const entryDate = new Date(dateStr);
    
    return isWithinInterval(entryDate, {
      start: dateRange.start,
      end: dateRange.end
    });
  };

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch roster when date range changes
  useEffect(() => {
    fetchRosterEntries();
  }, [selectedDate, selectedRoster]);

  const fetchAllData = async () => {
    try {
      setLoadingData({
        sites: true,
        supervisors: true,
        employees: true,
        roster: true
      });

      await Promise.all([
        fetchSites(),
        fetchSupervisors(),
        fetchEmployees(),
        fetchRosterEntries()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoadingData({
        sites: false,
        supervisors: false,
        employees: false,
        roster: false
      });
    }
  };

  const fetchSites = async () => {
    try {
      const data = await siteService.getAllSites();
      // Ensure unique sites by ID
      const uniqueSites = Array.from(new Map(data.map(site => [site._id, site])).values());
      setSites(uniqueSites);
    } catch (error) {
      console.error("Error fetching sites:", error);
      toast.error("Failed to load sites");
    }
  };

  const fetchSupervisors = async () => {
    try {
      const data = await supervisorService.getAllSupervisors();
      // Ensure unique supervisors by ID and filter active ones
      const uniqueSupervisors = Array.from(
        new Map(data.map(sup => [sup._id, sup])).values()
      ).filter(sup => sup.isActive !== false);
      setSupervisors(uniqueSupervisors);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
      toast.error("Failed to load supervisors");
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      if (response.data.success) {
        const employeesData = response.data.employees || [];
        // Ensure unique employees by ID and filter active ones
        const uniqueEmployees = Array.from(
          new Map(employeesData.map((emp: Employee) => [emp._id, emp])).values()
        ).filter(emp => emp.status === "active");
        setEmployees(uniqueEmployees);
      } else {
        throw new Error(response.data.message || "Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const fetchRosterEntries = async () => {
    try {
      setLoadingData(prev => ({ ...prev, roster: true }));
      
      // Fetch ALL roster entries for the selected date range
      const dateRange = getDateRange();
      const params = new URLSearchParams({
        startDate: format(dateRange.start, "yyyy-MM-dd"),
        endDate: format(dateRange.end, "yyyy-MM-dd")
      });

      const response = await axios.get(`${API_BASE_URL}/roster?${params}`);
      
      if (response.data.success) {
        console.log("Fetched roster entries:", response.data.roster);
        setRoster(response.data.roster || []);
      } else {
        throw new Error(response.data.message || "Failed to fetch roster");
      }
    } catch (error) {
      console.error("Error fetching roster:", error);
      toast.error("Failed to load roster entries");
    } finally {
      setLoadingData(prev => ({ ...prev, roster: false }));
    }
  };

  // Calculate date ranges based on roster type
  const getDateRange = () => {
    switch (selectedRoster) {
      case "daily":
        return {
          start: selectedDate,
          end: selectedDate,
          label: format(selectedDate, "dd MMMM yyyy")
        };
      case "weekly":
        const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
        const weekEndDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return {
          start: weekStartDate,
          end: weekEndDate,
          label: `${format(weekStartDate, "dd MMM")} - ${format(weekEndDate, "dd MMM yyyy")}`
        };
      case "fortnightly":
        const fortnightStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const fortnightEnd = addDays(fortnightStart, 13); // 14 days total
        return {
          start: fortnightStart,
          end: fortnightEnd,
          label: `${format(fortnightStart, "dd MMM")} - ${format(fortnightEnd, "dd MMM yyyy")}`
        };
      case "monthly":
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        return {
          start: monthStart,
          end: monthEnd,
          label: format(selectedDate, "MMMM yyyy")
        };
      default:
        return {
          start: selectedDate,
          end: selectedDate,
          label: format(selectedDate, "dd MMMM yyyy")
        };
    }
  };

  const dateRange = getDateRange();

  // Get days for calendar view
  const getDaysInRange = () => {
    if (selectedRoster === "monthly") {
      const start = startOfMonth(dateRange.start);
      const end = endOfMonth(dateRange.start);
      return eachDayOfInterval({ start, end });
    } else if (selectedRoster === "weekly") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else if (selectedRoster === "fortnightly") {
      const start = dateRange.start;
      const end = dateRange.end;
      return eachDayOfInterval({ start, end });
    } else {
      return [selectedDate];
    }
  };

  const handleAddRosterEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      const requiredFields = [
        "date",
        "employeeName",
        "employeeId",
        "department",
        "designation",
        "shift",
        "shiftTiming",
        "assignedTask",
        "hours",
        "siteClient",
        "supervisor",
      ];

      const missingFields = requiredFields.filter(field => !newRosterEntry[field as keyof typeof newRosterEntry]);

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }

      // Validate hours
      if (newRosterEntry.hours <= 0 || newRosterEntry.hours > 24) {
        toast.error("Hours must be between 0 and 24");
        return;
      }

      // Check for duplicate entry locally
      if (checkDuplicateEntry(newRosterEntry.employeeId, newRosterEntry.date, newRosterEntry.shift)) {
        toast.error("Roster entry already exists for this employee on selected date and shift");
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/roster`, {
        ...newRosterEntry,
        type: selectedRoster
      });

      if (response.data.success) {
        toast.success("Roster entry created successfully!");
        
        // Add the new entry to local state immediately
        const newEntry = response.data.roster;
        setRoster(prev => {
          // Check if entry already exists to avoid duplicates
          const exists = prev.some(entry => 
            entry._id === newEntry._id || 
            (entry.employeeId === newEntry.employeeId && 
             entry.date === newEntry.date && 
             entry.shift === newEntry.shift)
          );
          
          if (exists) {
            return prev.map(entry => entry._id === newEntry._id ? newEntry : entry);
          }
          
          return [newEntry, ...prev];
        });
        
        setAddEntryDialogOpen(false);
        resetForm();
        
        // If the new entry is within current date range, show success message
        if (isDateInCurrentRange(newEntry.date)) {
          toast.success("Entry added and displayed in current view");
        } else {
          toast.info("Entry created. Change date range to view it.");
        }
      } else {
        throw new Error(response.data.message || "Failed to create roster entry");
      }
    } catch (error: any) {
      console.error("Error creating roster:", error);
      if (error.response?.data?.error?.includes("duplicate") || error.response?.data?.message?.includes("already exists")) {
        toast.error("A roster entry already exists for this employee on this date and shift");
      } else {
        toast.error(error.response?.data?.message || error.message || "Error creating roster entry");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoster = async (rosterId: string) => {
    if (!confirm("Are you sure you want to delete this roster entry?")) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/roster/${rosterId}`);
      
      if (response.data.success) {
        toast.success("Roster entry deleted successfully!");
        // Remove from local state
        setRoster(prev => prev.filter(entry => entry.id !== rosterId && entry._id !== rosterId));
      } else {
        throw new Error(response.data.message || "Failed to delete roster entry");
      }
    } catch (error: any) {
      console.error("Error deleting roster:", error);
      toast.error(error.response?.data?.message || "Error deleting roster entry");
    }
  };

  const handleUpdateRoster = async (rosterId: string, updates: Partial<RosterEntry>) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/roster/${rosterId}`, updates);
      
      if (response.data.success) {
        toast.success("Roster entry updated successfully!");
        // Update in local state
        setRoster(prev => prev.map(entry => 
          (entry.id === rosterId || entry._id === rosterId) ? response.data.roster : entry
        ));
        return response.data.roster;
      } else {
        throw new Error(response.data.message || "Failed to update roster entry");
      }
    } catch (error: any) {
      console.error("Error updating roster:", error);
      toast.error(error.response?.data?.message || "Error updating roster entry");
    }
  };

  const resetForm = () => {
    setNewRosterEntry({
      date: format(new Date(), "yyyy-MM-dd"),
      employeeName: "",
      employeeId: "",
      department: "",
      designation: "",
      shift: "",
      shiftTiming: "",
      assignedTask: "",
      hours: 8,
      remark: "",
      type: "daily",
      siteClient: "",
      supervisor: ""
    });
  };

  // Handle site selection
  const handleSiteSelect = (uniqueValue: string) => {
    const selectedSite = findItemByUniqueValue('site', uniqueValue);
    
    if (selectedSite) {
      setNewRosterEntry(prev => ({ 
        ...prev, 
        siteClient: selectedSite.name 
      }));
    }
  };

  // Handle supervisor selection
  const handleSupervisorSelect = (uniqueValue: string) => {
    const selectedSupervisor = findItemByUniqueValue('supervisor', uniqueValue);
    
    if (selectedSupervisor) {
      setNewRosterEntry(prev => ({ 
        ...prev, 
        supervisor: selectedSupervisor.name 
      }));
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = (uniqueValue: string) => {
    const selectedEmployee = findItemByUniqueValue('employee', uniqueValue);
    
    if (selectedEmployee) {
      setNewRosterEntry(prev => ({
        ...prev,
        employeeId: selectedEmployee._id,
        employeeName: selectedEmployee.name,
        department: selectedEmployee.department || selectedEmployee.position || "",
        designation: selectedEmployee.designation || selectedEmployee.position || ""
      }));
    }
  };

  // Filter roster by date range for display
  const filteredRoster = roster.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= dateRange.start && entryDate <= dateRange.end;
  });

  const handleExportReport = () => {
    toast.success(`Exporting ${selectedRoster} roster report for ${dateRange.label}...`);
    // Implement export functionality here
  };

  const navigateDate = (direction: "prev" | "next") => {
    switch (selectedRoster) {
      case "daily":
        setSelectedDate(prev => addDays(prev, direction === "next" ? 1 : -1));
        break;
      case "weekly":
        setSelectedDate(prev => addWeeks(prev, direction === "next" ? 1 : -1));
        break;
      case "fortnightly":
        setSelectedDate(prev => addDays(prev, direction === "next" ? 14 : -14));
        break;
      case "monthly":
        setSelectedDate(prev => addMonths(prev, direction === "next" ? 1 : -1));
        break;
    }
  };

  // Group roster by date for calendar view
  const groupedRoster = filteredRoster.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, RosterEntry[]>);

  // Daily Roster Table Component
  const DailyRosterTable = ({ roster, onDelete, onUpdate }: { 
    roster: RosterEntry[], 
    onDelete: (id: string) => void,
    onUpdate: (id: string, updates: Partial<RosterEntry>) => Promise<void>
  }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<RosterEntry>>({});

    const startEdit = (entry: RosterEntry) => {
      setEditingId(entry.id);
      setEditForm({
        shift: entry.shift,
        shiftTiming: entry.shiftTiming,
        assignedTask: entry.assignedTask,
        hours: entry.hours,
        remark: entry.remark,
        siteClient: entry.siteClient,
        supervisor: entry.supervisor
      });
    };

    const saveEdit = async (id: string) => {
      await onUpdate(id, editForm);
      setEditingId(null);
      setEditForm({});
    };

    const cancelEdit = () => {
      setEditingId(null);
      setEditForm({});
    };

    return (
      <div>
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            Showing entries for: <span className="font-medium">{dateRange.label}</span>
            {roster.length > 0 && (
              <span className="ml-4">
                Total: <span className="font-medium">{roster.length}</span> entries
              </span>
            )}
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sr. No.</TableHead>
              <TableHead>Employee Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Shift Timing</TableHead>
              <TableHead>Assigned Task</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Site/Client</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingData.roster ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading roster entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : roster.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="h-8 w-8" />
                    <div>No roster entries found for selected period</div>
                    <div className="text-sm">Try changing the date or roster type</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              roster.map((entry, index) => (
                <TableRow key={entry.id || entry._id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{entry.employeeName}</TableCell>
                  <TableCell>{entry.employeeId}</TableCell>
                  <TableCell>{entry.department}</TableCell>
                  <TableCell>{entry.designation}</TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        value={editForm.shiftTiming || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, shiftTiming: e.target.value }))}
                        placeholder="e.g., 09:00-17:00"
                        className="w-32"
                      />
                    ) : (
                      entry.shiftTiming
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        value={editForm.assignedTask || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, assignedTask: e.target.value }))}
                        placeholder="Assigned task"
                      />
                    ) : (
                      entry.assignedTask
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="number"
                        value={editForm.hours || 0}
                        onChange={(e) => setEditForm(prev => ({ ...prev, hours: parseFloat(e.target.value) }))}
                        min="0"
                        max="24"
                        step="0.5"
                        className="w-20"
                      />
                    ) : (
                      <Badge variant="outline" className="font-mono">
                        {entry.hours}h
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Select
                        value={editForm.siteClient || ""}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, siteClient: value }))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select site/client" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites.map(site => (
                            <SelectItem 
                              key={site._id} 
                              value={site.name}
                            >
                              {site.name} - {site.clientName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      entry.siteClient
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Select
                        value={editForm.supervisor || ""}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, supervisor: value }))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors.map(sup => (
                            <SelectItem 
                              key={sup._id} 
                              value={sup.name}
                            >
                              {sup.name} - {sup.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      entry.supervisor
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={entry.remark}>
                    {editingId === entry.id ? (
                      <Input
                        value={editForm.remark || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev, remark: e.target.value }))}
                        placeholder="Remarks"
                      />
                    ) : (
                      entry.remark
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {editingId === entry.id ? (
                        <>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => saveEdit(entry.id || entry._id)}
                          >
                            Save
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => startEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => onDelete(entry.id || entry._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Calendar View for Monthly Roster
  const MonthlyCalendarView = () => {
    const days = getDaysInRange();
    const startDate = startOfMonth(selectedDate);
    const endDate = endOfMonth(selectedDate);
    
    // Get all days in month
    const monthDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Get days before month start to fill first week
    const firstDayOfMonth = startOfWeek(startDate, { weekStartsOn: 1 });
    
    const allDays = eachDayOfInterval({ 
      start: firstDayOfMonth, 
      end: endDate 
    }).filter(day => day <= endDate || isSameMonth(day, startDate));

    const totalHoursByDate = filteredRoster.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += entry.hours;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
            <div key={day} className="py-2 bg-muted rounded-t">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, index) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEntries = groupedRoster[dateStr] || [];
            const totalHours = totalHoursByDate[dateStr] || 0;
            const isCurrentMonth = isSameMonth(day, startDate);
            
            return (
              <div
                key={index}
                className={cn(
                  "min-h-32 border rounded p-2 text-sm transition-colors",
                  isCurrentMonth ? "bg-background" : "bg-muted/50",
                  isSameDay(day, new Date()) && "border-primary border-2"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={cn(
                    "font-semibold",
                    !isCurrentMonth && "text-muted-foreground",
                    isSameDay(day, new Date()) && "text-primary"
                  )}>
                    {format(day, "d")}
                  </span>
                  {totalHours > 0 && (
                    <Badge variant="secondary" className="h-5">
                      {totalHours}h
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {dayEntries.slice(0, 3).map(entry => (
                    <div key={entry.id || entry._id} className="text-xs p-1 bg-secondary rounded truncate">
                      {entry.employeeName.split(' ')[0]}: {entry.shift}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayEntries.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Roster types
  const rosterTypes = ["daily", "weekly", "fortnightly", "monthly"];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Roster Management
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportReport} disabled={loadingData.roster}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Roster Type Selection */}
          <div className="flex flex-wrap gap-4 mb-6">
            {rosterTypes.map((type) => (
              <Button
                key={type}
                variant={selectedRoster === type ? "default" : "outline"}
                onClick={() => setSelectedRoster(type as any)}
                className="capitalize"
                disabled={loadingData.roster}
              >
                {type} Roster
              </Button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("prev")}
                disabled={loadingData.roster}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[240px] justify-start text-left font-normal"
                    disabled={loadingData.roster}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.label}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="font-semibold">
                        {format(selectedDate, "MMMM yyyy")}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                        <div key={i} className="text-center text-xs font-medium">
                          {day}
                        </div>
                      ))}
                      {eachDayOfInterval({
                        start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
                        end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
                      }).map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, selectedDate);
                        const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                        
                        return (
                          <Button
                            key={i}
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            className={cn(
                              "h-8 w-8 p-0",
                              !isCurrentMonth && "text-muted-foreground opacity-50"
                            )}
                            onClick={() => setSelectedDate(day)}
                          >
                            {format(day, "d")}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("next")}
                disabled={loadingData.roster}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {selectedRoster === "daily" && "Daily View"}
              {selectedRoster === "weekly" && "Weekly View"}
              {selectedRoster === "fortnightly" && "15 Days View"}
              {selectedRoster === "monthly" && "Monthly View"}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredRoster.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {filteredRoster.reduce((sum, entry) => sum + entry.hours, 0)}h
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unique Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Set(filteredRoster.map(entry => entry.employeeId)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Dialog open={addEntryDialogOpen} onOpenChange={setAddEntryDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={loadingData.sites || loadingData.supervisors || loadingData.employees}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Roster Entry - {selectedRoster.toUpperCase()} ROSTER</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddRosterEntry} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Date" id="date" required>
                      <Input 
                        id="date" 
                        name="date" 
                        type="date" 
                        value={newRosterEntry.date}
                        onChange={(e) => setNewRosterEntry(prev => ({ ...prev, date: e.target.value }))}
                        required 
                      />
                    </FormField>
                    <FormField label="Site / Client" id="siteClient" required>
                      {loadingData.sites ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading sites...</span>
                        </div>
                      ) : (
                        <Select 
                          value={getCurrentSelectValue('site')}
                          onValueChange={handleSiteSelect}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select site/client" />
                          </SelectTrigger>
                          <SelectContent>
                            {sites.map(site => (
                              <SelectItem 
                                key={createUniqueValue('site', site)}
                                value={createUniqueValue('site', site)}
                              >
                                {site.name} - {site.clientName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormField>
                    <FormField label="Supervisor" id="supervisor" required>
                      {loadingData.supervisors ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading supervisors...</span>
                        </div>
                      ) : (
                        <Select 
                          value={getCurrentSelectValue('supervisor')}
                          onValueChange={handleSupervisorSelect}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select supervisor" />
                          </SelectTrigger>
                          <SelectContent>
                            {supervisors.map(sup => (
                              <SelectItem 
                                key={createUniqueValue('supervisor', sup)}
                                value={createUniqueValue('supervisor', sup)}
                              >
                                {sup.name} - {sup.department}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormField>
                    <FormField label="Employee" id="employee" required>
                      {loadingData.employees ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading employees...</span>
                        </div>
                      ) : (
                        <Select 
                          value={getCurrentSelectValue('employee')}
                          onValueChange={handleEmployeeSelect}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees
                              .filter(emp => emp.status === "active")
                              .map(emp => (
                                <SelectItem 
                                  key={createUniqueValue('employee', emp)}
                                  value={createUniqueValue('employee', emp)}
                                >
                                  {emp.name} - {emp.position} ({emp.employeeId})
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      )}
                    </FormField>
                    <FormField label="Department" id="department" required>
                      <Input 
                        id="department" 
                        value={newRosterEntry.department}
                        onChange={(e) => setNewRosterEntry(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Enter department"
                        required 
                      />
                    </FormField>
                    <FormField label="Designation" id="designation" required>
                      <Input 
                        id="designation" 
                        value={newRosterEntry.designation}
                        onChange={(e) => setNewRosterEntry(prev => ({ ...prev, designation: e.target.value }))}
                        placeholder="Enter designation"
                        required 
                      />
                    </FormField>
                    <FormField label="Shift" id="shift" required>
                      <Select 
                        value={newRosterEntry.shift} 
                        onValueChange={(value) => setNewRosterEntry(prev => ({ ...prev, shift: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning">Morning Shift</SelectItem>
                          <SelectItem value="Evening">Evening Shift</SelectItem>
                          <SelectItem value="Night">Night Shift</SelectItem>
                          <SelectItem value="General">General Shift</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Shift Timing" id="shiftTiming" required>
                      <Input 
                        id="shiftTiming" 
                        value={newRosterEntry.shiftTiming}
                        onChange={(e) => setNewRosterEntry(prev => ({ ...prev, shiftTiming: e.target.value }))}
                        placeholder="e.g., 09:00-17:00" 
                        required 
                      />
                    </FormField>
                    <FormField label="Assigned Task" id="assignedTask" required>
                      <Input 
                        id="assignedTask" 
                        value={newRosterEntry.assignedTask}
                        onChange={(e) => setNewRosterEntry(prev => ({ ...prev, assignedTask: e.target.value }))}
                        placeholder="Enter assigned task" 
                        required 
                      />
                    </FormField>
                    <FormField label="Hours" id="hours" required>
                      <Input 
                        id="hours" 
                        type="number" 
                        value={newRosterEntry.hours}
                        onChange={(e) => setNewRosterEntry(prev => ({ ...prev, hours: parseFloat(e.target.value) }))}
                        placeholder="Enter hours" 
                        min="0"
                        max="24"
                        step="0.5"
                        required 
                      />
                    </FormField>
                  </div>
                  <FormField label="Remark" id="remark">
                    <Textarea 
                      id="remark" 
                      value={newRosterEntry.remark}
                      onChange={(e) => setNewRosterEntry(prev => ({ ...prev, remark: e.target.value }))}
                      placeholder="Enter any remarks or notes" 
                    />
                  </FormField>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Entry...
                      </>
                    ) : (
                      "Add Entry"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Roster Display */}
          {selectedRoster === "monthly" ? (
            <MonthlyCalendarView />
          ) : (
            <DailyRosterTable 
              roster={filteredRoster} 
              onDelete={handleDeleteRoster}
              onUpdate={handleUpdateRoster}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RosterSection;