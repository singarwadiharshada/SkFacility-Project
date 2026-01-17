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
import { Plus, Search, FileText, Download, Eye, Trash2, Edit, FileUp, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
    description: "Portable Document Format",
    size: "Standard"
  },
  {
    id: "2",
    name: "Excel Spreadsheet",
    type: "XLSX",
    description: "Microsoft Excel format",
    size: "Standard"
  },
  {
    id: "3",
    name: "Word Document",
    type: "DOCX",
    description: "Microsoft Word format",
    size: "Standard"
  },
  {
    id: "4",
    name: "JPEG Image",
    type: "JPG",
    description: "Joint Photographic Experts Group",
    size: "Standard"
  }
];

// Main Component
const Documents = () => {
  const [activeTab, setActiveTab] = useState("all-documents");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Documents Management" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <StatsCards />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="all-documents">All Documents</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="generate">Generate Documents</TabsTrigger>
            <TabsTrigger value="formats">Format Library</TabsTrigger>
          </TabsList>

          <TabsContent value="all-documents">
            <AllDocumentsSection />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesSection />
          </TabsContent>

          <TabsContent value="generate">
            <GenerateDocumentsSection />
          </TabsContent>

          <TabsContent value="formats">
            <FormatLibrarySection />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

// Stats Cards Component
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
          // Map backend categories to frontend categories
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
          // Fallback to initial documents
          setStats({
            total: initialDocuments.length,
            uploaded: initialDocuments.filter(d => d.category === "uploaded").length,
            templates: initialDocuments.filter(d => d.category === "template").length,
            generated: initialDocuments.filter(d => d.category === "generated").length
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Use initial documents as fallback
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
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard title="Total Documents" value={stats.total} />
      <StatCard title="Uploaded" value={stats.uploaded} className="text-primary" />
      <StatCard title="Templates" value={stats.templates} className="text-accent" />
      <StatCard title="Generated" value={stats.generated} className="text-green-600" />
    </div>
  );
};

// All Documents Section
const AllDocumentsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch documents from backend
  const fetchDocuments = async () => {
    console.log("📥 Starting to fetch documents...");
    setIsRefreshing(true);
    setIsLoading(true);
    try {
      const result = await documentService.getDocuments();
      console.log("📥 Fetch result:", result);
      
      if (result.success && result.data) {
        console.log(`📥 Found ${result.data.length} documents from backend`);
        // Transform the backend data to match your Document type
        const formattedDocuments: Document[] = result.data.map((doc: DocumentData) => {
          console.log("📝 Processing document:", doc.originalname);
          
          // Map backend category to frontend category
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
            uploadedBy: "Admin", // You can update this when you add authentication
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
      setDocuments(initialDocuments); // Fallback
      toast.error("Unable to connect to server. Using demo data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch documents on component mount
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
      const category = formData.get("category") as string || "uploaded"; // Get category
      
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

      // Upload to Cloudinary AND save to database in ONE step
      // The uploadSingle endpoint handles both Cloudinary upload and database save
      const uploadResult = await documentService.uploadDocument(
        file, 
        folder, 
        description || undefined,
        category // Pass category to upload
      );
      
      console.log("📤 Upload result:", uploadResult);
      
      if (uploadResult.success && uploadResult.data) {
        console.log("✅ Document uploaded and saved:", {
          documentId: uploadResult.data.documentId,
          publicId: uploadResult.data.public_id,
          url: uploadResult.data.url,
          category: uploadResult.data.category
        });
        
        // Refresh the documents list
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
      
      // Check if it's a real MongoDB ID or a dummy ID
      const isRealMongoId = docId && (docId.length === 24 || /^[0-9a-fA-F]{24}$/.test(docId));
      
      if (!isRealMongoId) {
        // It's a dummy document from initialDocuments array
        console.log("🗑️ Deleting dummy document from local state");
        setDocuments(prev => prev.filter(d => d.id !== docId));
        toast.success("Document removed from local state");
        return;
      }
      
      // Delete from backend (which will delete from Cloudinary and database)
      const deleteResult = await documentService.deleteDocument(docId);
      
      if (deleteResult.success) {
        // Refresh the documents list
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
      
      // If document has Cloudinary URL, download from there
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
        // Fallback to dummy download
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

  // Search functionality
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      try {
        console.log("🔍 Searching for:", searchQuery);
        const result = await documentService.searchDocuments(searchQuery);
        
        if (result.success && result.data) {
          console.log(`🔍 Found ${result.data.length} documents`);
          const formattedDocuments: Document[] = result.data.map((doc: DocumentData) => {
            // Map backend category to frontend category
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
          // Restore all documents on search error
          fetchDocuments();
        }
      } catch (error) {
        console.error("🔥 Search error:", error);
        toast.error("Search failed");
        // Restore all documents on search error
        fetchDocuments();
      } finally {
        setIsLoading(false);
      }
    } else {
      // If search is empty, fetch all documents
      fetchDocuments();
    }
  };

  // Add search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>All Documents</CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchDocuments}
            disabled={isRefreshing}
            size="sm"
            title="Refresh documents"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-name">
                    Document Name
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input 
                    id="document-name" 
                    name="document-name" 
                    placeholder="Enter document name" 
                    required 
                    disabled={isUploading}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="document-type">
                      Document Type
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select name="document-type" required disabled={isUploading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="XLSX">Excel (XLSX)</SelectItem>
                        <SelectItem value="DOCX">Word (DOCX)</SelectItem>
                        <SelectItem value="JPG">JPG Image</SelectItem>
                        <SelectItem value="PNG">PNG Image</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="folder">Folder</Label>
                    <Select name="folder" disabled={isUploading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="templates">Templates</SelectItem>
                        <SelectItem value="reports">Reports</SelectItem>
                        <SelectItem value="invoices">Invoices</SelectItem>
                        <SelectItem value="certificates">Certificates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select name="category" defaultValue="uploaded" required disabled={isUploading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uploaded">Uploaded Document</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="generated">Generated</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                        <SelectItem value="presentation">Presentation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">
                      Select File
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input 
                      id="file" 
                      name="file" 
                      type="file" 
                      required 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.rar,.ppt,.pptx"
                      disabled={isUploading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Enter document description" 
                    disabled={isUploading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Document'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by name, type, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="text-sm text-muted-foreground mt-2">
              Found {filteredDocuments.length} document(s)
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading documents...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No documents match your search" : "No documents found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <div>
                          <div>{doc.name}</div>
                          {doc.description && (
                            <div className="text-sm text-muted-foreground">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryColor(doc.category)}>
                        {doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc.size}</TableCell>
                    <TableCell>{doc.uploadedBy}</TableCell>
                    <TableCell>{doc.date}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleViewDocument(doc)}
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadDocument(doc.name, doc)}
                          title="Download Document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteDocument(doc.id, doc)}
                          title="Delete Document"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// Templates Section
const TemplatesSection = () => {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templatesList, setTemplatesList] = useState<Template[]>(templates);

  // Fetch templates from backend
  const fetchTemplates = async () => {
    try {
      const result = await documentService.getDocuments();
      if (result.success && result.data) {
        // Filter for template category and map to Template type
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
        
        // If no templates from backend, use default ones
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
      
      // Upload template to backend with category "template"
      const uploadResult = await documentService.uploadDocument(file, "templates", description, "template");
      
      if (uploadResult.success) {
        console.log("✅ Template uploaded successfully:", uploadResult.data);
        
        // Refresh templates list
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
    // Logic to use template would go here
  };

  const handleDownloadTemplate = async (templateName: string, templateId: string) => {
    try {
      // Check if it's a real MongoDB ID or dummy ID
      const isRealMongoId = templateId && (templateId.length === 24 || /^[0-9a-fA-F]{24}$/.test(templateId));
      
      if (!isRealMongoId) {
        // It's a dummy template
        toast.success(`Downloading ${templateName}...`);
        return;
      }
      
      // Fetch template details from backend
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Document Templates</CardTitle>
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Template</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTemplate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">
                    Template Name
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input 
                    id="template-name" 
                    name="template-name" 
                    placeholder="Enter template name" 
                    required 
                    disabled={isUploadingTemplate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-type">
                    Template Type
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select name="template-type" required disabled={isUploadingTemplate}>
                    <SelectTrigger>
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
                  <Label htmlFor="template-description">
                    Description
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea 
                    id="template-description" 
                    name="template-description" 
                    placeholder="Enter template description" 
                    required 
                    disabled={isUploadingTemplate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-file">
                    Upload Template File
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input 
                    id="template-file" 
                    name="template-file"
                    type="file" 
                    required 
                    disabled={isUploadingTemplate}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isUploadingTemplate}
                >
                  {isUploadingTemplate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading Template...
                    </>
                  ) : (
                    'Add Template'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templatesList.map((template) => (
              <Card key={template.id} className="relative hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {template.name}
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline">{template.type}</Badge>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <div className="text-xs text-muted-foreground">
                    Last modified: {template.lastModified}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleUseTemplate(template.name)}
                      className="flex-1"
                    >
                      Use Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadTemplate(template.name, template.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Generate Documents Section
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
      
      // Simulate document generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a generated document with correct types
      const generatedDoc: GeneratedDocument = {
        name: documentName,
        type: documentService.getFileType(outputFormat), // Map format to type
        size: documentService.formatFileSize(1024 * 1024), // Formatted string
        category: "generated",
        description: `Generated ${documentType} document`
      };
      
      console.log("Generated document:", generatedDoc);
      
      // In a real implementation, you would:
      // 1. Call an API to actually generate the document
      // 2. Save it to backend
      // 3. Refresh the documents list
      
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
    { name: "Salary Slip", type: "DOCX", description: "Generate employee salary slip" },
    { name: "Invoice", type: "PDF", description: "Create professional invoice" },
    { name: "Report", type: "XLSX", description: "Generate data report" },
    { name: "Certificate", type: "DOCX", description: "Create experience certificate" }
  ];

  const handleQuickGenerate = async (docType: string) => {
    setIsGenerating(true);
    try {
      // Simulate generation process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, you would:
      // 1. Call your generation API
      // 2. Save the document metadata
      // 3. Possibly redirect to the new document
      
      toast.success(`Generating ${docType}...`);
      // Refresh the main documents list if needed
    } catch (error) {
      toast.error(`Failed to generate ${docType}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Generate</h3>
              <div className="grid gap-3">
                {quickGenerateOptions.map((option, index) => (
                  <Card key={index} className="p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleQuickGenerate(option.name)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Custom Document Generation</h3>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="generate-template">Select Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
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
                      <Button className="w-full" disabled={!selectedTemplate || isGenerating}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Configure & Generate
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Document</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleGenerateDocument} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="document-type">
                            Document Type
                          </Label>
                          <Input 
                            id="document-type" 
                            name="document-type" 
                            value={selectedTemplate}
                            readOnly 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="output-format">
                            Output Format
                            <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Select name="output-format" required disabled={isGenerating}>
                            <SelectTrigger>
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
                          <Label htmlFor="generated-doc-name">
                            Document Name
                            <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Input 
                            id="generated-doc-name" 
                            name="generated-doc-name" 
                            placeholder="Enter document name" 
                            required 
                            disabled={isGenerating}
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate Document'
                          )}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Format Library Section
const FormatLibrarySection = () => {
  const handleDownloadFormat = (formatName: string) => {
    toast.success(`Downloading ${formatName} format guidelines...`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Format Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {formatLibrary.map((format) => (
              <Card key={format.id} className="relative hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {format.name}
                    <Badge variant="outline">{format.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{format.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Size:{format.size}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadFormat(format.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Reusable Components
const StatCard = ({ title, value, className = "" }: { title: string; value: number; className?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${className}`}>{value}</div>
    </CardContent>
  </Card>
);

export default Documents;