import React, { useState, useEffect, useImperativeHandle } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, getHours } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Task, Goal } from "@shared/schema";
import { getTaskTypeClass } from "@/lib/utils";
import { TaskForm } from "@/components/task-form";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  CheckCircle2, 
  Undo as UndoIcon, 
  LayoutGrid, 
  EyeIcon, 
  EyeOffIcon, 
  Repeat as RepeatIcon, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Info,
  Calendar,
  Sun,
  Moon,
  Circle,
  Clock
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useConfetti } from "@/hooks/use-confetti";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface TaskCalendarProps {
  tasks: Task[];
  goals: Goal[];
  showOnlyForGoal?: number;
}

// Define interface for task details modal
interface TaskDetailsModalState {
  isOpen: boolean;
  task: Task | null;
}

// Define interface for task edit modal
interface TaskEditModalState {
  isOpen: boolean;
  task: Task | null;
}

// Define interface for task delete confirmation
interface TaskDeleteState {
  isOpen: boolean;
  taskId: number | null;
}

export const TaskCalendar = React.forwardRef<{ resetToCurrentWeek: () => void; setCurrentWeek: (date: Date) => void }, TaskCalendarProps>((props, ref) => {
  const { tasks, goals, showOnlyForGoal } = props;
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { preferences, updatePreferences, setShowSimplifiedTasks } = useUserPreferences();
  const [showTimePeriods, setShowTimePeriods] = useState(false); // Always false in weekly view now
  const { toast } = useToast();
  const { subtleCelebration } = useConfetti();
  
  // States for modals
  const [taskDetailsModal, setTaskDetailsModal] = useState<TaskDetailsModalState>({
    isOpen: false,
    task: null
  });
  
  const [taskEditModal, setTaskEditModal] = useState<TaskEditModalState>({
    isOpen: false,
    task: null
  });
  
  const [taskDeleteState, setTaskDeleteState] = useState<TaskDeleteState>({
    isOpen: false,
    taskId: null
  });
  
  // Update user preferences when toggle changes
  useEffect(() => {
    if (preferences && preferences.showTimeOfDayDividers !== showTimePeriods) {
      updatePreferences({ showTimeOfDayDividers: showTimePeriods });
    }
  }, [showTimePeriods, preferences]);
  
  const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start, end });
  
  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };
  
  const prevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };
  
  const resetToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    resetToCurrentWeek,
    setCurrentWeek,
  }));
  
  // Task completion toggle mutation
  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async ({ taskId, completed, goalId, timeOfDay }: { taskId: number, completed: boolean, goalId?: number, timeOfDay?: string }) => {
      if (completed) {
        // Mark task as completed
        await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, { timeOfDay });
      } else {
        // Undo task completion
        await apiRequest("PATCH", `/api/tasks/${taskId}/uncomplete`);
      }
    },
    onSuccess: (_data, variables) => {
      // For specific goal views, limit invalidation to only necessary queries
      // to prevent flickering from excessive re-renders
      if (variables.goalId && showOnlyForGoal) {
        // Only update this specific goal's data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/goals/${variables.goalId}/tasks`],
          exact: false
        });
      } else {
        // Otherwise invalidate all task data
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      }
      
      // Always invalidate achievements to ensure they update in real-time
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      
      // Play confetti animation for task completion
      if (variables.completed) {
        subtleCelebration();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Task update mutation
  const updateTaskDateMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      newDate
    }: { 
      taskId: number, 
      newDate: Date 
    }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        scheduledDate: newDate.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      toast({
        title: "Task rescheduled",
        description: "Task has been moved to the new date and time.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reschedule task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Task delete mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      // Get the task's goalId before deleting it
      const taskToDelete = tasks.find(t => t.id === taskId);
      const result = await apiRequest("DELETE", `/api/tasks/${taskId}`);
      return { goalId: taskToDelete?.goalId, result };
    },
    onSuccess: (data) => {
      // For specific goal views, limit invalidation to only necessary queries
      // to prevent flickering from excessive re-renders
      if (data.goalId && showOnlyForGoal) {
        // Only update this specific goal's data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/goals/${data.goalId}/tasks`],
          exact: false
        });
      } else {
        // Otherwise invalidate all task data
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      }
      
      // Always invalidate achievements data
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      
      toast({
        title: "Task deleted",
        description: "Task has been permanently deleted.",
      });
      setTaskDeleteState({ isOpen: false, taskId: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle task completion toggle
  const handleTaskCompletion = (task: Task) => {
    const newCompletionState = !task.isCompleted;
    
    // Determine time of day for consistency achievements
    let timeOfDay = task.timeOfDay || "not_set";
    
    // If time of day is not set explicitly in the task,
    // determine it from the scheduled date
    if (timeOfDay === "not_set") {
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
    
    toggleTaskCompletionMutation.mutate({ 
      taskId: task.id, 
      completed: newCompletionState,
      goalId: task.goalId,
      timeOfDay: timeOfDay
    });
  };
  
  // Open task details modal
  const handleViewTaskDetails = (task: Task) => {
    setTaskDetailsModal({
      isOpen: true,
      task
    });
  };
  
  // Open task edit modal
  const handleEditTask = (task: Task) => {
    setTaskEditModal({
      isOpen: true,
      task
    });
  };
  
  // Handle task deletion confirmation
  const handleDeleteTaskConfirm = (taskId: number) => {
    setTaskDeleteState({
      isOpen: true,
      taskId
    });
  };
  
  // Execute task deletion
  const executeTaskDeletion = () => {
    if (taskDeleteState.taskId) {
      deleteTaskMutation.mutate(taskDeleteState.taskId);
    }
  };
  
  // Get all tasks for a specific day
  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.scheduledDate);
      const isSameDay = 
        taskDate.getDate() === day.getDate() &&
        taskDate.getMonth() === day.getMonth() &&
        taskDate.getFullYear() === day.getFullYear();
      
      if (!isSameDay) return false;
      
      // If showOnlyForGoal is specified, filter for only that goal
      if (showOnlyForGoal !== undefined && task.goalId !== showOnlyForGoal) {
        return false;
      }
      
      return true;
    });
  };
  
  // Get goal type for a task
  const getGoalType = (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    return goal?.type || "short";
  };
  
  // Get goal name for a task
  const getGoalName = (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || "Unknown Goal";
  };
  
  // Get proper hour for time period (for task rescheduling)
  const getHourForTimePeriod = (timePeriod?: string): number => {
    if (!timePeriod) return 12; // Default to noon
    if (timePeriod === "morning") return 9;
    if (timePeriod === "afternoon") return 14;
    if (timePeriod === "evening") return 19;
    return 12;
  };
  
  // TaskItem component with context menu
  const TaskItem = ({ task, goalType, goalName, showTime = false }: { 
    task: Task, 
    goalType: string, 
    goalName: string,
    showTime?: boolean 
  }) => {
    const taskClass = `task-item ${getTaskTypeClass(goalType)} dark:opacity-90 
      ${task.isCompleted ? "line-through opacity-60" : ""}
      cursor-pointer hover:shadow-sm hover:border-primary dark:hover:border-primary-600 transition-all
      w-full max-w-full rounded py-1 px-1.5 mb-1.5`; // More compact padding
    
    // Time display for all-day view  
    const taskDate = new Date(task.scheduledDate);
    const taskHour = taskDate.getHours();
    
    // Determine time period based on hour
    let timePeriodText = "";
    if (taskHour < 12) {
      timePeriodText = "AM";
    } else if (taskHour >= 12 && taskHour < 17) {
      timePeriodText = "PM";
    } else {
      timePeriodText = "EVE";
    }
    
    // Check if the task has a specific time set based on the timeOfDay field
    const isNotSet = task.timeOfDay === "not_set";
    
    // Format time - only if time is actually set
    const timeStr = isNotSet ? "No time set" : format(taskDate, 'h:mm a');

    // Check if simplified task view is enabled
    const showSimplified = preferences?.showSimplifiedTasks === true;
    
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ 
              scale: 1.02, 
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
            className={taskClass}
            onClick={() => handleTaskCompletion(task)}
            title={`${task.title} - ${goalName} (${task.isCompleted ? 'Completed' : 'Click to complete'})`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                {!showSimplified && !task.isCompleted && (
                  <motion.span 
                    title="Mark as completed"
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <Circle className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                  </motion.span>
                )}
                {!showSimplified && task.isCompleted && (
                  <motion.span 
                    title="Undo completion"
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </motion.span>
                )}
                <span className="truncate text-xs">{task.title}</span>
              </div>
              {!showSimplified && (
                <div className="flex items-center shrink-0 gap-1">
                  {task.isRepeating && (
                    <motion.span 
                      title="Repeating task"
                      whileHover={{ rotate: 180, scale: 1.2 }}
                      transition={{ duration: 0.3 }}
                    >
                      <RepeatIcon className="h-3 w-3 opacity-70" />
                    </motion.span>
                  )}
                </div>
              )}
            </div>
            
            {!showSimplified && (
              <div className="flex justify-between items-center mt-0.5">
                <div className="text-[8px] opacity-80 dark:opacity-90 truncate max-w-[50%] font-medium">{goalName}</div>
                <div className="text-[8px] opacity-80 dark:opacity-90 shrink-0 font-medium flex items-center">
                  {isNotSet 
                    ? <span className="flex items-center"><Clock className="h-2 w-2 mr-0.5" />No time</span>
                    : <span className="flex items-center"><Clock className="h-2 w-2 mr-0.5" />{timeStr}</span>
                  }
                </div>
              </div>
            )}
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem 
            onClick={() => handleTaskCompletion(task)}
            className="flex items-center"
          >
            {task.isCompleted ? (
              <>
                <UndoIcon className="mr-2 h-4 w-4" />
                <span>Mark as incomplete</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                <span>Mark as complete</span>
              </>
            )}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => handleEditTask(task)}
            className="flex items-center"
          >
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit task</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => handleViewTaskDetails(task)}
            className="flex items-center"
          >
            <Info className="mr-2 h-4 w-4" />
            <span>View details</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => handleDeleteTaskConfirm(task.id)}
            className="flex items-center text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete task</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };
  
  // Render time periods toggle
  // Render simplified tasks toggle with animation
  const renderSimplifiedTasksToggle = () => {
    const handleSimplifiedChange = (value: boolean) => {
      if (preferences) {
        updatePreferences({ showSimplifiedTasks: value });
      }
    };
    
    return (
      <div className="flex items-center space-x-2">
        <Switch
          id="simplified-tasks"
          checked={preferences?.showSimplifiedTasks === true}
          onCheckedChange={handleSimplifiedChange}
          className="data-[state=checked]:animate-pulse"
        />
        <Label htmlFor="simplified-tasks" className="text-xs whitespace-nowrap">
          <motion.span 
            className="flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {preferences?.showSimplifiedTasks ? (
              <>
                <EyeOffIcon className="h-3 w-3" /> Simple View
              </>
            ) : (
              <>
                <EyeIcon className="h-3 w-3" /> Detailed View
              </>
            )}
          </motion.span>
        </Label>
      </div>
    );
  };
  
  // Render time periods toggle with animation
  const renderTimePeriodsToggle = () => {
    return (
      <div className="flex items-center space-x-2">
        <Switch
          id="time-periods"
          checked={showTimePeriods}
          onCheckedChange={setShowTimePeriods}
          className="data-[state=checked]:animate-pulse"
        />
        <Label htmlFor="time-periods" className="text-xs whitespace-nowrap">
          <motion.span 
            className="flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {showTimePeriods ? (
              <>
                <LayoutGrid className="h-3 w-3" /> Show Time Periods
              </>
            ) : (
              <>
                <Calendar className="h-3 w-3" /> Simple View
              </>
            )}
          </motion.span>
        </Label>
      </div>
    );
  };
  
  // Render the calendar area for a day
  const renderDayArea = (day: Date, dayIndex: number, timePeriod?: string) => {
    const isWeekend = dayIndex === 5 || dayIndex === 6; // Saturday or Sunday
    const isCurrentDay = isToday(day);
    
    // Common class for all areas
    const baseClass = `
      ${isWeekend ? "bg-gray-50/50 dark:bg-gray-800/50" : "bg-white dark:bg-gray-900"} 
      ${isCurrentDay ? "bg-primary-50/50 dark:bg-primary-900/20" : ""}
      transition-colors duration-200
    `;
    
    // More space-efficient layout with scrolling and responsive heights
    const timeSpecificClass = `h-[160px] sm:h-[180px] md:h-[200px] overflow-y-auto p-1 sm:p-2 border-r border-b border-gray-200 dark:border-gray-800 last:border-r-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500`;
      
    // Get tasks for this day and sort them by time
    const zoneTasks = getTasksForDay(day).sort((a, b) => {
      // Sort by time of day: morning -> afternoon -> evening -> not_set
      const getTimeOfDayOrder = (timeOfDay: string | null) => {
        switch (timeOfDay) {
          case 'morning': return 1;
          case 'afternoon': return 2;
          case 'evening': return 3;
          case 'not_set': 
          default: return 4;
        }
      };
      
      const aOrder = getTimeOfDayOrder(a.timeOfDay);
      const bOrder = getTimeOfDayOrder(b.timeOfDay);
      
      // First sort by time of day category
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Then sort by specific time within the category
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });
    
    // Center tasks in simple view
    const layoutClass = !showTimePeriods ? "flex flex-col items-stretch justify-start" : "";

    // Group tasks by time of day for visual separation
    const groupedTasks: Record<string, Task[]> = {
      'morning': [],
      'afternoon': [],
      'evening': [],
      'not_set': []
    };
    
    // Group the tasks by time period
    zoneTasks.forEach(task => {
      const timeOfDay = task.timeOfDay || 'not_set';
      if (!groupedTasks[timeOfDay]) {
        groupedTasks[timeOfDay] = []; // Just in case
      }
      groupedTasks[timeOfDay].push(task);
    });
    
    // Get time period display info
    const timeLabels: Record<string, { icon: React.ReactNode, label: string, color: string }> = {
      'morning': { 
        icon: <Sun className="h-3 w-3 mr-0.5" />, 
        label: 'Morning', 
        color: 'text-amber-700 dark:text-amber-300'
      },
      'afternoon': { 
        icon: <Calendar className="h-3 w-3 mr-0.5" />, 
        label: 'Afternoon', 
        color: 'text-blue-700 dark:text-blue-300'
      },
      'evening': { 
        icon: <Moon className="h-3 w-3 mr-0.5" />, 
        label: 'Evening', 
        color: 'text-purple-700 dark:text-purple-300'
      },
      'not_set': { 
        icon: <Clock className="h-3 w-3 mr-0.5" />, 
        label: 'No specific time', 
        color: 'text-gray-700 dark:text-gray-300'
      }
    };
    
    // Render tasks in the area with time period headers
    return (
      <div className={`${baseClass} ${timeSpecificClass} ${layoutClass}`}>
        {Object.entries(groupedTasks).map(([timeOfDay, tasks]) => {
          if (tasks.length === 0) return null;
          
          const { icon, label, color } = timeLabels[timeOfDay];
          
          return (
            <div key={timeOfDay} className="mb-2">
              <div className={`flex items-center ${color} text-[9px] font-medium mb-1`}>
                {icon} {label}
              </div>
              {tasks.map((task) => {
                const goalType = getGoalType(task.goalId);
                const goalName = getGoalName(task.goalId);
                return (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    goalType={goalType} 
                    goalName={goalName} 
                    showTime={!timePeriod} 
                  />
                );
              })}
            </div>
          );
        })}
        
        {/* Empty state - only show in all-day view */}
        {zoneTasks.length === 0 && (
          <div className="text-[10px] text-gray-300 dark:text-gray-600 italic p-1 text-center opacity-70">
            {!showTimePeriods && "No tasks"}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col dark:text-white">
      {/* Calendar Controls - Desktop */}
      <div className="hidden lg:flex lg:justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={prevWeek} className="dark:border-gray-600">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          </motion.div>
        </div>
        
        <motion.div 
          className="flex justify-center items-center flex-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-sm font-medium text-center whitespace-nowrap">
            {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
            {isToday(currentWeek) && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 500, 
                  damping: 15, 
                  delay: 0.2 
                }}
                className="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 py-0.5 px-1.5 rounded-full inline-block"
              >
                Current Week
              </motion.span>
            )}
          </span>
        </motion.div>
        
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={nextWeek} className="dark:border-gray-600">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Calendar Controls - Tablet */}
      <div className="hidden md:flex lg:hidden md:flex-col sm:gap-3 mb-4">
        <motion.div 
          className="flex justify-center items-center w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-sm font-medium text-center">
            {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
            {isToday(currentWeek) && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 500, 
                  damping: 15, 
                  delay: 0.2 
                }}
                className="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 py-0.5 px-1.5 rounded-full inline-block"
              >
                Current Week
              </motion.span>
            )}
          </span>
        </motion.div>
        
        <div className="flex items-center justify-between w-full mt-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={prevWeek} className="dark:border-gray-600">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={nextWeek} className="dark:border-gray-600">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Calendar Controls - Mobile */}
      <div className="md:hidden space-y-3 mb-4">
        <motion.div 
          className="flex justify-center items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-sm font-medium text-center">
            {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
            {isToday(currentWeek) && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 500, 
                  damping: 15, 
                  delay: 0.2 
                }}
                className="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 py-0.5 px-1.5 rounded-full inline-block"
              >
                Now
              </motion.span>
            )}
          </span>
        </motion.div>
        
        <div className="flex justify-between items-center">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={prevWeek} className="dark:border-gray-600 px-2 sm:px-3">
              <ChevronLeft className="h-4 w-4 mr-0 sm:mr-1" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
          </motion.div>
                    
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={nextWeek} className="dark:border-gray-600 px-2 sm:px-3">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 ml-0 sm:ml-1" />
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-0 text-center py-2 mb-0 text-sm font-medium">
        {weekDays.map((day, i) => (
          <motion.div 
            key={`day-header-${i}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`px-1 ${isToday(day) ? "text-primary-600 dark:text-primary-400 font-semibold" : ""}`}
          >
            {/* Desktop Day Format */}
            <div className="hidden sm:block">{format(day, "EEE")}</div>
            <div className="hidden sm:block text-xs opacity-75">{format(day, "MMM d")}</div>
            
            {/* Mobile Day Format - Just day number and first letter of day */}
            <div className="sm:hidden">{format(day, "E")[0]}</div>
            <div className="sm:hidden text-xs font-bold">{format(day, "d")}</div>
          </motion.div>
        ))}
      </div>
      
      {/* Always use the simple view (all day) layout */}
      <div className="grid grid-cols-7 gap-0 border-t border-l border-gray-200 dark:border-gray-800">
        {weekDays.map((day, i) => renderDayArea(day, i))}
      </div>
      
      {/* Task details modal */}
      <Dialog open={taskDetailsModal.isOpen} onOpenChange={(open) => {
        if (!open) setTaskDetailsModal({ isOpen: false, task: null });
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{taskDetailsModal.task?.title}</DialogTitle>
          </DialogHeader>
          
          {taskDetailsModal.task && (
            <div className="space-y-4">
              {taskDetailsModal.task.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {taskDetailsModal.task.description}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Due Date:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {format(new Date(taskDetailsModal.task.scheduledDate), "PPP")}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Time:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {format(new Date(taskDetailsModal.task.scheduledDate), "p")}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Goal:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {getGoalName(taskDetailsModal.task.goalId)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">Status:</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  taskDetailsModal.task.isCompleted 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                }`}>
                  {taskDetailsModal.task.isCompleted ? "Completed" : "Pending"}
                </span>
              </div>
              
              {taskDetailsModal.task.isRepeating && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Repeats:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <RepeatIcon className="h-4 w-4 mr-1" />
                    {taskDetailsModal.task.repeatType === "daily" && "Daily"}
                    {taskDetailsModal.task.repeatType === "every_other_day" && "Every other day"}
                    {taskDetailsModal.task.repeatType === "weekly" && "Weekly"}
                    {taskDetailsModal.task.repeatType === "monthly" && "Monthly"}
                    {taskDetailsModal.task.repeatUntil && (
                      <span className="ml-1">
                        until {format(new Date(taskDetailsModal.task.repeatUntil), "PP")}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setTaskDetailsModal({ isOpen: false, task: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Task edit modal */}
      <Dialog open={taskEditModal.isOpen} onOpenChange={(open) => {
        if (!open) setTaskEditModal({ isOpen: false, task: null });
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          
          {taskEditModal.task && (
            <TaskForm 
              goalId={taskEditModal.task.goalId}
              task={taskEditModal.task}
              onSuccess={() => {
                setTaskEditModal({ isOpen: false, task: null });
                toast({
                  title: "Task updated",
                  description: "Your task has been updated successfully."
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <AlertDialog 
        open={taskDeleteState.isOpen} 
        onOpenChange={(open) => {
          if (!open) setTaskDeleteState({ isOpen: false, taskId: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeTaskDeletion}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});