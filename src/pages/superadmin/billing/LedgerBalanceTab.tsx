import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Filter, FileDown, Users, Eye, ChevronLeft, ChevronRight, List, Grid, Download } from "lucide-react";
import { LedgerEntry, PartyBalance, getTypeIcon, getStatusColor, getBalanceColor, getBalanceBadgeVariant, formatCurrency } from "../Billing";
import { siteService, Site } from "@/services/SiteService";

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
  const [siteNames, setSiteNames] = useState<string[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);

  // Fetch site names from SiteService
  useEffect(() => {
    const fetchSiteNames = async () => {
      try {
        setIsLoadingSites(true);
        const sites = await siteService.getAllSites();
        
        if (sites && sites.length > 0) {
          // Extract site names from sites and convert to uppercase
          const names = sites
            .map(site => site.name?.toUpperCase() || '')
            .filter(name => name.trim() !== '');
          
          // Sort by creation date (newest first) - assuming sites have createdAt field
          const sortedSites = sites.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Newest first
          });
          
          const sortedNames = sortedSites
            .map(site => site.name?.toUpperCase() || '')
            .filter(name => name.trim() !== '');
          
          // Add "TOTAL" at the end if not already in the list
          const finalNames = sortedNames;
          if (!finalNames.includes("TOTAL")) {
            finalNames.push("TOTAL");
          }
          
          setSiteNames(finalNames);
        } else {
          // Fallback to hardcoded site names with "TOTAL" at the end
          const fallbackSiteNames = [
            "WESTEND",
            "HIGH STREET", 
            "PHEONIX",
            "TRUENO",
            "SYNERGY HK",
            "SYNERGY SG",
            "GLOBAL SQUARE HK",
            "GLOBAL SQUARE SG",
            "T-ONE HK",
            "BLUEGRASS",
            "RAJASHREE ESTATE",
            "KRC DRIVER",
            "INSPIRIA",
            "MATTAR MOTORS",
            "SATURO TECHNOLOGIES",
            "ESPAT",
            "K P BUNGLOW",
            "NEXTGEN HK",
            "NEXTGEN SG",
            "MANGALWAR PETH",
            "PHULGAON",
            "COPLAND",
            "STEEPGRAPH",
            "BRAMHA",
            "TOTAL"
          ];
          setSiteNames(fallbackSiteNames);
        }
      } catch (error) {
        console.error("Error fetching site names:", error);
        // Fallback to hardcoded site names with "TOTAL" at the end
        const fallbackSiteNames = [
          "WESTEND",
          "HIGH STREET", 
          "PHEONIX",
          "TRUENO",
          "SYNERGY HK",
          "SYNERGY SG",
          "GLOBAL SQUARE HK",
          "GLOBAL SQUARE SG",
          "T-ONE HK",
          "BLUEGRASS",
          "RAJASHREE ESTATE",
          "KRC DRIVER",
          "INSPIRIA",
          "MATTAR MOTORS",
          "SATURO TECHNOLOGIES",
          "ESPAT",
          "K P BUNGLOW",
          "NEXTGEN HK",
          "NEXTGEN SG",
          "MANGALWAR PETH",
          "PHULGAON",
          "COPLAND",
          "STEEPGRAPH",
          "BRAMHA",
          "TOTAL"
        ];
        setSiteNames(fallbackSiteNames);
      } finally {
        setIsLoadingSites(false);
      }
    };

    fetchSiteNames();
  }, []);

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

  // Separate the "TOTAL" row from other site names
  const getSiteNamesWithoutTotal = () => {
    return siteNames.filter(name => name !== "TOTAL");
  };

  const getTotalRowSiteNames = () => {
    return siteNames.filter(name => name === "TOTAL");
  };

  // Calculate totals for all sites
  const calculateTotalsForAllSites = () => {
    const allSitesData = getSiteNamesWithoutTotal().map(siteName => {
      const siteEntries = filteredLedgerEntries.filter(entry => 
        entry.party.toUpperCase().includes(siteName) || 
        siteName.includes(entry.party.toUpperCase())
      );
      
      if (siteEntries.length > 0) {
        return siteEntries.reduce((acc, entry) => {
          const values = getEntryColumnValues(entry);
          return {
            labourBill: acc.labourBill + values.labourBill,
            managementFees: acc.managementFees + values.managementFees,
            machineRentWater: acc.machineRentWater + values.machineRentWater,
            gst: acc.gst + values.gst,
            billValue: acc.billValue + values.billValue,
            paidSalaries: acc.paidSalaries + values.paidSalaries,
            payableHoldSalaries: acc.payableHoldSalaries + values.payableHoldSalaries,
            pfEsicPt: acc.pfEsicPt + values.pfEsicPt,
            paidToVendor: acc.paidToVendor + values.paidToVendor,
            vouchers: acc.vouchers + values.vouchers,
            other: acc.other + values.other,
            grossExpenses: acc.grossExpenses + values.grossExpenses,
            balance: acc.balance + values.balance,
            lessManagement: acc.lessManagement + values.lessManagement,
            netProfit: acc.netProfit + values.netProfit
          };
        }, {
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
          balance: 0,
          lessManagement: 0,
          netProfit: 0
        });
      }
      return null;
    }).filter(data => data !== null);
    
    // Sum up all site data
    return allSitesData.reduce((totals, siteData) => {
      if (siteData) {
        return {
          labourBill: totals.labourBill + siteData.labourBill,
          managementFees: totals.managementFees + siteData.managementFees,
          machineRentWater: totals.machineRentWater + siteData.machineRentWater,
          gst: totals.gst + siteData.gst,
          billValue: totals.billValue + siteData.billValue,
          paidSalaries: totals.paidSalaries + siteData.paidSalaries,
          payableHoldSalaries: totals.payableHoldSalaries + siteData.payableHoldSalaries,
          pfEsicPt: totals.pfEsicPt + siteData.pfEsicPt,
          paidToVendor: totals.paidToVendor + siteData.paidToVendor,
          vouchers: totals.vouchers + siteData.vouchers,
          other: totals.other + siteData.other,
          grossExpenses: totals.grossExpenses + siteData.grossExpenses,
          balance: totals.balance + siteData.balance,
          lessManagement: totals.lessManagement + siteData.lessManagement,
          netProfit: totals.netProfit + siteData.netProfit
        };
      }
      return totals;
    }, {
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
      balance: 0,
      lessManagement: 0,
      netProfit: 0
    });
  };

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
                {isLoadingSites ? (
                  <span>Loading site names...</span>
                ) : (
                  <span>Showing {filteredLedgerEntries.length} entries across {siteNames.length} sites</span>
                )}
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

            {isLoadingSites ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading site names...</p>
              </div>
            ) : ledgerViewMode === "table" ? (
              <>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">SITE NAME</TableHead>
                        <TableHead className="whitespace-nowrap">LABOUR BILL</TableHead>
                        <TableHead className="whitespace-nowrap">MNG FEES</TableHead>
                        <TableHead className="whitespace-nowrap">MACHINE RENT/WATER</TableHead>
                        <TableHead className="whitespace-nowrap">GST</TableHead>
                        <TableHead className="whitespace-nowrap">BILL VALUE</TableHead>
                        <TableHead className="whitespace-nowrap">PAID SALARIES</TableHead>
                        <TableHead className="whitespace-nowrap">PAYBLE/HOLD SALAIES</TableHead>
                        <TableHead className="whitespace-nowrap">PF ESIC PT</TableHead>
                        <TableHead className="whitespace-nowrap">PAID TO VENDOR</TableHead>
                        <TableHead className="whitespace-nowrap">VOUCHERS</TableHead>
                        <TableHead className="whitespace-nowrap">OTHER</TableHead>
                        <TableHead className="whitespace-nowrap">GROSS EXPENSES</TableHead>
                        <TableHead className="whitespace-nowrap">BALANCE</TableHead>
                        <TableHead className="whitespace-nowrap">LESS MANAGEMENT</TableHead>
                        <TableHead className="whitespace-nowrap">NET PROFIT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Regular sites (newest first) */}
                      {getSiteNamesWithoutTotal().map((siteName) => {
                        // Find ledger entry for this site
                        const siteEntries = filteredLedgerEntries.filter(entry => 
                          entry.party.toUpperCase().includes(siteName) || 
                          siteName.includes(entry.party.toUpperCase())
                        );
                        
                        if (siteEntries.length > 0) {
                          // Aggregate values for all entries of this site
                          const aggregatedValues = siteEntries.reduce((acc, entry) => {
                            const values = getEntryColumnValues(entry);
                            return {
                              labourBill: acc.labourBill + values.labourBill,
                              managementFees: acc.managementFees + values.managementFees,
                              machineRentWater: acc.machineRentWater + values.machineRentWater,
                              gst: acc.gst + values.gst,
                              billValue: acc.billValue + values.billValue,
                              paidSalaries: acc.paidSalaries + values.paidSalaries,
                              payableHoldSalaries: acc.payableHoldSalaries + values.payableHoldSalaries,
                              pfEsicPt: acc.pfEsicPt + values.pfEsicPt,
                              paidToVendor: acc.paidToVendor + values.paidToVendor,
                              vouchers: acc.vouchers + values.vouchers,
                              other: acc.other + values.other,
                              grossExpenses: acc.grossExpenses + values.grossExpenses,
                              balance: acc.balance + values.balance,
                              lessManagement: acc.lessManagement + values.lessManagement,
                              netProfit: acc.netProfit + values.netProfit
                            };
                          }, {
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
                            balance: 0,
                            lessManagement: 0,
                            netProfit: 0
                          });

                          return (
                            <TableRow key={siteName}>
                              <TableCell>
                                <div className="font-medium">
                                  {siteName}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.labourBill > 0 ? formatCurrency(aggregatedValues.labourBill) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.managementFees > 0 ? formatCurrency(aggregatedValues.managementFees) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.machineRentWater > 0 ? formatCurrency(aggregatedValues.machineRentWater) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.gst > 0 ? formatCurrency(aggregatedValues.gst) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {aggregatedValues.billValue > 0 ? formatCurrency(aggregatedValues.billValue) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.paidSalaries > 0 ? formatCurrency(aggregatedValues.paidSalaries) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.payableHoldSalaries > 0 ? formatCurrency(aggregatedValues.payableHoldSalaries) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.pfEsicPt > 0 ? formatCurrency(aggregatedValues.pfEsicPt) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.paidToVendor > 0 ? formatCurrency(aggregatedValues.paidToVendor) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.vouchers > 0 ? formatCurrency(aggregatedValues.vouchers) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.other > 0 ? formatCurrency(aggregatedValues.other) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatCurrency(aggregatedValues.grossExpenses)}
                              </TableCell>
                              <TableCell className={`text-right font-bold ${getBalanceColor(aggregatedValues.balance)}`}>
                                {formatCurrency(aggregatedValues.balance)}
                              </TableCell>
                              <TableCell className="text-right">
                                {aggregatedValues.lessManagement > 0 ? formatCurrency(aggregatedValues.lessManagement) : '-'}
                              </TableCell>
                              <TableCell className={`text-right font-bold ${
                                aggregatedValues.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(aggregatedValues.netProfit)}
                              </TableCell>
                            </TableRow>
                          );
                        } else {
                          // Display empty row for site without data
                          return (
                            <TableRow key={siteName}>
                              <TableCell>
                                <div className="font-medium">{siteName}</div>
                              </TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right font-medium">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right font-bold">-</TableCell>
                              <TableCell className="text-right font-bold">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right font-bold">-</TableCell>
                            </TableRow>
                          );
                        }
                      })}
                      
                      {/* TOTAL row at the end */}
                      {getTotalRowSiteNames().map((siteName) => {
                        // For "TOTAL" row, calculate sum of all sites
                        const totalValues = calculateTotalsForAllSites();
                        
                        return (
                          <TableRow key={siteName} className="bg-muted/50 font-bold">
                            <TableCell>
                              <div className="font-bold text-primary">
                                {siteName}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.labourBill > 0 ? formatCurrency(totalValues.labourBill) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.managementFees > 0 ? formatCurrency(totalValues.managementFees) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.machineRentWater > 0 ? formatCurrency(totalValues.machineRentWater) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.gst > 0 ? formatCurrency(totalValues.gst) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {totalValues.billValue > 0 ? formatCurrency(totalValues.billValue) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.paidSalaries > 0 ? formatCurrency(totalValues.paidSalaries) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.payableHoldSalaries > 0 ? formatCurrency(totalValues.payableHoldSalaries) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.pfEsicPt > 0 ? formatCurrency(totalValues.pfEsicPt) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.paidToVendor > 0 ? formatCurrency(totalValues.paidToVendor) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.vouchers > 0 ? formatCurrency(totalValues.vouchers) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.other > 0 ? formatCurrency(totalValues.other) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatCurrency(totalValues.grossExpenses)}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${getBalanceColor(totalValues.balance)}`}>
                              {formatCurrency(totalValues.balance)}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalValues.lessManagement > 0 ? formatCurrency(totalValues.lessManagement) : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${
                              totalValues.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(totalValues.netProfit)}
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
                      Showing {((ledgerCurrentPage - 1) * ledgerItemsPerPage) + 1} to {Math.min(ledgerCurrentPage * ledgerItemsPerPage, siteNames.length)} of {siteNames.length} sites
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
                        Page {ledgerCurrentPage} of {Math.ceil(siteNames.length / ledgerItemsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerCurrentPage(prev => Math.min(prev + 1, Math.ceil(siteNames.length / ledgerItemsPerPage)))}
                        disabled={ledgerCurrentPage === Math.ceil(siteNames.length / ledgerItemsPerPage)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Card view with site names
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {siteNames.slice((ledgerCurrentPage - 1) * ledgerItemsPerPage, ledgerCurrentPage * ledgerItemsPerPage).map((siteName) => {
                    // Find ledger entries for this site
                    const siteEntries = filteredLedgerEntries.filter(entry => 
                      entry.party.toUpperCase().includes(siteName) || 
                      siteName.includes(entry.party.toUpperCase())
                    );
                    
                    if (siteEntries.length > 0) {
                      // For "TOTAL" row, calculate sum of all sites
                      let aggregatedValues;
                      if (siteName === "TOTAL") {
                        aggregatedValues = calculateTotalsForAllSites();
                      } else {
                        // Aggregate values for all entries of this site
                        aggregatedValues = siteEntries.reduce((acc, entry) => {
                          const values = getEntryColumnValues(entry);
                          return {
                            labourBill: acc.labourBill + values.labourBill,
                            managementFees: acc.managementFees + values.managementFees,
                            machineRentWater: acc.machineRentWater + values.machineRentWater,
                            gst: acc.gst + values.gst,
                            billValue: acc.billValue + values.billValue,
                            paidSalaries: acc.paidSalaries + values.paidSalaries,
                            payableHoldSalaries: acc.payableHoldSalaries + values.payableHoldSalaries,
                            pfEsicPt: acc.pfEsicPt + values.pfEsicPt,
                            paidToVendor: acc.paidToVendor + values.paidToVendor,
                            vouchers: acc.vouchers + values.vouchers,
                            other: acc.other + values.other,
                            grossExpenses: acc.grossExpenses + values.grossExpenses,
                            balance: acc.balance + values.balance,
                            lessManagement: acc.lessManagement + values.lessManagement,
                            netProfit: acc.netProfit + values.netProfit
                          };
                        }, {
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
                          balance: 0,
                          lessManagement: 0,
                          netProfit: 0
                        });
                      }

                      return (
                        <Card key={siteName} className={`hover:shadow-md transition-shadow ${siteName === "TOTAL" ? 'border-primary bg-primary/5' : ''}`}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className={`text-base ${siteName === "TOTAL" ? 'text-primary' : ''}`}>
                                  {siteName}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {siteName === "TOTAL" 
                                    ? 'Sum of all sites' 
                                    : `${siteEntries.length} transaction${siteEntries.length !== 1 ? 's' : ''}`
                                  }
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Bill Value</div>
                                <div className="font-semibold">
                                  {aggregatedValues.billValue > 0 ? formatCurrency(aggregatedValues.billValue) : '-'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Gross Expenses</div>
                                <div className="font-semibold">
                                  {formatCurrency(aggregatedValues.grossExpenses)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Net Profit</div>
                                <div className={`font-semibold ${
                                  aggregatedValues.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(aggregatedValues.netProfit)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Balance</div>
                                <div className={`font-semibold ${getBalanceColor(aggregatedValues.balance)}`}>
                                  {formatCurrency(aggregatedValues.balance)}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {siteName === "TOTAL" ? 'All sites combined' : `Entries: ${siteEntries.length}`}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    } else {
                      // Empty card for site without data
                      return (
                        <Card key={siteName} className={`opacity-50 ${siteName === "TOTAL" ? 'border-primary' : ''}`}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className={`text-base ${siteName === "TOTAL" ? 'text-primary' : ''}`}>
                                  {siteName}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">No data available</p>
                              </div>
                              <Badge variant="outline">
                                N/A
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Bill Value</div>
                                <div className="font-semibold">-</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Gross Expenses</div>
                                <div className="font-semibold">-</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Net Profit</div>
                                <div className="font-semibold">-</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Balance</div>
                                <div className="font-semibold">-</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  })}
                </div>

                {siteNames.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing sites {((ledgerCurrentPage - 1) * ledgerItemsPerPage) + 1} to {Math.min(ledgerCurrentPage * ledgerItemsPerPage, siteNames.length)} of {siteNames.length} sites
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
                        Page {ledgerCurrentPage} of {Math.ceil(siteNames.length / ledgerItemsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerCurrentPage(prev => Math.min(prev + 1, Math.ceil(siteNames.length / ledgerItemsPerPage)))}
                        disabled={ledgerCurrentPage === Math.ceil(siteNames.length / ledgerItemsPerPage)}
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
                      <TableHead>LABOUR BILL</TableHead>
                      <TableHead>MNG FEES</TableHead>
                      <TableHead>MACHINE RENT/WATER</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>BILL VALUE</TableHead>
                      <TableHead>PAID SALARIES</TableHead>
                      <TableHead>PAYBLE/HOLD SALAIES</TableHead>
                      <TableHead>PF ESIC PT</TableHead>
                      <TableHead>PAID TO VENDOR</TableHead>
                      <TableHead>VOUCHERS</TableHead>
                      <TableHead>OTHER</TableHead>
                      <TableHead>GROSS EXPENSES</TableHead>
                      <TableHead>BALANCE</TableHead>
                      <TableHead>LESS MANAGEMENT</TableHead>
                      <TableHead>NET PROFIT</TableHead>
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