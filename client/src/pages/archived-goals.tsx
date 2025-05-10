import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Goal } from "@shared/schema";
import { formatDate, getTimeLeft, calculateGoalProgress, cn } from "@/lib/utils";
import { Loader2, Archive, Clock, RefreshCw, Info, Trash2, Search, CheckCircle, ArrowLeft, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function ArchivedGoalsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [unarchiveGoalId, setUnarchiveGoalId] = useState<number | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: archivedGoals, isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals/archived"],
  });
  
  // Fetch tasks for all archived goals to calculate progress
  const { data: allTasks } = useQuery<Record<number, any[]>>({
    queryKey: ["/api/goals/archived/tasks"],
    enabled: !!archivedGoals && archivedGoals.length > 0,
    queryFn: async () => {
      if (!archivedGoals || archivedGoals.length === 0) return {};
      
      // Create an object to store tasks for each goal
      const tasksMap: Record<number, any[]> = {};
      
      // Fetch tasks for each goal
      for (const goal of archivedGoals) {
        if (!goal.id) continue;
        const response = await fetch(`/api/goals/${goal.id}/tasks`);
        if (response.ok) {
          tasksMap[goal.id] = await response.json();
        } else {
          tasksMap[goal.id] = [];
        }
      }
      
      return tasksMap;
    }
  });
  
  // Filter goals by search term
  const filteredGoals = searchTerm && archivedGoals 
    ? archivedGoals.filter(
        (goal) =>
          goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (goal.description && goal.description.toLowerCase().includes(searchTerm.toLowerCase()))
      ) 
    : archivedGoals;
  
  const unarchiveGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      await apiRequest("PATCH", `/api/goals/${goalId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/archived"] });
      toast({
        title: "Goal restored",
        description: "Your goal has been moved back to active goals.",
      });
      setUnarchiveGoalId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to restore goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      await apiRequest("DELETE", `/api/goals/${goalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/archived"] });
      toast({
        title: "Goal deleted",
        description: "Your goal has been permanently deleted.",
      });
      setIsDeleteDialogOpen(false);
      setDeleteGoalId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleUnarchive = (goalId: number) => {
    setUnarchiveGoalId(goalId);
  };
  
  const confirmUnarchive = () => {
    if (unarchiveGoalId) {
      unarchiveGoalMutation.mutate(unarchiveGoalId);
    }
  };
  
  const handleDeleteGoal = (goalId: number) => {
    setDeleteGoalId(goalId);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteGoal = () => {
    if (deleteGoalId) {
      deleteGoalMutation.mutate(deleteGoalId);
    }
  };
  
  const selectedGoal = unarchiveGoalId 
    ? archivedGoals?.find(goal => goal.id === unarchiveGoalId) 
    : null;
    
  const goalToDelete = deleteGoalId
    ? archivedGoals?.find(goal => goal.id === deleteGoalId)
    : null;
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Archived Goals</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Goals you've archived will be shown here. You can restore them back to active goals if needed.
            </p>
          </div>
          
          {/* Search functionality with animations */}
          {archivedGoals && archivedGoals.length > 0 && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <motion.div
                  whileHover={{ 
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    scale: 1.01
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Input
                    type="text"
                    placeholder="Search archived goals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 transition-all border-dashed focus:border-solid"
                  />
                </motion.div>
                {searchTerm && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={() => setSearchTerm("")}
                    >
                      <span className="sr-only">Clear search</span>
                      <motion.div
                        whileHover={{ rotate: 90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <XCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </motion.div>
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : archivedGoals && archivedGoals.length > 0 ? (
            <>
              {searchTerm && filteredGoals && filteredGoals.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <Search className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No matching goals</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">No archived goals match your search for "{searchTerm}".</p>
                  <div className="mt-6">
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      Clear search
                    </Button>
                  </div>
                </div>
              ) : (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {filteredGoals && filteredGoals.map((goal, index) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 100
                      }}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <motion.div
                            whileHover={{ 
                              scale: 1.02,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Card className="overflow-hidden">
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        goal.type === "short" 
                                          ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                                          : goal.type === "medium"
                                          ? "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                                          : "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                                      }
                                    >
                                      {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} term
                                    </Badge>
                                  </motion.div>
                                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                    <Archive className="h-3 w-3 mr-1" />
                                    <span>{formatDate(goal.archivedAt || new Date())}</span>
                                  </div>
                                </div>
                                <CardTitle className="mt-2 text-xl">
                                  <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                                    <Link href={`/goal/${goal.id}`} className="hover:underline">
                                      {goal.title}
                                    </Link>
                                  </motion.div>
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {goal.description || "No description provided"}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex justify-between text-sm mb-2">
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1 text-gray-500 dark:text-gray-400" />
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {goal.isCompleted 
                                        ? `Completed on ${formatDate(goal.completedAt || goal.deadline)}` 
                                        : getTimeLeft(goal.deadline)}
                                    </span>
                                  </div>
                                  <span className="font-medium">
                                    {goal.isCompleted 
                                      ? "100" 
                                      : allTasks && goal.id && allTasks[goal.id] 
                                        ? calculateGoalProgress(allTasks[goal.id])
                                        : "0"}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <motion.div 
                                    className={`h-full ${
                                      goal.type === "short" 
                                        ? "bg-amber-500"
                                        : goal.type === "medium"
                                        ? "bg-blue-500"
                                        : "bg-purple-500"
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ 
                                      width: `${goal.isCompleted 
                                        ? 100 
                                        : allTasks && goal.id && allTasks[goal.id] 
                                          ? calculateGoalProgress(allTasks[goal.id])
                                          : 0}%` 
                                    }}
                                    transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                                  />
                                </div>
                              </CardContent>
                              <CardFooter className="border-t pt-4 dark:border-gray-700">
                                <motion.div 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-full"
                                >
                                  <Button 
                                    variant="ghost" 
                                    className="w-full flex items-center justify-center"
                                    onClick={() => handleUnarchive(goal.id)}
                                  >
                                    <motion.div
                                      animate={{ rotate: [0, 180, 360] }}
                                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                      className="mr-2"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </motion.div>
                                    Restore to Active Goals
                                  </Button>
                                </motion.div>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        </ContextMenuTrigger>
                      
                        <ContextMenuContent className="w-56">
                          <ContextMenuItem 
                            onClick={() => navigate(`/goal/${goal.id}`)}
                            className="flex items-center cursor-pointer"
                          >
                            <Info className="mr-2 h-4 w-4" />
                            <span>View details</span>
                          </ContextMenuItem>
                          
                          <ContextMenuItem 
                            onClick={() => handleUnarchive(goal.id)}
                            className="flex items-center cursor-pointer"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            <span>Restore to Active Goals</span>
                          </ContextMenuItem>
                          
                          <ContextMenuSeparator />
                          
                          <ContextMenuItem 
                            className="flex items-center cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Goal</span>
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-12 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
              <Archive className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No archived goals</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">You haven't archived any goals yet.</p>
              <div className="mt-6">
                <Button variant="outline" asChild>
                  <Link href="/">
                    Go back to active goals
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Unarchive Confirmation Dialog */}
      <Dialog open={!!unarchiveGoalId} onOpenChange={(open) => !open && setUnarchiveGoalId(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogTitle>Restore Goal</DialogTitle>
          <DialogDescription>
            Are you sure you want to restore "{selectedGoal?.title}" back to your active goals?
          </DialogDescription>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setUnarchiveGoalId(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUnarchive}
              disabled={unarchiveGoalMutation.isPending}
            >
              {unarchiveGoalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore Goal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Goal Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{goalToDelete?.title}"? This action cannot be undone.
              All associated tasks will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteGoalId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGoal}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
              disabled={deleteGoalMutation.isPending}
            >
              {deleteGoalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Goal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}