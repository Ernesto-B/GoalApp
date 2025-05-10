import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Goal, Task } from "@shared/schema";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { GoalForm } from "@/components/goal-form";
import { GoalHierarchy } from "@/components/goal-hierarchy";
import { Sidebar } from "@/components/sidebar";
import { ScrollToTop } from "@/components/scroll-to-top";
import { GoalTimelineView } from "@/components/goal-timeline-view";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { cn, formatDate, getGoalTypeClass } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { InfoIcon, ArchiveIcon, Trash2, PlusSquare, Calendar as CalendarIcon } from "lucide-react";
import {
  Loader2,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Plus,
  List as ListIcon,
  Network,
  ListTree,
  AlignLeft,
  Calendar,
  Clock,
  SortAsc,
  CheckCircle2,
  Circle as CircleIcon,
  CheckCircle,
} from "lucide-react";

type GoalGrouping = "type" | "deadline" | "created" | "status";
type GoalSorting = "type" | "deadline" | "created" | "status";

export default function GoalsPage() {
  const { toast } = useToast();
  const isMobile = useMobile();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGoals, setExpandedGoals] = useState<number[]>([]);
  const [groupBy, setGroupBy] = useState<GoalGrouping>("type");
  const [sortBy, setSortBy] = useState<GoalSorting>("created");
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [goalFormType, setGoalFormType] = useState<"short" | "medium" | "long">("short");
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  
  const handleAddGoal = (type: "short" | "medium" | "long") => {
    setGoalFormType(type);
    setIsGoalFormOpen(true);
  };

  const {
    data: goals,
    isLoading,
    error,
  } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    toast({
      title: "Error fetching goals",
      description: error.message,
      variant: "destructive",
    });
  }

  // Filter goals by search term
  const filteredGoals = searchTerm
    ? goals?.filter(
        (goal) =>
          goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          goal.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : goals;

  // Get root goals (those without a parent)
  const rootGoals = filteredGoals?.filter((goal) => !goal.parentGoalId);

  // Function to get child goals for a parent
  const getChildGoals = (parentId: number) => {
    return filteredGoals?.filter((goal) => goal.parentGoalId === parentId);
  };

  // Toggle expanded state for a goal
  const toggleExpand = (goalId: number) => {
    setExpandedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId],
    );
  };

  // Function to group goals based on the selected grouping
  const groupGoals = (goals: Goal[]) => {
    if (!goals || goals.length === 0) return {};

    switch (groupBy) {
      case "type":
        return goals.reduce((acc, goal) => {
          const type = goal.type || "unknown";
          if (!acc[type]) acc[type] = [];
          acc[type].push(goal);
          return acc;
        }, {} as Record<string, Goal[]>);
      
      case "deadline":
        return goals.reduce((acc, goal) => {
          const deadline = new Date(goal.deadline);
          const month = deadline.toLocaleString('default', { month: 'long', year: 'numeric' });
          if (!acc[month]) acc[month] = [];
          acc[month].push(goal);
          return acc;
        }, {} as Record<string, Goal[]>);
      
      case "created":
        return goals.reduce((acc, goal) => {
          const created = new Date(goal.createdAt || Date.now());
          const month = created.toLocaleString('default', { month: 'long', year: 'numeric' });
          if (!acc[month]) acc[month] = [];
          acc[month].push(goal);
          return acc;
        }, {} as Record<string, Goal[]>);
      

      
      case "status":
        return goals.reduce((acc, goal) => {
          let status = "In Progress";
          if (goal.isCompleted) status = "Completed";
          else if (goal.isArchived) status = "Archived";
          
          if (!acc[status]) acc[status] = [];
          acc[status].push(goal);
          return acc;
        }, {} as Record<string, Goal[]>);
      
      default:
        return { "All Goals": goals };
    }
  };

  // Function to sort goals based on selected criteria
  const sortGoals = (goals: Goal[]): Goal[] => {
    if (!goals || goals.length === 0) return [];
    
    const sorted = [...goals];
    
    switch (sortBy) {
      case "type":
        // Sort by type: short, medium, long
        return sorted.sort((a, b) => {
          const typeOrder = { short: 1, medium: 2, long: 3 };
          return (typeOrder[a.type as keyof typeof typeOrder] || 0) - (typeOrder[b.type as keyof typeof typeOrder] || 0);
        });
      
      case "deadline":
        // Sort by deadline date
        return sorted.sort((a, b) => {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
      
      case "created":
        // Sort by creation date (newest first)
        return sorted.sort((a, b) => {
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdB - createdA; // newest first
        });
      
      case "status":
        // Sort by status: in progress, completed, archived
        return sorted.sort((a, b) => {
          // Define status order: in progress first, then completed, then archived
          const getStatusPriority = (goal: Goal): number => {
            if (goal.isArchived) return 3;
            if (goal.isCompleted) return 2;
            return 1; // in progress
          };
          return getStatusPriority(a) - getStatusPriority(b);
        });
      
      default:
        return sorted;
    }
  };

  // Function to render the goal list with the appropriate grouping
  const renderGoalList = (goals: Goal[]) => {
    // Group the goals
    const groupedGoals = groupGoals(goals);
    let groups = Object.entries(groupedGoals);
    
    // Sort each group's goals
    groups = groups.map(([groupName, groupGoals]) => {
      return [groupName, sortGoals(groupGoals as Goal[])] as [string, Goal[]];
    });

    if (groups.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          No goals found matching your search criteria.
        </div>
      );
    }

    return (
      <motion.div 
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {groups.map(([groupName, goals], groupIndex) => (
          <motion.div 
            key={groupName} 
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            transition={{ 
              duration: 0.4, 
              delay: groupIndex * 0.15,
              type: "spring",
              stiffness: 80,
              damping: 15
            }}
          >
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                {groupName} <span className="text-gray-500 dark:text-gray-400 text-sm">({(goals as Goal[]).length} goals)</span>
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {(goals as Goal[]).map((goal: Goal, goalIndex: number) => {
                const handleGoalClick = () => navigate(`/goal/${goal.id}`);
                const handleDetailClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  navigate(`/goal/${goal.id}`);
                };
                
                const handleArchiveGoal = () => {
                  apiRequest("POST", `/api/goals/${goal.id}/archive`)
                    .then(() => {
                      queryClient.invalidateQueries({queryKey: ["/api/goals"]});
                      toast({
                        title: "Goal archived",
                        description: "The goal has been archived successfully",
                      });
                    })
                    .catch(error => {
                      toast({
                        title: "Error archiving goal",
                        description: error.message,
                        variant: "destructive",
                      });
                    });
                };
                
                const handleDeleteGoal = () => {
                  if (confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
                    apiRequest("DELETE", `/api/goals/${goal.id}`)
                      .then(() => {
                        queryClient.invalidateQueries({queryKey: ["/api/goals"]});
                        toast({
                          title: "Goal deleted",
                          description: "The goal has been deleted successfully",
                        });
                      })
                      .catch(error => {
                        toast({
                          title: "Error deleting goal",
                          description: error.message,
                          variant: "destructive",
                        });
                      });
                  }
                };
                
                return (
                  <motion.div 
                    key={goal.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    transition={{ 
                      duration: 0.4, 
                      delay: goalIndex * 0.05 + groupIndex * 0.1, 
                      type: "spring",
                      stiffness: 100,
                      damping: 10
                    }}
                  >
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <motion.div
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          onClick={handleGoalClick}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div 
                                className="text-md font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                              >
                                {goal.title}
                              </div>
                              <div className="flex items-center mt-1 space-x-2">
                                <Badge className={cn(getGoalTypeClass(goal.type, "bg"))}>
                                  {goal.type}
                                </Badge>
                                {goal.isCompleted && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/40">
                                    Completed
                                  </Badge>
                                )}
                                {goal.isArchived && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                              {goal.description && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {goal.description}
                                </p>
                              )}
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Deadline: {formatDate(goal.deadline)}
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="ml-4 shrink-0"
                              onClick={handleDetailClick}
                            >
                              View Details
                            </Button>
                          </div>
                        </motion.div>
                      </ContextMenuTrigger>
                      
                      <ContextMenuContent className="w-56">
                        <ContextMenuItem 
                          onClick={() => navigate(`/goal/${goal.id}`)}
                          className="flex items-center cursor-pointer"
                        >
                          <InfoIcon className="mr-2 h-4 w-4" />
                          <span>View details</span>
                        </ContextMenuItem>
                        
                        <ContextMenuItem 
                          onClick={() => navigate(`/goal/${goal.id}?add=task`)}
                          className="flex items-center cursor-pointer"
                        >
                          <PlusSquare className="mr-2 h-4 w-4" />
                          <span>Add task</span>
                        </ContextMenuItem>
                        
                        <ContextMenuItem 
                          onClick={() => navigate(`/calendar?goal=${goal.id}`)}
                          className="flex items-center cursor-pointer"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          <span>View in calendar</span>
                        </ContextMenuItem>
                        
                        <ContextMenuSeparator />
                        
                        {!goal.isArchived && !goal.isCompleted && (
                          <ContextMenuItem 
                            onClick={handleArchiveGoal}
                            className="flex items-center cursor-pointer text-orange-600 focus:text-orange-600 dark:text-orange-400 dark:focus:text-orange-400"
                          >
                            <ArchiveIcon className="mr-2 h-4 w-4" />
                            <span>Archive Goal</span>
                          </ContextMenuItem>
                        )}
                        
                        <ContextMenuItem 
                          className="flex items-center cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                          onClick={handleDeleteGoal}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Goal</span>
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  // Helper to get the vertical line color for the goal type
  const getVerticalLineColor = (type: string): string => {
    switch (type) {
      case "long":
        return "bg-purple-500";
      case "medium":
        return "bg-blue-500";
      case "short":
        return "bg-amber-500";
      default:
        return "bg-gray-300 dark:bg-gray-600";
    }
  };

  // Helper to get the circular indicator color for the goal type
  const getCircleBackground = (type: string): string => {
    switch (type) {
      case "long":
        return "bg-purple-100 dark:bg-purple-900/30";
      case "medium":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "short":
        return "bg-amber-100 dark:bg-amber-900/30";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
  };

  // Helper to get the circle icon color for the goal type
  const getCircleIconColor = (type: string): string => {
    switch (type) {
      case "long":
        return "text-purple-600 dark:text-purple-400";
      case "medium":
        return "text-blue-600 dark:text-blue-400";
      case "short":
        return "text-amber-600 dark:text-amber-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  };

  // Recursive component to render a goal and its children in a clear parent-child tree structure
  const renderGoalTree = (goal: Goal, level: number = 0) => {
    const children = getChildGoals(goal.id);
    const hasChildren = children && children.length > 0;
    const isExpanded = expandedGoals.includes(goal.id);
    const verticalLineColor = getVerticalLineColor(goal.type);
    const circleBackground = getCircleBackground(goal.type);
    const circleIconColor = getCircleIconColor(goal.type);

    return (
      <div key={goal.id} className="relative mb-8">
        {/* Goal node */}
        <div 
          className={cn(
            "border rounded-md shadow-sm p-4 transition-all",
            getGoalTypeClass(goal.type, "border"),
            "bg-white dark:bg-gray-800"
          )}
        >
          <div className="flex items-start">
            {/* Goal indicator circle */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${circleBackground} flex items-center justify-center mr-3`}>
              <CircleIcon className={`w-4 h-4 ${circleIconColor}`} />
            </div>
            
            <div className="flex-1">
              {/* Goal header with badges */}
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <Link 
                  href={`/goal/${goal.id}`} 
                  className="text-lg font-semibold hover:underline text-gray-900 dark:text-gray-100"
                >
                  {goal.title}
                </Link>
                <Badge className={cn(getGoalTypeClass(goal.type, "bg"))}>
                  {goal.type}
                </Badge>
                {goal.isCompleted && (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/40"
                  >
                    Completed
                  </Badge>
                )}
                {goal.isArchived && (
                  <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  >
                    Archived
                  </Badge>
                )}
              </div>
              
              {/* Goal details */}
              {goal.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {goal.description}
                </p>
              )}
              
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Deadline: {formatDate(goal.deadline)}
                </div>
                
                {/* Expand/collapse children button */}
                {hasChildren && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => toggleExpand(goal.id)} 
                    className="text-xs h-7 px-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="mr-1 h-3 w-3" />
                        Hide children
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-3 w-3" />
                        Show children ({children?.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Tasks list */}
          {isExpanded && (
            <div className="mt-4 border-t pt-3 border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Tasks
              </div>
              <div className="space-y-2 pl-2">
                {goal.type === "short" && (
                  <>
                    <div className="flex items-center text-sm">
                      <div className="h-4 w-4 rounded-full bg-green-500 mr-2 flex-shrink-0"></div>
                      <span className="text-gray-500 dark:text-gray-400 line-through">Research industry trends</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="h-4 w-4 rounded-full bg-green-500 mr-2 flex-shrink-0"></div>
                      <span className="text-gray-500 dark:text-gray-400 line-through">Identify pain points</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 rounded-full mr-2 flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300">Create project timeline</span>
                    </div>
                  </>
                )}
                
                {goal.type === "medium" && (
                  <>
                    <div className="flex items-center text-sm">
                      <div className="h-4 w-4 rounded-full bg-green-500 mr-2 flex-shrink-0"></div>
                      <span className="text-gray-500 dark:text-gray-400 line-through">Complete leadership training</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 rounded-full mr-2 flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300">Practice public speaking</span>
                    </div>
                  </>
                )}
                
                {goal.type === "long" && (
                  <>
                    <div className="flex items-center text-sm">
                      <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 rounded-full mr-2 flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300">Complete certification</span>
                    </div>
                  </>
                )}
                
                {/* If there are no example tasks based on type, show a placeholder */}
                {goal.type !== "short" && goal.type !== "medium" && goal.type !== "long" && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No tasks for this goal yet</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Child goals tree with connecting lines */}
        {isExpanded && hasChildren && (
          <div className="ml-8 mt-4 pl-6 relative">
            {/* Vertical connector line from parent to children */}
            <div className={`absolute left-0 top-0 w-0.5 h-full ${verticalLineColor}`}></div>
            
            {/* Child nodes */}
            {children?.map((childGoal, index) => (
              <div key={childGoal.id} className="relative">
                {/* Horizontal connector line to child */}
                <div className={`absolute left-0 top-6 w-6 h-0.5 ${verticalLineColor}`}></div>
                
                {/* Child goal tree */}
                {renderGoalTree(childGoal, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header - Only show on mobile */}
      {isMobile && (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                GoalQuest
              </h1>
            </div>
          </div>
        </header>
      )}

      {/* Sidebar */}
      <Sidebar />

      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                All Goals
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                View and manage all your goals
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Goal
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAddGoal("short")}>
                    <Clock className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Short Term Goal</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddGoal("medium")}>
                    <Clock className="mr-2 h-4 w-4 text-blue-500" />
                    <span>Medium Term Goal</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddGoal("long")}>
                    <Clock className="mr-2 h-4 w-4 text-purple-500" />
                    <span>Long Term Goal</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <Input
                type="search"
                placeholder="Search goals..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : goals?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                  You don't have any goals yet. Start by creating your first
                  goal!
                </p>
                <Button onClick={() => handleAddGoal("short")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list" className="flex items-center">
                  <AlignLeft className="mr-2 h-4 w-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center">
                  <ListTree className="mr-2 h-4 w-4" />
                  Timeline View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Goals List
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="ml-2">
                          <Plus className="h-4 w-4 mr-1" /> Add Goal
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAddGoal("short")}>
                          <Clock className="mr-2 h-4 w-4 text-amber-500" />
                          <span>Short Term Goal</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddGoal("medium")}>
                          <Clock className="mr-2 h-4 w-4 text-blue-500" />
                          <span>Medium Term Goal</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddGoal("long")}>
                          <Clock className="mr-2 h-4 w-4 text-purple-500" />
                          <span>Long Term Goal</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Group by:</span>
                      <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GoalGrouping)}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Select grouping" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="type">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Term</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="deadline">
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>Deadline Month</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="created">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Date Created</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="status">
                            <div className="flex items-center">
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              <span>Status</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as GoalSorting)}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Select sorting" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="type">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Term</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="deadline">
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>Deadline Month</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="created">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Date Created</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="status">
                            <div className="flex items-center">
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              <span>Status</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* List View Content */}
                {renderGoalList(filteredGoals || [])}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Timeline View
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="ml-2">
                          <Plus className="h-4 w-4 mr-1" /> Add Goal
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAddGoal("short")}>
                          <Clock className="mr-2 h-4 w-4 text-amber-500" />
                          <span>Short Term Goal</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddGoal("medium")}>
                          <Clock className="mr-2 h-4 w-4 text-blue-500" />
                          <span>Medium Term Goal</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddGoal("long")}>
                          <Clock className="mr-2 h-4 w-4 text-purple-500" />
                          <span>Long Term Goal</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimelineCollapsed(!timelineCollapsed)}
                  >
                    {timelineCollapsed ? (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Expand All
                      </>
                    ) : (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Collapse All
                      </>
                    )}
                  </Button>
                </div>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : goals && goals.length > 0 ? (
                  <div className="space-y-6">
                    {/* Timeline view showing goals chronologically */}
                    <GoalTimelineView 
                      goals={filteredGoals || []}
                      allCollapsed={timelineCollapsed}
                    />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                        You don't have any goals yet. Start by creating your first goal!
                      </p>
                      <Button onClick={() => handleAddGoal("short")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Goal
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Scroll to top button */}
          <ScrollToTop />
          
          {/* Goal Form Dialog */}
          <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogTitle>Create New {goalFormType.charAt(0).toUpperCase() + goalFormType.slice(1)} Term Goal</DialogTitle>
              <DialogDescription>
                Add the details for your new goal.
              </DialogDescription>
              <GoalForm 
                type={goalFormType} 
                onSuccess={() => setIsGoalFormOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
