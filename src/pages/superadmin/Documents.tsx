import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, FileText, Download, Eye, Trash2, Edit, FileUp, Loader2,
  RefreshCw, Upload, Filter, MoreVertical, FolderOpen, Shield,
  Clock, Users, BarChart3, ChevronRight, Sparkles, Zap, TrendingUp,
  CheckCircle, FileCheck, FileSearch, FileBarChart, FileCode, FileX,
  FileDigit, FileOutput, FileInput, FileStack, FolderArchive,
  ArrowUpRight, ChevronDown, Star, Crown, Award, Target,
  Cloud, Lock, Globe, Cpu, Rocket, Wallet, ShieldCheck,
  Sparkle, Palette, Zap as ZapIcon, FileKey, FileSpreadsheet,
  FileImage, FileVideo, FileAudio, FileArchive, FolderSync,
  Layers, Box, Database, Server, HardDrive, Network,
  BarChart, PieChart, LineChart, Activity
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Import the document service
import documentService, { DocumentData } from "@/services/document.service";

// Types
interface Document {
  id: string;
  name: string;
  type: "PDF" | "XLSX" | "DOCX" | "JPG" | "PNG" | "OTHER";
  size: string;
  uploadedBy: string;
  date: string;
  category: "uploaded" | "generated" | "template" | "image" | "document" | "spreadsheet" | "presentation" | "other";
  description?: string;
  cloudinaryData?: {
    url: string;
    publicId: string;
    format: string;
  };
}

interface GeneratedDocument {
  name: string;
  type: "PDF" | "XLSX" | "DOCX" | "JPG" | "PNG" | "OTHER";
  size: string;
  category: "generated";
  description?: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  lastModified: string;
}

interface Format {
  id: string;
  name: string;
  type: string;
  description: string;
  size: string;
}

// Dummy Data (for initial load/fallback)
const initialDocuments: Document[] = [
  {
    id: "1",
    name: "Employee Joining Form",
    type: "PDF",
    size: "2.4 MB",
    uploadedBy: "Admin User",
    date: "2024-01-15",
    category: "uploaded",
    description: "Standard employee joining form"
  },
  {
    id: "2",
    name: "Monthly Salary Report",
    type: "XLSX",
    size: "1.8 MB",
    uploadedBy: "HR Manager",
    date: "2024-01-14",
    category: "generated",
    description: "Automated salary report for January"
  },
  {
    id: "3",
    name: "Invoice Template",
    type: "DOCX",
    size: "0.8 MB",
    uploadedBy: "Finance Team",
    date: "2024-01-13",
    category: "template",
    description: "Standard invoice template"
  },
  {
    id: "4",
    name: "Attendance Sheet",
    type: "XLSX",
    size: "1.2 MB",
    uploadedBy: "Operations",
    date: "2024-01-12",
    category: "uploaded",
    description: "Monthly attendance record"
  },
  {
    id: "5",
    name: "Experience Certificate",
    type: "DOCX",
    size: "0.9 MB",
    uploadedBy: "HR Manager",
    date: "2024-01-11",
    category: "template",
    description: "Employee experience certificate template"
  }
];

const templates: Template[] = [
  {
    id: "1",
    name: "Employee Joining Form",
    type: "PDF Template",
    description: "Standard employee onboarding form",
    lastModified: "2024-01-10"
  },
  {
    id: "2",
    name: "Salary Slip",
    type: "DOCX Template",
    description: "Monthly salary slip template",
    lastModified: "2024-01-09"
  },
  {
    id: "3",
    name: "Invoice Template",
    type: "DOCX Template",
    description: "Professional invoice template",
    lastModified: "2024-01-08"
  },
  {
    id: "4",
    name: "Attendance Report",
    type: "XLSX Template",
    description: "Monthly attendance reporting template",
    lastModified: "2024-01-07"
  }
];

const formatLibrary: Format[] = [
  {
    id: "1",
    name: "PDF Format",
    type: "PDF",
    description: "Portable Document Format with advanced security features and digital signatures",
    size: "Premium"
  },
  {
    id: "2",
    name: "Excel Spreadsheet",
    type: "XLSX",
    description: "Microsoft Excel format with advanced formulas and data visualization",
    size: "Enterprise"
  },
  {
    id: "3",
    name: "Word Document",
    type: "DOCX",
    description: "Microsoft Word format with professional styling and templates",
    size: "Premium"
  },
  {
    id: "4",
    name: "JPEG Image",
    type: "JPG",
    description: "High-quality image format with compression and optimization",
    size: "Standard"
  }
];

// Theme-aware gradient classes
const getThemeGradients = () => ({
  heroGradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-purple-500/10 dark:from-primary/30 dark:via-primary/20 dark:to-purple-500/20",
  cardGradient: "bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 backdrop-blur-xl",
  glassCard: "bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-900/90 dark:to-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-2xl",
  premiumCard: "bg-gradient-to-br from-primary/5 via-primary/10 to-purple-500/5 dark:from-primary/10 dark:via-primary/15 dark:to-purple-500/10 backdrop-blur-xl border border-primary/20 dark:border-primary/30",
  accentGradient: "bg-gradient-to-r from-accent via-accent/90 to-pink-500/80",
  successGradient: "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500",
  warningGradient: "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500",
  purpleGradient: "bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500",
});

// Main Component with Premium Design
const Documents = () => {
  const [activeTab, setActiveTab] = useState("all-documents");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 dark:from-background dark:via-gray-950 dark:to-gray-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <DashboardHeader title="Documents Management" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative p-6 space-y-8 z-10"
      >

        {/* Premium Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatsCards />
        </motion.div>

        {/* Premium Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <div className={`${getThemeGradients().glassCard} rounded-2xl p-2 shadow-2xl`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4">
                <div>
                  <h2 className="text-xl font-bold">Document Management Dashboard</h2>
                  <p className="text-sm text-muted-foreground">Manage all aspects of your documents</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 bg-background/50">
                    <Activity className="h-3 w-3" />
                    Active
                  </Badge>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px] bg-background/50">
                      <SelectValue placeholder="View all" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Documents</SelectItem>
                      <SelectItem value="recent">Recent Only</SelectItem>
                      <SelectItem value="starred">Starred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsList className={`grid w-full grid-cols-2 lg:grid-cols-4 gap-2 p-1 mx-4 mb-4 ${getThemeGradients().cardGradient} rounded-xl`}>
                <TabsTrigger value="all-documents" className="relative data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-500 data-[state=active]:text-white">
                  <div className="flex items-center gap-2">
                    <FileStack className="h-4 w-4" />
                    All Documents
                  </div>
                </TabsTrigger>
                <TabsTrigger value="templates" className="relative data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-pink-500 data-[state=active]:text-white">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    Templates
                  </div>
                </TabsTrigger>
                <TabsTrigger value="generate" className="relative data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Generate
                  </div>
                </TabsTrigger>
                <TabsTrigger value="formats" className="relative data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white">
                  <div className="flex items-center gap-2">
                    <FileBarChart className="h-4 w-4" />
                    Format Library
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="all-documents" className="mt-0">
                  <AllDocumentsSection />
                </TabsContent>

                <TabsContent value="templates" className="mt-0">
                  <TemplatesSection />
                </TabsContent>

                <TabsContent value="generate" className="mt-0">
                  <GenerateDocumentsSection />
                </TabsContent>

                <TabsContent value="formats" className="mt-0">
                  <FormatLibrarySection />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Premium Stats Cards Component
const StatsCards = () => {
  const [stats, setStats] = useState({
    total: 0,
    uploaded: 0,
    templates: 0,
    generated: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await documentService.getDocuments();
        if (result.success && result.data) {
          const documents = result.data;
          const uploadedCount = documents.filter((d: DocumentData) =>
            d.category === "document" || d.category === "image" || d.category === "spreadsheet" || d.category === "presentation" || d.category === "other" || d.category === "uploaded"
          ).length;

          setStats({
            total: documents.length,
            uploaded: uploadedCount,
            templates: documents.filter((d: DocumentData) => d.category === "template").length,
            generated: documents.filter((d: DocumentData) => d.category === "generated").length
          });
        } else {
          setStats({
            total: initialDocuments.length,
            uploaded: initialDocuments.filter(d => d.category === "uploaded").length,
            templates: initialDocuments.filter(d => d.category === "template").length,
            generated: initialDocuments.filter(d => d.category === "generated").length
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats({
          total: initialDocuments.length,
          uploaded: initialDocuments.filter(d => d.category === "uploaded").length,
          templates: initialDocuments.filter(d => d.category === "template").length,
          generated: initialDocuments.filter(d => d.category === "generated").length
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Total Documents"
          value={stats.total}
          icon={<FileStack className="h-6 w-6" />}
          trend="+12%"
          color="from-primary to-blue-500"
          className="shadow-xl"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Uploaded"
          value={stats.uploaded}
          icon={<Upload className="h-6 w-6" />}
          trend="+8%"
          color="from-green-500 to-emerald-500"
          className="shadow-xl"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Templates"
          value={stats.templates}
          icon={<FileCode className="h-6 w-6" />}
          trend="+15%"
          color="from-purple-500 to-violet-500"
          className="shadow-xl"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Generated"
          value={stats.generated}
          icon={<Zap className="h-6 w-6" />}
          trend="+24%"
          color="from-orange-500 to-amber-500"
          className="shadow-xl"
        />
      </motion.div>
    </div>
  );
};

// Premium All Documents Section
const AllDocumentsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const fetchDocuments = async () => {
    console.log("📥 Starting to fetch documents...");
    setIsRefreshing(true);
    setIsLoading(true);
    try {
      const result = await documentService.getDocuments();
      console.log("📥 Fetch result:", result);

      if (result.success && result.data) {
        console.log(`📥 Found ${result.data.length} documents from backend`);
        const formattedDocuments: Document[] = result.data.map((doc: DocumentData) => {
          console.log("📝 Processing document:", doc.originalname);

          let frontendCategory: "uploaded" | "generated" | "template" | "image" | "document" | "spreadsheet" | "presentation" | "other" = "uploaded";

          if (doc.category === "template") {
            frontendCategory = "template";
          } else if (doc.category === "generated") {
            frontendCategory = "generated";
          } else if (doc.category === "image") {
            frontendCategory = "image";
          } else if (doc.category === "document") {
            frontendCategory = "document";
          } else if (doc.category === "spreadsheet") {
            frontendCategory = "spreadsheet";
          } else if (doc.category === "presentation") {
            frontendCategory = "presentation";
          } else if (doc.category === "other") {
            frontendCategory = "other";
          } else if (doc.category === "uploaded") {
            frontendCategory = "uploaded";
          }

          return {
            id: doc._id || doc.id || "",
            name: doc.originalname || doc.name || "Unnamed Document",
            type: documentService.getFileType(doc.mimetype?.split('/')[1] || doc.originalname?.split('.').pop() || doc.name?.split('.').pop() || ''),
            size: documentService.formatFileSize(doc.size || 0),
            uploadedBy: "Admin",
            date: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] :
              doc.date ? new Date(doc.date).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
            category: frontendCategory,
            description: doc.description,
            cloudinaryData: {
              url: doc.url || "",
              publicId: doc.public_id || "",
              format: doc.mimetype?.split('/')[1] || 'unknown'
            }
          };
        });

        console.log(`✅ Formatted ${formattedDocuments.length} documents`);
        setDocuments(formattedDocuments);
      } else {
        console.warn("⚠️ Using fallback documents:", result.message);
        setDocuments(initialDocuments);
        if (result.message) {
          toast.error(result.message || "Failed to load documents");
        }
      }
    } catch (error) {
      console.error("🔥 Error fetching documents:", error);
      setDocuments(initialDocuments);
      toast.error("Unable to connect to server. Using demo data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
      const documentName = formData.get("document-name") as string;
      const description = formData.get("description") as string;
      const folder = formData.get("folder") as string || "documents";
      const category = formData.get("category") as string || "uploaded";

      if (!fileInput.files || fileInput.files.length === 0) {
        toast.error("Please select a file to upload");
        setIsUploading(false);
        return;
      }

      const file = fileInput.files[0];
      console.log("📤 Starting upload process...", {
        fileName: file.name,
        fileSize: file.size,
        documentName: documentName,
        folder: folder,
        category: category,
        description: description
      });

      const uploadResult = await documentService.uploadDocument(
        file,
        folder,
        description || undefined,
        category
      );

      console.log("📤 Upload result:", uploadResult);

      if (uploadResult.success && uploadResult.data) {
        console.log("✅ Document uploaded and saved:", {
          documentId: uploadResult.data.documentId,
          publicId: uploadResult.data.public_id,
          url: uploadResult.data.url,
          category: uploadResult.data.category
        });

        await fetchDocuments();

        toast.success("Document uploaded successfully!");
        setUploadDialogOpen(false);
        (e.target as HTMLFormElement).reset();
      } else {
        console.error("❌ Upload failed:", uploadResult.message);
        toast.error(uploadResult.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("🔥 Upload error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to upload document. Please check your backend connection.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, doc: Document) => {
    try {
      console.log("🗑️ Deleting document:", { docId, documentName: doc.name });

      const isRealMongoId = docId && (docId.length === 24 || /^[0-9a-fA-F]{24}$/.test(docId));

      if (!isRealMongoId) {
        console.log("🗑️ Deleting dummy document from local state");
        setDocuments(prev => prev.filter(d => d.id !== docId));
        toast.success("Document removed from local state");
        return;
      }

      const deleteResult = await documentService.deleteDocument(docId);

      if (deleteResult.success) {
        await fetchDocuments();
        toast.success("Document deleted successfully!");
      } else {
        toast.error(deleteResult.message || "Failed to delete document");
      }
    } catch (error: any) {
      console.error("🔥 Delete error:", error);
      toast.error("Failed to delete document from storage");
    }
  };

  const handleDownloadDocument = async (docName: string, doc?: Document) => {
    try {
      console.log("📥 Downloading document:", docName);

      if (doc?.cloudinaryData?.url) {
        const response = await fetch(doc.cloudinaryData.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = docName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Downloading ${docName}...`);
      } else {
        toast.success(`Downloading ${docName}...`);
      }
    } catch (error) {
      console.error("🔥 Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handleViewDocument = (doc: Document) => {
    if (doc.cloudinaryData?.url) {
      window.open(doc.cloudinaryData.url, '_blank');
      toast.success(`Opening ${doc.name}...`);
    } else {
      toast.error("Document URL not available");
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      try {
        console.log("🔍 Searching for:", searchQuery);
        const result = await documentService.searchDocuments(searchQuery);

        if (result.success && result.data) {
          console.log(`🔍 Found ${result.data.length} documents`);
          const formattedDocuments: Document[] = result.data.map((doc: DocumentData) => {
            let frontendCategory: "uploaded" | "generated" | "template" | "image" | "document" | "spreadsheet" | "presentation" | "other" = "uploaded";

            if (doc.category === "template") {
              frontendCategory = "template";
            } else if (doc.category === "generated") {
              frontendCategory = "generated";
            } else if (doc.category === "image") {
              frontendCategory = "image";
            } else if (doc.category === "document") {
              frontendCategory = "document";
            } else if (doc.category === "spreadsheet") {
              frontendCategory = "spreadsheet";
            } else if (doc.category === "presentation") {
              frontendCategory = "presentation";
            } else if (doc.category === "other") {
              frontendCategory = "other";
            } else if (doc.category === "uploaded") {
              frontendCategory = "uploaded";
            }

            return {
              id: doc._id || doc.id || "",
              name: doc.originalname || doc.name || "Unnamed Document",
              type: documentService.getFileType(doc.mimetype?.split('/')[1] || doc.originalname?.split('.').pop() || doc.name?.split('.').pop() || ''),
              size: documentService.formatFileSize(doc.size || 0),
              uploadedBy: "Admin",
              date: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] :
                doc.date ? new Date(doc.date).toISOString().split('T')[0] :
                  new Date().toISOString().split('T')[0],
              category: frontendCategory,
              description: doc.description,
              cloudinaryData: {
                url: doc.url || "",
                publicId: doc.public_id || "",
                format: doc.mimetype?.split('/')[1] || 'unknown'
              }
            };
          });

          setDocuments(formattedDocuments);
        } else {
          console.warn("🔍 Search failed:", result.message);
          toast.error(result.message || "Search failed");
          fetchDocuments();
        }
      } catch (error) {
        console.error("🔥 Search error:", error);
        toast.error("Search failed");
        fetchDocuments();
      } finally {
        setIsLoading(false);
      }
    } else {
      fetchDocuments();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredDocuments = documents
    .filter(doc =>
      (selectedCategory === "all" || doc.category === selectedCategory) &&
      (doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())))
    )
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "size") {
        const getSize = (size: string) => parseFloat(size) * (size.includes('GB') ? 1024 : size.includes('MB') ? 1 : 0.001);
        return getSize(b.size) - getSize(a.size);
      }
      return 0;
    });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      uploaded: "default",
      template: "secondary",
      generated: "outline",
      image: "default",
      document: "default",
      spreadsheet: "default",
      presentation: "default",
      other: "outline"
    };
    return colors[category] || "outline";
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="h-5 w-5 text-red-500" />;
      case 'DOCX': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'XLSX': return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'JPG': case 'PNG': return <FileImage className="h-5 w-5 text-purple-500" />;
      default: return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const categories = [
    { id: "all", label: "All Categories", count: documents.length, color: "from-primary to-blue-500" },
    { id: "uploaded", label: "Uploaded", count: documents.filter(d => d.category === "uploaded").length, color: "from-green-500 to-emerald-500" },
    { id: "template", label: "Templates", count: documents.filter(d => d.category === "template").length, color: "from-purple-500 to-violet-500" },
    { id: "generated", label: "Generated", count: documents.filter(d => d.category === "generated").length, color: "from-orange-500 to-amber-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold">All Documents</h2>
          <p className="text-muted-foreground">Manage all your documents with enterprise-grade features</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`${viewMode === "grid" ? 'bg-gradient-to-r from-primary to-purple-500' : ''}`}
            >
              <Box className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={`${viewMode === "list" ? 'bg-gradient-to-r from-primary to-purple-500' : ''}`}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={fetchDocuments}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg hover:shadow-xl">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 border-0 overflow-hidden">
              <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Upload New Document</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">Upload your document to the cloud</p>
                </DialogHeader>
              </div>
              <form onSubmit={handleUploadDocument} className="p-6 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* File Upload Zone */}
                  <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-gradient-to-br from-primary/5 to-primary/0">
                    <Upload className="h-12 w-12 text-primary/50 mx-auto mb-4" />
                    <p className="font-medium">Drop your files here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, XLSX, JPG, PNG</p>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      required
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.rar,.ppt,.pptx"
                      disabled={isUploading}
                      className="mt-4 bg-background cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="document-name" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Document Name
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="document-name"
                        name="document-name"
                        placeholder="Enter document name"
                        required
                        disabled={isUploading}
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Category
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Select name="category" defaultValue="uploaded" required disabled={isUploading}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uploaded">Uploaded Document</SelectItem>
                          <SelectItem value="template">Template</SelectItem>
                          <SelectItem value="generated">Generated</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter document description"
                      disabled={isUploading}
                      className="bg-background/50 min-h-[100px]"
                    />
                  </div>
                </motion.div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setUploadDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Document
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Premium Search and Filter */}
      <div className={`${getThemeGradients().glassCard} rounded-2xl p-6 shadow-2xl`}>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search documents by name, type, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent form submission
                    handleSearch();
                  }
                }}
                className="pl-12 h-12 bg-background/50 border-0 text-lg shadow-inner"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12 min-w-[180px] bg-background/50 border-0">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="size">File Size</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setFilterOpen(!filterOpen)}
              className="h-12 gap-2 bg-background/50 border-0"
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Premium Category Filters */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-white/10 dark:border-gray-700/30">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`h-auto py-4 px-4 rounded-xl ${selectedCategory === category.id ? `bg-gradient-to-r ${category.color} text-white` : ''}`}
                  >
                    <div className="text-left w-full">
                      <div className="font-medium">{category.label}</div>
                      <div className="text-xs opacity-80 mt-1">{category.count} documents</div>
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {searchQuery && (
          <div className="flex items-center justify-between mt-6 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl">
            <div className="text-sm">
              Found <span className="font-bold text-primary text-lg">{filteredDocuments.length}</span> document(s)
              {searchQuery && ` for "${searchQuery}"`}
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-xs"
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Premium Documents Display */}
      {viewMode === "list" ? (
        <div className={`${getThemeGradients().glassCard} rounded-2xl overflow-hidden shadow-2xl`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 blur-xl opacity-20"></div>
              </div>
              <span className="text-muted-foreground mt-4 text-lg">Loading documents...</span>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
                  <TableRow className="border-b-0">
                    <TableHead className="h-16 text-foreground/80 font-bold">Document</TableHead>
                    <TableHead className="h-16 text-foreground/80 font-bold">Type</TableHead>
                    <TableHead className="h-16 text-foreground/80 font-bold">Category</TableHead>
                    <TableHead className="h-16 text-foreground/80 font-bold">Size</TableHead>
                    <TableHead className="h-16 text-foreground/80 font-bold">Uploaded</TableHead>
                    <TableHead className="h-16 text-foreground/80 font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <FileSearch className="h-20 w-20 text-muted-foreground/30" />
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl"></div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">No documents found</div>
                            <div className="text-muted-foreground mt-2">
                              {searchQuery ? "Try a different search term" : "Upload your first document to get started"}
                            </div>
                          </div>
                          {!searchQuery && (
                            <DialogTrigger asChild>
                              <Button className="mt-2 gap-2 bg-gradient-to-r from-primary to-purple-500">
                                <Upload className="h-4 w-4" />
                                Upload Document
                              </Button>
                            </DialogTrigger>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence>
                      {filteredDocuments.map((doc, index) => (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="group border-b border-white/10 dark:border-gray-700/30 last:border-0 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/0"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-sm rounded-lg"></div>
                                <div className="relative p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                                  {getFileIcon(doc.type)}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-lg truncate">{doc.name}</div>
                                {doc.description && (
                                  <div className="text-sm text-muted-foreground truncate mt-1">{doc.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-2 px-3 py-1.5">
                              {doc.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`gap-2 px-3 py-1.5 ${doc.category === 'template' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                                doc.category === 'generated' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                                  'bg-gradient-to-r from-green-500 to-emerald-500'
                              }`}>
                              {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{doc.size}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {doc.uploadedBy}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {doc.date}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDocument(doc)}
                                title="View Document"
                                className="h-9 w-9 hover:bg-primary/10 rounded-full"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadDocument(doc.name, doc)}
                                title="Download Document"
                                className="h-9 w-9 hover:bg-primary/10 rounded-full"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDocument(doc.id, doc)}
                                title="Delete Document"
                                className="h-9 w-9 hover:bg-destructive/10 text-destructive rounded-full"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        // Grid View
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <div className={`${getThemeGradients().glassCard} rounded-2xl p-5 hover:shadow-2xl transition-all duration-300`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-sm rounded-lg"></div>
                    <div className="relative p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                      {getFileIcon(doc.type)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <h3 className="font-bold text-lg mb-2 truncate">{doc.name}</h3>
                {doc.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <Badge className={`${doc.category === 'template' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                      doc.category === 'generated' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                        'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}>
                    {doc.category}
                  </Badge>
                  <span className="text-sm font-medium">{doc.size}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {doc.uploadedBy}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {doc.date}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(doc)}
                    className="flex-1 gap-2"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(doc.name, doc)}
                    className="flex-1 gap-2"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Premium Templates Section
const TemplatesSection = () => {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templatesList, setTemplatesList] = useState<Template[]>(templates);

  const fetchTemplates = async () => {
    try {
      const result = await documentService.getDocuments();
      if (result.success && result.data) {
        const backendTemplates: Template[] = result.data
          .filter((doc: DocumentData) => doc.category === "template")
          .map((doc: DocumentData, index: number) => ({
            id: doc._id || String(index + 1),
            name: doc.originalname || doc.name || "Unnamed Template",
            type: documentService.getFileType(doc.mimetype?.split('/')[1] || doc.originalname?.split('.').pop() || '') + ' Template',
            description: doc.description || 'No description',
            lastModified: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] :
              doc.date ? new Date(doc.date).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0]
          }));

        if (backendTemplates.length > 0) {
          setTemplatesList(backendTemplates);
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploadingTemplate(true);

    try {
      const formData = new FormData(e.currentTarget);
      const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
      const templateName = formData.get("template-name") as string;
      const description = formData.get("template-description") as string;

      if (!fileInput.files || fileInput.files.length === 0) {
        toast.error("Please select a template file");
        setIsUploadingTemplate(false);
        return;
      }

      const file = fileInput.files[0];

      const uploadResult = await documentService.uploadDocument(file, "templates", description, "template");

      if (uploadResult.success) {
        console.log("✅ Template uploaded successfully:", uploadResult.data);

        await fetchTemplates();

        toast.success("Template uploaded successfully!");
        setTemplateDialogOpen(false);
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(uploadResult.message || "Template upload failed");
      }
    } catch (error: any) {
      console.error("🔥 Template upload error:", error);
      toast.error("Failed to upload template");
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleUseTemplate = (templateName: string) => {
    toast.success(`Using template: ${templateName}`);
  };

  const handleDownloadTemplate = async (templateName: string, templateId: string) => {
    try {
      const isRealMongoId = templateId && (templateId.length === 24 || /^[0-9a-fA-F]{24}$/.test(templateId));

      if (!isRealMongoId) {
        toast.success(`Downloading ${templateName}...`);
        return;
      }

      const result = await documentService.getDocumentById(templateId);
      if (result.success && result.data) {
        const url = result.data.url;
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = templateName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        toast.success(`Downloading ${templateName}...`);
      } else {
        toast.error("Template URL not found");
      }
    } catch (error) {
      console.error("Download template error:", error);
      toast.error("Failed to download template");
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold">Document Templates</h2>
          <p className="text-muted-foreground">Professional templates for all your document needs</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="gap-1.5 bg-gradient-to-r from-purple-500 to-violet-500">
            <Star className="h-3 w-3" />
            Premium Templates
          </Badge>
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg">
                <Plus className="h-4 w-4" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 border-0 overflow-hidden">
              <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Add New Template</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">Create reusable document templates</p>
                </DialogHeader>
              </div>
              <form onSubmit={handleAddTemplate} className="p-6 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="template-name" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Template Name
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="template-name"
                      name="template-name"
                      placeholder="Enter template name"
                      required
                      disabled={isUploadingTemplate}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-type" className="flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      Template Type
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select name="template-type" required disabled={isUploadingTemplate}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select template type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Template</SelectItem>
                        <SelectItem value="word">Word Document Template</SelectItem>
                        <SelectItem value="excel">Excel Template</SelectItem>
                        <SelectItem value="image">Image Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      id="template-description"
                      name="template-description"
                      placeholder="Enter template description"
                      required
                      disabled={isUploadingTemplate}
                      className="bg-background/50 min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-file" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Template File
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="template-file"
                      name="template-file"
                      type="file"
                      required
                      disabled={isUploadingTemplate}
                      className="bg-background/50 cursor-pointer"
                    />
                  </div>
                </motion.div>
                <Button
                  type="submit"
                  className="w-full gap-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
                  disabled={isUploadingTemplate}
                >
                  {isUploadingTemplate ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading Template...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Add Template
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Premium Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {templatesList.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
          >
            <div className={`${getThemeGradients().glassCard} rounded-2xl p-5 hover:shadow-2xl transition-all duration-300 h-full`}>
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-500/20 blur-sm rounded-lg"></div>
                  <div className="relative p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                    <FileCode className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              <h3 className="font-bold text-lg mb-2 truncate">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>

              <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-violet-500">
                {template.type}
              </Badge>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Clock className="h-3 w-3" />
                Last modified: {template.lastModified}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template.name)}
                  className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-violet-500"
                >
                  <Sparkles className="h-3 w-3" />
                  Use Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate(template.name, template.id)}
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Premium Generate Documents Section
const GenerateDocumentsSection = () => {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const formData = new FormData(e.currentTarget);
      const documentType = formData.get("document-type") as string;
      const documentName = formData.get("generated-doc-name") as string;
      const outputFormat = formData.get("output-format") as string;

      await new Promise(resolve => setTimeout(resolve, 2000));

      const generatedDoc: GeneratedDocument = {
        name: documentName,
        type: documentService.getFileType(outputFormat),
        size: documentService.formatFileSize(1024 * 1024),
        category: "generated",
        description: `Generated ${documentType} document`
      };

      console.log("Generated document:", generatedDoc);

      toast.success(`${documentType} "${documentName}" generated successfully!`);
      setGenerateDialogOpen(false);
      (e.target as HTMLFormElement).reset();
      setSelectedTemplate("");
    } catch (error) {
      console.error("Generate error:", error);
      toast.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

  const quickGenerateOptions = [
    {
      name: "Salary Slip",
      type: "DOCX",
      description: "Generate employee salary slip",
      icon: <FileText className="h-5 w-5" />,
      gradient: "from-green-500 to-emerald-500",
      badge: "HR"
    },
    {
      name: "Invoice",
      type: "PDF",
      description: "Create professional invoice",
      icon: <FileText className="h-5 w-5" />,
      gradient: "from-blue-500 to-cyan-500",
      badge: "Finance"
    },
    {
      name: "Report",
      type: "XLSX",
      description: "Generate data report",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      gradient: "from-purple-500 to-violet-500",
      badge: "Analytics"
    },
    {
      name: "Certificate",
      type: "DOCX",
      description: "Create experience certificate",
      icon: <FileText className="h-5 w-5" />,
      gradient: "from-orange-500 to-amber-500",
      badge: "HR"
    }
  ];

  const handleQuickGenerate = async (docType: string) => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Generating ${docType}...`);
    } catch (error) {
      toast.error(`Failed to generate ${docType}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <div className={`${getThemeGradients().premiumCard} rounded-2xl p-8`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 blur-xl rounded-full"></div>
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-white to-white/80 dark:from-gray-900 dark:to-gray-800 shadow-lg">
                <ZapIcon className="h-8 w-8 bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI-Powered Document Generation</h2>
              <p className="text-muted-foreground">Generate documents instantly using advanced AI templates</p>
            </div>
          </div>
          <Badge className="gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500">
            <Sparkle className="h-3 w-3" />
            AI Powered
          </Badge>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Premium Quick Generate */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Quick Generate</h3>
            <Badge variant="outline" className="gap-1.5">
              <Zap className="h-3 w-3" />
              Instant Generation
            </Badge>
          </div>
          <div className="grid gap-4">
            {quickGenerateOptions.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 5, transition: { duration: 0.2 } }}
              >
                <div className={`${getThemeGradients().glassCard} rounded-2xl p-5 hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${option.gradient}`}>
                        {option.icon}
                      </div>
                      <div>
                        <div className="font-bold">{option.name}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                    <Badge className={`bg-gradient-to-r ${option.gradient}`}>
                      {option.badge}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="gap-1.5">
                      {option.type}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handleQuickGenerate(option.name)}
                      disabled={isGenerating}
                      className={`gap-2 bg-gradient-to-r ${option.gradient}`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Premium Custom Generation */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Custom Generation</h3>
            <Badge variant="outline" className="gap-1.5">
              <Crown className="h-3 w-3" />
              Advanced
            </Badge>
          </div>

          <div className={`${getThemeGradients().glassCard} rounded-2xl p-6`}>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generate-template" className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    Select Template
                  </Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">Salary Slip Template</SelectItem>
                      <SelectItem value="invoice">Invoice Template</SelectItem>
                      <SelectItem value="report">Report Template</SelectItem>
                      <SelectItem value="certificate">Certificate Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      disabled={!selectedTemplate || isGenerating}
                      size="lg"
                    >
                      <Sparkles className="h-4 w-4" />
                      Configure & Generate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] p-0 border-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Generate Document</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">Configure and generate your document</p>
                      </DialogHeader>
                    </div>
                    <form onSubmit={handleGenerateDocument} className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="document-type">
                            Document Type
                          </Label>
                          <Input
                            id="document-type"
                            name="document-type"
                            value={selectedTemplate}
                            readOnly
                            className="bg-background/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="output-format" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Output Format
                            <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Select name="output-format" required disabled={isGenerating}>
                            <SelectTrigger className="bg-background/50">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PDF">PDF</SelectItem>
                              <SelectItem value="DOCX">Word Document</SelectItem>
                              <SelectItem value="XLSX">Excel Spreadsheet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="generated-doc-name" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Document Name
                            <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Input
                            id="generated-doc-name"
                            name="generated-doc-name"
                            placeholder="Enter document name"
                            required
                            disabled={isGenerating}
                            className="bg-background/50"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Generate Document
                          </>
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Features List */}
              <div className="pt-6 border-t border-white/10 dark:border-gray-700/30">
                <h4 className="font-bold mb-3">Advanced Features</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Cpu className="h-4 w-4" />, text: "AI-Powered" },
                    { icon: <Sparkle className="h-4 w-4" />, text: "Smart Templates" },
                    { icon: <Database className="h-4 w-4" />, text: "Data Integration" },
                    { icon: <Target className="h-4 w-4" />, text: "Custom Logic" },
                    { icon: <ShieldCheck className="h-4 w-4" />, text: "Secure" },
                    { icon: <Rocket className="h-4 w-4" />, text: "Fast Processing" },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        {feature.icon}
                      </div>
                      {feature.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Premium Format Library Section
const FormatLibrarySection = () => {
  const handleDownloadFormat = (formatName: string) => {
    toast.success(`Downloading ${formatName} format guidelines...`);
  };

  const getFormatIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="h-6 w-6" />;
      case 'XLSX': return <FileSpreadsheet className="h-6 w-6" />;
      case 'DOCX': return <FileText className="h-6 w-6" />;
      case 'JPG': return <FileImage className="h-6 w-6" />;
      default: return <FileText className="h-6 w-6" />;
    }
  };

  const getFormatGradient = (type: string) => {
    switch (type) {
      case 'PDF': return "from-red-500 to-pink-500";
      case 'XLSX': return "from-green-500 to-emerald-500";
      case 'DOCX': return "from-blue-500 to-cyan-500";
      case 'JPG': return "from-purple-500 to-violet-500";
      default: return "from-gray-500 to-gray-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold">Format Library</h2>
          <p className="text-muted-foreground">Industry-standard formats and guidelines</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500">
            <Award className="h-3 w-3" />
            Certified Standards
          </Badge>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download All
          </Button>
        </div>
      </div>

      {/* Premium Format Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {formatLibrary.map((format, index) => (
          <motion.div
            key={format.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
          >
            <div className={`${getThemeGradients().glassCard} rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 h-full`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getFormatGradient(format.type)}`}>
                  {getFormatIcon(format.type)}
                </div>
                <Badge className={`bg-gradient-to-r ${getFormatGradient(format.type)}`}>
                  {format.size}
                </Badge>
              </div>

              <h3 className="font-bold text-lg mb-2">{format.name}</h3>
              <Badge variant="outline" className="mb-4">
                {format.type}
              </Badge>

              <p className="text-sm text-muted-foreground mb-6 line-clamp-3">{format.description}</p>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleDownloadFormat(format.name)}
              >
                <Download className="h-4 w-4" />
                Download Guidelines
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Premium Info Card */}
      <div className={`${getThemeGradients().premiumCard} rounded-2xl p-8`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-xl rounded-full"></div>
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-white to-white/80 dark:from-gray-900 dark:to-gray-800 shadow-lg">
              <ShieldCheck className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Format Standards Compliance</h3>
            <p className="text-muted-foreground">
              All formats follow industry standards ISO/IEC 26300, ISO 32000-1 and comply with GDPR,
              HIPAA regulations for maximum security and compatibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Premium StatCard Component
const StatCard = ({
  title,
  value,
  icon,
  trend,
  color = "from-primary to-blue-500",
  className = ""
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
  className?: string;
}) => (
  <div className={`${getThemeGradients().glassCard} rounded-2xl p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm">
        {icon}
      </div>
      {trend && (
        <Badge className={`bg-gradient-to-r ${color}`}>
          {trend}
        </Badge>
      )}
    </div>

    <div className="mb-2">
      <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>

    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
        style={{ width: `${Math.min(value * 2, 100)}%` }}
      ></div>
    </div>
  </div>
);

export default Documents;