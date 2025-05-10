import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useParams, useLocation } from "wouter";
import { Goal, Task, GoalStats } from "@shared/schema";
import { TaskForm } from "@/components/task-form";
import { GoalForm } from "@/components/goal-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { GoalHeatmap } from "@/components/goal-heatmap";
import { 
  Loader2, 
  CalendarIcon, 
  ListChecks, 
  BarChart2, 
  CheckCircle2, 
  Edit, 
  Share2, 
  Clock, 
  Archive,
  AlertTriangle,
  Flame,
  Trash2,
  RefreshCw,
  PlusSquare,
  Target,
  TrendingUp,
  Calendar,
  Sparkles,
  Award,
  HelpCircle,
  Info
} from "lucide-react";
import { formatDate, calculateGoalProgress, getTimeLeft, getTaskTypeClass } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useConfetti } from "@/hooks/use-confetti";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TaskCalendar } from "@/components/task-calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuSeparator, 
  ContextMenuTrigger 
} from "@/components/ui/context-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Create a validation schema for editing goals
const editGoalSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  deadline: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: "Please enter a valid date",
  }),
});

type EditGoalValues = z.infer<typeof editGoalSchema>;

export default function GoalDetails() {
  const { id } = useParams();
  const isNewGoal = id === "new";
  const goalId = isNewGoal ? 0 : parseInt(id || "0");
  const { toast } = useToast();
  const { partyPopper, celebrateCompletion, subtleCelebration } = useConfetti();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [tab, setTab] = useState("tasks");
  const [reflection, setReflection] = useState("");
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isEditGoalDialogOpen, setIsEditGoalDialogOpen] = useState(false);
  const [isDeadlineChangeDialogOpen, setIsDeadlineChangeDialogOpen] = useState(false);
  const [originalDeadline, setOriginalDeadline] = useState<string>("");
  const [_, navigate] = useLocation();
  const [goalStreak, setGoalStreak] = useState(0);
  const [reflectionDialogOpen, setReflectionDialogOpen] = useState(false);
  const [completionAlertOpen, setCompletionAlertOpen] = useState(false);
  
  // Task editing and deletion state variables
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<number | null>(null);
  
  const { data: goal, isLoading: isGoalLoading } = useQuery<Goal>({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
  });
  
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/goals/${goalId}/tasks`],
    enabled: !!goalId,
  });
  
  const { data: goalStats, isLoading: isGoalStatsLoading } = useQuery<GoalStats>({
    queryKey: [`/api/goals/${goalId}/stats`],
    enabled: !!goalId,
  });
  
  const completeGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/goals/${goalId}/complete`, { reflection });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      
      // Celebrate with a big confetti animation!
      partyPopper();
      // Add a small delay and run another celebration
      setTimeout(() => {
        celebrateCompletion();
      }, 500);
      
      toast({
        title: "Goal completed!",
        description: "Congratulations on achieving your goal.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // State for the public feature alert dialog
  const [isPublicFeatureAlertOpen, setIsPublicFeatureAlertOpen] = useState(false);
  
  const togglePublicMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/goals/${goalId}/toggle-public`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      
      // If goal is being made public, show the alert first
      if (!goal?.isPublic) {
        setIsPublicFeatureAlertOpen(true);
      }
      
      toast({
        title: goal?.isPublic ? "Goal set to private" : "Goal shared publicly",
        description: goal?.isPublic 
          ? "Your goal is now private" 
          : "Your goal is now visible to others for inspiration",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update goal visibility",
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
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/stats`] });
      
      // Play a subtle confetti animation for task completion
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
  
  const uncompleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}/uncomplete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/stats`] });
      
      toast({
        title: "Task unmarked",
        description: "Task has been marked as incomplete.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unmark task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const archiveGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/goals/${goalId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/archived"] });
      toast({
        title: "Goal archived",
        description: "Your goal has been moved to the archives.",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to archive goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const editGoalMutation = useMutation({
    mutationFn: async (data: EditGoalValues) => {
      await apiRequest("PATCH", `/api/goals/${goalId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal updated",
        description: "Your goal has been successfully updated.",
      });
      setIsEditGoalDialogOpen(false);
      setIsDeadlineChangeDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/goals/${goalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      
      toast({
        title: "Goal deleted",
        description: "Your goal has been permanently deleted.",
      });
      
      navigate("/goals");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Task edit and delete mutations
  const editTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      // We're not actually updating the task here, just opening the edit dialog
      // The actual update happens in the TaskForm component
      setIsEditTaskDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to prepare task for editing",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/stats`] });
      
      setIsDeleteTaskDialogOpen(false);
      setTaskToDeleteId(null);
      
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Calculate goal streak using completed tasks
  useEffect(() => {
    if (tasks) {
      // Sort completed tasks by completedAt date
      const sortedTasks = [...tasks]
        .filter(task => task.isCompleted && task.completedAt)
        .sort((a, b) => {
          const dateA = new Date(a.completedAt!).getTime();
          const dateB = new Date(b.completedAt!).getTime();
          return dateB - dateA; // Sort in descending order (newest first)
        });
      
      if (sortedTasks.length === 0) {
        setGoalStreak(0);
        return;
      }
      
      let streak = 1;
      let currentDate = new Date(sortedTasks[0].completedAt!);
      
      // Set to start of day for comparison
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 1; i < sortedTasks.length; i++) {
        const taskDate = new Date(sortedTasks[i].completedAt!);
        taskDate.setHours(0, 0, 0, 0);
        
        // Check if this task was completed one day before the current date
        const daysBetween = Math.round((currentDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysBetween === 1) {
          streak++;
          currentDate = taskDate;
        } else if (daysBetween > 1) {
          // Break in the streak
          break;
        }
      }
      
      setGoalStreak(streak);
    }
  }, [tasks]);

  // Form initialization for editing goals
  const form = useForm<EditGoalValues>({
    resolver: zodResolver(editGoalSchema),
    defaultValues: {
      title: goal?.title || "",
      description: goal?.description || "",
      deadline: goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : "",
    },
  });

  // Update form when goal data changes
  useEffect(() => {
    if (goal) {
      form.reset({
        title: goal.title,
        description: goal.description || "",
        deadline: new Date(goal.deadline).toISOString().split('T')[0],
      });
    }
  }, [goal, form]);
  
  const isLoading = isGoalLoading || isTasksLoading || isGoalStatsLoading;
  const progress = tasks ? calculateGoalProgress(tasks) : 0;
  const completedTasks = tasks?.filter(task => task.isCompleted) || [];
  const pendingTasks = tasks?.filter(task => !task.isCompleted) || [];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!goal && !isNewGoal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Goal not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If we're creating a new goal, show the goal form directly
  if (isNewGoal) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 md:pl-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
                Create New Goal
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Set a new goal to track your progress and achieve your ambitions.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <GoalForm onSuccess={() => {
                  navigate("/goals");
                  toast({
                    title: "Goal created",
                    description: "Your new goal has been created successfully.",
                  });
                }} />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate">
                {goal.title}
              </h2>
              <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Badge 
                    variant="outline" 
                    className={`mr-2 ${
                      goal.type === "short" 
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        : goal.type === "medium"
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        : "bg-purple-100 text-purple-800 hover:bg-purple-100"
                    }`}
                  >
                    {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} term
                  </Badge>
                  <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  {goal.isCompleted ? "Completed" : getTimeLeft(goal.deadline)}
                </div>
              </div>
            </div>
            
            <div className="mt-5 flex lg:mt-0 lg:ml-4">
              {!goal.isCompleted ? (
                <Button onClick={() => setIsTaskFormOpen(true)}>
                  Add Task
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Share2 className="h-4 w-4 text-gray-500" />
                  <div className="text-sm text-gray-500">Share your achievement</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardDescription>
                    {goal.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{progress}%</p>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                      <div 
                        style={{ width: `${progress}%` }} 
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          goal.type === "short" 
                            ? "bg-amber-500"
                            : goal.type === "medium"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                        }`}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Tabs value={tab} onValueChange={setTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="tasks">
                          <ListChecks className="h-4 w-4 mr-2" />
                          Tasks
                        </TabsTrigger>
                        <TabsTrigger value="calendar">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Calendar
                        </TabsTrigger>
                        <TabsTrigger value="stats">
                          <BarChart2 className="h-4 w-4 mr-2" />
                          Stats
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="tasks" className="pt-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Pending Tasks</h4>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsTaskFormOpen(true)}
                            >
                              <PlusSquare className="h-4 w-4 mr-2" />
                              Add Task
                            </Button>
                          </div>
                          
                          {pendingTasks.length > 0 ? (
                            <div className="space-y-2">
                              {pendingTasks.map((task, index) => (
                                <ContextMenu key={task.id}>
                                  <ContextMenuTrigger>
                                    <div 
                                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border border-gray-200 dark:border-gray-800 hover:translate-y-[-2px] transform transition-transform duration-300"
                                      style={{ animationDelay: `${0.05 * index}s` }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                          <div className={`h-2 w-2 rounded-full ${getTaskTypeClass(goal?.type || "short")}`} />
                                          <p className="font-medium text-sm ml-2 text-gray-900 dark:text-gray-100">{task.title}</p>
                                        </div>
                                        {task.description && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p>
                                        )}
                                        <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          <CalendarIcon className="h-3 w-3 mr-1" />
                                          {formatDate(task.scheduledDate)}
                                          {task.isRepeating && (
                                            <span className="ml-2 inline-flex items-center">
                                              <RefreshCw className="h-3 w-3 mr-1" />
                                              {task.repeatType.replace("_", " ")}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          completeTaskMutation.mutate(task.id);
                                        }}
                                        disabled={completeTaskMutation.isPending}
                                        className="ml-2"
                                      >
                                        {completeTaskMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent className="w-56">
                                    <ContextMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => completeTaskMutation.mutate(task.id)}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      <span>Complete task</span>
                                    </ContextMenuItem>
                                    <ContextMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => {
                                        setCurrentTask(task);
                                        setIsEditTaskDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edit task</span>
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem 
                                      className="flex items-center cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                      onClick={() => {
                                        setTaskToDeleteId(task.id);
                                        setIsDeleteTaskDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete task</span>
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                              <CheckCircle2 className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">No pending tasks</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a task to start making progress</p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-4"
                                onClick={() => setIsTaskFormOpen(true)}
                              >
                                <PlusSquare className="h-4 w-4 mr-2" />
                                Add first task
                              </Button>
                            </div>
                          )}
                          
                          <h4 className="text-sm font-medium mt-6 flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                            Completed Tasks ({completedTasks.length})
                          </h4>
                          
                          {completedTasks.length > 0 ? (
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                              {completedTasks.map((task, index) => (
                                <ContextMenu key={task.id}>
                                  <ContextMenuTrigger>
                                    <div 
                                      className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-md border border-gray-100 dark:border-gray-800/50 animate-slide-in"
                                      style={{ animationDelay: `${0.03 * index}s` }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm line-through text-gray-600 dark:text-gray-400">{task.title}</p>
                                        <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-500">
                                          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                          Completed {task.completedAt ? formatDate(task.completedAt) : ''}
                                        </div>
                                      </div>
                                    </div>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent className="w-56">
                                    <ContextMenuItem 
                                      className="flex items-center cursor-pointer"
                                      onClick={() => uncompleteTaskMutation.mutate(task.id)}
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      <span>Unmark as completed</span>
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem 
                                      className="flex items-center cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                      onClick={() => {
                                        setTaskToDeleteId(task.id);
                                        setIsDeleteTaskDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete task</span>
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-2">No completed tasks yet</p>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="calendar" className="pt-4">
                        <TaskCalendar 
                          tasks={tasks || []} 
                          goals={[goal]} 
                          showOnlyForGoal={goal.id} 
                        />
                      </TabsContent>
                      
                      <TabsContent value="stats" className="pt-4">
                        <GoalHeatmap 
                          title={goal?.title || ""}
                          goalType={goal?.type || "short"}
                          tasks={tasks || []}
                          showLegend={true}
                        />
                        
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 hover:translate-y-[-2px] transform transition-transform duration-300">
                            <div className="rounded-full p-3 bg-green-100 dark:bg-green-900/20">
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 animate-fadeIn" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">Completed Tasks</h4>
                              <p className="text-2xl font-bold animate-countUp">
                                {completedTasks.length} <span className="text-sm text-gray-500 font-normal">/ {tasks?.length || 0}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 hover:translate-y-[-2px] transform transition-transform duration-300">
                            <div className="rounded-full p-3 bg-amber-100 dark:bg-amber-900/20">
                              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-fadeIn" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">Time Spent</h4>
                              <p className="text-2xl font-bold animate-countUp">
                                {goal && tasks && tasks.length > 0 
                                  ? Math.round((new Date().getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24)) 
                                  : 0}
                                <span className="text-sm text-gray-500 font-normal ml-1">days</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 hover:translate-y-[-2px] transform transition-transform duration-300">
                            <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/20">
                              <Flame className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-fadeIn" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">Longest Streak</h4>
                              <p className="text-2xl font-bold animate-countUp">
                                {goal?.longestStreak || goalStreak}
                                <span className="text-sm text-gray-500 font-normal ml-1">days</span>
                              </p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help mt-1 flex items-center text-xs text-gray-500">
                                      <Info className="h-3 w-3 mr-1" />
                                      More info
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Your longest continuous streak of completing tasks for this goal.
                                      A streak is counted when you complete at least one task per day.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow hover:border-primary/50 duration-300">
                            <div className="flex items-center mb-4">
                              <Award className="h-5 w-5 mr-2 text-purple-500 dark:text-purple-400 animate-pulse" />
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Achievement Insights</h4>
                            </div>
                            
                            <div className="space-y-3">
                              {completedTasks.length > 0 ? (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <div className="rounded-full h-8 w-8 bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                      <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Daily Consistency</p>
                                      <p className="text-xs text-gray-500">
                                        {goalStreak > 3 
                                          ? `Amazing ${goalStreak}-day streak! Keep it up!` 
                                          : goalStreak > 0 
                                            ? `You're building momentum with a ${goalStreak}-day streak` 
                                            : "Start a streak by completing tasks on consecutive days"}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <div className="rounded-full h-8 w-8 bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                      <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                      <div className="flex items-center">
                                        <p className="text-sm font-medium">On-Time Task Completion</p>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="ml-1 cursor-help">
                                                <HelpCircle className="h-3 w-3 text-gray-400 hover:text-primary transition-colors" />
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <p className="text-xs">
                                                This percentage shows how often you complete tasks on their scheduled day.
                                                A higher percentage indicates better time management and commitment to your schedule.
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      
                                      {tasks && completedTasks && (
                                        <>
                                          <p className="text-sm font-medium mt-2">
                                            {completedTasks.length === 0 ? (
                                              <span className="text-gray-500">Complete tasks to see your on-time performance</span>
                                            ) : (
                                              (() => {
                                                // Calculate how many completed tasks were completed on time
                                                const tasksCompletedOnTime = completedTasks.filter(task => task.completedOnTime).length;
                                                const totalCompletedTasks = completedTasks.length;
                                                
                                                // Calculate the percentage
                                                const percentage = (tasksCompletedOnTime / totalCompletedTasks) * 100;
                                                const roundedPercentage = Math.round(percentage);
                                                
                                                // Determine the color based on the performance
                                                const colorClass = percentage > 70 
                                                  ? "text-green-600 dark:text-green-400" 
                                                  : percentage > 40 
                                                    ? "text-amber-600 dark:text-amber-400" 
                                                    : "text-red-600 dark:text-red-400";
                                                
                                                return (
                                                  <span className={colorClass}>
                                                    {roundedPercentage}%
                                                  </span>
                                                );
                                              })()
                                            )}
                                          </p>
                                          
                                          <p className="text-xs text-gray-500 mt-1">
                                            {completedTasks.length === 0 ? (
                                              ""
                                            ) : (
                                              (() => {
                                                // Calculate the percentage again for the message
                                                const tasksCompletedOnTime = completedTasks.filter(task => task.completedOnTime).length;
                                                const totalCompletedTasks = completedTasks.length;
                                                const percentage = (tasksCompletedOnTime / totalCompletedTasks) * 100;
                                                
                                                // Choose appropriate message based on performance
                                                const message = percentage > 70
                                                  ? " - Excellent time management!" 
                                                  : percentage > 40
                                                    ? " - Good discipline, keep it up" 
                                                    : " - Try to stick to your schedule";
                                                
                                                return (
                                                  <>
                                                    Tasks completed on schedule
                                                    {message}
                                                  </>
                                                );
                                              })()
                                            )}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-6 animate-pulse">
                                  <Target className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                                  <p className="text-sm text-gray-500 dark:text-gray-400">No achievements yet</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Complete tasks to unlock insights</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow hover:border-primary/50 duration-300">
                            <div className="flex items-center mb-4">
                              <TrendingUp className="h-5 w-5 mr-2 text-emerald-500 dark:text-emerald-400 animate-bounce-slow" />
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Performance</h4>
                            </div>
                            
                            {tasks && tasks.length > 0 ? (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span className="flex items-center">
                                      <span>Task Type Distribution</span>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="ml-1 cursor-help">
                                              <HelpCircle className="h-3 w-3 text-gray-400 hover:text-primary transition-colors" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p className="text-xs">
                                              This shows the balance between recurring and one-time tasks. A healthy mix indicates 
                                              you're balancing routine habits with unique steps toward your goal.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </span>
                                  </div>
                                  
                                  {tasks && tasks.length > 0 ? (
                                    <div className="flex items-center justify-between mt-2">
                                      {(() => {
                                        // Calculate task type distribution based on all tasks, not just completed ones
                                        // Count a task as recurring if:
                                        // 1. It has isRepeating=true OR
                                        // 2. It has a parentTaskId (meaning it's a child of a recurring task) OR
                                        // 3. It has a repeat type that's not "none"
                                        const recurringTasks = tasks.filter(t => 
                                          t.isRepeating || 
                                          t.parentTaskId !== null || 
                                          (t.repeatType && t.repeatType !== "none")
                                        );
                                        const nonRecurringTasks = tasks.filter(t => 
                                          !t.isRepeating && 
                                          t.parentTaskId === null && 
                                          (!t.repeatType || t.repeatType === "none")
                                        );
                                        
                                        // Calculate percentages based on total tasks
                                        const totalTasks = tasks.length;
                                        const recurringPercentage = Math.round((recurringTasks.length / totalTasks) * 100);
                                        // Ensure percentages always add up to 100%
                                        const nonRecurringPercentage = 100 - recurringPercentage;
                                        
                                        return (
                                          <>
                                            <div className="flex items-center">
                                              <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-600 mr-1"></div>
                                              <span className="text-sm">Recurring: <span className="font-medium text-blue-600 dark:text-blue-400">{recurringPercentage}%</span></span>
                                            </div>
                                            <div className="flex items-center">
                                              <div className="w-3 h-3 rounded-full bg-purple-500 dark:bg-purple-600 mr-1"></div>
                                              <span className="text-sm">One-time: <span className="font-medium text-purple-600 dark:text-purple-400">{nonRecurringPercentage}%</span></span>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 mt-2 text-center">
                                      No tasks created yet
                                    </div>
                                  )}
                                  
                                  {tasks && tasks.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      {(() => {
                                        // Use the same counting logic as above for consistency
                                        const recurringTasks = tasks.filter(t => 
                                          t.isRepeating || 
                                          t.parentTaskId !== null || 
                                          (t.repeatType && t.repeatType !== "none")
                                        );
                                        const nonRecurringTasks = tasks.filter(t => 
                                          !t.isRepeating && 
                                          t.parentTaskId === null && 
                                          (!t.repeatType || t.repeatType === "none")
                                        );
                                        
                                        if (recurringTasks.length > nonRecurringTasks.length * 2) {
                                          return "You're focusing on building regular habits, which is great for long-term goals";
                                        } else if (nonRecurringTasks.length > recurringTasks.length * 2) {
                                          return "You're focusing on unique tasks, which helps you make direct progress";
                                        } else {
                                          return "You have a good balance of routine and unique tasks for this goal";
                                        }
                                      })()}
                                    </p>
                                  )}
                                </div>
                                

                              </div>
                            ) : (
                              <div className="text-center py-6 animate-pulse">
                                <BarChart2 className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No performance data yet</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Complete tasks to see your patterns</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
                {goal.isCompleted ? (
                  <CardFooter className="border-t">
                    <div className="w-full space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Reflection</h4>
                        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{goal.reflection || "No reflection added"}</p>
                    </div>
                  </CardFooter>
                ) : (
                  <CardFooter className="border-t">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center">
                        <Switch
                          id="public"
                          checked={goal.isPublic}
                          onCheckedChange={() => togglePublicMutation.mutate()}
                        />
                        <Label htmlFor="public" className="ml-2">Make goal public</Label>
                      </div>
                      
                      <Button 
                        variant={progress === 100 ? "default" : "outline"}
                        className={progress === 100 ? "" : "border-green-400 text-green-600 hover:bg-green-50 hover:text-green-700"}
                        onClick={() => setCompletionAlertOpen(true)}
                        disabled={goal.isCompleted}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Completed
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </div>
            
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Goal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(goal.createdAt)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Deadline</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(goal.deadline)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{goal.isCompleted ? "Completed" : "In Progress"}</p>
                  </div>
                  
                  <div className="flex items-center bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-100 dark:border-amber-700/50">
                    <Flame className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-amber-200">Goal Streak</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{goalStreak} {goalStreak === 1 ? 'day' : 'days'}</p>
                    </div>
                  </div>
                  
                  {goal.isCompleted && goal.completedAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(goal.completedAt)}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Visibility</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{goal.isPublic ? "Public" : "Private"}</p>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        setOriginalDeadline(new Date(goal.deadline).toISOString().split('T')[0]);
                        setIsEditGoalDialogOpen(true);
                      }}
                      disabled={goal.isCompleted}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Goal
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200"
                      onClick={() => setIsArchiveDialogOpen(true)}
                      disabled={goal.isCompleted}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Goal
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full bg-red-50 hover:bg-red-100 text-red-800 border-red-200"
                      onClick={() => {
                        const dialog = document.createElement('dialog');
                        dialog.className = 'p-4 rounded-lg shadow-lg max-w-md mx-auto border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';
                        dialog.innerHTML = `
                          <div class="space-y-4">
                            <div class="flex items-center gap-2 text-red-600 dark:text-red-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                              <h3 class="text-lg font-bold">Delete Goal</h3>
                            </div>
                            <p class="text-gray-700 dark:text-gray-300">Are you sure you want to delete this goal? This action cannot be undone and will remove all associated tasks.</p>
                            <div class="flex justify-end space-x-2 pt-2">
                              <button class="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" id="cancel">Cancel</button>
                              <button class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white transition-colors" id="delete">Delete</button>
                            </div>
                          </div>
                        `;
                        document.body.appendChild(dialog);
                        dialog.showModal();
                        
                        const cancelBtn = dialog.querySelector('#cancel');
                        const deleteBtn = dialog.querySelector('#delete');
                        
                        cancelBtn?.addEventListener('click', () => {
                          dialog.close();
                          document.body.removeChild(dialog);
                        });
                        
                        deleteBtn?.addEventListener('click', () => {
                          deleteGoalMutation.mutate();
                          dialog.close();
                          document.body.removeChild(dialog);
                        });
                      }}
                      disabled={goal.isCompleted}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Goal
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks && tasks.length > 0 ? (
                    <div className="space-y-3">
                      {tasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-start space-x-2">
                          <div className={`mt-0.5 h-2 w-2 rounded-full ${task.isCompleted ? "bg-green-500" : `bg-${goal.type === "short" ? "amber" : goal.type === "medium" ? "blue" : "purple"}-500`}`} />
                          <div>
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-gray-500">
                              {task.isCompleted 
                                ? `Completed on ${formatDate(task.completedAt || task.scheduledDate)}` 
                                : `Scheduled for ${formatDate(task.scheduledDate)}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No activity recorded yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Task Form Dialog */}
          <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogTitle>Add Task</DialogTitle>
              <DialogDescription>
                Create a new task for your "{goal.title}" goal.
              </DialogDescription>
              <TaskForm
                goalId={goal.id}
                onSuccess={() => setIsTaskFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
          
          {/* Edit Goal Dialog */}
          <Dialog open={isEditGoalDialogOpen} onOpenChange={setIsEditGoalDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Goal</DialogTitle>
                <DialogDescription>
                  Make changes to your goal. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => {
                  // If deadline changed, confirm with the user
                  if (data.deadline !== originalDeadline) {
                    setIsDeadlineChangeDialogOpen(true);
                  } else {
                    editGoalMutation.mutate(data);
                  }
                })} className="space-y-6 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditGoalDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={editGoalMutation.isPending}
                    >
                      {editGoalMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Deadline Change Confirmation Dialog */}
          <Dialog open={isDeadlineChangeDialogOpen} onOpenChange={setIsDeadlineChangeDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Confirm Deadline Change</DialogTitle>
                <DialogDescription>
                  Changing a goal's deadline is an important decision. Are you sure you want to proceed?
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex items-start mt-4 space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    Setting clear deadlines is crucial for maintaining accountability and focus. 
                    Changing your deadline might impact your commitment to the goal.
                  </p>
                  <p className="text-sm text-gray-600">
                    Original deadline: <span className="font-medium">{formatDate(originalDeadline)}</span><br />
                    New deadline: <span className="font-medium">{formatDate(form.getValues().deadline)}</span>
                  </p>
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeadlineChangeDialogOpen(false)}
                >
                  Go Back
                </Button>
                <Button
                  onClick={() => editGoalMutation.mutate(form.getValues())}
                  disabled={editGoalMutation.isPending}
                >
                  {editGoalMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Confirm Change"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Archive Dialog */}
          <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Archive Goal</DialogTitle>
                <DialogDescription>
                  Are you sure you want to archive this goal? Archived goals won't show up in your active goals list, but you can still view them in the archives.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex items-start mt-4 space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  You won't be able to add new tasks to this goal once it's archived.
                  {pendingTasks.length > 0 && ` There are still ${pendingTasks.length} pending tasks for this goal.`}
                </p>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsArchiveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => archiveGoalMutation.mutate()}
                  disabled={archiveGoalMutation.isPending}
                >
                  {archiveGoalMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Archiving...
                    </>
                  ) : (
                    "Archive Goal"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Delete task confirmation dialog */}
          <AlertDialog open={isDeleteTaskDialogOpen} onOpenChange={setIsDeleteTaskDialogOpen}>
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
                  onClick={() => taskToDeleteId && deleteTaskMutation.mutate(taskToDeleteId)}
                  className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Edit task dialog */}
          <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>
                  Make changes to your task below.
                </DialogDescription>
              </DialogHeader>
              {currentTask && (
                <TaskForm
                  goalId={goalId}
                  task={currentTask}
                  onSuccess={() => {
                    setIsEditTaskDialogOpen(false);
                    setCurrentTask(null);
                    toast({
                      title: "Task updated",
                      description: "Your task has been updated successfully.",
                    });
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
      
      {/* Public feature notice dialog */}
      <AlertDialog open={isPublicFeatureAlertOpen} onOpenChange={setIsPublicFeatureAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Public Feature Notice</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">Public sharing features are not fully supported yet.</p>
              <p className="mb-2">While your goal is marked as public, online sharing functionality is still under development.</p>
              <p>Future updates will enable social features such as public profiles, goal sharing, and community support.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Goal Completion Confirmation Alert */}
      <AlertDialog open={completionAlertOpen} onOpenChange={setCompletionAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <Info className="h-5 w-5" />
              Mark Goal as Completed
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Once a goal is marked as completed:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>You won't be able to edit the goal or its tasks anymore</li>
                <li>All incomplete tasks will remain in their current state</li>
                <li>You'll add a reflection on what you learned or achieved</li>
                <li>The goal will be added to your achievements</li>
              </ul>
              <p className="font-medium mt-2">Are you sure you want to mark this goal as completed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setReflectionDialogOpen(true)}>
              Continue to Reflection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Goal Reflection Dialog */}
      <Dialog open={reflectionDialogOpen} onOpenChange={setReflectionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Goal</DialogTitle>
            <DialogDescription>
              Add a reflection on what you learned or how you achieved this goal:
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea 
              placeholder="Share your thoughts, challenges you overcame, or what you learned..." 
              rows={4}
              className="col-span-3"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReflectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              completeGoalMutation.mutate();
              setReflectionDialogOpen(false);
            }}>
              Complete Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
