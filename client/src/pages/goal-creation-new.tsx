import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, addMonths, isAfter, isBefore, differenceInDays } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { InsertGoal, Goal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CalendarIcon, 
  InfoIcon, 
  Lightbulb, 
  Target, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  BrainCircuit, 
  Briefcase, 
  GraduationCap, 
  HeartPulse, 
  Dumbbell, 
  DollarSign, 
  School,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  Activity,
  Scale,
  BarChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfetti } from "@/hooks/use-confetti";

// Create schema based on the InsertGoal type but with client-side validation
const goalFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["short", "medium", "long"]),
  deadline: z.date({
    required_error: "A deadline is required",
  }),
  isPublic: z.boolean().default(false),
  parentGoalId: z.number().nullable().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

// SMART Goal explanation component
function SmartGoalExplanation() {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex gap-1">
        <div className="font-bold text-amber-700 dark:text-amber-500 w-24">Specific:</div>
        <div className="flex-1">Clear, precise, and unambiguous. What exactly will be accomplished?</div>
      </div>
      <div className="flex gap-1">
        <div className="font-bold text-amber-700 dark:text-amber-500 w-24">Measurable:</div>
        <div className="flex-1">How will you know when it's achieved? Include metrics to track progress.</div>
      </div>
      <div className="flex gap-1">
        <div className="font-bold text-amber-700 dark:text-amber-500 w-24">Achievable:</div>
        <div className="flex-1">Realistic and attainable with your current resources and constraints.</div>
      </div>
      <div className="flex gap-1">
        <div className="font-bold text-amber-700 dark:text-amber-500 w-24">Relevant:</div>
        <div className="flex-1">Matters to you and aligns with your broader objectives and values.</div>
      </div>
      <div className="flex gap-1">
        <div className="font-bold text-amber-700 dark:text-amber-500 w-24">Time-bound:</div>
        <div className="flex-1">Has a clear deadline or timeframe to create urgency and structure.</div>
      </div>
    </div>
  );
}

// AI Suggestions component (placeholder for now)
function AiSuggestions() {
  const sampleSuggestions = [
    {
      type: "short",
      title: "Create a fitness routine",
      description: "Establish a consistent workout schedule with specific exercises tailored to my fitness level."
    },
    {
      type: "medium",
      title: "Learn basic JavaScript",
      description: "Complete an online course and build a simple interactive website to demonstrate new skills."
    },
    {
      type: "long",
      title: "Save for a down payment",
      description: "Save $20,000 for a home down payment through monthly budget allocations and reducing expenses."
    }
  ];

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
          AI Goal Suggestions
        </CardTitle>
        <CardDescription>
          Smart recommendations based on goal frameworks
          <span className="block text-xs italic mt-1 text-muted-foreground">(Connect OpenAI to enable personalized suggestions)</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {sampleSuggestions.map((suggestion, index) => (
            <div key={index} className="p-3 rounded-md bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex items-center mb-1">
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  suggestion.type === "short" ? "bg-amber-500" : 
                  suggestion.type === "medium" ? "bg-blue-500" : "bg-purple-500"
                )} />
                <div className="font-medium text-sm">{suggestion.title}</div>
              </div>
              <p className="text-xs text-muted-foreground">{suggestion.description}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button variant="outline" size="sm" className="opacity-50" disabled>
            <BrainCircuit className="h-4 w-4 mr-2" />
            Generate More Ideas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Define the Blueprint type 
type Blueprint = {
  id?: number;
  icon: JSX.Element;
  iconType?: string; // Store the string reference to the icon for serialization
  title: string;
  description: string;
  goals: {
    type: "short" | "medium" | "long";
    title: string;
    description: string;
  }[];
  isCustom?: boolean;
};

// Enhanced Deadline guidance component
function DeadlineGuidance({ selectedType, selectedDate }: { selectedType: string, selectedDate: Date | null }) {
  const { data: goals } = useQuery({
    queryKey: ["/api/goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to fetch goals");
      return res.json();
    }
  });
  
  const getGuidanceMessage = () => {
    if (!selectedDate) return "";
    
    const today = new Date();
    const daysFromNow = differenceInDays(selectedDate, today);
    
    // Provide different guidance based on goal type and selected date
    if (selectedType === "short") {
      if (daysFromNow < 7) {
        return "Consider setting a slightly longer timeframe for your short-term goal to ensure it's achievable.";
      } else if (daysFromNow > 30) {
        return "This deadline is longer than typical for a short-term goal. Consider either adjusting the deadline or changing to a medium-term goal.";
      }
      return "This is a good timeframe for a short-term goal! It provides urgency while allowing time to make progress.";
    } else if (selectedType === "medium") {
      if (daysFromNow < 30) {
        return "This deadline may be too soon for a medium-term goal. Consider either extending the deadline or changing to a short-term goal.";
      } else if (daysFromNow > 90) {
        return "This deadline is on the longer side for a medium-term goal. Ensure you have intermediate milestones to track progress.";
      }
      return "Great timeframe for a medium-term goal! It allows sufficient time for meaningful progress while maintaining momentum.";
    } else {
      if (daysFromNow < 90) {
        return "This deadline may be too soon for a long-term goal. Consider either extending the deadline or changing to a medium-term goal.";
      } else if (daysFromNow > 365) {
        return "For goals with deadlines over a year away, be sure to break them down into shorter milestones to track progress.";
      }
      return "Good long-term goal timeframe. Remember to create shorter-term milestones to help you stay on track!";
    }
  };
  
  // Calculate workload analysis based on existing goals
  const getWorkloadAnalysis = () => {
    if (!selectedDate || !goals || goals.length === 0) return null;
    
    // Filter active goals (not completed)
    const activeGoals = goals.filter((goal: Goal) => !goal.isCompleted);
    
    // Check if the goal's deadline falls within the selected date's timeframe
    const overlappingGoals = activeGoals.filter((goal: Goal) => {
      const goalDeadline = new Date(goal.deadline);
      const today = new Date();
      
      // If the selected date is within now and the goal's deadline, or
      // if the goal deadline is within now and the selected date, it's overlapping
      return (
        (isAfter(selectedDate, today) && isBefore(selectedDate, goalDeadline)) ||
        (isAfter(goalDeadline, today) && isBefore(goalDeadline, selectedDate))
      );
    });
    
    // Count overlapping goals by type
    const shortTermCount = overlappingGoals.filter((g: Goal) => g.type === "short").length;
    const mediumTermCount = overlappingGoals.filter((g: Goal) => g.type === "medium").length;
    const longTermCount = overlappingGoals.filter((g: Goal) => g.type === "long").length;
    
    // Calculate workload
    const totalWorkload = shortTermCount + mediumTermCount * 1.5 + longTermCount * 2;
    
    let workloadMessage = "";
    let workloadLevel = "";
    
    if (totalWorkload === 0) {
      workloadMessage = "You have no other active goals in this timeframe. This is a great time to take on a new goal!";
      workloadLevel = "low";
    } else if (totalWorkload < 3) {
      workloadMessage = `You have a light workload with ${overlappingGoals.length} active goal(s) in this timeframe. Adding this goal seems manageable.`;
      workloadLevel = "low";
    } else if (totalWorkload < 6) {
      workloadMessage = `You have ${overlappingGoals.length} active goal(s) in this timeframe. Be mindful of your capacity when adding this goal.`;
      workloadLevel = "medium";
    } else {
      workloadMessage = `You already have ${overlappingGoals.length} active goal(s) in this timeframe. Consider completing some current goals first or extending this deadline.`;
      workloadLevel = "high";
    }
    
    return { message: workloadMessage, level: workloadLevel, counts: { short: shortTermCount, medium: mediumTermCount, long: longTermCount } };
  };
  
  // Determine the color based on how appropriate the deadline is
  const getCardColor = () => {
    if (!selectedDate) return "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30";
    
    const today = new Date();
    const daysFromNow = differenceInDays(selectedDate, today);
    
    // Warning colors for potentially problematic deadlines
    if (selectedType === "short" && (daysFromNow < 7 || daysFromNow > 30)) {
      return "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30";
    } else if (selectedType === "medium" && (daysFromNow < 30 || daysFromNow > 90)) {
      return "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30";
    } else if (selectedType === "long" && daysFromNow < 90) {
      return "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30";
    }
    
    // Good deadline colors
    return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30";
  };
  
  // Calculate workload analysis
  const workloadAnalysis = getWorkloadAnalysis();
  
  // Workload level color and background colors
  const getWorkloadColor = (level: string) => {
    if (level === "high") return "text-white";
    if (level === "medium") return "text-amber-950 dark:text-amber-50";
    return "text-green-950 dark:text-green-50";
  };
  
  const getWorkloadBackground = (level: string) => {
    if (level === "high") return "bg-red-500 dark:bg-red-600";
    if (level === "medium") return "bg-amber-300 dark:bg-amber-600";
    return "bg-green-300 dark:bg-green-600";
  };

  // Get appropriate icon based on timeframe guidance
  const getTimeframeIcon = () => {
    if (!selectedDate) return <InfoIcon className="h-5 w-5 text-blue-500" />;
    
    const today = new Date();
    const daysFromNow = differenceInDays(selectedDate, today);
    
    // Warning for potentially problematic deadlines
    if (selectedType === "short" && (daysFromNow < 7 || daysFromNow > 30)) {
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    } else if (selectedType === "medium" && (daysFromNow < 30 || daysFromNow > 90)) {
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    } else if (selectedType === "long" && daysFromNow < 90) {
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    }
    
    // Good timeframe
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };
  
  // Get icon for workload
  const getWorkloadIcon = (level: string) => {
    if (level === "high") return <AlertTriangle className="h-5 w-5" />;
    if (level === "medium") return <AlertCircle className="h-5 w-5" />;
    return <CheckCircle className="h-5 w-5" />;
  };
  
  return (
    <Card className={cn("border-2", getCardColor())}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2 text-gray-500" />
          Deadline & Workload Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-md border bg-muted/30">
          <div className="flex items-start">
            {getTimeframeIcon()}
            <div className="ml-2">
              <h4 className="text-sm font-medium">Goal Timeframe:</h4>
              <p className="text-sm">{getGuidanceMessage()}</p>
            </div>
          </div>
        </div>
        
        {workloadAnalysis && (
          <div>
            <div className={cn(
              "p-3 rounded-md flex items-start",
              getWorkloadBackground(workloadAnalysis.level)
            )}>
              {getWorkloadIcon(workloadAnalysis.level)}
              <div className="ml-2">
                <h4 className={cn("text-sm font-medium", getWorkloadColor(workloadAnalysis.level))}>
                  Workload Assessment
                </h4>
                <p className={cn("text-sm", getWorkloadColor(workloadAnalysis.level))}>
                  {workloadAnalysis.message}
                </p>
              </div>
            </div>
            
            {workloadAnalysis.counts.short + workloadAnalysis.counts.medium + workloadAnalysis.counts.long > 0 && (
              <div className="mt-3 bg-muted/30 p-3 rounded-md border">
                <div className="text-sm font-medium mb-2">Overlapping active goals:</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                    <div className="font-medium text-lg">{workloadAnalysis.counts.short}</div>
                    <div className="text-xs text-muted-foreground">Short-term</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                    <div className="font-medium text-lg">{workloadAnalysis.counts.medium}</div>
                    <div className="text-xs text-muted-foreground">Medium-term</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded bg-purple-100 dark:bg-purple-900/30">
                    <div className="font-medium text-lg">{workloadAnalysis.counts.long}</div>
                    <div className="text-xs text-muted-foreground">Long-term</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Recommended timeframes:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-amber-100/50 dark:bg-amber-900/20">
              <div className="font-medium">Short Term</div>
              <div>7-30 days</div>
            </div>
            <div className="p-2 rounded bg-blue-100/50 dark:bg-blue-900/20">
              <div className="font-medium">Medium Term</div>
              <div>1-3 months</div>
            </div>
            <div className="p-2 rounded bg-purple-100/50 dark:bg-purple-900/20">
              <div className="font-medium">Long Term</div>
              <div>3-12 months</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Blueprint templates component
function BlueprintTemplates() {
  const { toast } = useToast();
  const { celebrateCompletion } = useConfetti();
  const [selectedTab, setSelectedTab] = useState("browse");
  const [browseCategory, setBrowseCategory] = useState("preset");
  
  // Available icons for custom blueprints
  const iconOptions = [
    { value: 'target', label: 'Target', icon: <Target className="h-5 w-5 text-blue-500" /> },
    { value: 'briefcase', label: 'Briefcase', icon: <Briefcase className="h-5 w-5 text-indigo-500" /> },
    { value: 'graduationCap', label: 'Education', icon: <GraduationCap className="h-5 w-5 text-purple-500" /> },
    { value: 'heartPulse', label: 'Health', icon: <HeartPulse className="h-5 w-5 text-red-500" /> },
    { value: 'dollarSign', label: 'Finance', icon: <DollarSign className="h-5 w-5 text-green-500" /> },
    { value: 'brain', label: 'Brain', icon: <BrainCircuit className="h-5 w-5 text-amber-500" /> },
    { value: 'school', label: 'School', icon: <School className="h-5 w-5 text-cyan-500" /> },
    { value: 'sparkles', label: 'Sparkles', icon: <Sparkles className="h-5 w-5 text-yellow-500" /> },
    { value: 'dumbbell', label: 'Fitness', icon: <Dumbbell className="h-5 w-5 text-orange-500" /> },
  ];
  
  // Built-in blueprints
  const defaultBlueprints: Blueprint[] = [
    {
      icon: <Briefcase className="h-5 w-5 text-blue-500" />,
      title: "Career Growth",
      description: "Advance your professional path strategically",
      goals: [
        { type: "short", title: "Develop Project Proposal", description: "Create a detailed proposal for a high-impact project" },
        { type: "medium", title: "Lead a Team Project", description: "Successfully manage a project with measurable outcomes" },
        { type: "long", title: "Secure Senior Position", description: "Position yourself for promotion through demonstrated leadership" }
      ]
    },
    {
      icon: <GraduationCap className="h-5 w-5 text-indigo-500" />,
      title: "Learning Journey",
      description: "Master a new skill through structured learning",
      goals: [
        { type: "short", title: "Complete Fundamentals", description: "Learn the basic principles and core concepts" },
        { type: "medium", title: "Build Practice Project", description: "Apply knowledge by creating a tangible project" },
        { type: "long", title: "Achieve Certification", description: "Obtain formal recognition of your expertise" }
      ]
    },
    {
      icon: <HeartPulse className="h-5 w-5 text-red-500" />,
      title: "Health Transformation",
      description: "Improve physical wellness systematically",
      goals: [
        { type: "short", title: "Establish Exercise Routine", description: "Create and follow a consistent weekly workout schedule" },
        { type: "medium", title: "Nutrition Overhaul", description: "Implement a sustainable, balanced eating plan" },
        { type: "long", title: "Reach Fitness Milestone", description: "Achieve specific measurable health improvements" }
      ]
    },
    {
      icon: <DollarSign className="h-5 w-5 text-green-500" />,
      title: "Financial Growth",
      description: "Build wealth through strategic planning",
      goals: [
        { type: "short", title: "Create Budget System", description: "Establish tracking and spending controls" },
        { type: "medium", title: "Build Emergency Fund", description: "Save 3-6 months of expenses" },
        { type: "long", title: "Investment Strategy", description: "Develop and implement a diversified portfolio" }
      ]
    }
  ];

  // State for blueprints and custom blueprints
  const [customBlueprints, setCustomBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<number | null>(null);
  const [editingBlueprint, setEditingBlueprint] = useState<Blueprint | null>(null);
  const [isCreatingBlueprint, setIsCreatingBlueprint] = useState(false);
  const [isEditingBeforeUse, setIsEditingBeforeUse] = useState(false);
  
  // Currently selecting from preset or custom blueprints
  const [currentBlueprintCategory, setCurrentBlueprintCategory] = useState<"preset" | "custom">("preset");
  
  // State for new blueprint creation/editing
  const [newBlueprintTitle, setNewBlueprintTitle] = useState("");
  const [newBlueprintDescription, setNewBlueprintDescription] = useState("");
  const [newBlueprintGoals, setNewBlueprintGoals] = useState<{ type: "short" | "medium" | "long"; title: string; description: string }[]>([]);
  const [selectedIconType, setSelectedIconType] = useState("target");
  
  // State for temporary blueprint editing (edit before use)
  const [temporaryBlueprint, setTemporaryBlueprint] = useState<Blueprint | null>(null);
  
  // Load custom blueprints from localStorage on component mount
  useEffect(() => {
    const savedBlueprints = localStorage.getItem('customBlueprints');
    if (savedBlueprints) {
      try {
        // Parse the saved blueprints, but we need to recreate the icon elements
        const parsed = JSON.parse(savedBlueprints);
        const restoredBlueprints = parsed.map((bp: any) => {
          // Find the icon option that matches the saved iconType
          const iconOption = iconOptions.find(opt => opt.value === bp.iconType) || iconOptions[0];
          
          return {
            ...bp,
            icon: iconOption.icon,
            isCustom: true
          };
        });
        
        setCustomBlueprints(restoredBlueprints);
      } catch (error) {
        console.error("Error loading custom blueprints:", error);
      }
    }
  }, []);
  
  // Get the appropriate blueprints based on the category
  const getDisplayedBlueprints = () => {
    return currentBlueprintCategory === "preset" ? defaultBlueprints : customBlueprints;
  };
  
  // Save custom blueprints to localStorage
  const saveCustomBlueprints = (blueprints: Blueprint[]) => {
    // We need to transform the blueprint objects to be JSON serializable
    // by removing the icon JSX elements and adding a type string instead
    const serializableBlueprints = blueprints.map(bp => {
      const { icon, ...rest } = bp;
      return { ...rest, iconType: bp.iconType || "target" };
    });
    
    localStorage.setItem('customBlueprints', JSON.stringify(serializableBlueprints));
  };
  
  // Handle creating/updating a custom blueprint
  const handleSaveCustomBlueprint = () => {
    if (!newBlueprintTitle.trim()) {
      toast({
        title: "Blueprint title required",
        description: "Please provide a title for your blueprint",
        variant: "destructive"
      });
      return;
    }
    
    if (newBlueprintGoals.length === 0) {
      toast({
        title: "Goals required",
        description: "Please add at least one goal to your blueprint",
        variant: "destructive"
      });
      return;
    }
    
    // Find the selected icon option
    const iconOption = iconOptions.find(opt => opt.value === selectedIconType) || iconOptions[0];
    
    // Create the new blueprint object
    const newBlueprint: Blueprint = {
      id: editingBlueprint?.id || Date.now(),
      icon: iconOption.icon,
      iconType: selectedIconType, // Store the icon type for serialization
      title: newBlueprintTitle,
      description: newBlueprintDescription || "Custom blueprint",
      goals: [...newBlueprintGoals],
      isCustom: true
    };
    
    let updatedCustomBlueprints: Blueprint[];
    
    if (editingBlueprint) {
      // Update existing blueprint
      updatedCustomBlueprints = customBlueprints.map(bp => 
        bp.id === editingBlueprint.id ? newBlueprint : bp
      );
    } else {
      // Add new blueprint
      updatedCustomBlueprints = [...customBlueprints, newBlueprint];
    }
    
    setCustomBlueprints(updatedCustomBlueprints);
    saveCustomBlueprints(updatedCustomBlueprints);
    
    // Reset form
    setNewBlueprintTitle("");
    setNewBlueprintDescription("");
    setNewBlueprintGoals([]);
    setSelectedIconType("target");
    setEditingBlueprint(null);
    setIsCreatingBlueprint(false);
    
    toast({
      title: editingBlueprint ? "Blueprint updated" : "Blueprint created",
      description: `Your blueprint has been ${editingBlueprint ? 'updated' : 'created'} successfully.`,
    });
    
    // Set to custom blueprints tab to show the new blueprint
    setBrowseCategory("custom");
    setCurrentBlueprintCategory("custom");
  };
  
  // Add a new goal to the blueprint being created/edited
  const addGoalToBlueprint = () => {
    setNewBlueprintGoals([
      ...newBlueprintGoals, 
      { type: "short", title: "", description: "" }
    ]);
  };
  
  // Update a goal in the blueprint being created/edited
  const updateBlueprintGoal = (index: number, field: string, value: any) => {
    const updatedGoals = [...newBlueprintGoals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    setNewBlueprintGoals(updatedGoals);
  };
  
  // Remove a goal from the blueprint being created/edited
  const removeBlueprintGoal = (index: number) => {
    const updatedGoals = newBlueprintGoals.filter((_, i) => i !== index);
    setNewBlueprintGoals(updatedGoals);
  };
  
  // Delete a custom blueprint
  const deleteCustomBlueprint = (id: number) => {
    const updatedCustomBlueprints = customBlueprints.filter(bp => bp.id !== id);
    setCustomBlueprints(updatedCustomBlueprints);
    saveCustomBlueprints(updatedCustomBlueprints);
    
    // Reset selected blueprint if it was deleted
    if (selectedBlueprint !== null) {
      const blueprints = getDisplayedBlueprints();
      if (!blueprints[selectedBlueprint] || blueprints[selectedBlueprint]?.id === id) {
        setSelectedBlueprint(null);
      }
    }
    
    toast({
      title: "Blueprint deleted",
      description: "Your custom blueprint has been removed.",
    });
  };
  
  // Edit a custom blueprint
  const editBlueprint = (blueprint: Blueprint) => {
    setEditingBlueprint(blueprint);
    setNewBlueprintTitle(blueprint.title);
    setNewBlueprintDescription(blueprint.description);
    setNewBlueprintGoals([...blueprint.goals]);
    setSelectedIconType(blueprint.iconType || "target");
    setIsCreatingBlueprint(true);
  };
  
  // Get workload analysis for blueprints
  const { data: goals } = useQuery({
    queryKey: ["/api/goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to fetch goals");
      return res.json();
    }
  });
  
  // Calculate the blueprint's workload implications
  const getBlueprintWorkloadAnalysis = (blueprint: Blueprint | null) => {
    if (!blueprint || !goals || goals.length === 0) return null;
    
    // Filter active goals (not completed)
    const activeGoals = goals.filter((goal: Goal) => !goal.isCompleted);
    
    // Count active goals by type
    const currentShortTermCount = activeGoals.filter((g: Goal) => g.type === "short").length;
    const currentMediumTermCount = activeGoals.filter((g: Goal) => g.type === "medium").length;
    const currentLongTermCount = activeGoals.filter((g: Goal) => g.type === "long").length;
    
    // Count blueprint goals by type
    const blueprintShortTermCount = blueprint.goals.filter(g => g.type === "short").length;
    const blueprintMediumTermCount = blueprint.goals.filter(g => g.type === "medium").length;
    const blueprintLongTermCount = blueprint.goals.filter(g => g.type === "long").length;
    
    // Calculate current and future workload
    const currentWorkload = currentShortTermCount + (currentMediumTermCount * 1.5) + (currentLongTermCount * 2);
    const futureWorkload = currentWorkload + 
                          blueprintShortTermCount + 
                          (blueprintMediumTermCount * 1.5) + 
                          (blueprintLongTermCount * 2);
    
    // Workload assessment
    let workloadLevel = "";
    let message = "";
    
    if (futureWorkload < 5) {
      workloadLevel = "low";
      message = `Adding this blueprint's ${blueprint.goals.length} goals seems very manageable with your current workload.`;
    } else if (futureWorkload < 10) {
      workloadLevel = "medium";
      message = `Adding this blueprint will give you a moderate workload. Consider your available time and energy.`;
    } else {
      workloadLevel = "high";
      message = `This blueprint will create a high workload when combined with your existing goals. Consider completing some current goals first.`;
    }
    
    return {
      current: {
        short: currentShortTermCount,
        medium: currentMediumTermCount,
        long: currentLongTermCount,
        total: activeGoals.length
      },
      blueprint: {
        short: blueprintShortTermCount,
        medium: blueprintMediumTermCount,
        long: blueprintLongTermCount,
        total: blueprint.goals.length
      },
      workload: {
        current: currentWorkload,
        future: futureWorkload,
        level: workloadLevel,
        message: message
      }
    };
  };
  
  // Custom hook for creating goals from the blueprint
  const [, navigate] = useLocation();
  const createGoalMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/goals", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Initialize and prepare temporary blueprint for editing
  const initTemporaryBlueprint = () => {
    if (selectedBlueprint === null) return;
    
    const blueprints = getDisplayedBlueprints();
    const blueprint = blueprints[selectedBlueprint];
    
    if (!blueprint) return;
    
    // Create a deep copy of the blueprint for temporary editing
    const tempBp = {
      ...blueprint,
      goals: JSON.parse(JSON.stringify(blueprint.goals))
    };
    
    setTemporaryBlueprint(tempBp);
    setIsEditingBeforeUse(true);
  };
  
  // Update a goal in the temporary blueprint
  const updateTemporaryGoal = (index: number, field: string, value: any) => {
    if (!temporaryBlueprint) return;
    
    const updatedGoals = [...temporaryBlueprint.goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    
    setTemporaryBlueprint({
      ...temporaryBlueprint,
      goals: updatedGoals
    });
  };
  
  // Cancel temporary editing
  const cancelTemporaryEditing = () => {
    setTemporaryBlueprint(null);
    setIsEditingBeforeUse(false);
  };
  
  // Create goals from the blueprint
  const useSelectedBlueprint = async () => {
    // If we're in edit mode, use the temporary blueprint
    const blueprint = isEditingBeforeUse && temporaryBlueprint 
      ? temporaryBlueprint 
      : selectedBlueprint !== null 
        ? getDisplayedBlueprints()[selectedBlueprint]
        : null;
    
    if (!blueprint) {
      toast({
        title: "Blueprint not found",
        description: "Please select a valid blueprint",
        variant: "destructive",
      });
      return;
    }
    
    let createdCount = 0;
    
    try {
      // Create each goal in the blueprint sequentially
      for (const goal of blueprint.goals) {
        // Calculate appropriate deadline based on goal type
        const today = new Date();
        let deadline: Date;
        
        if (goal.type === "short") {
          deadline = addDays(today, 14);
        } else if (goal.type === "medium") {
          deadline = addMonths(today, 2);
        } else {
          deadline = addMonths(today, 6);
        }
        
        // Create the goal
        await createGoalMutation.mutateAsync({
          title: goal.title,
          description: goal.description,
          type: goal.type,
          deadline,
          isPublic: false,
          parentGoalId: null
        });
        
        createdCount++;
      }
      
      // Show success toast
      toast({
        title: "Blueprint applied!",
        description: `Created ${createdCount} goals from the ${blueprint.title} blueprint.`,
      });
      
      // Show confetti for celebration
      celebrateCompletion();
      
      // Navigate to goals page
      navigate("/goals");
      
      // Reset temporary state if we were editing
      if (isEditingBeforeUse) {
        cancelTemporaryEditing();
      }
    } catch (error) {
      toast({
        title: "Error creating goals",
        description: "There was a problem applying the blueprint. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-500" />
            Blueprint Templates
          </div>
          {!isCreatingBlueprint && (
            <Button 
              variant="default" 
              size="sm"
              className="h-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm"
              onClick={() => {
                setIsCreatingBlueprint(true);
                setEditingBlueprint(null);
                setNewBlueprintTitle("");
                setNewBlueprintDescription("");
                setNewBlueprintGoals([]);
                setSelectedIconType("target");
                setSelectedTab("create");
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Create Custom Blueprint
            </Button>
          )}
        </CardTitle>
        <CardDescription>Ready-made goal frameworks for common objectives</CardDescription>
      </CardHeader>
      <CardContent>
        {isCreatingBlueprint ? (
          // Blueprint creation/editing form
          <div className="space-y-4">
            <div className="flex items-center">
              <h3 className="font-medium text-base">
                {editingBlueprint ? "Edit Blueprint" : "Create New Blueprint"}
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="blueprint-title">Blueprint Title</Label>
                  <Input 
                    id="blueprint-title" 
                    placeholder="E.g., Personal Development Path" 
                    value={newBlueprintTitle}
                    onChange={(e) => setNewBlueprintTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="blueprint-description">Description (Optional)</Label>
                  <Textarea 
                    id="blueprint-description" 
                    placeholder="What is this blueprint for?" 
                    value={newBlueprintDescription}
                    onChange={(e) => setNewBlueprintDescription(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="blueprint-icon">Blueprint Icon</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {iconOptions.find(opt => opt.value === selectedIconType)?.icon}
                        <span className="ml-2">
                          {iconOptions.find(opt => opt.value === selectedIconType)?.label}
                        </span>
                        <span className="sr-only">Select icon</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-2">
                      <div className="grid grid-cols-3 gap-2">
                        {iconOptions.map(option => (
                          <div 
                            key={option.value}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 rounded cursor-pointer transition-all hover:bg-muted",
                              selectedIconType === option.value ? "bg-primary/10 ring-1 ring-primary" : ""
                            )}
                            onClick={() => {
                              setSelectedIconType(option.value);
                            }}
                          >
                            <div className="mb-1">{option.icon}</div>
                            <span className="text-xs text-center">{option.label}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Blueprint Goals</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={addGoalToBlueprint}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Goal
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                  {newBlueprintGoals.length === 0 ? (
                    <div className="text-center p-4 border border-dashed rounded-md text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Add goals to your blueprint</p>
                    </div>
                  ) : (
                    newBlueprintGoals.map((goal, index) => (
                      <Card key={index} className="relative">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeBlueprintGoal(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={goal.type} 
                              onValueChange={(value: any) => updateBlueprintGoal(index, 'type', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="short">Short Term</SelectItem>
                                <SelectItem value="medium">Medium Term</SelectItem>
                                <SelectItem value="long">Long Term</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              placeholder="Goal Title" 
                              value={goal.title}
                              onChange={(e) => updateBlueprintGoal(index, 'title', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <Textarea 
                            placeholder="Goal Description" 
                            value={goal.description}
                            onChange={(e) => updateBlueprintGoal(index, 'description', e.target.value)}
                            className="text-sm"
                          />
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-2 space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreatingBlueprint(false);
                  setEditingBlueprint(null);
                  setSelectedTab("browse");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveCustomBlueprint}>
                {editingBlueprint ? "Update Blueprint" : "Save Blueprint"}
              </Button>
            </div>
          </div>
        ) : (
          // Blueprint browsing and selection
          <Tabs defaultValue="browse" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">Browse Templates</TabsTrigger>
              <TabsTrigger value="selected">
                {selectedBlueprint !== null ? "Selected Blueprint" : "No Selection"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="browse" className="space-y-4 mt-4">
              <Tabs 
                value={browseCategory} 
                onValueChange={(value) => {
                  setBrowseCategory(value);
                  setCurrentBlueprintCategory(value as any);
                  setSelectedBlueprint(null);
                }} 
                className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="preset">Preset Templates</TabsTrigger>
                  <TabsTrigger value="custom">Custom Templates</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preset" className="space-y-2 pt-2">
                  {defaultBlueprints.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p>No preset templates available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {defaultBlueprints.map((blueprint, index) => (
                        <div 
                          key={index} 
                          className={cn(
                            "p-3 rounded-md bg-white dark:bg-gray-800 cursor-pointer transition-all hover:shadow-md relative",
                            selectedBlueprint === index && currentBlueprintCategory === "preset" ? "ring-2 ring-green-500 shadow-md" : ""
                          )}
                          onClick={() => {
                            setSelectedBlueprint(index);
                            setCurrentBlueprintCategory("preset");
                          }}
                        >
                          <div className="flex items-center mb-2">
                            {blueprint.icon}
                            <h4 className="font-medium text-sm ml-2">{blueprint.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{blueprint.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              {blueprint.goals.length} goals
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBlueprint(index);
                                setCurrentBlueprintCategory("preset");
                                setSelectedTab("selected");
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-2 pt-2">
                  {customBlueprints.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p>You haven't created any custom blueprints yet</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setIsCreatingBlueprint(true);
                          setEditingBlueprint(null);
                          setNewBlueprintTitle("");
                          setNewBlueprintDescription("");
                          setNewBlueprintGoals([]);
                        }}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Create Your First Blueprint
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customBlueprints.map((blueprint, index) => (
                        <div 
                          key={index} 
                          className={cn(
                            "p-3 rounded-md bg-white dark:bg-gray-800 cursor-pointer transition-all hover:shadow-md relative",
                            selectedBlueprint === index && currentBlueprintCategory === "custom" ? "ring-2 ring-green-500 shadow-md" : ""
                          )}
                          onClick={() => {
                            setSelectedBlueprint(index);
                            setCurrentBlueprintCategory("custom");
                          }}
                        >
                          <div className="absolute top-1 right-1 flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-blue-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                editBlueprint(blueprint);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (blueprint.id) {
                                  deleteCustomBlueprint(blueprint.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center mb-2">
                            {blueprint.icon}
                            <h4 className="font-medium text-sm ml-2">{blueprint.title}</h4>
                            <span className="text-xs ml-2 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded">Custom</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{blueprint.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              {blueprint.goals.length} goals
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBlueprint(index);
                                setCurrentBlueprintCategory("custom");
                                setSelectedTab("selected");
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            <TabsContent value="selected" className="mt-4">
              {selectedBlueprint !== null ? (
                <div className="space-y-4">
                  {(() => {
                    // If we're in edit mode, use the temporary blueprint
                    // Otherwise use the selected blueprint from the collection
                    const blueprintToShow = isEditingBeforeUse && temporaryBlueprint 
                      ? temporaryBlueprint 
                      : (() => {
                          const blueprints = currentBlueprintCategory === "preset" ? defaultBlueprints : customBlueprints;
                          return blueprints[selectedBlueprint];
                        })();
                    
                    if (!blueprintToShow) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <Target className="h-8 w-8 mx-auto mb-3 opacity-50" />
                          <p>Blueprint not found. Please select another blueprint.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {blueprintToShow.icon}
                            <h3 className="font-medium ml-2">{blueprintToShow.title} Blueprint</h3>
                            {blueprintToShow.isCustom && (
                              <span className="text-xs ml-2 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded">Custom</span>
                            )}
                          </div>
                          {!isEditingBeforeUse && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-7 text-xs"
                              onClick={initTemporaryBlueprint}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit Goals Before Using
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{blueprintToShow.description}</p>
                        
                        {isEditingBeforeUse ? (
                          // Editable goals list
                          <div className="space-y-3 max-h-[300px] overflow-y-auto p-1">
                            {blueprintToShow.goals.map((goal, index) => (
                              <Card key={index} className="relative">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Select 
                                      value={goal.type} 
                                      onValueChange={(value: any) => updateTemporaryGoal(index, 'type', value)}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="short">Short Term</SelectItem>
                                        <SelectItem value="medium">Medium Term</SelectItem>
                                        <SelectItem value="long">Long Term</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input 
                                      placeholder="Goal Title" 
                                      value={goal.title}
                                      onChange={(e) => updateTemporaryGoal(index, 'title', e.target.value)}
                                      className="flex-1"
                                    />
                                  </div>
                                  <Textarea 
                                    placeholder="Goal Description" 
                                    value={goal.description}
                                    onChange={(e) => updateTemporaryGoal(index, 'description', e.target.value)}
                                    className="text-sm"
                                  />
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          // Read-only goals list
                          <div className="space-y-3 mt-4">
                            {blueprintToShow.goals.map((goal, index) => (
                              <div key={index} className="p-3 rounded-md bg-white dark:bg-gray-800 shadow-sm">
                                <div className="flex items-center mb-1">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full mr-2",
                                    goal.type === "short" ? "bg-amber-500" : 
                                    goal.type === "medium" ? "bg-blue-500" : "bg-purple-500"
                                  )} />
                                  <div className="font-medium text-sm">{goal.title}</div>
                                  <span className="text-xs ml-2 text-muted-foreground">({goal.type})</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{goal.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Workload Analysis for Blueprint */}
                        {(() => {
                          const workloadAnalysis = getBlueprintWorkloadAnalysis(blueprintToShow);
                          if (!workloadAnalysis) return null;
                          
                          // Helper functions for styling
                          const getWorkloadColor = (level: string) => {
                            if (level === "high") return "text-white";
                            if (level === "medium") return "text-amber-950 dark:text-amber-50";
                            return "text-green-950 dark:text-green-50";
                          };
                          
                          const getWorkloadBackground = (level: string) => {
                            if (level === "high") return "bg-red-500 dark:bg-red-600";
                            if (level === "medium") return "bg-amber-300 dark:bg-amber-600";
                            return "bg-green-300 dark:bg-green-600";
                          };
                          
                          const getWorkloadIcon = (level: string) => {
                            if (level === "high") return <AlertTriangle className="h-5 w-5 flex-shrink-0" />;
                            if (level === "medium") return <AlertCircle className="h-5 w-5 flex-shrink-0" />;
                            return <CheckCircle className="h-5 w-5 flex-shrink-0" />;
                          };
                          
                          return (
                            <div className="mb-4 space-y-3">
                              <div className={cn(
                                "p-3 rounded-md flex items-start gap-2",
                                getWorkloadBackground(workloadAnalysis.workload.level)
                              )}>
                                {getWorkloadIcon(workloadAnalysis.workload.level)}
                                <div>
                                  <h5 className={cn("text-sm font-medium", getWorkloadColor(workloadAnalysis.workload.level))}>
                                    Blueprint Workload Assessment
                                  </h5>
                                  <p className={cn("text-sm", getWorkloadColor(workloadAnalysis.workload.level))}>
                                    {workloadAnalysis.workload.message}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/30 p-3 rounded-md border">
                                  <div className="text-xs font-medium mb-2 text-muted-foreground">Current Active Goals</div>
                                  <div className="flex items-center justify-between">
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="flex flex-col items-center">
                                        <div className="bg-amber-100 dark:bg-amber-900/30 w-8 h-8 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium">{workloadAnalysis.current.short}</span>
                                        </div>
                                        <span className="text-[10px] mt-1">Short</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="bg-blue-100 dark:bg-blue-900/30 w-8 h-8 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium">{workloadAnalysis.current.medium}</span>
                                        </div>
                                        <span className="text-[10px] mt-1">Medium</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="bg-purple-100 dark:bg-purple-900/30 w-8 h-8 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium">{workloadAnalysis.current.long}</span>
                                        </div>
                                        <span className="text-[10px] mt-1">Long</span>
                                      </div>
                                    </div>
                                    <div className="border-l pl-3">
                                      <div className="text-lg font-medium">{workloadAnalysis.current.total}</div>
                                      <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-muted/30 p-3 rounded-md border">
                                  <div className="text-xs font-medium mb-2 text-muted-foreground">Goals in Blueprint</div>
                                  <div className="flex items-center justify-between">
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="flex flex-col items-center">
                                        <div className="bg-amber-100 dark:bg-amber-900/30 w-8 h-8 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium">{workloadAnalysis.blueprint.short}</span>
                                        </div>
                                        <span className="text-[10px] mt-1">Short</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="bg-blue-100 dark:bg-blue-900/30 w-8 h-8 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium">{workloadAnalysis.blueprint.medium}</span>
                                        </div>
                                        <span className="text-[10px] mt-1">Medium</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <div className="bg-purple-100 dark:bg-purple-900/30 w-8 h-8 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium">{workloadAnalysis.blueprint.long}</span>
                                        </div>
                                        <span className="text-[10px] mt-1">Long</span>
                                      </div>
                                    </div>
                                    <div className="border-l pl-3">
                                      <div className="text-lg font-medium">{workloadAnalysis.blueprint.total}</div>
                                      <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                          
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                          <div className="flex items-start">
                            <InfoIcon className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Ready to apply this blueprint?</p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                This will create {blueprintToShow.goals.length} new goals based on this blueprint. Each goal will have appropriate deadlines set automatically.
                              </p>
                              {isEditingBeforeUse && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                                  Your edits will only apply to this one-time use and won't be saved to the blueprint.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-4">
                          {isEditingBeforeUse ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={cancelTemporaryEditing}
                              >
                                Cancel Edits
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={useSelectedBlueprint}
                                disabled={createGoalMutation.isPending}
                              >
                                {createGoalMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Goals...
                                  </>
                                ) : (
                                  "Use Edited Blueprint"
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedBlueprint(null);
                                  setSelectedTab("browse");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={useSelectedBlueprint}
                                disabled={createGoalMutation.isPending}
                              >
                                {createGoalMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Goals...
                                  </>
                                ) : (
                                  "Use Blueprint"
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>Select a blueprint template to get started</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default function GoalCreationPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { celebrateCompletion } = useConfetti();
  
  // Track which creation method is selected
  const [creationMethod, setCreationMethod] = useState<"single" | "blueprint">("single");
  
  // Initialize with "short" as default goal type
  const [selectedType, setSelectedType] = useState<"short" | "medium" | "long">("short");
  
  // Set default values based on goal type
  const getDefaultDeadline = () => {
    const today = new Date();
    if (selectedType === "short") {
      return addDays(today, 14); // Default to 2 weeks for short term
    } else if (selectedType === "medium") {
      return addMonths(today, 2); // Default to 2 months for medium term
    } else {
      return addMonths(today, 6); // Default to 6 months for long term
    }
  };
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: selectedType,
      deadline: getDefaultDeadline(),
      isPublic: false,
      parentGoalId: null
    },
  });
  
  // Update form values when the type changes
  const updateFormTypeAndDeadline = (type: "short" | "medium" | "long") => {
    setSelectedType(type);
    form.setValue("type", type);
    
    // Adjust deadline based on new type
    const newDeadline = (() => {
      const today = new Date();
      if (type === "short") return addDays(today, 14);
      if (type === "medium") return addMonths(today, 2);
      return addMonths(today, 6);
    })();
    
    form.setValue("deadline", newDeadline);
  };
  
  const createGoalMutation = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const res = await apiRequest("POST", "/api/goals", values);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal created successfully!",
        description: "Your new goal has been added to your dashboard.",
      });
      celebrateCompletion();
      
      // Navigate to the goal details page
      navigate(`/goal/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (values: GoalFormValues) => {
    await createGoalMutation.mutateAsync(values);
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
                Create New Goal
              </h1>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                Define your objectives with clarity and purpose
              </p>
            </div>
          </div>
          
          {/* Method Selection Tabs */}
          <Tabs 
            defaultValue="single" 
            className="mb-6"
            onValueChange={(value) => setCreationMethod(value as "single" | "blueprint")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Single Goal
              </TabsTrigger>
              <TabsTrigger value="blueprint" className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Blueprint Templates
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="md:col-span-2 space-y-6">
              {creationMethod === "single" ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Goal Details</CardTitle>
                      <CardDescription>Define what you want to achieve</CardDescription>
                    </div>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Button variant="outline" size="icon">
                          <InfoIcon className="h-4 w-4" />
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <SmartGoalExplanation />
                      </HoverCardContent>
                    </HoverCard>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                          <div className="bg-muted/50 rounded-lg p-4">
                            <h3 className="font-medium mb-3">Goal Type</h3>
                            <div className="grid grid-cols-3 gap-3">
                              <div 
                                className={cn(
                                  "cursor-pointer border rounded-lg p-3 text-center transition-all",
                                  selectedType === "short" 
                                    ? "bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700" 
                                    : "hover:bg-muted"
                                )}
                                onClick={() => updateFormTypeAndDeadline("short")}
                              >
                                <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                                <div className="font-medium text-sm">Short Term</div>
                                <div className="text-xs text-muted-foreground">7-30 days</div>
                              </div>
                              <div 
                                className={cn(
                                  "cursor-pointer border rounded-lg p-3 text-center transition-all",
                                  selectedType === "medium" 
                                    ? "bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700" 
                                    : "hover:bg-muted"
                                )}
                                onClick={() => updateFormTypeAndDeadline("medium")}
                              >
                                <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                                <div className="font-medium text-sm">Medium Term</div>
                                <div className="text-xs text-muted-foreground">1-3 months</div>
                              </div>
                              <div 
                                className={cn(
                                  "cursor-pointer border rounded-lg p-3 text-center transition-all",
                                  selectedType === "long" 
                                    ? "bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700" 
                                    : "hover:bg-muted"
                                )}
                                onClick={() => updateFormTypeAndDeadline("long")}
                              >
                                <Clock className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                                <div className="font-medium text-sm">Long Term</div>
                                <div className="text-xs text-muted-foreground">3-12 months</div>
                              </div>
                            </div>
                          </div>
                        
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Goal Title
                                  <HoverCard>
                                    <HoverCardTrigger>
                                      <InfoIcon className="h-4 w-4 ml-1 text-muted-foreground inline-block" />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                      <div className="space-y-2">
                                        <h4 className="font-medium">Effective Goal Titles</h4>
                                        <p className="text-sm text-muted-foreground">Use specific, action-oriented language that clearly states what you want to accomplish.</p>
                                        <div className="border-t pt-2 mt-2">
                                          <div className="flex">
                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Good: "Complete 5K training program"</p>
                                            </div>
                                          </div>
                                          <div className="flex mt-1">
                                            <CheckCircle className="h-4 w-4 text-red-500 mr-2" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Avoid: "Get in shape"</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="What do you want to achieve?" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Be specific and action-oriented
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Description
                                  <HoverCard>
                                    <HoverCardTrigger>
                                      <InfoIcon className="h-4 w-4 ml-1 text-muted-foreground inline-block" />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                      <div className="space-y-2">
                                        <h4 className="font-medium">Powerful Goal Descriptions</h4>
                                        <p className="text-sm text-muted-foreground">Include your motivation, success metrics, and key milestones.</p>
                                        <div className="border-t pt-2 mt-2">
                                          <div className="flex">
                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Motivation: Why is this goal important to you?</p>
                                            </div>
                                          </div>
                                          <div className="flex mt-1">
                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Metrics: How will you measure success?</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe your goal in detail, including why it matters to you and how you'll measure success." 
                                    className="min-h-[120px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Include your motivation and metrics for success
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="deadline"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>
                                  Deadline
                                  <HoverCard>
                                    <HoverCardTrigger>
                                      <InfoIcon className="h-4 w-4 ml-1 text-muted-foreground inline-block" />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                      <div className="space-y-2">
                                        <h4 className="font-medium">Setting Effective Deadlines</h4>
                                        <p className="text-sm text-muted-foreground">Choose a deadline that creates healthy pressure but remains achievable.</p>
                                        <div className="border-t pt-2 mt-2">
                                          <div className="flex">
                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Short-term: 7-30 days</p>
                                            </div>
                                          </div>
                                          <div className="flex mt-1">
                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Medium-term: 1-3 months</p>
                                            </div>
                                          </div>
                                          <div className="flex mt-1">
                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Long-term: 3-12 months</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>
                                  Choose a realistic timeframe for completion
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="mr-2"
                            onClick={() => navigate("/goals")}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createGoalMutation.isPending}
                          >
                            {createGoalMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Goal"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : (
                <BlueprintTemplates />
              )}
            </div>
            
            {/* Sidebar Area */}
            <div className="space-y-6">
              {creationMethod === "single" ? (
                <>
                  <AiSuggestions />
                  <DeadlineGuidance 
                    selectedType={selectedType} 
                    selectedDate={form.watch("deadline")}
                  />
                </>
              ) : (
                <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                      About Blueprints
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-3">
                      Blueprints let you create multiple related goals at once, setting up a framework for achieving larger objectives.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Choose from preset templates or create your own custom blueprints</span>
                      </li>
                      <li className="flex">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Create short, medium, and long-term goals that build on each other</span>
                      </li>
                      <li className="flex">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Save your blueprint designs for future use</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}