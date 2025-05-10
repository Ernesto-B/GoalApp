import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { TaskForm } from "@/components/task-form";
import { Task, Goal, UserPreferences } from "@shared/schema";
import { TaskCalendar } from "@/components/task-calendar";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import {
  Loader2,
  Calendar as CalendarIcon,
  ListFilter,
  CheckCircle2,
  Plus,
  Clock,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Eye,
  RefreshCw, 
  ClipboardCheck,
  ArrowDown,
  ArrowUp,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Search,
  Target
} from "lucide-react";
import { formatDate, formatShortDate, getTaskTypeClass, cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/use-confetti";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollToTop } from "@/components/scroll-to-top";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// TaskTimeSection component to organize tasks by time period
type TaskTimeSectionProps = {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  getGoalById: (id: number) => Goal | undefined;
  onComplete: (id: number) => void;
  isCompleting: boolean;
  borderColor: string;
  registerSection?: (id: string, controls: {setCollapsed: (val: boolean) => void}) => void;
  onDeleteTask?: (taskId: number) => void;
};

function TaskTimeSection({ 
  title, 
  icon, 
  tasks, 
  getGoalById, 
  onComplete, 
  isCompleting,
  borderColor,
  registerSection,
  onDeleteTask
}: TaskTimeSectionProps) {
  // Use the parent component's state management for task deletion
  const handleDeleteTask = (taskId: number) => {
    if (onDeleteTask) {
      onDeleteTask(taskId);
    }
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sectionId = `time-${title.toLowerCase().replace(/\s+/g, '-')}`;
  
  // Register this section with parent for expand/collapse control
  useEffect(() => {
    if (registerSection) {
      registerSection(sectionId, { setCollapsed: setIsCollapsed });
    }
  }, [registerSection, sectionId]);
  
  // Return null after hooks are called
  if (tasks.length === 0) return null;
  
  // Toggle collapsed state when clicked anywhere on the header
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <div className="py-3 px-4">
      <div 
        className="flex items-center justify-between mb-2 cursor-pointer"
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium">{title}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </div>
      
      {!isCollapsed && (
        <div className={`space-y-2 pl-2 ${borderColor} border-l-2`}>
          {tasks.map(task => {
            const goal = getGoalById(task.goalId);
            return (
              <TaskListItem
                key={task.id}
                task={task}
                goal={goal}
                onComplete={() => onComplete(task.id)}
                isCompleting={isCompleting}
                onDelete={onDeleteTask}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// TaskListItem component for consistent task rendering in the list view
type TaskListItemProps = {
  task: Task;
  goal?: Goal;
  onComplete: () => void;
  isCompleting: boolean;
  onDelete?: (taskId: number) => void;
};

function TaskListItem({ task, goal, onComplete, isCompleting, onDelete }: TaskListItemProps) {
  const scheduledHour = new Date(task.scheduledDate).getHours();
  // Check if time is not set based on the timeOfDay field rather than just checking the hour
  const isTimeSet = task.timeOfDay !== "not_set";
  const { preferences } = useUserPreferences();
  const showSimplified = preferences?.showSimplifiedTasks === true;
  const [showOptions, setShowOptions] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const { toast } = useToast();
  
  // Format time for display
  const formattedTime = isTimeSet 
    ? format(new Date(task.scheduledDate), 'h:mm a')
    : 'No time set';
    
  // Determine task time period for visual cues
  const getTimePeriodColor = () => {
    // Base colors on the timeOfDay field rather than calculated hours
    if (task.timeOfDay === "not_set") return "border-gray-300";
    if (task.timeOfDay === "morning") return "border-amber-300";
    if (task.timeOfDay === "afternoon") return "border-blue-300";
    return "border-purple-300"; // evening
  };
  
  const handleViewDetails = () => {
    toast({
      title: "Task Details",
      description: `${task.title}: ${task.description || "No description provided"}`,
    });
  };
  
  const handleEdit = () => {
    setIsTaskEditOpen(true);
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className={`flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border ${getTimePeriodColor()} dark:border-opacity-30 hover:shadow group transition-all relative`}
          onMouseEnter={() => setShowOptions(true)}
          onMouseLeave={() => setShowOptions(false)}
        >
          {/* Task completion button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onComplete}
            disabled={isCompleting}
            className="h-7 w-7 p-0 flex-shrink-0 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            {isCompleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </Button>
          
          {/* Task content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium text-base">{task.title}</div>
                
                {/* Description (if not simplified view) */}
                {!showSimplified && task.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                {/* Task metadata row */}
                <div className="flex items-center flex-wrap mt-2 gap-x-3 gap-y-1">
                  {/* Time indicator */}
                  {!showSimplified && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      {formattedTime}
                    </span>
                  )}
                  
                  {/* Goal badge (if not simplified) */}
                  {!showSimplified && goal && (
                    <Badge 
                      variant="outline"
                      className={`ml-0 text-xs ${
                        goal.type === "short" 
                          ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                          : goal.type === "medium"
                          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                          : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                      }`}
                    >
                      {goal.title}
                    </Badge>
                  )}
                  
                  {/* Repeating task indicator */}
                  {!showSimplified && task.isRepeating && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <RefreshCw className="h-3 w-3 mr-1 flex-shrink-0" />
                      {task.repeatType === "daily" && "Daily"}
                      {task.repeatType === "every_other_day" && "Every 2 days"}
                      {task.repeatType === "weekly" && "Weekly"}
                      {task.repeatType === "monthly" && "Monthly"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onComplete} className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{task.isCompleted ? "Mark as incomplete" : "Complete task"}</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleViewDetails} className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span>View details</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleEdit} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          <span>Edit task</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDelete} className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <Trash2 className="h-4 w-4" />
          <span>Delete task</span>
        </ContextMenuItem>
      </ContextMenuContent>
      
      {/* Edit Task Dialog */}
      {isTaskEditOpen && (
        <Dialog open={isTaskEditOpen} onOpenChange={setIsTaskEditOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Make changes to this task.
            </DialogDescription>
            <TaskForm 
              goalId={task.goalId}
              preselectedDate={new Date(task.scheduledDate)}
              onSuccess={() => setIsTaskEditOpen(false)}
              task={task}
            />
          </DialogContent>
        </Dialog>
      )}
    </ContextMenu>
  );
}

// A component to show tasks for a specific day
function DayTasksSection({ 
  date, 
  tasks, 
  getGoalById, 
  onComplete, 
  isCompleting, 
  showTimePeriods,
  registerSection,
  onDeleteTask
}: { 
  date: Date; 
  tasks: Task[]; 
  getGoalById: (id: number) => Goal | undefined; 
  onComplete: (id: number) => void; 
  isCompleting: boolean;
  showTimePeriods: boolean;
  registerSection?: (id: string, controls: {setCollapsed: (val: boolean) => void}) => void;
  onDeleteTask?: (taskId: number) => void;
}) {
  // Return null if no tasks for this day
  if (tasks.length === 0) return null;

  const formattedDate = formatDate(date);
  const isToday = new Date().toDateString() === date.toDateString();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sectionId = date.toISOString();
  
  // Register this section with parent for expand/collapse control
  useEffect(() => {
    if (registerSection) {
      registerSection(sectionId, { setCollapsed: setIsCollapsed });
    }
  }, [registerSection, sectionId]);
  
  // Toggle collapsed state when date header is clicked
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <div className={`p-4 mb-4 border rounded-lg ${isToday ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}>
      <h3 
        className={`text-base font-medium mb-3 ${isToday ? 'text-primary' : ''} cursor-pointer`}
        onClick={toggleCollapsed}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {isToday ? 'Today' : formattedDate}
            <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
      </h3>
      
      {!isCollapsed && (
        <>
          {showTimePeriods ? (
            <div className="space-y-4">
              {/* Morning tasks */}
              <TaskTimeSection 
                title="Morning" 
                icon={<span className="p-1 rounded-full bg-amber-100 dark:bg-amber-900/30"><Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" /></span>}
                tasks={tasks && tasks.filter(t => {
                  return !t.isCompleted && 
                    (t.timeOfDay === "morning" || 
                     t.title?.toLowerCase().includes("morning") || 
                     t.description?.toLowerCase().includes("morning"));
                }) || []}
                getGoalById={getGoalById}
                onComplete={onComplete}
                isCompleting={isCompleting}
                borderColor="border-amber-300"
                registerSection={registerSection}
                onDeleteTask={onDeleteTask}
              />
              
              {/* No specific time tasks */}
              <TaskTimeSection 
                title="No specific time" 
                icon={<span className="p-1 rounded-full bg-gray-100 dark:bg-gray-700"><Clock className="h-3 w-3 text-gray-500" /></span>}
                tasks={tasks && tasks.filter(t => {
                  return !t.isCompleted && 
                    (t.timeOfDay === "not_set" || !t.timeOfDay || 
                     t.timeOfDay === null || t.timeOfDay === undefined);
                }) || []}
                getGoalById={getGoalById}
                onComplete={onComplete}
                isCompleting={isCompleting}
                borderColor="border-gray-300"
                registerSection={registerSection}
                onDeleteTask={onDeleteTask}
              />
              
              {/* Afternoon tasks */}
              <TaskTimeSection 
                title="Afternoon" 
                icon={<span className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30"><Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" /></span>}
                tasks={tasks && tasks.filter(t => {
                  return !t.isCompleted && 
                    (t.timeOfDay === "afternoon" || 
                     t.title?.toLowerCase().includes("afternoon") || 
                     t.description?.toLowerCase().includes("afternoon"));
                }) || []}
                getGoalById={getGoalById}
                onComplete={onComplete}
                isCompleting={isCompleting}
                borderColor="border-blue-300"
                registerSection={registerSection}
                onDeleteTask={onDeleteTask}
              />
              
              {/* Evening tasks */}
              <TaskTimeSection 
                title="Evening" 
                icon={<span className="p-1 rounded-full bg-purple-100 dark:bg-purple-900/30"><Clock className="h-3 w-3 text-purple-600 dark:text-purple-400" /></span>}
                tasks={tasks && tasks.filter(t => {
                  return !t.isCompleted && 
                    (t.timeOfDay === "evening" || 
                     t.title?.toLowerCase().includes("evening") || 
                     t.description?.toLowerCase().includes("evening"));
                }) || []}
                getGoalById={getGoalById}
                onComplete={onComplete}
                isCompleting={isCompleting}
                borderColor="border-purple-300"
                registerSection={registerSection}
                onDeleteTask={onDeleteTask}
              />
            </div>
          ) : (
            <div className="space-y-2 pl-2">
              {tasks.filter(t => !t.isCompleted).map(task => {
                const goal = getGoalById(task.goalId);
                return (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    goal={goal}
                    onComplete={() => onComplete(task.id)}
                    isCompleting={isCompleting}
                    onDelete={onDeleteTask}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const { subtleCelebration } = useConfetti();
  const { preferences, updatePreferences } = useUserPreferences();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | "all">("all");
  const [view, setView] = useState<"calendar" | "list">("list");
  const [showTimePeriods, setShowTimePeriods] = useState<boolean>(preferences?.showTimeOfDayDividers || true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const sectionRefs = useRef<{[key: string]: {setCollapsed: (val: boolean) => void}}>({});
  const taskCalendarRef = useRef<{resetToCurrentWeek: () => void; setCurrentWeek: (date: Date) => void} | null>(null);
  
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: goals, isLoading: isGoalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });
  
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      
      toast({
        title: "Task deleted",
        description: "The task has been permanently removed.",
      });
      
      setTaskToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      // Find the task to determine its time of day
      const task = tasks?.find(t => t.id === taskId);
      let timeOfDay = task?.timeOfDay || "not_set";
      
      // If time of day is not set explicitly in the task,
      // determine it from the scheduled date
      if (timeOfDay === "not_set" && task) {
        const taskDate = new Date(task.scheduledDate);
        const hours = taskDate.getHours();
        
        if (hours < 12) {
          timeOfDay = "morning";
        } else if (hours >= 12 && hours < 17) {
          timeOfDay = "afternoon";
        } else {
          timeOfDay = "evening";
        }
      }
      
      await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, { timeOfDay });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      
      // Launch confetti celebration
      subtleCelebration();
      
      toast({
        title: "Task completed!",
        description: "Great job on completing your task.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const isLoading = isTasksLoading || isGoalsLoading;
  
  // Filter tasks by goal, date, and search query
  const filteredTasks = tasks?.filter(task => {
    // Filter by goal if selected
    if (selectedGoalId !== "all" && task.goalId !== selectedGoalId) {
      return false;
    }
    
    // Filter by month if in list view
    if (view === "list") {
      const taskDate = new Date(task.scheduledDate);
      if (!isSameMonth(taskDate, currentMonth)) {
        return false;
      }
      
      // Apply search query if it exists
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(query);
        const descriptionMatch = task.description?.toLowerCase().includes(query) || false;
        
        return titleMatch || descriptionMatch;
      }
    }
    
    return true;
  });
  
  // Group tasks by day
  const tasksByDay = filteredTasks ? 
    filteredTasks.reduce<Record<string, Task[]>>((acc, task) => {
      const date = new Date(task.scheduledDate);
      const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      
      acc[dateKey].push(task);
      return acc;
    }, {}) 
    : {};
  
  // Sort days
  const sortedDays = Object.keys(tasksByDay)
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime());
  
  const getGoalById = (goalId: number) => {
    return goals?.find(g => g.id === goalId);
  };

  const handlePreviousMonth = () => {
    const newDate = subMonths(currentMonth, 1);
    setCurrentMonth(newDate);

    // Sync weekly calendar if that view is active
    if (view === "calendar" && taskCalendarRef.current) {
      // For weekly view, set to the middle of the month to avoid edge cases
      const middleOfMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 15);
      taskCalendarRef.current.setCurrentWeek(middleOfMonth);
    }
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentMonth, 1);
    setCurrentMonth(newDate);
    
    // Sync weekly calendar if that view is active
    if (view === "calendar" && taskCalendarRef.current) {
      // For weekly view, set to the middle of the month to avoid edge cases
      const middleOfMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 15);
      taskCalendarRef.current.setCurrentWeek(middleOfMonth);
    }
  };
  
  // Handle scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Register section for expand/collapse control
  const registerSection = useCallback((id: string, controls: {setCollapsed: (val: boolean) => void} | null) => {
    if (controls) {
      sectionRefs.current[id] = controls;
    } else {
      delete sectionRefs.current[id];
    }
  }, []);
  
  // Function to toggle expand/collapse all sections
  const expandAllSections = useCallback(() => {
    // Get the current state to determine whether to expand or collapse
    const shouldCollapse = !allCollapsed;
    
    // Toggle all sections based on the new state
    Object.values(sectionRefs.current).forEach(section => {
      section.setCollapsed(shouldCollapse);
    });
    
    // Update the state to reflect the new collapsed state
    setAllCollapsed(shouldCollapse);
  }, [allCollapsed]);
  
  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight * 0.5) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate dark:text-white">
                Tasks
              </h2>
            </div>
            
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button onClick={() => setIsTaskFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
          
          {/* Delete Task Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this task? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteTask}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          

          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div>
              {/* Full-width control panel with improved layout */}
              <motion.div 
                className="mb-6 bg-card border rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                  {/* Left Section: Month Navigation */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2 mr-2">
                      <motion.button 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300"
                        whileHover={{ scale: 1.1 }} 
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={handlePreviousMonth}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </motion.button>
                      
                      <h3 className="text-sm font-medium px-1 w-24 text-center">
                        {format(currentMonth, 'MMM yyyy')}
                      </h3>
                      
                      <motion.button 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300"
                        whileHover={{ scale: 1.1 }} 
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={handleNextMonth}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </motion.button>
                      
                      <motion.button 
                        className={`h-8 px-2 rounded-md flex items-center justify-center text-xs text-gray-600 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300`}
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={() => view === "calendar" 
                          ? taskCalendarRef?.current?.resetToCurrentWeek() 
                          : setCurrentMonth(new Date())
                        }
                        title={view === "calendar" ? "Return to current week" : "Return to current month"}
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Today
                      </motion.button>
                    </div>
                    
                    {/* View Switcher - Pills Style */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                      <motion.button
                        className={`flex items-center px-3 py-1.5 text-xs rounded ${view === "calendar" ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={() => setView("calendar")}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        Weekly
                      </motion.button>
                      
                      <motion.button
                        className={`flex items-center px-3 py-1.5 text-xs rounded ${view === "list" ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={() => setView("list")}
                      >
                        <ListFilter className="mr-1.5 h-3.5 w-3.5" />
                        List
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Middle Section: Toggle Switches */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="simplified-view"
                        checked={preferences?.showSimplifiedTasks === true}
                        onCheckedChange={(value) => updatePreferences({ showSimplifiedTasks: value })}
                        className="h-5 w-9"
                      />
                      <Label htmlFor="simplified-view" className="text-xs cursor-pointer">
                        Simple View
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        id="time-periods"
                        checked={showTimePeriods}
                        onCheckedChange={(value) => {
                          setShowTimePeriods(value);
                          updatePreferences({ showTimeOfDayDividers: value });
                        }}
                        className="h-5 w-9"
                        disabled={view === "calendar"}
                      />
                      <Label 
                        htmlFor="time-periods" 
                        className={`text-xs ${view === "calendar" ? "text-gray-400 dark:text-gray-600 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        Show Time Periods
                      </Label>
                    </div>
                    
                    <motion.button
                      className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 ${view === "calendar" ? "opacity-50 cursor-not-allowed" : ""}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      onClick={expandAllSections}
                      disabled={view === "calendar"}
                    >
                      {allCollapsed ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Expand All
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          Collapse All
                        </>
                      )}
                    </motion.button>
                  </div>
                  
                  {/* Right Section: Goal Filter & Search */}
                  <div className="flex items-center gap-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <motion.button
                          className="flex items-center justify-between gap-1.5 rounded border border-gray-200 dark:border-gray-700 px-3 py-1.5 h-9 text-xs bg-white dark:bg-gray-800 hover:border-primary hover:text-primary dark:hover:border-primary"
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Target className="h-4 w-4 text-muted-foreground mr-1.5" />
                          <span className="truncate max-w-[120px]">
                            {selectedGoalId === "all" 
                              ? "All Goals" 
                              : goals?.find(g => g.id === selectedGoalId)?.title || "Select Goal"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
                        </motion.button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[240px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search goals..." />
                          <CommandList>
                            <CommandEmpty>No goals found</CommandEmpty>
                            <CommandGroup>
                              <CommandItem 
                                onSelect={() => setSelectedGoalId("all")}
                                className="cursor-pointer transition-colors hover:bg-accent"
                              >
                                <Target className="mr-2 h-4 w-4" />
                                <span>All Goals</span>
                                {selectedGoalId === "all" && (
                                  <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />
                                )}
                              </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Active Goals">
                              {goals?.filter(goal => !goal.isCompleted).map((goal) => (
                                <CommandItem 
                                  key={goal.id} 
                                  onSelect={() => setSelectedGoalId(goal.id)}
                                  className="cursor-pointer transition-colors hover:bg-accent"
                                >
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full mr-2",
                                    goal.type === "short" ? "bg-amber-500" : 
                                    goal.type === "medium" ? "bg-blue-500" : "bg-purple-500"
                                  )} />
                                  <span>{goal.title}</span>
                                  {selectedGoalId === goal.id && (
                                    <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 ${view === "calendar" ? "text-gray-300 dark:text-gray-600" : "text-gray-400"}`} />
                      <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`h-9 pl-9 pr-3 text-xs w-[160px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${view === "calendar" ? "cursor-not-allowed opacity-60" : ""}`}
                        disabled={view === "calendar"}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {view === "calendar" ? (
                <div>
                  <Card>
                    <CardContent className="p-0 pt-6">
                      <TaskCalendar 
                        ref={taskCalendarRef}
                        tasks={selectedGoalId === "all" ? tasks || [] : tasks?.filter(t => t.goalId === selectedGoalId) || []} 
                        goals={goals || []} 
                        showOnlyForGoal={selectedGoalId !== "all" ? selectedGoalId : undefined}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div>
                  <Card className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Tasks for {format(currentMonth, 'MMMM yyyy')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Viewing all tasks for this month
                      </p>
                    </div>
                    
                    <Tabs defaultValue="pending" className="mt-4">
                      <TabsList className="w-full md:w-auto">
                        <TabsTrigger value="pending">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> 
                            Pending
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 
                            Completed
                          </span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="pending" className="mt-4">
                        {sortedDays.length > 0 ? (
                          <div className="space-y-2">
                            {sortedDays.map(day => (
                              <DayTasksSection
                                key={day.toISOString()}
                                date={day}
                                tasks={tasksByDay[day.toISOString()].filter(t => !t.isCompleted)}
                                getGoalById={getGoalById}
                                onComplete={(id) => completeTaskMutation.mutate(id)}
                                isCompleting={completeTaskMutation.isPending}
                                showTimePeriods={showTimePeriods}
                                registerSection={registerSection}
                                onDeleteTask={handleDeleteTask}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 px-4 gap-4">
                            <div className="text-center">
                              <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                                <ClipboardCheck className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-medium mb-2">No pending tasks</h3>
                              <p className="text-sm text-gray-500 max-w-md mx-auto">
                                You don't have any pending tasks for this month. Take a moment to relax or plan your next goal.
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsTaskFormOpen(true)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add a new task
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="completed" className="mt-4">
                        {sortedDays.some(day => tasksByDay[day.toISOString()].some(t => t.isCompleted)) ? (
                          <div className="space-y-4">
                            {sortedDays.map(day => {
                              const completedTasks = tasksByDay[day.toISOString()].filter(t => t.isCompleted);
                              if (completedTasks.length === 0) return null;
                              
                              return (
                                <div key={day.toISOString()} className="border rounded-lg p-4">
                                  <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    {formatDate(day)}
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                                      {completedTasks.length}
                                    </span>
                                  </h3>
                                  
                                  <div className="space-y-2">
                                    {completedTasks.map(task => (
                                      <ContextMenu key={task.id}>
                                        <ContextMenuTrigger asChild>
                                          <div 
                                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                                          >
                                            <div className="flex-shrink-0">
                                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm line-through text-gray-500">{task.title}</div>
                                              <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  Completed on {formatDate(task.completedAt || task.scheduledDate)}
                                                </span>
                                                {!preferences?.showSimplifiedTasks && getGoalById(task.goalId) && (
                                                  <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-500">
                                                    {getGoalById(task.goalId)?.title}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </ContextMenuTrigger>
                                        
                                        <ContextMenuContent className="w-52">
                                          <ContextMenuItem 
                                            onClick={() => completeTaskMutation.mutate(task.id)} 
                                            className="flex items-center gap-2"
                                          >
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>Mark as incomplete</span>
                                          </ContextMenuItem>
                                          <ContextMenuItem 
                                            onClick={() => toast({
                                              title: "Task Details",
                                              description: `${task.title}: ${task.description || "No description provided"}`,
                                            })} 
                                            className="flex items-center gap-2"
                                          >
                                            <Eye className="h-4 w-4" />
                                            <span>View details</span>
                                          </ContextMenuItem>
                                        </ContextMenuContent>
                                      </ContextMenu>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 px-4 gap-4">
                            <div className="text-center">
                              <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                                <CheckCircle2 className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-medium mb-2">No completed tasks</h3>
                              <p className="text-sm text-gray-500 max-w-md mx-auto">
                                You haven't completed any tasks for this month yet. Complete tasks to see them appear here.
                              </p>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </Card>
                </div>
              )}
            </div>
          )}
          
          {/* Task Form Dialog */}
          <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogTitle>Add Task</DialogTitle>
              <DialogDescription>
                Create a new task for your goals.
              </DialogDescription>
              <TaskForm 
                goalId={selectedGoalId !== "all" ? selectedGoalId : undefined} 
                preselectedDate={new Date()}
                onSuccess={() => setIsTaskFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
          
          {/* Scroll to top button */}
          {showScrollTop && (
            <Button
              className="fixed bottom-6 right-6 h-10 w-10 rounded-full p-0 shadow-md"
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

// The control panel components have been consolidated into a single layout in the main component above