import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Goal, Task } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { GoalHierarchy } from "@/components/goal-hierarchy";
import { Sidebar } from "@/components/sidebar";
import { ScrollToTop } from "@/components/scroll-to-top";
import { GoalTimelineView } from "@/components/goal-timeline-view";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { cn, formatDate, getGoalTypeClass } from "@/lib/utils";
import {
  Loader2,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  List as ListIcon,
  ListTree,
  AlignLeft,
  Calendar,
  Clock,
  SortAsc,
  CheckCircle2,
  Circle as CircleIcon,
  CheckCircle,
  Archive,
  Trash,
  Info,
  PlusSquare,
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
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    goalId: number | null;
  }>({
    show: false,
    x: 0,
    y: 0,
    goalId: null
  });

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
      return [groupName, sortGoals(groupGoals)];
    });

    if (groups.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          No goals found matching your search criteria.
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {groups.map(([groupName, goals], groupIndex) => {
          const isCollapsed = collapsedGroups.includes(groupName);
          
          return (
            <div 
              key={groupName}
              className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden goal-group`}
              style={{ animationDelay: `${groupIndex * 100}ms` }}
            >
              <div 
                className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200"
                onClick={() => {
                  if (isCollapsed) {
                    setCollapsedGroups(prev => prev.filter(g => g !== groupName));
                  } else {
                    setCollapsedGroups(prev => [...prev, groupName]);
                  }
                }}
              >
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  {groupName} <span className="text-gray-500 dark:text-gray-400 text-sm">({goals.length} goals)</span>
                </h3>
                <div className="transition-transform duration-300 hover:scale-110 active:scale-95">
                  <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                    <ChevronRight className={`h-4 w-4 transform transition-transform duration-300 ease-in-out ${!isCollapsed ? 'rotate-90' : ''}`} />
                  </Button>
                </div>
              </div>
              
              
                {!isCollapsed && (
                  <div 
                    className="divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden"
                  >
                    {goals.map((goal, index) => (
                      <div 
                        key={goal.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300 hover:shadow-md dark:hover:shadow-gray-800/30 goal-item"
                        style={{ animationDelay: `${(index * 50) + 50}ms` }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            show: true,
                            x: e.clientX,
                            y: e.clientY,
                            goalId: goal.id
                          });
                        }}
                      >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <Link 
                            href={`/goal/${goal.id}`}
                            className="text-md font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline transition-all duration-200 ease-in-out hover:scale-[1.02] inline-block transform-gpu"
                          >
                            {goal.title}
                          </Link>
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
                          className="ml-4 shrink-0 transition-all duration-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 hover:shadow-sm"
                          onClick={() => navigate(`/goal/${goal.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
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
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({
              show: true,
              x: e.clientX,
              y: e.clientY,
              goalId: goal.id
            });
          }}
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
              
              {/* Goal description */}
              {goal.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {goal.description}
                </p>
              )}
              
              {/* Goal deadline */}
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                <span>Deadline: {formatDate(goal.deadline)}</span>
              </div>
            </div>
            
            {/* Expand/collapse button if goal has children */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-8 w-8"
                onClick={() => toggleExpand(goal.id)}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
        
        {/* Child goals */}
        {hasChildren && isExpanded && (
          <div className="pl-8 mt-4 relative">
            {/* Vertical line connecting to children */}
            <div className={`absolute left-4 top-0 bottom-0 w-0.5 ${verticalLineColor}`}></div>
            
            {/* Render the child goals */}
            <div className="space-y-8">
              {children?.map((childGoal) => renderGoalTree(childGoal, level + 1))}
            </div>
          </div>
        )}
      </div>
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

  // Handle context menu actions
  const handleContextMenuAction = (action: string) => {
    if (!contextMenu.goalId) return;
    
    // Find the goal
    const goal = filteredGoals?.find(g => g.id === contextMenu.goalId);
    
    if (!goal) return;
    
    switch (action) {
      case "view":
        navigate(`/goal/${goal.id}`);
        break;
      case "addTask":
        navigate(`/goal/${goal.id}?addTask=true`);
        break;
      case "viewCalendar":
        navigate(`/goal/${goal.id}?tab=calendar`);
        break;
      case "archive":
        // You'll need to implement the archive mutation here
        toast({
          title: "Archive feature",
          description: "Goal archiving would be triggered here.",
        });
        break;
      case "delete":
        // You'll need to implement the delete confirmation and mutation here
        toast({
          title: "Delete feature",
          description: "Goal deletion confirmation would be shown here.",
        });
        break;
    }
    
    // Close the context menu
    setContextMenu({ show: false, x: 0, y: 0, goalId: null });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        setContextMenu({ show: false, x: 0, y: 0, goalId: null });
      }
    };
    
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu.show]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 px-4 py-8 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Goals</h1>
              <p className="text-gray-500 dark:text-gray-400">View and manage all your goals</p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/goals/archived">
                  <Archive className="mr-2 h-4 w-4" />
                  Archived Goals
                </Link>
              </Button>
              <Button
                onClick={() => navigate("/goal/new")}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Goal
              </Button>
            </div>
          </div>
          
          {/* Context Menu */}
          {contextMenu.show && (
            <div
              className="fixed z-50 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
              style={{
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  onClick={() => handleContextMenuAction("view")}
                >
                  <Info className="mr-2 h-4 w-4" />
                  View Details
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  onClick={() => handleContextMenuAction("addTask")}
                >
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Add Task
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  onClick={() => handleContextMenuAction("viewCalendar")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  View in Calendar
                </button>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <button
                  className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  onClick={() => handleContextMenuAction("archive")}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Goal
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  onClick={() => handleContextMenuAction("delete")}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Goal
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search goals..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="list">
              <div className="flex items-center mb-6">
                <TabsList>
                  <TabsTrigger value="list" className="flex items-center">
                    <AlignLeft className="mr-2 h-4 w-4" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex items-center">
                    <ListTree className="mr-2 h-4 w-4" />
                    Timeline View
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="list" className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Goals List
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // If there are any collapsed groups, expand all groups
                        if (collapsedGroups.length > 0) {
                          setCollapsedGroups([]);
                        } else {
                          // Otherwise collapse all groups
                          const groupedGoals = groupGoals(filteredGoals || []);
                          setCollapsedGroups(Object.keys(groupedGoals));
                        }
                      }}
                    >
                      {collapsedGroups.length > 0 ? (
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Timeline View
                  </h2>
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
                  <GoalTimelineView 
                    goals={filteredGoals || []}
                    allCollapsed={timelineCollapsed}
                  />
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                        You don't have any goals yet. Start by creating your first goal!
                      </p>
                      <Button onClick={() => navigate("/goal/new")}>
                        <PlusCircle className="mr-2 h-4 w-4" />
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
        </div>
      </main>
    </div>
  );
}