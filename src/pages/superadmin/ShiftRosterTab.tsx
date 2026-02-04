import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Clock, Users, Calendar, Plus, CheckCircle } from "lucide-react";
import { Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { shiftService } from "@/services/ShiftService";

// Interfaces (can also be imported from types file)
interface Shift {
  _id: string;
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  employees: string[];
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  status: string;
}

const ShiftRosterTab = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState({
    shifts: false,
    employees: false,
    creating: false,
    deleting: false,
    assigning: false
  });
  const [newShift, setNewShift] = useState({
    name: "",
    startTime: "06:00",
    endTime: "14:00",
    employees: [] as string[]
  });

  // Fetch shifts and employees from backend
  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

  const fetchShifts = async () => {
    setLoading(prev => ({ ...prev, shifts: true }));
    try {
      const shiftsData = await shiftService.getAllShifts();
      setShifts(shiftsData);
    } catch (error: any) {
      console.error("Error fetching shifts:", error);
      toast.error(`Error fetching shifts: ${error.message}. Make sure backend is running on port 5001.`);
    } finally {
      setLoading(prev => ({ ...prev, shifts: false }));
    }
  };

  const fetchEmployees = async () => {
    setLoading(prev => ({ ...prev, employees: true }));
    try {
      const activeEmployees = await shiftService.getActiveEmployees();
      setEmployees(activeEmployees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error(`Error fetching employees: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  const handleAddShift = async () => {
    if (!newShift.name.trim()) {
      toast.error("Please enter shift name");
      return;
    }

    setLoading(prev => ({ ...prev, creating: true }));
    try {
      const createdShift = await shiftService.createShift(newShift);
      setShifts(prev => [...prev, createdShift]);
      setNewShift({ 
        name: "", 
        startTime: "06:00", 
        endTime: "14:00", 
        employees: [] 
      });
      toast.success("Shift created successfully!");
    } catch (error: any) {
      console.error("Error creating shift:", error);
      toast.error(`Error creating shift: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, creating: false }));
    }
  };

  const handleAssignEmployee = async (shiftId: string, employeeId: string) => {
    setLoading(prev => ({ ...prev, assigning: true }));
    try {
      await shiftService.assignEmployeeToShift(shiftId, employeeId);
      fetchShifts(); // Refresh shifts
      toast.success("Employee assigned successfully!");
    } catch (error: any) {
      console.error("Error assigning employee:", error);
      toast.error(`Error assigning employee: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, assigning: false }));
    }
  };

  const handleRemoveEmployee = async (shiftId: string, employeeId: string) => {
    try {
      await shiftService.removeEmployeeFromShift(shiftId, employeeId);
      fetchShifts(); // Refresh shifts
      toast.success("Employee removed successfully!");
    } catch (error: any) {
      console.error("Error removing employee:", error);
      toast.error(`Error removing employee: ${error.message}`);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    setLoading(prev => ({ ...prev, deleting: true }));
    try {
      await shiftService.deleteShift(shiftId);
      setShifts(prev => prev.filter(shift => shift._id !== shiftId));
      toast.success("Shift deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting shift:", error);
      toast.error(`Error deleting shift: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  };

  const refreshAll = async () => {
    setLoading(prev => ({ ...prev, shifts: true, employees: true }));
    try {
      await Promise.all([fetchShifts(), fetchEmployees()]);
      toast.success("Data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Error refreshing data");
    } finally {
      setLoading(prev => ({ ...prev, shifts: false, employees: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.employeeId === employeeId);
    return emp ? emp.name : employeeId;
  };

  const getEmployeeDetails = (employeeId: string) => {
    const emp = employees.find(e => e.employeeId === employeeId);
    return emp;
  };

  const getAvailableEmployeesForShift = (shift: Shift) => {
    return employees.filter(emp => !shift.employees.includes(emp.employeeId));
  };

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold text-gray-800">Shift & Roster Management</CardTitle>
              <p className="text-sm text-gray-600">Create, manage and assign shifts to employees</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex gap-2">
                <Badge variant="secondary" className="px-3 py-1.5">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'}
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  {employees.length} Employees
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshAll}
                disabled={loading.shifts || loading.employees}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading.shifts ? 'animate-spin' : ''}`} />
                Refresh All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-2">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Shift
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Manage Shifts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Create Shift Section */}
                <Card className="border shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Create New Shift
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Step 1</Badge>
                      <span className="text-xs text-gray-600">Define shift details and assign employees</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-2.5">
                        <Label htmlFor="shiftName" className="font-semibold flex items-center gap-2">
                          Shift Name
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="shiftName" 
                          placeholder="e.g., Morning Shift, Night Shift, Weekend Shift" 
                          value={newShift.name}
                          onChange={(e) => setNewShift({...newShift, name: e.target.value})}
                          disabled={loading.creating}
                          className="h-11 bg-white border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                          <Label htmlFor="startTime" className="font-semibold flex items-center gap-2">
                            Start Time
                            <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              id="startTime" 
                              type="time" 
                              value={newShift.startTime}
                              onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                              disabled={loading.creating}
                              className="h-11 pl-10 bg-white border-gray-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <Label htmlFor="endTime" className="font-semibold flex items-center gap-2">
                            End Time
                            <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              id="endTime" 
                              type="time" 
                              value={newShift.endTime}
                              onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                              disabled={loading.creating}
                              className="h-11 pl-10 bg-white border-gray-300"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="space-y-3">
                        <Label className="font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Assign Employees (Optional)
                        </Label>
                        <Select 
                          onValueChange={(value) => {
                            if (!newShift.employees.includes(value)) {
                              setNewShift({
                                ...newShift, 
                                employees: [...newShift.employees, value]
                              });
                            }
                          }}
                          disabled={loading.creating || loading.employees}
                        >
                          <SelectTrigger className="h-11 bg-white border-gray-300">
                            <SelectValue placeholder="Select employees to assign" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {loading.employees ? (
                              <div className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : employees.length === 0 ? (
                              <div className="text-center p-4 text-sm text-gray-500">
                                <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                                No active employees found
                              </div>
                            ) : (
                              employees.map(emp => (
                                <SelectItem 
                                  key={emp._id} 
                                  value={emp.employeeId}
                                  disabled={newShift.employees.includes(emp.employeeId)}
                                  className="py-2.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="font-medium">{emp.name}</span>
                                    <Badge variant="outline" className="ml-auto text-xs">
                                      {emp.department}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">{emp.employeeId}</div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        
                        {newShift.employees.length > 0 && (
                          <div className="space-y-3 mt-4">
                            <Label className="text-sm font-semibold text-gray-700">
                              Selected Employees ({newShift.employees.length})
                            </Label>
                            <div className="space-y-2 max-h-48 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                              {newShift.employees.map(empId => {
                                const emp = getEmployeeDetails(empId);
                                return (
                                  <div key={empId} className="flex justify-between items-center p-3 border rounded-md bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <div className="font-medium">{emp?.name || empId}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs text-gray-500">{empId}</span>
                                          {emp?.department && (
                                            <Badge variant="secondary" className="text-xs">
                                              {emp.department}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 hover:bg-red-50"
                                      onClick={() => setNewShift({
                                        ...newShift,
                                        employees: newShift.employees.filter(id => id !== empId)
                                      })}
                                      disabled={loading.creating}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleAddShift} 
                      disabled={loading.creating || !newShift.name.trim()}
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      size="lg"
                    >
                      {loading.creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Shift...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Shift
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Current Shifts Preview */}
                <Card className="border shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-700" />
                      Current Shifts Preview
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {loading.shifts ? "Loading..." : `${shifts.length} active shifts`}
                      </Badge>
                      {loading.employees && (
                        <Badge variant="secondary" className="text-xs animate-pulse">
                          Loading Employees...
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading.shifts ? (
                      <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-600">Loading shifts...</p>
                      </div>
                    ) : shifts.length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed rounded-xl bg-gradient-to-b from-gray-50 to-white">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                          <Clock className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No shifts created yet</h3>
                        <p className="text-gray-600 mb-6">Create your first shift to get started</p>
                        <Button 
                          variant="outline" 
                          onClick={refreshAll}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh Data
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {shifts.slice(0, 3).map((shift) => (
                          <div key={shift._id} className="border rounded-xl p-4 space-y-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-lg text-gray-800">{shift.name}</h4>
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {shift.startTime} - {shift.endTime}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Created {formatDate(shift.createdAt)}
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-gray-50">
                                <Users className="h-3 w-3 mr-1" />
                                {shift.employees.length} assigned
                              </Badge>
                            </div>
                            
                            {shift.employees.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Assigned Team</Label>
                                <div className="space-y-2">
                                  {shift.employees.slice(0, 2).map(empId => {
                                    const emp = getEmployeeDetails(empId);
                                    return (
                                      <div key={empId} className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                          <Users className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm truncate">{emp?.name || empId}</div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500 truncate">{empId}</span>
                                            {emp?.department && (
                                              <Badge variant="secondary" className="text-xs">
                                                {emp.department}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {shift.employees.length > 2 && (
                                    <div className="text-center py-2 text-sm text-gray-500">
                                      + {shift.employees.length - 2} more employees
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {shifts.length > 3 && (
                          <div className="text-center pt-4 border-t">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                              View all {shifts.length} shifts →
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              <Card className="border shadow-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-700" />
                      All Shifts Management
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="px-3 py-1.5">
                        Total: {shifts.length} shifts
                      </Badge>
                      <Badge variant="outline" className="px-3 py-1.5">
                        Employees: {employees.length}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading.shifts ? (
                    <div className="flex flex-col items-center justify-center h-96">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                      <p className="text-gray-600">Loading shift data...</p>
                    </div>
                  ) : shifts.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed rounded-xl bg-gradient-to-b from-gray-50 to-white">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock className="h-10 w-10 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">No shifts available</h3>
                      <p className="text-gray-600 mb-8 max-w-md mx-auto">
                        Create your first shift to start managing employee schedules and assignments.
                      </p>
                      <Button 
                        onClick={() => document.querySelector('[data-value="create"]')?.click()}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        Create First Shift
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {shifts.map((shift) => (
                        <Card key={shift._id} className="border shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg font-bold text-gray-800">{shift.name}</CardTitle>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteShift(shift._id)}
                                disabled={loading.deleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                <Clock className="h-3 w-3 mr-1" />
                                {shift.startTime} - {shift.endTime}
                              </Badge>
                              <Badge variant="outline" className="bg-gray-50">
                                <Users className="h-3 w-3 mr-1" />
                                {shift.employees.length}
                              </Badge>
                            </div>
                          </CardHeader>
                          <Separator />
                          <CardContent className="pt-4 space-y-4">
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Created</span>
                                <span className="font-medium">{formatDate(shift.createdAt)}</span>
                              </div>
                              
                              {shift.employees.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-gray-700">Assigned Employees</Label>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {shift.employees.map(empId => {
                                      const emp = getEmployeeDetails(empId);
                                      return (
                                        <div key={empId} className="flex justify-between items-center p-2 border rounded bg-gray-50 hover:bg-gray-100">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                            <div className="min-w-0">
                                              <div className="text-sm font-medium truncate">{emp?.name || empId}</div>
                                              <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-500 truncate">{empId}</span>
                                                {emp?.department && (
                                                  <Badge variant="outline" className="text-xs">
                                                    {emp.department}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-red-50"
                                            onClick={() => handleRemoveEmployee(shift._id, empId)}
                                            disabled={loading.assigning}
                                          >
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              <div className="pt-2">
                                <Select 
                                  onValueChange={(value) => handleAssignEmployee(shift._id, value)}
                                  disabled={loading.shifts || loading.employees || loading.assigning}
                                >
                                  <SelectTrigger className="h-9 bg-white">
                                    <SelectValue placeholder="Add employee" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {loading.employees ? (
                                      <div className="flex justify-center p-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      </div>
                                    ) : employees.length === 0 ? (
                                      <div className="text-center p-4 text-sm text-gray-500">
                                        No employees available
                                      </div>
                                    ) : (
                                      getAvailableEmployeesForShift(shift).map(emp => (
                                        <SelectItem key={emp._id} value={emp.employeeId}>
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span>{emp.name}</span>
                                            <Badge variant="outline" className="ml-auto text-xs">
                                              {emp.department}
                                            </Badge>
                                          </div>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftRosterTab;