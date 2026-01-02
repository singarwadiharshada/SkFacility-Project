import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Service } from "../data";

// API base URL
const API_BASE_URL = "http://localhost:5001/api";

const ServicesSection = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch services from backend
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/services`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Transform the data to match your frontend Service type
        const transformedServices = data.data.map((service: any) => ({
          id: service._id,
          name: service.name,
          status: service.status,
          assignedTeam: service.assignedTeam,
          lastChecked: service.lastChecked
        }));
        
        setServices(transformedServices);
      } else {
        toast.error(data.message || "Failed to fetch services");
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update service status
  const handleUpdateStatus = async (serviceId: string, status: Service["status"]) => {
    try {
      setUpdatingId(serviceId);
      
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state with the updated service
        setServices(prev => prev.map(service => 
          service.id === serviceId ? { 
            ...service, 
            status: data.data.status,
            lastChecked: data.data.lastChecked
          } : service
        ));
        
        toast.success(`Service status updated to ${status}`);
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating service status:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Seed initial services (optional - run once)
  const seedServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/seed`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Services seeded successfully");
        fetchServices(); // Refresh the list
      } else {
        toast.error(data.message || "Failed to seed services");
      }
    } catch (error) {
      console.error("Error seeding services:", error);
      toast.error("Failed to seed services");
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const getStatusColor = (status: Service["status"]) => {
    const colors = {
      operational: "default",
      maintenance: "secondary",
      down: "destructive"
    };
    return colors[status];
  };

  const getStatusIcon = (status: Service["status"]) => {
    const icons = {
      operational: <CheckCircle className="h-4 w-4" />,
      maintenance: <Clock className="h-4 w-4" />,
      down: <XCircle className="h-4 w-4" />
    };
    return icons[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading services...</span>
      </div>
    );
  }

  // If no services, show seed button (optional)
  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No services found</p>
            <Button onClick={seedServices}>
              Seed Initial Services
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Service Monitoring</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchServices}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={seedServices}
          >
            Reset to Sample
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {service.name}
                    {getStatusIcon(service.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant={getStatusColor(service.status) as "default" | "destructive" | "outline" | "secondary"}>
                    {service.status}
                  </Badge>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">Team: {service.assignedTeam}</p>
                    <p className="text-muted-foreground">Last checked: {service.lastChecked}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant={service.status === "operational" ? "default" : "outline"}
                      onClick={() => handleUpdateStatus(service.id, "operational")}
                      disabled={updatingId === service.id}
                    >
                      {updatingId === service.id && service.status === "operational" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Operational
                    </Button>
                    <Button 
                      size="sm" 
                      variant={service.status === "maintenance" ? "secondary" : "outline"}
                      onClick={() => handleUpdateStatus(service.id, "maintenance")}
                      disabled={updatingId === service.id}
                    >
                      {updatingId === service.id && service.status === "maintenance" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Maintenance
                    </Button>
                    <Button 
                      size="sm" 
                      variant={service.status === "down" ? "destructive" : "outline"}
                      onClick={() => handleUpdateStatus(service.id, "down")}
                      disabled={updatingId === service.id}
                    >
                      {updatingId === service.id && service.status === "down" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Down
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

export default ServicesSection;