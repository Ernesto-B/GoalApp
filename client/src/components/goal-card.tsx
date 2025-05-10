import { Task, Goal } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import { calculateGoalProgress, getTimeLeft, getGoalTypeClass } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  InfoIcon, 
  ArchiveIcon, 
  Trash2, 
  CheckSquare, 
  PlusSquare,
  ExternalLink,
  Calendar
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";

interface GoalCardProps {
  goal: Goal;
  tasks: Task[];
  showContextMenu?: boolean;
}

export function GoalCard({ goal, tasks, showContextMenu = true }: GoalCardProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const progress = calculateGoalProgress(tasks);
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const totalTasks = tasks.length;
  const timeLeft = getTimeLeft(goal.deadline);
  
  // Color classes based on goal type
  const borderColorClass = goal.type === "short" 
    ? "border-amber-500" 
    : goal.type === "medium" 
      ? "border-blue-500" 
      : "border-purple-500";
  
  const progressColorClass = goal.type === "short" 
    ? "bg-amber-500" 
    : goal.type === "medium" 
      ? "bg-blue-500" 
      : "bg-purple-500";
  
  const badgeColorClass = goal.type === "short" 
    ? "bg-amber-100 text-amber-800" 
    : goal.type === "medium" 
      ? "bg-blue-100 text-blue-800" 
      : "bg-purple-100 text-purple-800";

  // Archive goal mutation
  const archiveGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/goals/${goal.id}/archive`, {
        isArchived: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/archived"] });
      toast({
        title: "Goal archived",
        description: "The goal has been moved to the archive.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to archive goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/goals/${goal.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/archived"] });
      toast({
        title: "Goal deleted",
        description: "The goal has been permanently deleted.",
      });
      setShowDeleteAlert(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNavigate = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(path);
  };

  const handleArchiveGoal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    archiveGoalMutation.mutate();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteAlert(true);
  };

  const executeDelete = () => {
    deleteGoalMutation.mutate();
  };

  const cancelDelete = () => {
    setShowDeleteAlert(false);
  };

  const cardContent = (
    <Card className={`overflow-hidden shadow-sm rounded-lg border-l-4 ${borderColorClass} hover:shadow-md transition-all duration-200 cursor-pointer`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 break-words">
              {goal.title}
            </h5>
          </div>
          <div className="flex-shrink-0">
            <motion.div
              initial={{ opacity: 0.8, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Badge variant="outline" className={`${badgeColorClass} hover:${badgeColorClass} whitespace-nowrap`}>
                {timeLeft}
              </Badge>
            </motion.div>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between mb-1">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{progress}%</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700 cursor-pointer">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${progressColorClass}`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="text-xs">
                  <p className="font-semibold mb-1">Goal Progress: {progress}%</p>
                  <p>
                    {completedTasks} of {totalTasks} tasks completed for this goal
                    {totalTasks === 0 ? ". Add tasks to track progress!" : ""}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{completedTasks} / {totalTasks} tasks</span>
          <motion.span 
            className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            View Details
          </motion.span>
        </div>
      </CardContent>
    </Card>
  );

  if (!showContextMenu) {
    return (
      <Link href={`/goal/${goal.id}`} className="block">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {cardContent}
        </motion.div>
      </Link>
    );
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Link href={`/goal/${goal.id}`} className="block">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {cardContent}
            </motion.div>
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem 
            onClick={(e) => handleNavigate(e, `/goal/${goal.id}`)}
            className="flex items-center cursor-pointer"
          >
            <InfoIcon className="mr-2 h-4 w-4" />
            <span>View details</span>
          </ContextMenuItem>
          
          <ContextMenuItem 
            onClick={(e) => handleNavigate(e, `/goal/${goal.id}?add=task`)}
            className="flex items-center cursor-pointer"
          >
            <PlusSquare className="mr-2 h-4 w-4" />
            <span>Add task</span>
          </ContextMenuItem>
          
          <ContextMenuItem 
            onClick={(e) => handleNavigate(e, `/calendar?goal=${goal.id}`)}
            className="flex items-center cursor-pointer"
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>View in calendar</span>
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={handleArchiveGoal}
            className="flex items-center text-orange-600 focus:text-orange-600 dark:text-orange-400 dark:focus:text-orange-400 cursor-pointer"
          >
            <ArchiveIcon className="mr-2 h-4 w-4" />
            <span>Archive goal</span>
          </ContextMenuItem>
          
          <ContextMenuItem 
            onClick={handleDelete}
            className="flex items-center text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete goal</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Delete confirmation alert dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the goal "{goal.title}" and all of its data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
