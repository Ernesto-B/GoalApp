import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Goal, Task } from "@shared/schema";
import { 
  Circle, 
  CircleDot, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Archive, 
  Trash2, 
  Calendar,
  CheckCircle 
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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

interface GoalFrameworkViewProps {
  goals: Goal[];
}

export function GoalFrameworkView({ goals }: GoalFrameworkViewProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State for manage collapsible goals
  const [collapsedGoals, setCollapsedGoals] = useState<number[]>([]);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  
  // Fetch tasks to display under each goal
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Archive goal mutation
  const archiveGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      const res = await apiRequest("PATCH", `/api/goals/${goalId}/archive`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Goal archived",
        description: "The goal has been archived successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
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
    mutationFn: async (goalId: number) => {
      const res = await apiRequest("DELETE", `/api/goals/${goalId}`);
      if (!res.ok) {
        throw new Error("Failed to delete goal");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Goal deleted",
        description: "The goal and its associated tasks have been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDeleteAlertOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete goal",
        description: error.message,
        variant: "destructive",
      });
      setDeleteAlertOpen(false);
    },
  });
  
  // Handle collapsing/expanding all goals
  const toggleAllGoals = (collapse: boolean) => {
    if (collapse) {
      // Collapse all goals
      setCollapsedGoals(goals.map(g => g.id));
    } else {
      // Expand all goals
      setCollapsedGoals([]);
    }
  };
  
  // Sort goals by hierarchy (parent-child relationships) and then by deadline date
  const sortedGoals = [...goals].sort((a, b) => {
    // First sort by parent-child relationship
    if (a.parentGoalId === null && b.parentGoalId !== null) return -1;
    if (a.parentGoalId !== null && b.parentGoalId === null) return 1;
    
    // Then by deadline date
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
  
  // Helper functions for goal organization
  const getChildrenOfGoal = (parentId: number) => {
    return sortedGoals.filter(g => g.parentGoalId === parentId);
  };
  
  // Get root goals (those without a parent)
  const rootGoals = sortedGoals.filter(g => !g.parentGoalId);
  
  // Build goal hierarchy for display
  type GoalNode = Goal & { children: GoalNode[] };
  
  const buildGoalTree = (parentGoal: Goal): GoalNode => {
    const children = getChildrenOfGoal(parentGoal.id);
    return {
      ...parentGoal,
      children: children.map(child => buildGoalTree(child))
    };
  };
  
  // Create goal trees
  const goalTrees = rootGoals.map(rootGoal => buildGoalTree(rootGoal));
  
  // Styling helper functions
  const getGoalCardColor = (type: string): string => {
    switch (type) {
      case "long":
        return "bg-green-100 border-green-200 dark:bg-green-950 dark:border-green-900";
      case "medium":
        return "bg-blue-100 border-blue-200 dark:bg-blue-950 dark:border-blue-900";
      case "short":
        return "bg-amber-100 border-amber-200 dark:bg-amber-950 dark:border-amber-900";
      default:
        return "bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700";
    }
  };
  
  const getTimelineDotColor = (type: string): string => {
    switch (type) {
      case "long":
        return "bg-green-500 dark:bg-green-500"; 
      case "medium":
        return "bg-blue-500 dark:bg-blue-500";
      case "short":
        return "bg-amber-500 dark:bg-amber-500";
      default:
        return "bg-gray-500 dark:bg-gray-500";
    }
  };
  
  const getTimelineLineColor = (type: string): string => {
    switch (type) {
      case "long":
        return "border-green-300 dark:border-green-800";
      case "medium":
        return "border-blue-300 dark:border-blue-800";
      case "short":
        return "border-amber-300 dark:border-amber-800";
      default:
        return "border-gray-300 dark:border-gray-600";
    }
  };
  
  const getTimelineDotSize = (type: string): string => {
    switch (type) {
      case "long":
        return "w-6 h-6";
      case "medium":
        return "w-5 h-5";
      case "short":
        return "w-4 h-4";
      default:
        return "w-3 h-3";
    }
  };
  
  // Render timeline goals
  const renderTimeline = () => {
    // Flatten goal trees into a list maintaining parent-child relationships visually
    const flattenedGoals: { goal: GoalNode; level: number; isLast: boolean; parentType?: string }[] = [];
    
    const flattenTree = (node: GoalNode, level: number = 0, isLast: boolean = true, parentType?: string) => {
      flattenedGoals.push({ goal: node, level, isLast, parentType });
      
      if (node.children.length > 0) {
        node.children.forEach((child, index) => {
          flattenTree(
            child, 
            level + 1, 
            index === node.children.length - 1,
            node.type
          );
        });
      }
    };
    
    goalTrees.forEach((tree, index) => {
      flattenTree(tree, 0, index === goalTrees.length - 1);
    });
    
    return (
      <div className="relative pl-6">
        <div className="space-y-8">
          {flattenedGoals.map((item, index) => {
            const { goal, level, isLast, parentType } = item;
            const isChild = level > 0;
            const timelineDotColor = getTimelineDotColor(goal.type);
            const timelineDotSize = getTimelineDotSize(goal.type);
            const cardBgColor = getGoalCardColor(goal.type);
            const goalTasks = tasks.filter(task => task.goalId === goal.id);
            
            return (
              <div key={goal.id} className={`relative ${isChild ? 'ml-6' : ''}`}>
                {/* Vertical timeline */}
                {(!isChild || (isChild && level === 1)) && (
                  <div 
                    className={`absolute left-4 top-0 bottom-0 w-px border-l-2 border-dashed ${getTimelineLineColor(goal.type)}`}
                    style={{
                      top: index === 0 ? '0' : '-16px',
                      bottom: isLast ? '0' : '-16px'
                    }}
                  />
                )}
                
                {/* Horizontal connector */}
                {isChild && parentType && (
                  <div className={`absolute -left-6 top-4 w-6 h-px border-t-2 border-dashed ${getTimelineLineColor(parentType)}`} />
                )}
                
                {/* Timeline dot */}
                <div className={`absolute -left-4 top-4 ${timelineDotSize} rounded-full ${timelineDotColor} z-10 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center`}>
                  {goal.type === "long" && (
                    <Circle className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* Goal card with context menu */}
                <ContextMenu>
                  <ContextMenuTrigger>
                    <Collapsible
                      open={!collapsedGoals.includes(goal.id)}
                      onOpenChange={(open) => {
                        if (open) {
                          setCollapsedGoals(prev => prev.filter(id => id !== goal.id));
                        } else {
                          setCollapsedGoals(prev => [...prev, goal.id]);
                        }
                      }}
                      className={`relative p-4 border rounded-md shadow-sm ${cardBgColor}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Link href={`/goal/${goal.id}`} className="text-lg font-semibold hover:underline text-gray-900 dark:text-gray-100">
                              {goal.title}
                            </Link>
                          </div>
                          {goal.description && (
                            <p className="text-gray-600 dark:text-gray-300 mt-2">{goal.description}</p>
                          )}
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>Deadline: {formatDate(goal.deadline)}</span>
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                            {collapsedGoals.includes(goal.id) ? 
                              <ChevronRight className="h-4 w-4" /> :
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      
                      {/* Associated tasks */}
                      {goalTasks.length > 0 && (
                        <CollapsibleContent>
                          <div className="mt-4 space-y-2">
                            {goalTasks.map(task => (
                              <div key={task.id} className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                  {task.isCompleted ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                                  ) : (
                                    <CircleDot className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                  )}
                                </div>
                                <div className="ml-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                                  {task.title}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </ContextMenuTrigger>
                  
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem 
                      onClick={() => navigate(`/goal/${goal.id}`)}
                      className="flex items-center cursor-pointer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      <span>View Details</span>
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => archiveGoalMutation.mutate(goal.id)}
                      className="flex items-center cursor-pointer"
                      disabled={archiveGoalMutation.isPending}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      <span>{archiveGoalMutation.isPending ? "Archiving..." : "Archive Goal"}</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      className="flex items-center cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                      onClick={() => {
                        setSelectedGoalId(goal.id);
                        setDeleteAlertOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete Goal</span>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="my-6">
      {rootGoals.length > 0 ? (
        <>
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => toggleAllGoals(collapsedGoals.length < goals.length)}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              {collapsedGoals.length < goals.length ? "Collapse All" : "Expand All"}
            </Button>
          </div>
          
          {renderTimeline()}
          
          {/* Delete goal confirmation dialog */}
          <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this goal?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the goal
                  and all tasks associated with it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => selectedGoalId && deleteGoalMutation.mutate(selectedGoalId)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteGoalMutation.isPending ? "Deleting..." : "Delete Goal"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          <p>No goals to display. Create goals with parent-child relationships to visualize them in a timeline.</p>
        </div>
      )}
    </div>
  );
}