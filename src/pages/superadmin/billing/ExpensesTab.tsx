import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Eye, Edit, Search, Receipt, ChevronLeft, ChevronRight, List, Grid, Trash2 } from "lucide-react";
import { sites, expenseCategories, getStatusColor, getExpenseTypeColor, formatCurrency } from "../Billing";
import { toast } from "sonner";

interface Expense {
  _id: string;
  expenseId: string;
  category: string;
  description: string;
  amount: number;
  baseAmount: number;
  gst: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  vendor: string;
  paymentMethod: string;
  site: string;
  expenseType: "operational" | "office" | "other";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpensesTabProps {
  userId?: string; // Add userId prop for createdBy field
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ userId = "user-001" }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseViewDialogOpen, setExpenseViewDialogOpen] = useState(false);
  const [expenseEditDialogOpen, setExpenseEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<"all" | "operational" | "office" | "other">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [reportPeriod, setReportPeriod] = useState<"weekly" | "monthly">("monthly");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [siteWiseExpenses, setSiteWiseExpenses] = useState<{ [key: string]: { operational: number, office: number, other: number, total: number } }>({});

  // API Base URL
  const API_BASE_URL = "http://localhost:5001/api";

  // Fetch expenses from backend
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/expenses?page=${currentPage}&limit=${itemsPerPage}&expenseType=${expenseTypeFilter === 'all' ? '' : expenseTypeFilter}&search=${searchTerm}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch expenses');
      
      const data = await response.json();
      if (data.success) {
        setExpenses(data.data);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      toast.error("Failed to fetch expenses");
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch site-wise statistics
  const fetchExpenseStats = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/expenses/stats?period=${reportPeriod}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch expense stats');
      
      const data = await response.json();
      if (data.success) {
        // Transform data for frontend
        const siteStats: { [key: string]: { operational: number, office: number, other: number, total: number } } = {};
        
        data.data.siteStats.forEach((stat: any) => {
          siteStats[stat._id] = {
            operational: stat.operational || 0,
            office: stat.office || 0,
            other: stat.other || 0,
            total: stat.total || 0
          };
        });
        
        // Ensure all sites are present
        sites.forEach(site => {
          if (!siteStats[site]) {
            siteStats[site] = { operational: 0, office: 0, other: 0, total: 0 };
          }
        });
        
        setSiteWiseExpenses(siteStats);
      }
    } catch (error) {
      console.error("Error fetching expense stats:", error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchExpenseStats();
  }, [currentPage, expenseTypeFilter, searchTerm, reportPeriod]);

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      
      const baseAmount = parseFloat(formData.get("amount") as string);
      const expenseType = formData.get("expenseType") as "operational" | "office" | "other";
      
      const expenseData = {
        category: formData.get("category") as string,
        description: formData.get("description") as string,
        baseAmount: baseAmount,
        date: formData.get("date") as string,
        vendor: formData.get("vendor") as string,
        paymentMethod: formData.get("paymentMethod") as string,
        site: formData.get("site") as string,
        expenseType: expenseType,
        createdBy: userId
      };
      
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData)
      });
      
      if (!response.ok) throw new Error('Failed to add expense');
      
      const data = await response.json();
      if (data.success) {
        toast.success("Expense added successfully");
        setExpenseDialogOpen(false);
        fetchExpenses(); // Refresh the list
        fetchExpenseStats(); // Refresh stats
      }
    } catch (error) {
      toast.error("Failed to add expense");
      console.error("Error adding expense:", error);
    }
  };

  const handleEditExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedExpense) return;
    
    try {
      const formData = new FormData(e.currentTarget);
      const baseAmount = parseFloat(formData.get("amount") as string);
      const expenseType = formData.get("expenseType") as "operational" | "office" | "other";
      
      const expenseData = {
        category: formData.get("category") as string,
        description: formData.get("description") as string,
        baseAmount: baseAmount,
        date: formData.get("date") as string,
        vendor: formData.get("vendor") as string,
        paymentMethod: formData.get("paymentMethod") as string,
        site: formData.get("site") as string,
        expenseType: expenseType
      };
      
      const response = await fetch(`${API_BASE_URL}/expenses/${selectedExpense._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData)
      });
      
      if (!response.ok) throw new Error('Failed to update expense');
      
      const data = await response.json();
      if (data.success) {
        toast.success("Expense updated successfully");
        setExpenseEditDialogOpen(false);
        setSelectedExpense(null);
        fetchExpenses(); // Refresh the list
        fetchExpenseStats(); // Refresh stats
      }
    } catch (error) {
      toast.error("Failed to update expense");
      console.error("Error updating expense:", error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete expense');
      
      const data = await response.json();
      if (data.success) {
        toast.success("Expense deleted successfully");
        fetchExpenses(); // Refresh the list
        fetchExpenseStats(); // Refresh stats
      }
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error("Error deleting expense:", error);
    }
  };

  const handleUpdateStatus = async (expenseId: string, status: "pending" | "approved" | "rejected") => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      const data = await response.json();
      if (data.success) {
        toast.success("Expense status updated successfully");
        fetchExpenses(); // Refresh the list
      }
    } catch (error) {
      toast.error("Failed to update status");
      console.error("Error updating status:", error);
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseViewDialogOpen(true);
  };

  const handleEditExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseEditDialogOpen(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const filteredExpenses = expenses; // Now filtered on backend

  const paginatedExpenses = filteredExpenses;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4">
            <CardTitle>Expense Management</CardTitle>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="h-8 px-3"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-8 w-64"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  {/* First row: Expense Type and Category side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expenseType">Expense Type</Label>
                      <Select name="expenseType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expense type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operational">Operational Expenses</SelectItem>
                          <SelectItem value="office">Office Expenses</SelectItem>
                          <SelectItem value="other">Other Expenses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Second row: Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      required 
                      rows={3} 
                      className="resize-none"
                    />
                  </div>

                  {/* Third row: Amount and Date side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input id="amount" name="amount" type="number" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" name="date" type="date" required />
                    </div>
                  </div>

                  {/* Fourth row: Vendor and Site side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Vendor</Label>
                      <Input id="vendor" name="vendor" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site">Site</Label>
                      <Select name="site" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites.map(site => (
                            <SelectItem key={site} value={site}>{site}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fifth row: Payment Method */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select name="paymentMethod" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">Add Expense</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Expense Type Filter */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={expenseTypeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setExpenseTypeFilter("all")}
            >
              All Expenses
            </Button>
            <Button
              variant={expenseTypeFilter === "operational" ? "default" : "outline"}
              size="sm"
              onClick={() => setExpenseTypeFilter("operational")}
            >
              Operational
            </Button>
            <Button
              variant={expenseTypeFilter === "office" ? "default" : "outline"}
              size="sm"
              onClick={() => setExpenseTypeFilter("office")}
            >
              Office
            </Button>
            <Button
              variant={expenseTypeFilter === "other" ? "default" : "outline"}
              size="sm"
              onClick={() => setExpenseTypeFilter("other")}
            >
              Other
            </Button>
          </div>

          {/* Site-wise Expense Report */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Site-wise Expense Report ({reportPeriod === "weekly" ? "Weekly" : "Monthly"})</h3>
            <div className="flex gap-2 mb-4">
              <Button
                variant={reportPeriod === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportPeriod("weekly")}
              >
                Weekly
              </Button>
              <Button
                variant={reportPeriod === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportPeriod("monthly")}
              >
                Monthly
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sites.map(site => (
                <Card key={site}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{site}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Operational:</span>
                      <span className="font-medium">{formatCurrency(siteWiseExpenses[site]?.operational || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Office:</span>
                      <span className="font-medium">{formatCurrency(siteWiseExpenses[site]?.office || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Other:</span>
                      <span className="font-medium">{formatCurrency(siteWiseExpenses[site]?.other || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2 font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(siteWiseExpenses[site]?.total || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading expenses...</p>
            </div>
          )}

          {/* Search Info */}
          {searchTerm && !loading && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                Searching for "{searchTerm}"
              </p>
            </div>
          )}

          {!loading && viewMode === "table" && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell className="font-medium">{expense.expenseId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getExpenseTypeColor(expense.expenseType)}>
                          {expense.expenseType}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {expense.site}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(expense.status)}>
                            {expense.status}
                          </Badge>
                          {expense.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-green-600"
                                onClick={() => handleUpdateStatus(expense._id, "approved")}
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-red-600"
                                onClick={() => handleUpdateStatus(expense._id, "rejected")}
                              >
                                ✗
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewExpense(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditExpenseClick(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteExpense(expense._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredExpenses.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Card View */}
          {!loading && viewMode === "card" && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedExpenses.map((expense) => (
                  <Card key={expense._id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{expense.expenseId}</CardTitle>
                          <p className="text-sm text-muted-foreground">{expense.vendor}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={getStatusColor(expense.status)}>
                            {expense.status}
                          </Badge>
                          <Badge variant="outline" className={getExpenseTypeColor(expense.expenseType)}>
                            {expense.expenseType}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="font-medium">{expense.category}</div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {expense.description}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Site: {expense.site}
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <div>Date: {new Date(expense.date).toLocaleDateString()}</div>
                          <div>Method: {expense.paymentMethod}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">{formatCurrency(expense.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            GST: {formatCurrency(expense.gst)}
                          </div>
                        </div>
                      </div>
                      {expense.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="flex-1 text-green-600 hover:text-green-700"
                            variant="outline"
                            onClick={() => handleUpdateStatus(expense._id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-red-600 hover:text-red-700"
                            variant="outline"
                            onClick={() => handleUpdateStatus(expense._id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewExpense(expense)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditExpenseClick(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteExpense(expense._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredExpenses.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && filteredExpenses.length === 0 && (
            <div className="text-center py-8">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No expenses found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first expense"}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setExpenseDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense View Dialog */}
      <Dialog open={expenseViewDialogOpen} onOpenChange={setExpenseViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Details - {selectedExpense?.expenseId}</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Expense ID:</strong> {selectedExpense.expenseId}</div>
                <div><strong>Category:</strong> {selectedExpense.category}</div>
                <div><strong>Vendor:</strong> {selectedExpense.vendor}</div>
                <div><strong>Date:</strong> {new Date(selectedExpense.date).toLocaleDateString()}</div>
                <div><strong>Payment Method:</strong> {selectedExpense.paymentMethod}</div>
                <div><strong>Status:</strong> {selectedExpense.status}</div>
                <div><strong>Site:</strong> {selectedExpense.site}</div>
                <div>
                  <strong>Expense Type:</strong>
                  <Badge variant="outline" className={`ml-2 ${getExpenseTypeColor(selectedExpense.expenseType)}`}>
                    {selectedExpense.expenseType}
                  </Badge>
                </div>
              </div>
              <div>
                <strong>Description:</strong>
                <p className="mt-1">{selectedExpense.description}</p>
              </div>
              {selectedExpense.notes && (
                <div>
                  <strong>Notes:</strong>
                  <p className="mt-1">{selectedExpense.notes}</p>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span>{formatCurrency(selectedExpense.baseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>{formatCurrency(selectedExpense.gst)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedExpense.amount)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2">
                <div>Created By: {selectedExpense.createdBy}</div>
                <div>Created: {new Date(selectedExpense.createdAt).toLocaleString()}</div>
                <div>Last Updated: {new Date(selectedExpense.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expense Edit Dialog */}
      <Dialog open={expenseEditDialogOpen} onOpenChange={setExpenseEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense - {selectedExpense?.expenseId}</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <form onSubmit={handleEditExpense} className="space-y-4">
              {/* First row: Expense Type and Category side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-expenseType">Expense Type</Label>
                  <Select name="expenseType" defaultValue={selectedExpense.expenseType} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational Expenses</SelectItem>
                      <SelectItem value="office">Office Expenses</SelectItem>
                      <SelectItem value="other">Other Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select name="category" defaultValue={selectedExpense.category} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second row: Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea 
                  id="edit-description" 
                  name="description" 
                  defaultValue={selectedExpense.description} 
                  required 
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Third row: Amount and Date side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Base Amount (₹)</Label>
                  <Input 
                    id="edit-amount" 
                    name="amount" 
                    type="number" 
                    defaultValue={selectedExpense.baseAmount}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input 
                    id="edit-date" 
                    name="date" 
                    type="date" 
                    defaultValue={selectedExpense.date.split('T')[0]}
                    required 
                  />
                </div>
              </div>

              {/* Fourth row: Vendor and Site side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vendor">Vendor</Label>
                  <Input 
                    id="edit-vendor" 
                    name="vendor" 
                    defaultValue={selectedExpense.vendor}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-site">Site</Label>
                  <Select name="site" defaultValue={selectedExpense.site} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(site => (
                        <SelectItem key={site} value={site}>{site}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fifth row: Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="edit-paymentMethod">Payment Method</Label>
                <Select name="paymentMethod" defaultValue={selectedExpense.paymentMethod} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sixth row: Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea 
                  id="edit-notes" 
                  name="notes" 
                  defaultValue={selectedExpense.notes || ''}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <Button type="submit" className="w-full">Update Expense</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpensesTab;