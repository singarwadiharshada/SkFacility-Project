import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Edit,
  Trash2,
  Upload,
  CalendarDays,
  Clock4,
  User,
  Building,
  Target,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  RefreshCw
} from "lucide-react";
import { format } from 'date-fns';

// Import API functions from your API files
import { trainingApi } from '@/api/trainingApi';
import { briefingApi } from '@/api/briefingApi';

// Types
interface TrainingSession {
  _id: string;
  id: string;
  title: string;
  description: string;
  type: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'other';
  date: string;
  time: string;
  duration: string;
  trainer: string;
  supervisor: string;
  site: string;
  department: string;
  attendees: string[];
  maxAttendees: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  attachments: Attachment[];
  feedback: Feedback[];
  location: string;
  objectives: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface StaffBriefing {
  _id: string;
  id: string;
  date: string;
  time: string;
  conductedBy: string;
  site: string;
  department: string;
  attendeesCount: number;
  topics: string[];
  keyPoints: string[];
  actionItems: ActionItem[];
  attachments: Attachment[];
  notes: string;
  shift: 'morning' | 'evening' | 'night';
  createdAt?: string;
  updatedAt?: string;
}

interface Attachment {
  _id?: string;
  id?: string;
  name: string;
  type: 'image' | 'document' | 'video';
  url: string;
  size: string;
  uploadedAt: string;
}

interface Feedback {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

interface ActionItem {
  _id?: string;
  id?: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

// Sample data (fallback)
const sampleTrainingSessions: TrainingSession[] = [
  {
    _id: 'TRN001',
    id: 'TRN001',
    title: 'Fire Safety Training',
    description: 'Comprehensive fire safety training covering evacuation procedures, fire extinguifier usage, and emergency response protocols.',
    type: 'safety',
    date: '2024-12-15',
    time: '10:00 AM',
    duration: '3 hours',
    trainer: 'John Safety Officer',
    supervisor: 'Manager Smith',
    site: 'Main Building',
    department: 'All Departments',
    attendees: ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'],
    maxAttendees: 20,
    status: 'scheduled',
    attachments: [
      { id: 'ATT001', name: 'fire_safety_manual.pdf', type: 'document', url: '#', size: '2.4 MB', uploadedAt: '2024-12-01' },
      { id: 'ATT002', name: 'evacuation_plan.jpg', type: 'image', url: '#', size: '1.2 MB', uploadedAt: '2024-12-01' }
    ],
    feedback: [],
    location: 'Main Conference Room',
    objectives: ['Understand fire safety protocols', 'Learn evacuation procedures', 'Practice fire extinguifier usage']
  },
];

const sampleStaffBriefings: StaffBriefing[] = [
  {
    _id: 'BRI001',
    id: 'BRI001',
    date: '2024-12-12',
    time: '08:00 AM',
    conductedBy: 'Manager Smith',
    site: 'Main Building',
    department: 'Housekeeping',
    attendeesCount: 25,
    topics: ['Daily tasks allocation', 'Safety reminders', 'Quality standards'],
    keyPoints: ['Focus on common areas', 'Check equipment before use', 'Report any issues immediately'],
    actionItems: [
      { id: 'ACT001', description: 'Clean lobby area', assignedTo: 'Team A', dueDate: '2024-12-12', status: 'completed', priority: 'high' },
      { id: 'ACT002', description: 'Inspect cleaning equipment', assignedTo: 'Team B', dueDate: '2024-12-13', status: 'pending', priority: 'medium' }
    ],
    attachments: [
      { id: 'ATT006', name: 'briefing_notes.pdf', type: 'document', url: '#', size: '0.8 MB', uploadedAt: '2024-12-12' }
    ],
    notes: 'All team members present. Emphasized on maintaining hygiene standards.',
    shift: 'morning'
  },
];

const departments = ['All Departments', 'Housekeeping', 'Security', 'Maintenance', 'Operations', 'Front Desk', 'Administration', 'IT Support'];
const trainingTypes = [
  { value: 'safety', label: 'Safety Training', color: 'bg-red-100 text-red-800' },
  { value: 'technical', label: 'Technical Training', color: 'bg-blue-100 text-blue-800' },
  { value: 'soft_skills', label: 'Soft Skills', color: 'bg-green-100 text-green-800' },
  { value: 'compliance', label: 'Compliance', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];
const shifts = ['morning', 'evening', 'night'];
const priorities = ['low', 'medium', 'high'];
const supervisors = ['John Safety Officer', 'Robert Engineer', 'Sarah Customer Manager', 'Manager Smith', 'Supervisor Lee', 'Manager Garcia', 'Team Lead Brown'];

const PriceCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'training' | 'briefing'>('training');
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [staffBriefings, setStaffBriefings] = useState<StaffBriefing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddBriefing, setShowAddBriefing] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingSession | null>(null);
  const [selectedBriefing, setSelectedBriefing] = useState<StaffBriefing | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrainings: 0,
    staffBriefings: 0,
    completedTraining: 0,
    pendingActions: 0
  });

