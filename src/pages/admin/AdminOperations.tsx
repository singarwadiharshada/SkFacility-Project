import { useState } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Calculator } from "lucide-react";
import { motion } from "framer-motion";
import { StatsCards } from "./components/StatsCardsA";
import TasksSectionA from "./components/TasksSectionA";
import SitesSectionA from "./components/SitesSectionA";
import RosterSectionA from "./components/RosterSectionaA";
import ServicesSectionA from "./components/ServicesSectionA";
import AlertsSectionA from "./components/AlertsSectionA";
import PriceCalculatorA from "./components/PriceCalculatorA";
import { initialTasks, initialSites } from "./datas";

const Operations = () => {
  const [activeTab, setActiveTab] = useState("sites"); // Changed default to "sites"
  const [tasks] = useState(initialTasks);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Operations & Task Management" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <StatsCards tasks={tasks} sites={initialSites} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="sites">Sites</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Calculator
            </TabsTrigger>
          </TabsList>
         <TabsContent value="tasks">
            <TasksSectionA />
          </TabsContent> 
          <TabsContent value="sites">
            <SitesSectionA />
          </TabsContent>
          <TabsContent value="roster">
            <RosterSectionA />
          </TabsContent>
          <TabsContent value="services">
            <ServicesSectionA />
          </TabsContent>
          <TabsContent value="alerts">
            <AlertsSectionA />
          </TabsContent>
          <TabsContent value="calculator">
            <PriceCalculatorA />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Operations;