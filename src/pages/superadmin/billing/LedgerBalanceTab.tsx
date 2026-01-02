import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Filter, FileDown, Users, Eye, ChevronLeft, ChevronRight, List, Grid, Download } from "lucide-react";
import { LedgerEntry, PartyBalance, getTypeIcon, getStatusColor, getBalanceColor, getBalanceBadgeVariant, formatCurrency } from "../Billing";

interface LedgerBalanceTabProps {
  ledgerEntries: LedgerEntry[];
  partyBalances: PartyBalance[];
  onExportData: (type: string) => void;
}

const LedgerBalanceTab: React.FC<LedgerBalanceTabProps> = ({
  ledgerEntries,
  partyBalances,
  onExportData
}) => {
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [ledgerViewMode, setLedgerViewMode] = useState<"table" | "card">("table");
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });
  const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
  const [ledgerItemsPerPage] = useState(10);

  const handleViewPartyLedger = (party: string) => {
    setSelectedParty(party);
    setLedgerDialogOpen(true);
  };

  // Helper function to calculate values based on entry type
  const getEntryColumnValues = (entry: LedgerEntry) => {
    const values = {
      labourBill: 0,
      managementFees: 0,
      machineRentWater: 0,
      gst: 0,
      billValue: 0,
      paidSalaries: 0,
      payableHoldSalaries: 0,
      pfEsicPt: 0,
      paidToVendor: 0,
      vouchers: 0,
      other: 0,
      grossExpenses: 0,
      balance: entry.balance,
      lessManagement: 0,
      netProfit: 0
    };

    // Map ledger entry types to your specific columns
    switch (entry.type.toLowerCase()) {
      case "labour":
      case "labour_bill":
        values.labourBill = entry.debit;
        break;
      case "management":
      case "management_fees":
        values.managementFees = entry.debit;
        values.lessManagement = entry.debit; // For less management column
        break;
      case "machine":
      case "machine_rent":
      case "water":
      case "machine_rent_water":
        values.machineRentWater = entry.debit;
        break;
      case "salary":
      case "salaries":
        values.paidSalaries = entry.debit;
        break;
      case "payable_salary":
      case "hold_salary":
        values.payableHoldSalaries = entry.debit;
        break;
      case "pf":
      case "esic":
      case "pt":
      case "statutory":
        values.pfEsicPt = entry.debit;
        break;
      case "vendor":
      case "vendor_payment":
        values.paidToVendor = entry.debit;
        break;
      case "voucher":
      case "expense_voucher":
        values.vouchers = entry.debit;
        break;
      case "gst":
        values.gst = entry.debit;
        break;
      case "bill":
      case "invoice":
        values.billValue = entry.credit;
        break;
      case "other":
      case "miscellaneous":
        values.other = entry.debit;
        break;
    }

    // Calculate derived values
    values.grossExpenses = values.labourBill + values.machineRentWater + values.paidSalaries + 
                           values.pfEsicPt + values.paidToVendor + values.vouchers + values.other + values.gst;
    
    values.netProfit = values.billValue - values.grossExpenses - values.managementFees;

    return values;
  };

  const getFilteredLedgerEntries = () => {
    let filtered = ledgerEntries;

    if (dateFilter.startDate) {
      filtered = filtered.filter(entry => entry.date >= dateFilter.startDate);
    }

    if (dateFilter.endDate) {
      filtered = filtered.filter(entry => entry.date <= dateFilter.endDate);
    }

    if (selectedParty) {
      filtered = filtered.filter(entry => entry.party === selectedParty);
    }

    if (ledgerSearchTerm) {
      filtered = filtered.filter(entry => 
        entry.party.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
        entry.reference.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
        entry.description.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
        entry.status.toLowerCase().includes(ledgerSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getPartyLedgerEntries = (party: string) => {
    return ledgerEntries
      .filter(entry => entry.party === party)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getPaginatedLedgerData = (data: LedgerEntry[]) => {
    const startIndex = (ledgerCurrentPage - 1) * ledgerItemsPerPage;
    const endIndex = startIndex + ledgerItemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const totalLedgerPages = (data: LedgerEntry[]) => Math.ceil(data.length / ledgerItemsPerPage);

  const filteredLedgerEntries = getFilteredLedgerEntries();
  const paginatedLedgerEntries = getPaginatedLedgerData(filteredLedgerEntries);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4">
            <CardTitle>Ledger & Site Balances</CardTitle>
            <div className="flex border rounded-lg">
              <Button
                variant={ledgerViewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLedgerViewMode("table")}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={ledgerViewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLedgerViewMode("card")}
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
                placeholder="Search ledger entries..."
                className="pl-8 w-64"
                value={ledgerSearchTerm}
                onChange={(e) => setLedgerSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onExportData("ledger")}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Ledger
              </Button>
              <Button variant="outline" onClick={() => onExportData("balances")}>
                <Users className="mr-2 h-4 w-4" />
                Export Balances
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Filter */}
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">From Date</Label>
              <Input 
                id="startDate" 
                type="date" 
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">To Date</Label>
              <Input 
                id="endDate" 
                type="date" 
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setDateFilter({ startDate: "", endDate: "" })}
            >
              <Filter className="mr-2 h-4 w-4" />
              Clear Filter
            </Button>
          </div>

          {/* Site Balances Summary */}
          <div>
            <h3 className="font-semibold mb-4">Site Balances Summary</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {partyBalances.map((party) => (
                <Card key={party.party} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6" onClick={() => handleViewPartyLedger(party.party)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium truncate">{party.party}</div>
                      <Badge variant={getBalanceBadgeVariant(party.status)}>
                        {party.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className={`text-2xl font-bold ${getBalanceColor(party.currentBalance)}`}>
                      {formatCurrency(Math.abs(party.currentBalance))}
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                      <span>Debit: {formatCurrency(party.totalDebit)}</span>
                      <span>Credit: {formatCurrency(party.totalCredit)}</span>
                    </div>
                    {party.site && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Site: {party.site}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Last: {party.lastTransaction}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Ledger Entries */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Ledger Entries</h3>
              <div className="text-sm text-muted-foreground">
                Showing {filteredLedgerEntries.length} entries
              </div>
            </div>

            {(ledgerSearchTerm || dateFilter.startDate || dateFilter.endDate) && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  Showing {filteredLedgerEntries.length} of {ledgerEntries.length} ledger entries
                  {ledgerSearchTerm && ` matching "${ledgerSearchTerm}"`}
                  {(dateFilter.startDate || dateFilter.endDate) && ` within selected date range`}
                </p>
              </div>
            )}

            {ledgerViewMode === "table" ? (
              <>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Site Name</TableHead>
                        <TableHead className="whitespace-nowrap">Labour Bill</TableHead>
                        <TableHead className="whitespace-nowrap">MNG Fees</TableHead>
                        <TableHead className="whitespace-nowrap">Machine Rent/Water</TableHead>
                        <TableHead className="whitespace-nowrap">GST</TableHead>
                        <TableHead className="whitespace-nowrap">Bill Value</TableHead>
                        <TableHead className="whitespace-nowrap">Paid Salaries</TableHead>
                        <TableHead className="whitespace-nowrap">Payable/Hold Salaries</TableHead>
                        <TableHead className="whitespace-nowrap">PF ESIC PT</TableHead>
                        <TableHead className="whitespace-nowrap">Paid to Vendor</TableHead>
                        <TableHead className="whitespace-nowrap">Vouchers</TableHead>
                        <TableHead className="whitespace-nowrap">Other</TableHead>
                        <TableHead className="whitespace-nowrap">Gross Expenses</TableHead>
                        <TableHead className="whitespace-nowrap">Balance</TableHead>
                        <TableHead className="whitespace-nowrap">Less Management</TableHead>
                        <TableHead className="whitespace-nowrap">Net Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLedgerEntries.map((entry) => {
                        const values = getEntryColumnValues(entry);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div 
                                className="font-medium cursor-pointer hover:text-primary hover:underline"
                                onClick={() => handleViewPartyLedger(entry.party)}
                              >
                                {entry.party}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {values.labourBill > 0 ? formatCurrency(values.labourBill) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.managementFees > 0 ? formatCurrency(values.managementFees) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.machineRentWater > 0 ? formatCurrency(values.machineRentWater) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.gst > 0 ? formatCurrency(values.gst) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {values.billValue > 0 ? formatCurrency(values.billValue) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.paidSalaries > 0 ? formatCurrency(values.paidSalaries) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.payableHoldSalaries > 0 ? formatCurrency(values.payableHoldSalaries) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.pfEsicPt > 0 ? formatCurrency(values.pfEsicPt) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.paidToVendor > 0 ? formatCurrency(values.paidToVendor) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.vouchers > 0 ? formatCurrency(values.vouchers) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.other > 0 ? formatCurrency(values.other) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(values.grossExpenses)}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${getBalanceColor(values.balance)}`}>
                              {formatCurrency(values.balance)}
                            </TableCell>
                            <TableCell className="text-right">
                              {values.lessManagement > 0 ? formatCurrency(values.lessManagement) : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${
                              values.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(values.netProfit)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {filteredLedgerEntries.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((ledgerCurrentPage - 1) * ledgerItemsPerPage) + 1} to {Math.min(ledgerCurrentPage * ledgerItemsPerPage, filteredLedgerEntries.length)} of {filteredLedgerEntries.length} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={ledgerCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {ledgerCurrentPage} of {totalLedgerPages(filteredLedgerEntries)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerCurrentPage(prev => Math.min(prev + 1, totalLedgerPages(filteredLedgerEntries)))}
                        disabled={ledgerCurrentPage === totalLedgerPages(filteredLedgerEntries)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Card view remains similar but with updated fields
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedLedgerEntries.map((entry) => {
                    const values = getEntryColumnValues(entry);
                    return (
                      <Card key={entry.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{entry.party}</CardTitle>
                              <p className="text-sm text-muted-foreground">{entry.reference}</p>
                            </div>
                            <Badge variant={getStatusColor(entry.status)}>
                              {entry.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground">Bill Value</div>
                              <div className="font-semibold">
                                {values.billValue > 0 ? formatCurrency(values.billValue) : '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Gross Expenses</div>
                              <div className="font-semibold">
                                {formatCurrency(values.grossExpenses)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Net Profit</div>
                              <div className={`font-semibold ${
                                values.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(values.netProfit)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Balance</div>
                              <div className={`font-semibold ${getBalanceColor(values.balance)}`}>
                                {formatCurrency(values.balance)}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Date: {entry.date}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={() => handleViewPartyLedger(entry.party)}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {filteredLedgerEntries.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((ledgerCurrentPage - 1) * ledgerItemsPerPage) + 1} to {Math.min(ledgerCurrentPage * ledgerItemsPerPage, filteredLedgerEntries.length)} of {filteredLedgerEntries.length} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={ledgerCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {ledgerCurrentPage} of {totalLedgerPages(filteredLedgerEntries)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerCurrentPage(prev => Math.min(prev + 1, totalLedgerPages(filteredLedgerEntries)))}
                        disabled={ledgerCurrentPage === totalLedgerPages(filteredLedgerEntries)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {filteredLedgerEntries.length === 0 && (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No ledger entries found</h3>
                <p className="text-muted-foreground">
                  {ledgerSearchTerm || dateFilter.startDate || dateFilter.endDate 
                    ? "Try adjusting your search terms or date filters" 
                    : "No ledger entries available"
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Party Ledger Dialog */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Ledger Statement - {selectedParty}</DialogTitle>
          </DialogHeader>
          {selectedParty && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/50">
                <div>
                  <h3 className="font-semibold">{selectedParty}</h3>
                  <p className="text-sm text-muted-foreground">
                    Current Balance: 
                    <span className={`ml-2 font-bold ${getBalanceColor(
                      partyBalances.find(p => p.party === selectedParty)?.currentBalance || 0
                    )}`}>
                      {formatCurrency(partyBalances.find(p => p.party === selectedParty)?.currentBalance || 0)}
                    </span>
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => onExportData("statement")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Statement
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Labour Bill</TableHead>
                      <TableHead>MNG Fees</TableHead>
                      <TableHead>Machine Rent/Water</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>Bill Value</TableHead>
                      <TableHead>Paid Salaries</TableHead>
                      <TableHead>Payable/Hold Salaries</TableHead>
                      <TableHead>PF ESIC PT</TableHead>
                      <TableHead>Paid to Vendor</TableHead>
                      <TableHead>Vouchers</TableHead>
                      <TableHead>Other</TableHead>
                      <TableHead>Gross Expenses</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Less Management</TableHead>
                      <TableHead>Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPartyLedgerEntries(selectedParty).map((entry) => {
                      const values = getEntryColumnValues(entry);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                          <TableCell className="font-mono text-sm">{entry.reference}</TableCell>
                          <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                          <TableCell className="text-right">
                            {values.labourBill > 0 ? formatCurrency(values.labourBill) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.managementFees > 0 ? formatCurrency(values.managementFees) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.machineRentWater > 0 ? formatCurrency(values.machineRentWater) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.gst > 0 ? formatCurrency(values.gst) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {values.billValue > 0 ? formatCurrency(values.billValue) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.paidSalaries > 0 ? formatCurrency(values.paidSalaries) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.payableHoldSalaries > 0 ? formatCurrency(values.payableHoldSalaries) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.pfEsicPt > 0 ? formatCurrency(values.pfEsicPt) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.paidToVendor > 0 ? formatCurrency(values.paidToVendor) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.vouchers > 0 ? formatCurrency(values.vouchers) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.other > 0 ? formatCurrency(values.other) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(values.grossExpenses)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${getBalanceColor(values.balance)}`}>
                            {formatCurrency(values.balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {values.lessManagement > 0 ? formatCurrency(values.lessManagement) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${
                            values.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(values.netProfit)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LedgerBalanceTab;