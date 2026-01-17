import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Clock, 
  AlertCircle, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Paperclip, 
  Download,
  Eye,
  Upload,
  MessageSquare,
  Calendar,
  User,
  Globe,
  Building,
  Briefcase,
  Users,
  Loader2,
  Target,
  Check,
  ChevronsUpDown,
  X,
  FileText,
  Ban,
  Layers,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { FormField, SearchBar } from "../components/sharedA";
import taskService, { 
  type Task, 
  type Site, 
  type ExtendedSite,
  type Assignee, 
  type CreateMultipleTasksRequest,
  type UpdateTaskStatusRequest,
  type AddHourlyUpdateRequest,
  type Attachment,
  type HourlyUpdate
} from "@/services/TaskService";

// Components
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Extended Task type for grouped tasks
interface GroupedTask extends Task {
  _isGrouped: true;
  _groupCount: number;
  _groupItems: Task[];
  _groupedAssignees: string[];
  _groupedAssigneeNames: string[];
  _groupedSites: string[];
  _groupedSiteNames: string[];
  _groupedClientNames: string[];
  _overallStatus: Task["status"];
  _totalAttachments: number;
  _totalHourlyUpdates: number;
  _allAttachments: Attachment[];
  _allHourlyUpdates: HourlyUpdate[];
}

// Type guard to check if a task is grouped
const isGroupedTask = (task: Task | GroupedTask): task is GroupedTask => {
  return (task as GroupedTask)._isGrouped === true;
};

// Helper function for safe string access
const safeString = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value);
};

// Memoized components
const SiteCheckboxItem = memo(({ 
  site, 
  isSelected, 
  onToggle 
}: { 
  site: Site;
  isSelected: boolean;
  onToggle: (siteId: string) => void;
}) => (
  <div key={site._id} className="flex items-center space-x-3">
    <input 
      type="checkbox"
      id={`site-${site._id}`}
      checked={isSelected}
      onChange={() => onToggle(site._id)}
      className="h-4 w-4 rounded border-gray-300"
    />
    <label
      htmlFor={`site-${site._id}`}
      className="flex-1 cursor-pointer"
    >
      <div className="flex flex-col">
        <span className="font-medium">{site.name}</span>
        <span className="text-sm text-muted-foreground">
          {site.clientName} • {site.location}
        </span>
      </div>
    </label>
    <Badge variant={site.status === "active" ? "default" : "secondary"}>
      {site.status}
    </Badge>
  </div>
));

SiteCheckboxItem.displayName = "SiteCheckboxItem";