  // Form states for training
  const [trainingForm, setTrainingForm] = useState({
    title: '',
    description: '',
    type: 'safety' as const,
    date: '',
    time: '',
    duration: '',
    trainer: '',
    site: '',
    department: 'All Departments',
    maxAttendees: 20,
    location: '',
    objectives: [''] as string[]
  });

  // Form states for briefing
  const [briefingForm, setBriefingForm] = useState({
    date: '',
    time: '',
    conductedBy: '',
    site: '',
    department: '',
    attendeesCount: 0,
    topics: [''] as string[],
    keyPoints: [''] as string[],
    actionItems: [] as Omit<ActionItem, 'id'>[],
    notes: '',
    shift: 'morning' as const
  });

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchTrainingSessions();
    fetchStaffBriefings();
    fetchStats();
  }, [searchTerm, filterDepartment, filterStatus]);

  const fetchTrainingSessions = async () => {
    try {
      setLoading(true);
      const filters = {
        department: filterDepartment === 'all' ? '' : filterDepartment,
        status: filterStatus === 'all' ? '' : filterStatus,
        search: searchTerm
      };
      
      const response = await trainingApi.getAllTrainings(filters);
      setTrainingSessions(response.trainings || response.data || []);
    } catch (error: any) {
      console.error('Error fetching training sessions:', error);
      toast.error('Error fetching training sessions');
      // Fallback to sample data if API fails
      setTrainingSessions(sampleTrainingSessions);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffBriefings = async () => {
    try {
      const filters = {
        department: filterDepartment === 'all' ? '' : filterDepartment,
        search: searchTerm
      };
      
      const response = await briefingApi.getAllBriefings(filters);
      setStaffBriefings(response.briefings || response.data || []);
    } catch (error: any) {
      console.error('Error fetching staff briefings:', error);
      toast.error('Error fetching staff briefings');
      // Fallback to sample data if API fails
      setStaffBriefings(sampleStaffBriefings);
    }
  };

  const fetchStats = async () => {
    try {
      const [trainingStats, briefingStats] = await Promise.all([
        trainingApi.getTrainingStats(),
        briefingApi.getBriefingStats()
      ]);
      
      setStats({
        totalTrainings: trainingStats.data?.totalTrainings || trainingSessions.length,
        staffBriefings: briefingStats.data?.totalBriefings || staffBriefings.length,
        completedTraining: trainingStats.data?.completedTrainings || 
                          trainingSessions.filter(t => t.status === 'completed').length,
        pendingActions: briefingStats.data?.pendingActions || 
                       staffBriefings.reduce((acc, briefing) => 
                         acc + briefing.actionItems.filter(a => a.status === 'pending').length, 0
                       )
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Calculate stats from local data if API fails
      setStats({
        totalTrainings: trainingSessions.length,
        staffBriefings: staffBriefings.length,
        completedTraining: trainingSessions.filter(t => t.status === 'completed').length,
        pendingActions: staffBriefings.reduce((acc, briefing) => 
          acc + briefing.actionItems.filter(a => a.status === 'pending').length, 0
        )
      });
    }
  };

  // Filter training sessions (client-side fallback)
  const filteredTrainingSessions = trainingSessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.supervisor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.site.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || session.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Filter staff briefings (client-side fallback)
  const filteredStaffBriefings = staffBriefings.filter(briefing => {
    const matchesSearch = briefing.conductedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         briefing.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         briefing.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDepartment = filterDepartment === 'all' || briefing.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added`);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    toast.info('File removed');
  };

  // Add training session
const handleAddTraining = async () => {
  if (!trainingForm.title || !trainingForm.date || !trainingForm.trainer) {
    toast.error('Please fill in all required fields');
    return;
  }

  try {
    // Create a simplified training data object
    const trainingData = {
      title: trainingForm.title,
      description: trainingForm.description || '',
      type: trainingForm.type,
      date: trainingForm.date,
      time: trainingForm.time || '',
      duration: trainingForm.duration || '',
      trainer: trainingForm.trainer,
      site: trainingForm.site || '',
      department: trainingForm.department,
      maxAttendees: trainingForm.maxAttendees || 20,
      location: trainingForm.location || '',
      objectives: trainingForm.objectives.filter(obj => obj.trim() !== '')
    };

    console.log('Sending training data:', trainingData);
    console.log('Attachments:', attachments.length);

    // Test without files first
    const response = await trainingApi.createTraining(trainingData, []);

    console.log('API response:', response);
    
    // If successful, refresh data
    await fetchTrainingSessions();
    await fetchStats();
    
    // Reset form
    setTrainingForm({
      title: '',
      description: '',
      type: 'safety',
      date: '',
      time: '',
      duration: '',
      trainer: '',
      site: '',
      department: 'All Departments',
      maxAttendees: 20,
      location: '',
      objectives: ['']
    });
    setAttachments([]);
    setShowAddTraining(false);
    
    toast.success(response.message || 'Training session added successfully');
  } catch (error: any) {
    console.error('Full error:', error);
    console.error('Error response:', error.response?.data);
    toast.error(error.response?.data?.message || error.message || 'Error adding training session');
  }
};

  // Add staff briefing
const handleAddBriefing = async () => {
  if (!briefingForm.date || !briefingForm.conductedBy || !briefingForm.site) {
    toast.error('Please fill in all required fields');
    return;
  }

  try {
    console.log('=== Frontend: Creating briefing ===');
    
    // Prepare action items
    const actionItems = briefingForm.actionItems.map(item => ({
      description: item.description,
      assignedTo: item.assignedTo,
      dueDate: item.dueDate,
      status: item.status || 'pending',
      priority: item.priority || 'medium'
    }));

    const briefingData = {
      date: briefingForm.date,
      time: briefingForm.time || '',
      conductedBy: briefingForm.conductedBy,
      site: briefingForm.site,
      department: briefingForm.department || '',
      attendeesCount: briefingForm.attendeesCount || 0,
      topics: briefingForm.topics.filter(topic => topic.trim() !== ''),
      keyPoints: briefingForm.keyPoints.filter(point => point.trim() !== ''),
      actionItems: actionItems,
      notes: briefingForm.notes || '',
      shift: briefingForm.shift
    };

    console.log('Briefing data to send:', briefingData);
    console.log('Attachments:', attachments.length);

    // First test without files
    const response = await briefingApi.createBriefing(briefingData, []);

    console.log('API response:', response);
    
    // Refresh the briefing list
    await fetchStaffBriefings();
    await fetchStats();
    
    // Reset form
    setBriefingForm({
      date: '',
      time: '',
      conductedBy: '',
      site: '',
      department: '',
      attendeesCount: 0,
      topics: [''],
      keyPoints: [''],
      actionItems: [] as Omit<ActionItem, 'id'>[],
      notes: '',
      shift: 'morning'
    });
    setAttachments([]);
    setShowAddBriefing(false);
    
    toast.success(response.message || 'Staff briefing added successfully');
  } catch (error: any) {
    console.error('Full error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error message:', error.message);
    toast.error(error.response?.data?.message || error.message || 'Error adding staff briefing');
  }
};

  // Delete training session
  const deleteTraining = async (id: string) => {
    try {
      await trainingApi.deleteTraining(id);
      // Refresh the list
      await fetchTrainingSessions();
      await fetchStats();
      toast.success('Training session deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting training session');
    }
  };

  // Delete briefing
  const deleteBriefing = async (id: string) => {
    try {
      await briefingApi.deleteBriefing(id);
      // Refresh the list
      await fetchStaffBriefings();
      await fetchStats();
      toast.success('Staff briefing deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting staff briefing');
    }
  };

  // Update training status
  const updateTrainingStatus = async (id: string, status: TrainingSession['status']) => {
    try {
      await trainingApi.updateTrainingStatus(id, status);
      // Refresh the list
      await fetchTrainingSessions();
      await fetchStats();
      toast.success(`Training status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating training status');
    }
  };

  // Update action item status
  const updateActionItemStatus = async (
    briefingId: string, 
    actionItemId: string, 
    status: ActionItem['status']
  ) => {
    try {
      await briefingApi.updateActionItemStatus(briefingId, actionItemId, status);
      // Refresh the list
      await fetchStaffBriefings();
      await fetchStats();
      toast.success('Action item status updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating action item status');
    }
  };

  // Add objective field
  const addObjective = () => {
    setTrainingForm(prev => ({
      ...prev,
      objectives: [...prev.objectives, '']
    }));
  };

  // Remove objective field
  const removeObjective = (index: number) => {
    setTrainingForm(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  // Update objective
  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...trainingForm.objectives];
    newObjectives[index] = value;
    setTrainingForm(prev => ({ ...prev, objectives: newObjectives }));
  };

  // Add topic field
  const addTopic = () => {
    setBriefingForm(prev => ({
      ...prev,
      topics: [...prev.topics, '']
    }));
  };

  // Remove topic field
  const removeTopic = (index: number) => {
    setBriefingForm(prev => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index)
    }));
  };

  // Update topic
  const updateTopic = (index: number, value: string) => {
    const newTopics = [...briefingForm.topics];
    newTopics[index] = value;
    setBriefingForm(prev => ({ ...prev, topics: newTopics }));
  };

  // Add key point field
  const addKeyPoint = () => {
    setBriefingForm(prev => ({
      ...prev,
      keyPoints: [...prev.keyPoints, '']
    }));
  };

  // Remove key point field
  const removeKeyPoint = (index: number) => {
    setBriefingForm(prev => ({
      ...prev,
      keyPoints: prev.keyPoints.filter((_, i) => i !== index)
    }));
  };

  // Update key point
  const updateKeyPoint = (index: number, value: string) => {
    const newKeyPoints = [...briefingForm.keyPoints];
    newKeyPoints[index] = value;
    setBriefingForm(prev => ({ ...prev, keyPoints: newKeyPoints }));
  };

  // Add action item
  const addActionItem = () => {
    setBriefingForm(prev => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        {
          description: '',
          assignedTo: '',
          dueDate: '',
          status: 'pending',
          priority: 'medium'
        }
      ]
    }));
  };

  // Remove action item
  const removeActionItem = (index: number) => {
    setBriefingForm(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter((_, i) => i !== index)
    }));
  };

  // Update action item
  const updateActionItem = (index: number, field: keyof ActionItem, value: string) => {
    const newActionItems = [...briefingForm.actionItems];
    newActionItems[index] = { ...newActionItems[index], [field]: value };
    setBriefingForm(prev => ({ ...prev, actionItems: newActionItems }));
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority badge color
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get shift badge color
  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'morning': return 'bg-blue-100 text-blue-800';
      case 'evening': return 'bg-purple-100 text-purple-800';
      case 'night': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Calendar navigation
  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  // Get events for calendar
  const getCalendarEvents = () => {
    const events = [];
    
    // Training events
    trainingSessions.forEach(session => {
      events.push({
        id: session._id,
        title: session.title,
        date: session.date,
        type: 'training',
        color: 'bg-blue-500',
        session
      });
    });
    
    // Briefing events
    staffBriefings.forEach(briefing => {
      events.push({
        id: briefing._id,
        title: `Briefing - ${briefing.department}`,
        date: briefing.date,
        type: 'briefing',
        color: 'bg-green-500',
        briefing
      });
    });
    
    return events;
  };

  const calendarEvents = getCalendarEvents();

  // Refresh data
  const handleRefresh = () => {
    fetchTrainingSessions();
    fetchStaffBriefings();
    fetchStats();
    toast.success('Data refreshed');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training & Staff Briefing</h1>
            <p className="text-gray-600 mt-2">Manage training sessions and daily staff briefings</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              disabled={loading}
            >
              {viewMode === 'list' ? (
                <>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar View
                </>
              ) : (
                <>
                  <List className="h-4 w-4 mr-2" />
                  List View
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showAddTraining} onOpenChange={setShowAddTraining}>
              <DialogTrigger asChild>
                <Button disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Training
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Training Session</DialogTitle>
                  <DialogDescription>
                    Schedule a new training session for your team.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Training Title *</label>
                      <Input
                        placeholder="Enter training title"
                        value={trainingForm.title}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, title: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Training Type</label>
                      <Select
                        value={trainingForm.type}
                        onValueChange={(value: any) => setTrainingForm(prev => ({ ...prev, type: value }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainingTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Date *</label>
                      <Input
                        type="date"
                        value={trainingForm.date}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, date: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Time</label>
                      <Input
                        type="time"
                        value={trainingForm.time}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, time: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Duration</label>
                      <Input
                        placeholder="e.g., 2 hours"
                        value={trainingForm.duration}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, duration: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Trainer *</label>
                      <Input
                        placeholder="Enter trainer name"
                        value={trainingForm.trainer}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, trainer: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Site</label>
                      <Input
                        placeholder="Enter site/location"
                        value={trainingForm.site}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, site: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Department</label>
                      <Select
                        value={trainingForm.department}
                        onValueChange={(value) => setTrainingForm(prev => ({ ...prev, department: value }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Max Attendees</label>
                      <Input
                        type="number"
                        min="1"
                        value={trainingForm.maxAttendees}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) || 1 }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location</label>
                      <Input
                        placeholder="Enter location"
                        value={trainingForm.location}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, location: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Training Objectives</label>
                      <div className="space-y-2">
                        {trainingForm.objectives.map((objective, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Objective ${index + 1}`}
                              value={objective}
                              onChange={(e) => updateObjective(index, e.target.value)}
                              disabled={loading}
                            />
                            {trainingForm.objectives.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeObjective(index)}
                                disabled={loading}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addObjective}
                          disabled={loading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Objective
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <Textarea
                        placeholder="Enter training description"
                        value={trainingForm.description}
                        onChange={(e) => setTrainingForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Attachments Section */}
                <div className="py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Attachments</h3>
                      <p className="text-sm text-gray-500">Upload training materials, photos, or videos</p>
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                    </div>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon className="h-5 w-5 text-blue-500" />
                            ) : file.type.startsWith('video/') ? (
                              <Video className="h-5 w-5 text-red-500" />
                            ) : (
                              <File className="h-5 w-5 text-gray-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / (1024 * 1024)).toFixed(1)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={loading}>Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddTraining} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Training Session'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showAddBriefing} onOpenChange={setShowAddBriefing}>
              <DialogTrigger asChild>
                <Button variant="secondary" disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Briefing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Staff Briefing</DialogTitle>
                  <DialogDescription>
                    Record daily staff briefing details and action items.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Date *</label>
                      <Input
                        type="date"
                        value={briefingForm.date}
                        onChange={(e) => setBriefingForm(prev => ({ ...prev, date: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Time</label>
                      <Input
                        type="time"
                        value={briefingForm.time}
                        onChange={(e) => setBriefingForm(prev => ({ ...prev, time: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Shift</label>
                      <Select
                        value={briefingForm.shift}
                        onValueChange={(value: any) => setBriefingForm(prev => ({ ...prev, shift: value }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts.map(shift => (
                            <SelectItem key={shift} value={shift}>
                              {shift.charAt(0).toUpperCase() + shift.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Conducted By *</label>
                      <Input
                        placeholder="Enter conductor name"
                        value={briefingForm.conductedBy}
                        onChange={(e) => setBriefingForm(prev => ({ ...prev, conductedBy: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Site *</label>
                      <Input
                        placeholder="Enter site/location"
                        value={briefingForm.site}
                        onChange={(e) => setBriefingForm(prev => ({ ...prev, site: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Department</label>
                      <Select
                        value={briefingForm.department}
                        onValueChange={(value) => setBriefingForm(prev => ({ ...prev, department: value }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Number of Attendees</label>
                      <Input
                        type="number"
                        min="0"
                        value={briefingForm.attendeesCount}
                        onChange={(e) => setBriefingForm(prev => ({ ...prev, attendeesCount: parseInt(e.target.value) || 0 }))}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Topics Discussed</label>
                      <div className="space-y-2">
                        {briefingForm.topics.map((topic, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Topic ${index + 1}`}
                              value={topic}
                              onChange={(e) => updateTopic(index, e.target.value)}
                              disabled={loading}
                            />
                            {briefingForm.topics.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTopic(index)}
                                disabled={loading}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTopic}
                          disabled={loading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Topic
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Key Points</label>
                      <div className="space-y-2">
                        {briefingForm.keyPoints.map((point, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Key point ${index + 1}`}
                              value={point}
                              onChange={(e) => updateKeyPoint(index, e.target.value)}
                              disabled={loading}
                            />
                            {briefingForm.keyPoints.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeKeyPoint(index)}
                                disabled={loading}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addKeyPoint}
                          disabled={loading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Key Point
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Notes</label>
                      <Textarea
                        placeholder="Enter additional notes"
                        value={briefingForm.notes}
                        onChange={(e) => setBriefingForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Action Items Section */}
                <div className="py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Action Items</h3>
                      <p className="text-sm text-gray-500">Add tasks assigned during the briefing</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addActionItem}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Action Item
                    </Button>
                  </div>
                  
                  {briefingForm.actionItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Description</label>
                        <Input
                          placeholder="Task description"
                          value={item.description}
                          onChange={(e) => updateActionItem(index, 'description', e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Assigned To</label>
                        <Input
                          placeholder="Person/Team"
                          value={item.assignedTo}
                          onChange={(e) => updateActionItem(index, 'assignedTo', e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Due Date</label>
                        <Input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => updateActionItem(index, 'dueDate', e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium mb-1 block">Priority</label>
                          <Select
                            value={item.priority}
                            onValueChange={(value: any) => updateActionItem(index, 'priority', value)}
                            disabled={loading}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorities.map(priority => (
                                <SelectItem key={priority} value={priority}>
                                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeActionItem(index)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Attachments Section */}
                <div className="py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Attachments</h3>
                      <p className="text-sm text-gray-500">Upload photos, documents, or other files</p>
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                    </div>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon className="h-5 w-5 text-blue-500" />
                            ) : file.type.startsWith('video/') ? (
                              <Video className="h-5 w-5 text-red-500" />
                            ) : (
                              <File className="h-5 w-5 text-gray-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / (1024 * 1024)).toFixed(1)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={loading}>Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddBriefing} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Staff Briefing'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Training Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTrainings}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +2 this week
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Staff Briefings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.staffBriefings}</p>
                  <p className="text-xs text-green-600 mt-1">
                    Daily average: 3
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Training</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedTraining}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.totalTrainings > 0 
                      ? `${Math.round((stats.completedTraining / stats.totalTrainings) * 100)}% completion rate`
                      : '0% completion rate'
                    }
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingActions}</p>
                  <p className="text-xs text-red-600 mt-1">
                    Requires attention
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Main Content */}
      {loading && viewMode === 'list' ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading data...</p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <>
          {/* Tabs */}
          <Tabs defaultValue="training" className="mb-6" onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList className="grid w-full md:w-auto grid-cols-2">
              <TabsTrigger value="training" className="flex items-center gap-2" disabled={loading}>
                <Calendar className="h-4 w-4" />
                Training Sessions
              </TabsTrigger>
              <TabsTrigger value="briefing" className="flex items-center gap-2" disabled={loading}>
                <MessageSquare className="h-4 w-4" />
                Staff Briefings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={activeTab === 'training' ? "Search training sessions..." : "Search staff briefings..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-64"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <Select value={filterDepartment} onValueChange={setFilterDepartment} disabled={loading}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {activeTab === 'training' && (
                      <Select value={filterStatus} onValueChange={setFilterStatus} disabled={loading}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button variant="outline" size="sm" disabled={loading}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Training Sessions Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'training' ? (
              <motion.div
                key="training"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Training Sessions</CardTitle>
                    <CardDescription>
                      Manage weekly training sessions and track attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredTrainingSessions.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No training sessions found</h3>
                        <p className="text-gray-500 mb-4">Try adjusting your filters or add a new training session.</p>
                        <Button onClick={() => setShowAddTraining(true)} disabled={loading}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Training Session
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredTrainingSessions.map(session => (
                          <Card key={session._id} className="overflow-hidden">
                            <div className="p-6">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                                      <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={trainingTypes.find(t => t.value === session.type)?.color}>
                                        {trainingTypes.find(t => t.value === session.type)?.label}
                                      </Badge>
                                      <Badge className={getStatusBadge(session.status)}>
                                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{formatDate(session.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{session.time} ({session.duration})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{session.trainer}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">Site: {session.site}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{session.department}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">
                                        {session.attendees?.length || 0}/{session.maxAttendees} attendees
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Target className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{session.location}</span>
                                    </div>
                                  </div>
                                  
                                  {session.objectives && session.objectives.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Objectives:</h4>
                                      <ul className="list-disc pl-5 space-y-1">
                                        {session.objectives.map((objective, index) => (
                                          <li key={index} className="text-sm text-gray-600">{objective}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {session.attachments && session.attachments.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {session.attachments.map(attachment => (
                                          <Badge key={attachment._id || attachment.id} variant="outline" className="flex items-center gap-1">
                                            {attachment.type === 'image' ? (
                                              <ImageIcon className="h-3 w-3" />
                                            ) : attachment.type === 'video' ? (
                                              <Video className="h-3 w-3" />
                                            ) : (
                                              <File className="h-3 w-3" />
                                            )}
                                            {attachment.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" disabled={loading}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                      <DialogHeader>
                                        <DialogTitle>Training Session Details</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <h3 className="text-lg font-semibold">{session.title}</h3>
                                          <p className="text-gray-600">{session.description}</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Date & Time</p>
                                            <p>{formatDate(session.date)} at {session.time}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Duration</p>
                                            <p>{session.duration}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Trainer</p>
                                            <p>{session.trainer}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Site</p>
                                            <p>{session.site}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Department</p>
                                            <p>{session.department}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Location</p>
                                            <p>{session.location}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Status</p>
                                            <Badge className={getStatusBadge(session.status)}>
                                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        {session.feedback && session.feedback.length > 0 && (
                                          <div>
                                            <h4 className="font-medium mb-2">Feedback</h4>
                                            <div className="space-y-2">
                                              {session.feedback.map(fb => (
                                                <div key={fb._id || fb.id} className="p-3 bg-gray-50 rounded">
                                                  <div className="flex justify-between">
                                                    <p className="font-medium">{fb.employeeName}</p>
                                                    <div className="flex">
                                                      {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`h-4 w-4 ${i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <p className="text-sm text-gray-600 mt-1">{fb.comment}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <div className="flex gap-2">
                                    <Select
                                      value={session.status}
                                      onValueChange={(value: any) => updateTrainingStatus(session._id, value)}
                                      disabled={loading}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="ongoing">Ongoing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteTraining(session._id)}
                                      disabled={loading}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="briefing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Briefings</CardTitle>
                    <CardDescription>
                      Daily staff briefings and action items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredStaffBriefings.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No staff briefings found</h3>
                        <p className="text-gray-500 mb-4">Try adjusting your filters or add a new staff briefing.</p>
                        <Button onClick={() => setShowAddBriefing(true)} disabled={loading}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Staff Briefing
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredStaffBriefings.map(briefing => (
                          <Card key={briefing._id} className="overflow-hidden">
                            <div className="p-6">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h3 className="text-lg font-semibold text-gray-900">
                                        Staff Briefing - {briefing.site}
                                      </h3>
                                      <div className="flex items-center gap-3 mt-1">
                                        <Badge className={getShiftBadge(briefing.shift)}>
                                          {briefing.shift.charAt(0).toUpperCase() + briefing.shift.slice(1)} Shift
                                        </Badge>
                                        <span className="text-sm text-gray-600">by {briefing.conductedBy}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-gray-900">{formatDate(briefing.date)}</p>
                                      <p className="text-sm text-gray-600">{briefing.time}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-1">Department:</p>
                                      <p className="text-gray-600">{briefing.department}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-1">Attendees:</p>
                                      <p className="text-gray-600">{briefing.attendeesCount} staff members</p>
                                    </div>
                                  </div>
                                  
                                  {briefing.topics && briefing.topics.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Topics Discussed:</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {briefing.topics.map((topic, index) => (
                                          <Badge key={index} variant="outline">
                                            {topic}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {briefing.keyPoints && briefing.keyPoints.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Key Points:</h4>
                                      <ul className="list-disc pl-5 space-y-1">
                                        {briefing.keyPoints.map((point, index) => (
                                          <li key={index} className="text-sm text-gray-600">{point}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {briefing.actionItems && briefing.actionItems.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Action Items:</h4>
                                      <div className="space-y-2">
                                        {briefing.actionItems.map(item => (
                                          <div key={item._id || item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                            <div className="flex items-center gap-3">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => updateActionItemStatus(
                                                  briefing._id,
                                                  item._id || item.id || '',
                                                  item.status === 'completed' ? 'pending' : 'completed'
                                                )}
                                                disabled={loading}
                                              >
                                                {item.status === 'completed' ? (
                                                  <CheckSquare className="h-4 w-4 text-green-500" />
                                                ) : (
                                                  <Square className="h-4 w-4 text-gray-400" />
                                                )}
                                              </Button>
                                              <div>
                                                <p className="font-medium">{item.description}</p>
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                  <span>Assigned to: {item.assignedTo}</span>
                                                  <span>Due: {formatDate(item.dueDate)}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <Badge className={getPriorityBadge(item.priority)}>
                                              {item.priority.toUpperCase()}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {briefing.attachments && briefing.attachments.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {briefing.attachments.map(attachment => (
                                          <Badge key={attachment._id || attachment.id} variant="outline" className="flex items-center gap-1">
                                            {attachment.type === 'image' ? (
                                              <ImageIcon className="h-3 w-3" />
                                            ) : attachment.type === 'video' ? (
                                              <Video className="h-3 w-3" />
                                            ) : (
                                              <File className="h-3 w-3" />
                                            )}
                                            {attachment.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {briefing.notes && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Notes:</h4>
                                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{briefing.notes}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" disabled={loading}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                      <DialogHeader>
                                        <DialogTitle>Staff Briefing Details</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <h3 className="text-lg font-semibold">
                                            {briefing.site} - {briefing.department}
                                          </h3>
                                          <div className="flex items-center gap-3 mt-1">
                                            <Badge className={getShiftBadge(briefing.shift)}>
                                              {briefing.shift.charAt(0).toUpperCase() + briefing.shift.slice(1)} Shift
                                            </Badge>
                                            <span className="text-gray-600">Conducted by {briefing.conductedBy}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Date & Time</p>
                                            <p>{formatDate(briefing.date)} at {briefing.time}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Attendees</p>
                                            <p>{briefing.attendeesCount} staff members</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Site</p>
                                            <p>{briefing.site}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Department</p>
                                            <p>{briefing.department}</p>
                                          </div>
                                        </div>
                                        
                                        {briefing.notes && (
                                          <div>
                                            <h4 className="font-medium mb-2">Notes</h4>
                                            <p className="text-gray-600 bg-gray-50 p-3 rounded">{briefing.notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteBriefing(briefing._id)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Calendar View */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Training & Briefing Calendar</CardTitle>
                  <CardDescription>
                    View all scheduled training sessions and staff briefings
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={prevMonth} disabled={loading}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-semibold">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <Button variant="outline" size="sm" onClick={nextMonth} disabled={loading}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days would be rendered here */}
                {/* This is a simplified version - you would implement full calendar logic */}
                
                <div className="text-center text-gray-400 py-8">
                  Calendar view would show training sessions and briefings on their respective dates
                </div>
              </div>
              
              <div className="space-y-4 mt-8">
                <h4 className="font-semibold">Upcoming Events</h4>
                {calendarEvents
                  .filter(event => new Date(event.date) >= new Date())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`h-3 w-3 rounded-full ${event.color}`}></div>
                      <div className="flex-1">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(event.date)} • {event.type === 'training' ? 'Training' : 'Briefing'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" disabled={loading}>
                        View
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

// Helper components
const Star: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const List: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

export default PriceCalculator;