// Combobox for Task Selection - FIXED: Only show tasks that are NOT already assigned anywhere
const TaskCombobox = ({ 
  tasks, 
  selectedTask, 
  onSelectTask,
  isLoading,
  alreadyAssignedTaskIds = [] // Tasks that are already assigned anywhere
}: { 
  tasks: Task[];
  selectedTask: Task | null;
  onSelectTask: (task: Task | null) => void;
  isLoading: boolean;
  alreadyAssignedTaskIds?: string[];
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredTasks = useMemo(() => {
    if (!searchValue) return tasks;
    const searchLower = searchValue.toLowerCase().trim();
    
    return tasks.filter(task => {
      if (!task) return false;
      
      // Check if task is already assigned anywhere
      const isAlreadyAssigned = alreadyAssignedTaskIds.includes(task._id);
      
      // If task is already assigned, don't show it at all
      if (isAlreadyAssigned) return false;
      
      // Search in multiple fields with OR logic
      const titleMatch = safeString(task.title).toLowerCase().includes(searchLower);
      const descriptionMatch = safeString(task.description).toLowerCase().includes(searchLower);
      const assigneeMatch = safeString(task.assignedToName).toLowerCase().includes(searchLower);
      const siteMatch = safeString(task.siteName).toLowerCase().includes(searchLower);
      const clientMatch = safeString(task.clientName).toLowerCase().includes(searchLower);
      const taskTypeMatch = safeString(task.taskType).toLowerCase().includes(searchLower);
      const priorityMatch = safeString(task.priority).toLowerCase().includes(searchLower);
      const statusMatch = safeString(task.status).toLowerCase().includes(searchLower);
      
      return titleMatch || descriptionMatch || assigneeMatch || 
             siteMatch || clientMatch || taskTypeMatch || 
             priorityMatch || statusMatch;
    });
  }, [tasks, searchValue, alreadyAssignedTaskIds]);

  const availableTasks = useMemo(() => {
    return filteredTasks.filter(task => {
      if (!task) return false;
      
      // Check if task is already assigned anywhere
      const isAlreadyAssigned = alreadyAssignedTaskIds.includes(task._id);
      
      // Only show tasks that are NOT already assigned
      return !isAlreadyAssigned;
    });
  }, [filteredTasks, alreadyAssignedTaskIds]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading tasks...
            </>
          ) : selectedTask ? (
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{safeString(selectedTask.title)}</span>
              {alreadyAssignedTaskIds.includes(selectedTask._id) && (
                <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700">
                  Already assigned
                </Badge>
              )}
            </div>
          ) : (
            "Select a task..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ minWidth: '400px' }}>
        <Command>
          <CommandInput 
            placeholder="Search tasks by title, description, assignee, site, etc..." 
            value={searchValue}
            onValueChange={(value) => setSearchValue(value)}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              {searchValue ? "No tasks found. Try a different search term." : "No unassigned tasks available."}
            </CommandEmpty>
            <CommandGroup>
              {availableTasks.map((task) => {
                const isAlreadyAssigned = alreadyAssignedTaskIds.includes(task._id);
                
                // Don't show already assigned tasks at all
                if (isAlreadyAssigned) return null;
                
                return (
                  <CommandItem
                    key={task._id}
                    value={task._id}
                    onSelect={() => {
                      onSelectTask(task);
                      setOpen(false);
                      setSearchValue("");
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{safeString(task.title)}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {safeString(task.description).substring(0, 50)}...
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {safeString(task.priority)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {safeString(task.status)}
                          </Badge>
                        </div>
                      </div>
                      <Check
                        className={`h-4 w-4 ${
                          selectedTask?._id === task._id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Multi-select Combobox for Assignees with site-based limits - FIXED VERSION
const AssigneeMultiSelect = ({ 
  assignees, 
  selectedAssignees, 
  onSelectAssignees,
  assigneeType,
  onAssigneeTypeChange,
  isLoading,
  selectedSites,
  sites
}: { 
  assignees: Assignee[];
  selectedAssignees: string[];
  onSelectAssignees: (assigneeIds: string[]) => void;
  assigneeType: "all" | "manager" | "supervisor";
  onAssigneeTypeChange: (type: "all" | "manager" | "supervisor") => void;
  isLoading: boolean;
  selectedSites: string[];
  sites: ExtendedSite[];
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Calculate available slots per site
  const siteSlots = useMemo(() => {
    const slots: {[siteId: string]: {manager: number, supervisor: number}} = {};
    
    selectedSites.forEach(siteId => {
      const site = sites.find(s => s._id === siteId);
      if (site) {
        slots[siteId] = {
          manager: site.managerCount || 0,
          supervisor: site.supervisorCount || 0
        };
      }
    });
    
    return slots;
  }, [selectedSites, sites]);

  // Calculate current usage per site with improved distribution logic
  const currentUsage = useMemo(() => {
    const usage: {[siteId: string]: {manager: number, supervisor: number}} = {};
    
    // Initialize usage for all selected sites
    selectedSites.forEach(siteId => {
      usage[siteId] = { manager: 0, supervisor: 0 };
    });
    
    // Count currently selected assignees - distribute evenly across sites
    selectedAssignees.forEach((assigneeId, index) => {
      const assignee = assignees.find(a => a._id === assigneeId);
      if (assignee) {
        // Determine which site to assign this assignee to
        let targetSiteId = null;
        
        // Try to find if assignee has a specific site
        const assigneeSiteId = (assignee as any).siteId;
        
        if (assigneeSiteId && selectedSites.includes(assigneeSiteId)) {
          // Assignee has a specific site preference
          targetSiteId = assigneeSiteId;
        } else {
          // Distribute evenly across selected sites
          // Use modulo to cycle through sites
          targetSiteId = selectedSites[index % selectedSites.length];
        }
        
        if (targetSiteId && usage[targetSiteId]) {
          if (assignee.role === 'manager') {
            usage[targetSiteId].manager++;
          } else if (assignee.role === 'supervisor') {
            usage[targetSiteId].supervisor++;
          }
        }
      }
    });
    
    return usage;
  }, [selectedAssignees, assignees, selectedSites]);

  // Check if assignee can be selected based on site limits
  const canSelectAssignee = (assignee: Assignee): {canSelect: boolean, reason?: string} => {
    if (!assignee) return {canSelect: false, reason: "Assignee not found"};
    
    // If no sites selected, can't assign
    if (selectedSites.length === 0) {
      return {
        canSelect: false,
        reason: "Please select sites first"
      };
    }
    
    // For simplicity, we'll check if there's ANY site that can accommodate this assignee
    let canAssign = false;
    let reason = "No site can accommodate this assignee";
    
    // Check each selected site to see if it has capacity
    for (const siteId of selectedSites) {
      const siteSlot = siteSlots[siteId];
      const siteUsage = currentUsage[siteId];
      
      if (!siteSlot || !siteUsage) continue;
      
      if (assignee.role === 'manager') {
        if (siteUsage.manager < siteSlot.manager) {
          canAssign = true;
          reason = `Can be assigned to ${sites.find(s => s._id === siteId)?.name || 'site'}`;
          break;
        }
      } else if (assignee.role === 'supervisor') {
        if (siteUsage.supervisor < siteSlot.supervisor) {
          canAssign = true;
          reason = `Can be assigned to ${sites.find(s => s._id === siteId)?.name || 'site'}`;
          break;
        }
      }
    }
    
    if (!canAssign) {
      const roleText = assignee.role === 'manager' ? 'Manager' : 'Supervisor';
      return {
        canSelect: false,
        reason: `${roleText} limit reached for all selected sites`
      };
    }
    
    return {canSelect: true, reason};
  };

  const filteredAssignees = useMemo(() => {
    let result = assignees.filter(assignee => {
      if (!assignee) return false;
      if (assigneeType === "all") return assignee.role === 'manager' || assignee.role === 'supervisor';
      if (assigneeType === "manager") return assignee.role === 'manager';
      if (assigneeType === "supervisor") return assignee.role === 'supervisor';
      return true;
    });

    if (searchValue) {
      const searchLower = searchValue.toLowerCase().trim();
      
      result = result.filter(assignee => {
        if (!assignee) return false;
        
        // Create searchable strings
        const name = safeString(assignee.name).toLowerCase();
        const email = safeString(assignee.email).toLowerCase();
        const role = safeString(assignee.role).toLowerCase();
        const department = assignee.department ? safeString(assignee.department).toLowerCase() : '';
        const phone = safeString(assignee.phone).toLowerCase();
        
        // Check if ANY field contains the search term (OR logic)
        return name.includes(searchLower) ||
               email.includes(searchLower) ||
               role.includes(searchLower) ||
               department.includes(searchLower) ||
               phone.includes(searchLower);
      });
    }

    return result;
  }, [assignees, assigneeType, searchValue]);

  const handleAssigneeToggle = (assigneeId: string) => {
    const assignee = assignees.find(a => a._id === assigneeId);
    if (!assignee) return;
    
    const { canSelect, reason } = canSelectAssignee(assignee);
    
    if (!canSelect) {
      toast.error(reason || "Cannot select this assignee");
      return;
    }
    
    if (selectedAssignees.includes(assigneeId)) {
      onSelectAssignees(selectedAssignees.filter(id => id !== assigneeId));
    } else {
      onSelectAssignees([...selectedAssignees, assigneeId]);
    }
  };

  const selectedAssigneeObjects = useMemo(() => {
    return assignees.filter(assignee => assignee && selectedAssignees.includes(assignee._id));
  }, [assignees, selectedAssignees]);

  const managerCount = selectedAssigneeObjects.filter(a => a.role === 'manager').length;
  const supervisorCount = selectedAssigneeObjects.filter(a => a.role === 'supervisor').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="font-medium">Select Assignees</span>
          <Badge variant="outline" className="ml-2">
            {selectedAssignees.length} selected
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={assigneeType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onAssigneeTypeChange("all")}
            className="flex items-center gap-1"
          >
            All
          </Button>
          <Button
            type="button"
            variant={assigneeType === "manager" ? "default" : "outline"}
            size="sm"
            onClick={() => onAssigneeTypeChange("manager")}
            className="flex items-center gap-1"
          >
            Managers
          </Button>
          <Button
            type="button"
            variant={assigneeType === "supervisor" ? "default" : "outline"}
            size="sm"
            onClick={() => onAssigneeTypeChange("supervisor")}
            className="flex items-center gap-1"
          >
            Supervisors
          </Button>
        </div>
      </div>

      {/* Site limits display */}
      {selectedSites.length > 0 && (
        <div className="bg-primary/5 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Site Assignment Limits:</div>
          <div className="space-y-2">
            {selectedSites.map(siteId => {
              const site = sites.find(s => s._id === siteId);
              if (!site) return null;
              
              const siteName = site.name || "Unknown Site";
              const managerLimit = site.managerCount || 0;
              const supervisorLimit = site.supervisorCount || 0;
              const currentManager = currentUsage[siteId]?.manager || 0;
              const currentSupervisor = currentUsage[siteId]?.supervisor || 0;
              
              const managerRemaining = Math.max(0, managerLimit - currentManager);
              const supervisorRemaining = Math.max(0, supervisorLimit - currentSupervisor);
              
              return (
                <div key={siteId} className="space-y-2 p-2 border rounded">
                  <div className="flex justify-between items-center">
                    <div className="font-medium truncate text-sm">{siteName}:</div>
                    <div className="flex gap-2">
                      <Badge variant={currentManager >= managerLimit ? "destructive" : "outline"} className="text-xs">
                        {currentManager}/{managerLimit} Managers
                      </Badge>
                      <Badge variant={currentSupervisor >= supervisorLimit ? "destructive" : "outline"} className="text-xs">
                        {currentSupervisor}/{supervisorLimit} Supervisors
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Remaining: {managerRemaining} Manager{managerRemaining !== 1 ? 's' : ''}, {supervisorRemaining} Supervisor{supervisorRemaining !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedSites.length > 1 && (
            <div className="mt-2 text-xs text-amber-600">
              Note: Assignees will be distributed across selected sites based on availability.
            </div>
          )}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading || selectedSites.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading assignees...
              </>
            ) : selectedSites.length === 0 ? (
              "Select sites first"
            ) : selectedAssignees.length > 0 ? (
              <div className="flex items-center gap-2 truncate">
                <Users className="h-4 w-4" />
                <span>{selectedAssignees.length} assignee(s) selected</span>
              </div>
            ) : (
              "Select assignees..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" style={{ minWidth: '400px' }}>
          <Command>
            <CommandInput 
              placeholder="Search assignees by name, role, department..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>
                {searchValue ? `No ${assigneeType === 'all' ? 'assignees' : assigneeType}s found for "${searchValue}".` : "No assignees available."}
              </CommandEmpty>
              <CommandGroup>
                {filteredAssignees.map((assignee) => {
                  const { canSelect, reason } = canSelectAssignee(assignee);
                  const isSelected = selectedAssignees.includes(assignee._id);
                  
                  return (
                    <CommandItem
                      key={assignee._id}
                      value={assignee._id}
                      onSelect={() => {
                        if (canSelect || isSelected) {
                          handleAssigneeToggle(assignee._id);
                          setSearchValue("");
                        } else {
                          toast.error(reason || "Cannot select this assignee");
                        }
                      }}
                      className={`flex items-center space-x-3 ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!canSelect && !isSelected}
                    >
                      <div className={`flex items-center justify-center h-4 w-4 rounded border ${
                        isSelected 
                          ? "bg-primary border-primary" 
                          : "border-gray-300"
                      }`}>
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{safeString(assignee.name)}</div>
                        <div className="text-xs text-muted-foreground">
                          {safeString(assignee.role).charAt(0).toUpperCase() + safeString(assignee.role).slice(1)}
                          {assignee.department && ` • ${safeString(assignee.department)}`}
                          {(assignee as any).siteName && ` • Site: ${(assignee as any).siteName}`}
                        </div>
                        {!canSelect && !isSelected && reason && (
                          <div className="text-xs text-red-600 mt-1">{reason}</div>
                        )}
                        {isSelected && (
                          <div className="text-xs text-green-600 mt-1">Selected</div>
                        )}
                      </div>
                      {!canSelect && !isSelected && (
                        <Ban className="h-4 w-4 text-red-500" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAssignees.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Selected Assignees:</div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                {managerCount} Manager{managerCount !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {supervisorCount} Supervisor{supervisorCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAssigneeObjects.map(assignee => (
              <Badge 
                key={assignee._id} 
                variant="secondary" 
                className="flex items-center gap-1"
              >
                <User className="h-3 w-3" />
                {safeString(assignee.name)}
                <Badge variant="outline" className="ml-1 text-xs">
                  {safeString(assignee.role).charAt(0).toUpperCase() + safeString(assignee.role).slice(1)}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleAssigneeToggle(assignee._id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Multi-select Combobox for Sites - FIXED: Filter out sites that already have the selected task
const SiteMultiSelect = ({ 
  sites, 
  selectedSites, 
  onSelectSites,
  isLoading,
  alreadyAssignedSiteIds = [] // Sites that already have the selected task assigned
}: { 
  sites: ExtendedSite[];
  selectedSites: string[];
  onSelectSites: (siteIds: string[]) => void;
  isLoading: boolean;
  alreadyAssignedSiteIds?: string[];
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filter out sites that already have the task assigned
  const availableSites = useMemo(() => {
    return sites.filter(site => !alreadyAssignedSiteIds.includes(site._id));
  }, [sites, alreadyAssignedSiteIds]);

  const filteredSites = useMemo(() => {
    if (!searchValue) return availableSites;
    
    const searchLower = searchValue.toLowerCase().trim();
    
    return availableSites.filter(site => {
      if (!site) return false;
      
      // Create searchable strings
      const name = safeString(site.name).toLowerCase();
      const client = safeString(site.clientName).toLowerCase();
      const location = safeString(site.location).toLowerCase();
      const status = safeString(site.status).toLowerCase();
      
      // Check if ANY field contains the search term (OR logic)
      return name.includes(searchLower) ||
             client.includes(searchLower) ||
             location.includes(searchLower) ||
             status.includes(searchLower);
    });
  }, [availableSites, searchValue]);

  const handleSiteToggle = (siteId: string) => {
    if (selectedSites.includes(siteId)) {
      onSelectSites(selectedSites.filter(id => id !== siteId));
    } else {
      onSelectSites([...selectedSites, siteId]);
    }
  };

  const selectedSiteObjects = useMemo(() => {
    return sites.filter(site => site && selectedSites.includes(site._id));
  }, [sites, selectedSites]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          <span className="font-medium">Select Sites</span>
          <Badge variant="outline" className="ml-2">
            {selectedSites.length} selected
          </Badge>
          {alreadyAssignedSiteIds.length > 0 && (
            <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700">
              {alreadyAssignedSiteIds.length} site(s) already assigned
            </Badge>
          )}
        </div>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={() => {
            if (selectedSites.length === availableSites.length) {
              onSelectSites([]);
            } else {
              onSelectSites(availableSites.map(site => site._id));
            }
          }}
          disabled={isLoading || availableSites.length === 0}
        >
          {selectedSites.length === availableSites.length ? "Deselect All" : "Select All"}
        </Button>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading || availableSites.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading sites...
              </>
            ) : availableSites.length === 0 ? (
              "No available sites (all already assigned)"
            ) : selectedSites.length > 0 ? (
              <div className="flex items-center gap-2 truncate">
                <Building className="h-4 w-4" />
                <span>{selectedSites.length} site(s) selected</span>
              </div>
            ) : (
              "Select sites..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" style={{ minWidth: '400px' }}>
          <Command>
            <CommandInput 
              placeholder="Search sites by name, client, location..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>
                {searchValue ? `No sites found for "${searchValue}".` : "No available sites."}
              </CommandEmpty>
              <CommandGroup>
                {filteredSites.map((site) => (
                  <CommandItem
                    key={site._id}
                    value={site._id}
                    onSelect={() => {
                      handleSiteToggle(site._id);
                      setSearchValue("");
                    }}
                    className="flex items-center space-x-3"
                  >
                    <div className={`flex items-center justify-center h-4 w-4 rounded border ${
                      selectedSites.includes(site._id) 
                        ? "bg-primary border-primary" 
                        : "border-gray-300"
                    }`}>
                      {selectedSites.includes(site._id) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{safeString(site.name)}</span>
                      <span className="text-xs text-muted-foreground">
                        {safeString(site.clientName)} • {safeString(site.location)}
                        <span className="block text-xs text-green-600 mt-1">
                          {site.managerCount || 0} Managers, {site.supervisorCount || 0} Supervisors
                        </span>
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedSites.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Selected Sites:</div>
          <div className="flex flex-wrap gap-2">
            {selectedSiteObjects.map(site => (
              <Badge 
                key={site._id} 
                variant="secondary" 
                className="flex items-center gap-1"
              >
                {safeString(site.name)}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleSiteToggle(site._id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// View Task Dialog Component
const ViewTaskDialog = ({ 
  task, 
  open, 
  onOpenChange,
  getAssigneeType,
  getSiteName,
  getClientName,
  formatDateTime,
  getAllAssigneeNames,
  getAllAssigneeIds
}: { 
  task: Task | GroupedTask; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  getAssigneeType: (assigneeId: string) => string;
  getSiteName: (siteId: string) => string;
  getClientName: (siteId: string) => string;
  formatDateTime: (dateTimeString: string) => string;
  getAllAssigneeNames: (task: Task | GroupedTask) => string[];
  getAllAssigneeIds: (task: Task | GroupedTask) => string[];
}) => {
  if (!task) return null;

  const getPriorityColor = (priority: string) => {
    const colors = { high: 'destructive', medium: 'default', low: 'secondary' };
    return colors[priority as keyof typeof colors] || 'outline';
  };

  const getStatusColor = (status: string) => {
    const colors = { 
      completed: 'default', 
      'in-progress': 'default', 
      pending: 'secondary',
      cancelled: 'destructive'
    };
    return colors[status as keyof typeof colors] || 'outline';
  };

  const isGrouped = isGroupedTask(task);
  const assigneeNames = getAllAssigneeNames(task);
  const assigneeIds = getAllAssigneeIds(task);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Task Details: {task.title || "Untitled Task"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Task Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="font-medium">{task.title || "No title"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium whitespace-pre-wrap">{task.description || "No description"}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Priority</div>
                    <Badge variant={getPriorityColor(task.priority) as any} className="mt-1">
                      {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
                      {task.priority}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant={getStatusColor(isGrouped ? task._overallStatus : task.status) as any} className="mt-1">
                      {isGrouped ? task._overallStatus : task.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Task Type</div>
                  <div className="font-medium">{task.taskType || "Not specified"}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Assignment Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Assignees</div>
                  <div className="space-y-2 mt-2">
                    {isGrouped ? (
                      // Show all assignees for grouped tasks
                      <div className="grid grid-cols-1 gap-2">
                        {assigneeNames.map((name, index) => {
                          const assigneeId = assigneeIds[index];
                          return (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <User className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {getAssigneeType(assigneeId)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Single assignee
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {task.assignedToName}
                        <Badge variant="outline" className="text-xs">
                          {getAssigneeType(task.assignedTo)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Site</div>
                  <div className="font-medium flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {getSiteName(task.siteId)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="font-medium">{getClientName(task.siteId)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Deadline Date</div>
              <div className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDateTime(task.deadline)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Due Date & Time</div>
              <div className="font-medium">
                {task.dueDateTime ? formatDateTime(task.dueDateTime) : "No due time"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created At</div>
              <div className="font-medium">
                {task.createdAt ? formatDateTime(task.createdAt) : "Unknown"}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4" />
                <div className="text-sm font-medium">Hourly Updates</div>
              </div>
              <div className="text-2xl font-bold">
                {isGrouped ? task._totalHourlyUpdates : (task.hourlyUpdates || []).length}
              </div>
            </div>
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-4 w-4" />
                <div className="text-sm font-medium">Attachments</div>
              </div>
              <div className="text-2xl font-bold">
                {isGrouped ? task._totalAttachments : (task.attachments || []).length}
              </div>
            </div>
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                <div className="text-sm font-medium">Last Updated</div>
              </div>
              <div className="text-sm">
                {task.updatedAt ? formatDateTime(task.updatedAt) : "Never"}
              </div>
            </div>
          </div>

          {/* Attachments Preview */}
          {(isGrouped ? task._totalAttachments > 0 : (task.attachments || []).length > 0) && (
            <div>
              <h3 className="font-semibold mb-3">Attachments</h3>
              <div className="space-y-2">
                {(isGrouped ? task._allAttachments : task.attachments || []).slice(0, 3).map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{attachment.filename || "Unnamed file"}</div>
                        <div className="text-xs text-muted-foreground">
                          {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : "Unknown size"} • {formatDateTime(attachment.uploadedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(isGrouped ? task._allAttachments : task.attachments || []).length > 3 && (
                  <div className="text-center text-sm text-muted-foreground">
                    + {(isGrouped ? task._allAttachments : task.attachments || []).length - 3} more attachment(s)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Updates */}
          {(isGrouped ? task._totalHourlyUpdates > 0 : (task.hourlyUpdates || []).length > 0) && (
            <div>
              <h3 className="font-semibold mb-3">Recent Updates</h3>
              <div className="space-y-3">
                {(isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).slice(0, 3).map((update, index) => (
                  <div key={update.id || `update-${index}`} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Update #{((isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).length - index)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(update.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm">{update.content}</p>
                  </div>
                ))}
                {(isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).length > 3 && (
                  <div className="text-center text-sm text-muted-foreground">
                    + {(isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).length - 3} more update(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TasksSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sites, setSites] = useState<ExtendedSite[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | GroupedTask | null>(null);
  const [showUpdatesDialog, setShowUpdatesDialog] = useState(false);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [hourlyUpdateText, setHourlyUpdateText] = useState("");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeType, setAssigneeType] = useState<"all" | "manager" | "supervisor">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  
  // New states for assign task dialog selection
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<Task | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchTasks();
    fetchSites();
    fetchAssignees();
  }, []);

  // Fetch tasks from backend using TaskService
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const tasksData = await taskService.getAllTasks();
      setTasks(tasksData || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error(error.message || "Failed to load tasks");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch sites from backend using TaskService
  const fetchSites = async () => {
    try {
      setIsLoadingSites(true);
      const sitesData = await taskService.getAllSites();
      
      // Calculate manager/supervisor counts for each site
      const sitesWithCounts = (sitesData || []).map(site => {
        // Get staff deployment array safely
        const staffDeployment = site.staffDeployment;
        
        // Ensure staffDeployment is an array, if not, use empty array
        const staffArray = Array.isArray(staffDeployment) ? staffDeployment : [];
        
        // Calculate manager count
        const managerCount = staffArray
          .filter((staff: any) => {
            if (!staff || !staff.role) return false;
            const role = staff.role.toLowerCase();
            return role.includes('manager') || role === 'manager';
          })
          .reduce((sum: number, staff: any) => sum + (Number(staff.count) || 0), 0);
        
        // Calculate supervisor count
        const supervisorCount = staffArray
          .filter((staff: any) => {
            if (!staff || !staff.role) return false;
            const role = staff.role.toLowerCase();
            return role.includes('supervisor') || role === 'supervisor';
          })
          .reduce((sum: number, staff: any) => sum + (Number(staff.count) || 0), 0);
        
        return {
          ...site,
          managerCount,
          supervisorCount
        };
      });
      
      setSites(sitesWithCounts || []);
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error("Failed to load sites");
      setSites([]);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Fetch assignees from backend using TaskService
  const fetchAssignees = async () => {
    try {
      setIsLoadingAssignees(true);
      const assigneesData = await taskService.getAllAssignees();
      setAssignees(assigneesData || []);
    } catch (error: any) {
      console.error("Error fetching assignees:", error);
      toast.error("Failed to load assignees");
      setAssignees([]);
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  // ========== FIXED LOGIC STARTS HERE ==========
  
  // Get IDs of tasks that are already assigned (to ANY assignee at ANY site)
  const alreadyAssignedTaskIds = useMemo(() => {
    return (tasks || [])
      .filter(task => {
        if (!task) return false;
        
        // A task is "already assigned" if it has a real assignee and site
        const isAssigned = 
          task.assignedTo !== "unassigned" && 
          task.assignedToName !== "Unassigned" &&
          task.siteId !== "unspecified" &&
          task.siteName !== "Unspecified Site";
        
        return isAssigned;
      })
      .map(task => task._id);
  }, [tasks]);

  // Get tasks that are templates/unassigned (available for assignment)
  const availableTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      if (!task) return false;
      
      // A task is available if it's unassigned (template)
      const isUnassigned = 
        task.assignedTo === "unassigned" || 
        task.assignedToName === "Unassigned" ||
        task.siteId === "unspecified" ||
        task.siteName === "Unspecified Site";
      
      return isUnassigned;
    });
  }, [tasks]);

  // Create a map to track which sites already have which tasks assigned
  const getTaskAssignmentsMap = useMemo(() => {
    const assignments = new Map<string, Set<string>>(); // taskKey -> Set of siteIds
    
    (tasks || []).forEach(task => {
      if (!task || task.assignedTo === "unassigned" || task.siteId === "unspecified") {
        return;
      }
      
      // Create a unique key for the task definition (based on its properties)
      const taskKey = `${task.title}_${task.description}_${task.taskType}_${task.priority}`;
      
      if (!assignments.has(taskKey)) {
        assignments.set(taskKey, new Set());
      }
      
      // Add this site to the set of sites where this task is assigned
      assignments.get(taskKey)!.add(task.siteId);
    });
    
    return assignments;
  }, [tasks]);

  // Get sites that already have the selected task assigned
  const getAlreadyAssignedSiteIds = useMemo(() => {
    if (!selectedTaskForAssignment) return [];
    
    // Create a unique key for the selected task
    const selectedTaskKey = `${selectedTaskForAssignment.title}_${selectedTaskForAssignment.description}_${selectedTaskForAssignment.taskType}_${selectedTaskForAssignment.priority}`;
    
    // Get all sites where this exact task is already assigned
    const assignedSites = getTaskAssignmentsMap.get(selectedTaskKey);
    
    return assignedSites ? Array.from(assignedSites) : [];
  }, [selectedTaskForAssignment, getTaskAssignmentsMap]);

  // ========== FIXED LOGIC ENDS HERE ==========

  // Helper functions
  const getAssigneeType = useCallback((assigneeId: string) => {
    const assignee = (assignees || []).find(a => a && a._id === assigneeId);
    return assignee ? assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1) : "Unknown";
  }, [assignees]);

  const getAssigneeName = useCallback((assigneeId: string) => {
    const assignee = (assignees || []).find(a => a && a._id === assigneeId);
    return assignee ? assignee.name : assigneeId;
  }, [assignees]);

  const getSiteName = useCallback((siteId: string) => {
    const site = (sites || []).find(s => s && s._id === siteId);
    return site ? site.name : "Unknown Site";
  }, [sites]);

  const getClientName = useCallback((siteId: string) => {
    const site = (sites || []).find(s => s && s._id === siteId);
    return site ? site.clientName : "Unknown Client";
  }, [sites]);

  const formatDateTime = useCallback((dateTimeString: string) => {
    return taskService.formatDate(dateTimeString);
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    return taskService.getPriorityColor(priority);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    return taskService.getStatusColor(status);
  }, []);

  const getHourlyUpdatesCount = useCallback((task: Task) => {
    return (task.hourlyUpdates || []).length;
  }, []);

  const getAttachmentsCount = useCallback((task: Task) => {
    return (task.attachments || []).length;
  }, []);

  // Helper function to get all assignee names for a task (for grouped or single tasks)
  const getAllAssigneeNames = useCallback((task: Task | GroupedTask): string[] => {
    if (!task) return [];
    
    if (isGroupedTask(task)) {
      // For grouped tasks, get all unique assignee names from the group
      return Array.from(new Set(task._groupItems.map(t => t.assignedToName)));
    } else {
      // For single tasks, just return the assignee name
      return [task.assignedToName];
    }
  }, []);

  // Helper function to get all assignee IDs for a task
  const getAllAssigneeIds = useCallback((task: Task | GroupedTask): string[] => {
    if (!task) return [];
    
    if (isGroupedTask(task)) {
      // For grouped tasks, get all unique assignee IDs from the group
      return Array.from(new Set(task._groupItems.map(t => t.assignedTo)));
    } else {
      // For single tasks, just return the assignee ID
      return [task.assignedTo];
    }
  }, []);

  // Group tasks by title, description, deadline, priority, task type, AND site
  // This ensures tasks at the same site with the same details are grouped together
  const groupTasks = useCallback((taskList: Task[]): (Task | GroupedTask)[] => {
    // Create a map to group tasks
    const groupMap = new Map<string, Task[]>();
    
    (taskList || []).forEach(task => {
      if (!task) return;
      
      // Create a unique key based on task definition AND site
      // This ensures identical tasks at the same site are grouped together
      const groupKey = `${task.title}|${task.description}|${task.deadline}|${task.priority}|${task.taskType}|${task.siteId}`;
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(task);
    });
    
    const result: (Task | GroupedTask)[] = [];
    
    // Process each group
    groupMap.forEach((group, groupKey) => {
      // If only one task in the group, add it as a regular task
      if (group.length === 1) {
        result.push(group[0]);
        return;
      }
      
      // Multiple tasks - create a grouped task
      const mainTask = group[0];
      
      // Get unique values using Sets
      const uniqueAssignees = [...new Set(group.map(t => t.assignedTo))];
      const uniqueAssigneeNames = [...new Set(group.map(t => t.assignedToName))];
      const uniqueSites = [...new Set(group.map(t => t.siteId))];
      const uniqueSiteNames = [...new Set(group.map(t => t.siteName))];
      const uniqueClientNames = [...new Set(group.map(t => t.clientName))];
      
      // Calculate status
      const statuses = group.map(t => t.status);
      const isAllCompleted = statuses.every(s => s === "completed");
      const isSomeInProgress = statuses.some(s => s === "in-progress");
      
      let overallStatus: Task["status"] = "pending";
      if (isAllCompleted) {
        overallStatus = "completed";
      } else if (isSomeInProgress) {
        overallStatus = "in-progress";
      }
      
      // Aggregate attachments and updates
      const allAttachments = group.flatMap(t => t.attachments || []);
      const allHourlyUpdates = group.flatMap(t => t.hourlyUpdates || []);
      
      const groupedTask: GroupedTask = {
        ...mainTask,
        _id: `group-${mainTask._id}-${Date.now()}`,
        _isGrouped: true,
        _groupCount: group.length,
        _groupItems: group,
        _groupedAssignees: uniqueAssignees,
        _groupedAssigneeNames: uniqueAssigneeNames,
        _groupedSites: uniqueSites,
        _groupedSiteNames: uniqueSiteNames,
        _groupedClientNames: uniqueClientNames,
        _overallStatus: overallStatus,
        _totalAttachments: allAttachments.length,
        _totalHourlyUpdates: allHourlyUpdates.length,
        _allAttachments: allAttachments,
        _allHourlyUpdates: allHourlyUpdates
      };
      
      result.push(groupedTask);
    });
    
    return result;
  }, []);

  // Filter tasks with useMemo - Only show assigned tasks (not unassigned/template tasks)
  const filteredTasks = useMemo(() => {
    // First, filter out unassigned/template tasks - only show assigned tasks
    let filtered = (tasks || []).filter(task => {
      if (!task) return false;
      
      // Only show tasks that are actually assigned (not templates)
      const isAssigned = 
        task.assignedTo !== "unassigned" && 
        task.assignedToName !== "Unassigned" &&
        task.siteId !== "unspecified" &&
        task.siteName !== "Unspecified Site";
      
      return isAssigned;
    });
    
    // Filter by site if selected
    if (selectedSite !== "all") {
      filtered = filtered.filter(task => task && task.siteId === selectedSite);
    }
    
    // Filter by search query if exists
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(task => {
        if (!task) return false;
        
        // Search in all relevant fields with OR logic
        const titleMatch = safeString(task.title).toLowerCase().includes(searchLower);
        const descriptionMatch = safeString(task.description).toLowerCase().includes(searchLower);
        const assigneeMatch = safeString(task.assignedToName).toLowerCase().includes(searchLower);
        const siteMatch = safeString(task.siteName).toLowerCase().includes(searchLower);
        const clientMatch = safeString(task.clientName).toLowerCase().includes(searchLower);
        const taskTypeMatch = safeString(task.taskType).toLowerCase().includes(searchLower);
        const priorityMatch = safeString(task.priority).toLowerCase().includes(searchLower);
        const statusMatch = safeString(task.status).toLowerCase().includes(searchLower);
        
        // Also search in assignee type
        const assigneeTypeMatch = getAssigneeType(task.assignedTo).toLowerCase().includes(searchLower);
        
        // Also search for "manager" or "supervisor" in role
        const role = getAssigneeType(task.assignedTo).toLowerCase();
        const roleMatch = role.includes(searchLower);
        
        return titleMatch || descriptionMatch || assigneeMatch || 
               siteMatch || clientMatch || taskTypeMatch || 
               priorityMatch || statusMatch || assigneeTypeMatch || roleMatch;
      });
    }
    
    // Remove duplicates based on task ID
    const uniqueTasks: Task[] = [];
    const taskIds = new Set<string>();
    
    filtered.forEach(task => {
      if (task && !taskIds.has(task._id)) {
        taskIds.add(task._id);
        uniqueTasks.push(task);
      }
    });
    
    // Group the tasks
    return groupTasks(uniqueTasks);
  }, [tasks, searchQuery, selectedSite, getAssigneeType, groupTasks]);

  // Handle add new task
  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Create task object without assignee and site
    const taskData = {
      title: formData.get("task-title") as string,
      description: formData.get("description") as string,
      assignedTo: "unassigned", // Default unassigned
      assignedToName: "Unassigned", // Default unassigned
      priority: formData.get("priority") as "high" | "medium" | "low",
      status: "pending" as const,
      deadline: formData.get("deadline") as string,
      dueDateTime: formData.get("due-datetime") as string,
      siteId: "unspecified", // Default unspecified
      siteName: "Unspecified Site", // Default unspecified
      clientName: "Unspecified Client", // Default unspecified
      taskType: formData.get("task-type") as string || "routine",
      attachments: [],
      hourlyUpdates: [],
      createdBy: "current-user" // This should be replaced with actual user ID from auth context
    };

    try {
      await taskService.createTask(taskData);
      
      toast.success("Task template created successfully! You can now assign it to assignees and sites.");
      setAddTaskDialogOpen(false);
      (e.target as HTMLFormElement).reset();
      
      // Refresh tasks list
      await fetchTasks();
      
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error(error.message || "Failed to create task");
    }
  };

  // Handle assign task
  const handleAssignTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedTaskForAssignment) {
      toast.error("Please select a task to assign");
      return;
    }

    if (selectedAssignees.length === 0) {
      toast.error("Please select at least one assignee");
      return;
    }

    if (selectedSites.length === 0) {
      toast.error("Please select at least one site");
      return;
    }

    // Get selected assignee objects
    const selectedAssigneeObjects = assignees.filter(assignee => 
      selectedAssignees.includes(assignee._id)
    );

    if (selectedAssigneeObjects.length === 0) {
      toast.error("Selected assignees not found");
      return;
    }

    // Get selected sites (already filtered by SiteMultiSelect)
    const selectedSiteObjects = sites.filter(site => 
      selectedSites.includes(site._id)
    );

    if (selectedSiteObjects.length === 0) {
      toast.error("No sites selected");
      return;
    }

    // Create tasks for each combination of assignee and site
    const tasksToCreate: any[] = [];
    const existingTasks: string[] = []; // Track already existing tasks
    
    selectedAssigneeObjects.forEach(assignee => {
      selectedSiteObjects.forEach(site => {
        // Check if this exact task already exists for this assignee at this site
        const taskKey = `${selectedTaskForAssignment.title}_${selectedTaskForAssignment.description}_${selectedTaskForAssignment.taskType}_${selectedTaskForAssignment.priority}`;
        const assignedSites = getTaskAssignmentsMap.get(taskKey);
        
        if (assignedSites && assignedSites.has(site._id)) {
          // Task already exists at this site (for any assignee)
          existingTasks.push(`${assignee.name} at ${site.name}`);
          return; // Skip creating duplicate task
        }
        
        const taskData = {
          title: selectedTaskForAssignment.title,
          description: selectedTaskForAssignment.description,
          assignedTo: assignee._id,
          assignedToName: assignee.name,
          priority: selectedTaskForAssignment.priority,
          status: "pending" as const,
          deadline: selectedTaskForAssignment.deadline,
          dueDateTime: selectedTaskForAssignment.dueDateTime || new Date().toISOString(),
          siteId: site._id,
          siteName: site.name,
          clientName: site.clientName,
          taskType: selectedTaskForAssignment.taskType || "routine",
          attachments: selectedTaskForAssignment.attachments || [],
          hourlyUpdates: [],
          createdBy: "current-user"
        };
        
        tasksToCreate.push(taskData);
      });
    });

    if (tasksToCreate.length === 0) {
      if (existingTasks.length > 0) {
        toast.warning(`All selected sites already have this task assigned. ${existingTasks.length} combination(s) skipped.`);
      } else {
        toast.warning("No new tasks to create.");
      }
      return;
    }

    try {
      const createMultipleTasksRequest: CreateMultipleTasksRequest = {
        tasks: tasksToCreate,
        createdBy: "current-user"
      };

      await taskService.createMultipleTasks(createMultipleTasksRequest);
      
      const managerCount = selectedAssigneeObjects.filter(a => a.role === 'manager').length;
      const supervisorCount = selectedAssigneeObjects.filter(a => a.role === 'supervisor').length;
      
      let successMessage = `Successfully created ${tasksToCreate.length} new task(s) for ${selectedAssignees.length} assignee(s) across ${selectedSites.length} site(s)!`;
      
      if (existingTasks.length > 0) {
        successMessage += ` ${existingTasks.length} combination(s) were skipped (already assigned).`;
      }
      
      toast.success(successMessage);
      
      // Reset form
      setAssignTaskDialogOpen(false);
      setSelectedSites([]);
      setSelectedAssignees([]);
      setSelectedTaskForAssignment(null);
      setAssigneeType("all");
      
      // Refresh tasks list
      await fetchTasks();
      
    } catch (error: any) {
      console.error("Error creating tasks:", error);
      toast.error(error.message || "Failed to assign tasks");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await taskService.deleteTask(taskId);
      toast.success("Task deleted successfully!");
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error(error.message || "Failed to delete task");
    }
  };

  const handleUpdateStatus = async (taskId: string, status: Task["status"]) => {
    try {
      const updateData: UpdateTaskStatusRequest = { status };
      await taskService.updateTaskStatus(taskId, updateData);
      toast.success("Task status updated!");
      await fetchTasks();
    } catch (error: any) {
      console.error("Error updating task status:", error);
      toast.error(error.message || "Failed to update task status");
    }
  };

  // Handle update status for grouped tasks
  const handleUpdateGroupStatus = async (groupedTask: GroupedTask, status: Task["status"]) => {
    try {
      // Update all tasks in the group
      const updatePromises = groupedTask._groupItems.map((task: Task) => 
        taskService.updateTaskStatus(task._id, { status })
      );
      
      await Promise.all(updatePromises);
      toast.success(`Updated status for ${groupedTask._groupCount} tasks!`);
      await fetchTasks();
    } catch (error: any) {
      console.error("Error updating group status:", error);
      toast.error(error.message || "Failed to update tasks");
    }
  };

  // Handle delete for grouped tasks
  const handleDeleteGroup = async (groupedTask: GroupedTask) => {
    if (!confirm(`Are you sure you want to delete ${groupedTask._groupCount} tasks?`)) {
      return;
    }

    try {
      // Delete all tasks in the group
      const deletePromises = groupedTask._groupItems.map((task: Task) => 
        taskService.deleteTask(task._id)
      );
      
      await Promise.all(deletePromises);
      toast.success(`Deleted ${groupedTask._groupCount} tasks successfully!`);
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting tasks:", error);
      toast.error(error.message || "Failed to delete tasks");
    }
  };

  const handleAddHourlyUpdate = async (taskId: string) => {
    if (!hourlyUpdateText.trim()) {
      toast.error("Please enter an update");
      return;
    }

    try {
      const updateData: AddHourlyUpdateRequest = {
        content: hourlyUpdateText,
        submittedBy: "current-user" // Replace with actual user ID
      };
      
      await taskService.addHourlyUpdate(taskId, updateData);
      setHourlyUpdateText("");
      toast.success("Hourly update added!");
      await fetchTasks();
      setShowUpdatesDialog(false);
    } catch (error: any) {
      console.error("Error adding hourly update:", error);
      toast.error(error.message || "Failed to add update");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (files.length === 1) {
        await taskService.uploadAttachment(taskId, files[0]);
      } else {
        await taskService.uploadMultipleAttachments(taskId, Array.from(files));
      }
      
      toast.success(`${files.length} file(s) uploaded successfully!`);
      await fetchTasks();
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    }
  };

  const handleDeleteAttachment = async (taskId: string, attachmentId: string) => {
    try {
      await taskService.deleteAttachment(taskId, attachmentId);
      toast.success("Attachment deleted!");
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast.error(error.message || "Failed to delete attachment");
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      await taskService.downloadAttachment(attachment);
      toast.success("Attachment downloaded!");
    } catch (error: any) {
      console.error("Error downloading attachment:", error);
      toast.error(error.message || "Failed to download attachment");
    }
  };

  const handlePreviewAttachment = (attachment: Attachment) => {
    taskService.previewAttachment(attachment);
  };

  // Memoized AddTaskDialog
  const AddTaskDialog = useMemo(() => {
    return ({ open, onOpenChange, onSubmit }: { 
      open: boolean; 
      onOpenChange: (open: boolean) => void;
      onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    }) => (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="default" className="ml-2">
            <Plus className="mr-2 h-4 w-4" />
            Add New Task
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Task Title" id="task-title" required>
              <Input id="task-title" name="task-title" placeholder="Enter task title" required />
            </FormField>

            <FormField label="Description" id="description" required>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Enter task description" 
                rows={3}
                required 
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Priority" id="priority" required>
                <Select name="priority" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Task Type" id="task-type">
                <Select name="task-type">
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="safety">Safety Check</SelectItem>
                    <SelectItem value="equipment">Equipment Check</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Start Date" id="start-date">
                <Input 
                  id="start-date" 
                  name="start-date" 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </FormField>

              <FormField label="Deadline Date" id="deadline" required>
                <Input 
                  id="deadline" 
                  name="deadline" 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  required 
                />
              </FormField>
            </div>

            <FormField label="Due Date & Time" id="due-datetime" required>
              <Input 
                id="due-datetime" 
                name="due-datetime" 
                type="datetime-local" 
                min={new Date().toISOString().slice(0, 16)}
                required 
              />
            </FormField>

            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Task Template
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }, []);

  // Memoized AssignTaskDialog
  const AssignTaskDialog = useMemo(() => {
    const selectedAssigneeObjects = assignees.filter(assignee => 
      selectedAssignees.includes(assignee._id)
    );
    const managerCount = selectedAssigneeObjects.filter(a => a.role === 'manager').length;
    const supervisorCount = selectedAssigneeObjects.filter(a => a.role === 'supervisor').length;

    return ({ open, onOpenChange, onSubmit }: { 
      open: boolean; 
      onOpenChange: (open: boolean) => void;
      onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    }) => {
      // Get IDs of sites that already have the selected task
      const alreadyAssignedSiteIds = getAlreadyAssignedSiteIds;
      
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Target className="mr-2 h-4 w-4" />
              Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Task Selection Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-medium">Select Task Template</span>
                  <Badge variant="outline" className="ml-2">
                    {selectedTaskForAssignment ? "1 selected" : "Not selected"}
                  </Badge>
                </div>
                
                <TaskCombobox 
                  tasks={availableTasks} // Only show available (unassigned) tasks
                  selectedTask={selectedTaskForAssignment}
                  onSelectTask={(task) => {
                    setSelectedTaskForAssignment(task);
                    setSelectedSites([]); // Clear site selection when task changes
                  }}
                  isLoading={isLoading}
                  alreadyAssignedTaskIds={alreadyAssignedTaskIds}
                />

                {selectedTaskForAssignment && (
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="font-medium">Selected Task Template:</div>
                        <div className="text-sm text-muted-foreground">
                          {safeString(selectedTaskForAssignment.title)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTaskForAssignment(null);
                          setSelectedSites([]); // Clear selected sites when task changes
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      This task template will be assigned to the selected sites with the selected assignees.
                    </div>
                  </div>
                )}
              </div>

              {/* Assignee Selection Section */}
              <AssigneeMultiSelect 
                assignees={assignees}
                selectedAssignees={selectedAssignees}
                onSelectAssignees={setSelectedAssignees}
                assigneeType={assigneeType}
                onAssigneeTypeChange={setAssigneeType}
                isLoading={isLoadingAssignees}
                selectedSites={selectedSites}
                sites={sites}
              />

              {/* Site Selection Section - Only show if task is selected */}
              {selectedTaskForAssignment && (
                <SiteMultiSelect 
                  sites={sites}
                  selectedSites={selectedSites}
                  onSelectSites={setSelectedSites}
                  isLoading={isLoadingSites}
                  alreadyAssignedSiteIds={alreadyAssignedSiteIds}
                />
              )}

              {/* Assignment Summary */}
              <div className="bg-primary/5 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="font-medium">Assignment Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Task Template</div>
                    <div className="font-medium flex items-center gap-2">
                      {selectedTaskForAssignment ? (
                        <>
                          <Briefcase className="h-3 w-3" />
                          <span className="truncate">{safeString(selectedTaskForAssignment.title)}</span>
                        </>
                      ) : (
                        <span className="text-amber-600">Not selected</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Assignees Selected</div>
                    <div className="font-medium flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {selectedAssignees.length > 0 ? (
                        <>
                          {selectedAssignees.length} assignee(s)
                          <div className="flex gap-1 ml-2">
                            {managerCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {managerCount} Manager{managerCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {supervisorCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {supervisorCount} Supervisor{supervisorCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-amber-600">Not selected</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Available Sites</div>
                    <div className="font-medium flex items-center gap-2">
                      <Building className="h-3 w-3" />
                      {selectedTaskForAssignment ? (
                        <>
                          {sites.length - alreadyAssignedSiteIds.length} available site(s)
                          {alreadyAssignedSiteIds.length > 0 && (
                            <Badge variant="outline" className="text-xs ml-1 bg-amber-50 text-amber-700">
                              {alreadyAssignedSiteIds.length} already assigned
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-amber-600">Select a task first</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Tasks to Create</div>
                    <div className="font-medium">
                      {selectedTaskForAssignment && selectedAssignees.length > 0 && selectedSites.length > 0 
                        ? `${selectedAssignees.length} assignees × ${selectedSites.length} sites = ${selectedAssignees.length * selectedSites.length} tasks`
                        : "Not calculated"
                      }
                    </div>
                  </div>
                </div>

                {/* Detailed Preview */}
                {selectedTaskForAssignment && selectedAssignees.length > 0 && selectedSites.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Task Distribution Preview:</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• {selectedAssignees.length} assignee(s) will each receive this task</div>
                      <div>• Task will be assigned to {selectedSites.length} site(s)</div>
                      <div>• Total: {selectedAssignees.length * selectedSites.length} new task(s) will be created</div>
                      {alreadyAssignedSiteIds.length > 0 && (
                        <div className="text-amber-600">
                          • {alreadyAssignedSiteIds.length} site(s) already have this task and are not shown
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset and Submit Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedTaskForAssignment(null);
                    setSelectedAssignees([]);
                    setSelectedSites([]);
                    setAssigneeType("all");
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reset All
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={
                    !selectedTaskForAssignment ||
                    selectedAssignees.length === 0 || 
                    selectedSites.length === 0
                  }
                >
                  <Target className="mr-2 h-4 w-4" />
                  {!selectedTaskForAssignment ? "Select a task" :
                   selectedAssignees.length === 0 ? "Select at least one assignee" :
                   selectedSites.length === 0 ? "Select at least one site" :
                   `Create ${selectedAssignees.length * selectedSites.length} Task(s)`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      );
    };
  }, [
    assignees,
    assigneeType,
    selectedTaskForAssignment,
    selectedAssignees,
    selectedSites,
    isLoading,
    isLoadingAssignees,
    isLoadingSites,
    alreadyAssignedTaskIds,
    availableTasks,
    getAlreadyAssignedSiteIds,
    sites
  ]);

  // Memoized HourlyUpdatesDialog
  const HourlyUpdatesDialog = useMemo(() => {
    return ({ task, open, onOpenChange }: { 
      task: Task; 
      open: boolean; 
      onOpenChange: (open: boolean) => void;
    }) => {
      const hourlyUpdates = task.hourlyUpdates || [];
      
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Hourly Updates for: {task.title || "Untitled Task"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Assignee: {task.assignedToName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Site: {task.siteName}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {hourlyUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hourly updates yet
                  </div>
                ) : (
                  hourlyUpdates.map((update, index) => (
                    <div key={update.id || `update-${index}`} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{getAssigneeName(update.submittedBy)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(update.timestamp)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Update #{hourlyUpdates.length - index}
                        </Badge>
                      </div>
                      <p className="text-sm">{update.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <Textarea
                  placeholder="Add a new hourly update..."
                  value={hourlyUpdateText}
                  onChange={(e) => setHourlyUpdateText(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <Button 
                  onClick={() => handleAddHourlyUpdate(task._id)}
                  className="w-full"
                >
                  Add Hourly Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };
  }, [hourlyUpdateText, handleAddHourlyUpdate, getAssigneeName, formatDateTime]);

  // Memoized AttachmentsDialog
  const AttachmentsDialog = useMemo(() => {
    return ({ task, open, onOpenChange }: { 
      task: Task; 
      open: boolean; 
      onOpenChange: (open: boolean) => void;
    }) => {
      const attachments = task.attachments || [];
      
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments for: {task.title || "Untitled Task"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{task.assignedToName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="text-sm">{task.siteName}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {attachments.length} file(s) attached
                </span>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Files
                      <Input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, task._id)}
                      />
                    </div>
                  </Button>
                </label>
              </div>
              
              <div className="space-y-3">
                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attachments yet
                  </div>
                ) : (
                  attachments.map((attachment) => (
                    <div key={attachment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{attachment.filename || "Unnamed file"}</div>
                            <div className="text-xs text-muted-foreground">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : "Unknown size"} • {formatDateTime(attachment.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewAttachment(attachment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(task._id, attachment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };
  }, [handleFileUpload, handleDeleteAttachment, handleDownloadAttachment, handlePreviewAttachment, formatDateTime]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>All Tasks</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTasks.length} assigned task(s) • 
              {filteredTasks.filter(task => !isGroupedTask(task)).length} individual task(s) • 
              {filteredTasks.filter(task => isGroupedTask(task)).length} grouped task(s)
            </p>
          </div>
          <div className="flex gap-2">
            {AddTaskDialog({
              open: addTaskDialogOpen,
              onOpenChange: setAddTaskDialogOpen,
              onSubmit: handleAddTask
            })}
            {AssignTaskDialog({
              open: assignTaskDialogOpen,
              onOpenChange: setAssignTaskDialogOpen,
              onSubmit: handleAssignTask
            })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery} 
                  placeholder="Search assigned tasks by title, description, assignee, site, client, type, priority, status..." 
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {(sites || []).map(site => (
                      <SelectItem key={site._id} value={site._id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Site & Client</TableHead>
                  <TableHead>Assignee(s) & Role(s)</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date & Time</TableHead>
                  <TableHead>Updates</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery || selectedSite !== "all" 
                        ? "No assigned tasks match your search criteria" 
                        : "No tasks assigned yet. Create a task template and assign it to assignees!"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => {
                    const isGrouped = isGroupedTask(task);
                    
                    return (
                      <TableRow key={task._id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{task.title || "Untitled Task"}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {task.description || "No description"}
                            </div>
                            {isGrouped && (
                              <div className="flex items-center gap-1 mt-1">
                                <Layers className="h-3 w-3 text-primary" />
                                <Badge variant="outline" className="text-xs">
                                  {task._groupCount} task(s) at this site
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span className="font-medium">{task.siteName}</span>
                              {isGrouped && task._groupedSites && task._groupedSites.length > 1 && (
                                <Badge variant="outline" className="text-xs ml-1">
                                  {task._groupedSites.length} sites
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {task.clientName}
                            </div>
                            {/* Show if there are multiple clients in the group */}
                            {isGrouped && task._groupedClientNames && task._groupedClientNames.length > 1 && (
                              <div className="text-xs text-amber-600 mt-1">
                                Multiple clients
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              {isGrouped ? (
                                <Users className="h-4 w-4 text-muted-foreground mt-1" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground mt-1" />
                              )}
                              <div className="flex-1">
                                {isGrouped ? (
                                  <>
                                    {/* Display multiple assignees for grouped tasks */}
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      {getAllAssigneeNames(task).slice(0, 3).map((name, index) => (
                                        <Badge 
                                          key={index} 
                                          variant="secondary" 
                                          className="text-xs flex items-center gap-1"
                                        >
                                          <User className="h-3 w-3" />
                                          {name}
                                        </Badge>
                                      ))}
                                      {getAllAssigneeNames(task).length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{getAllAssigneeNames(task).length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                    {/* Show role distribution */}
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <span>👨‍💼</span>
                                        <span>
                                          {getAllAssigneeIds(task).filter(id => getAssigneeType(id) === 'Manager').length} Managers
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span>👨‍🔧</span>
                                        <span>
                                          {getAllAssigneeIds(task).filter(id => getAssigneeType(id) === 'Supervisor').length} Supervisors
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Single assignee display */}
                                    <div className="font-medium">{task.assignedToName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {getAssigneeType(task.assignedTo)}
                                      </Badge>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority) as "default" | "destructive" | "outline" | "secondary"}>
                            {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(isGrouped ? task._overallStatus : task.status) as "default" | "destructive" | "outline" | "secondary"}>
                            {isGrouped ? task._overallStatus : task.status}
                            {isGrouped && (
                              <span className="ml-1 text-xs">
                                ({task._groupItems.filter((t: Task) => t.status === task._overallStatus).length}/{task._groupCount})
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(task.deadline)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {task.dueDateTime ? formatDateTime(task.dueDateTime) : "No due time"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedTask(task);
                              setShowUpdatesDialog(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            {isGrouped ? task._totalHourlyUpdates : getHourlyUpdatesCount(task)}
                            <span className="sr-only">View updates</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedTask(task);
                              setShowAttachmentsDialog(true);
                            }}
                          >
                            <Paperclip className="h-4 w-4" />
                            {isGrouped ? task._totalAttachments : getAttachmentsCount(task)}
                            <span className="sr-only">View attachments</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {/* View Button */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSelectedTask(task);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Complete Button - Only show if not already completed */}
                            {(isGrouped ? task._overallStatus !== "completed" : task.status !== "completed") && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => isGrouped ? handleUpdateGroupStatus(task, "completed") : handleUpdateStatus(task._id, "completed")}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Delete Button */}
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => isGrouped ? handleDeleteGroup(task) : handleDeleteTask(task._id)}
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

      {/* Dialogs */}
      {selectedTask && (
        <>
          <ViewTaskDialog
            task={selectedTask}
            open={showViewDialog}
            onOpenChange={setShowViewDialog}
            getAssigneeType={getAssigneeType}
            getSiteName={getSiteName}
            getClientName={getClientName}
            formatDateTime={formatDateTime}
            getAllAssigneeNames={getAllAssigneeNames}
            getAllAssigneeIds={getAllAssigneeIds}
          />
          
          {!isGroupedTask(selectedTask) && HourlyUpdatesDialog({
            task: selectedTask,
            open: showUpdatesDialog,
            onOpenChange: setShowUpdatesDialog
          })}
          
          {!isGroupedTask(selectedTask) && AttachmentsDialog({
            task: selectedTask,
            open: showAttachmentsDialog,
            onOpenChange: setShowAttachmentsDialog
          })}
        </>
      )}
    </div>
  );
};
 
export default TasksSection;