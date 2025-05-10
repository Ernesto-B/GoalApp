import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoalCard } from "@/components/goal-card";
import { TaskCalendar } from "@/components/task-calendar";
import { GoalHeatmap } from "@/components/goal-heatmap";
import { StatsCard } from "@/components/stats-card";
import { Goal, Task, UserStats } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, Plus, AlertCircle } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
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

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useMobile();
  const { toast } = useToast();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  const { data: goals, isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: !!user,
  });
  
  const { data: tasks, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });
  
  const { data: stats, isLoading: isLoadingStats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });
  
  const shortTermGoals = goals?.filter(goal => goal.type === "short") || [];
  const mediumTermGoals = goals?.filter(goal => goal.type === "medium") || [];
  const longTermGoals = goals?.filter(goal => goal.type === "long") || [];
  
  const isLoading = isLoadingGoals || isLoadingTasks || isLoadingStats;
  
  const handleExportClick = () => {
    // Show toast notification
    toast({
      title: "Export feature coming soon",
      description: "The export functionality is not yet implemented. Stay tuned for future updates!",
      variant: "default",
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header - Only show on mobile */}
      {isMobile && (
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <motion.button 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>
              <Link href="/">
                <motion.h1 
                  className="text-lg font-bold text-primary-600 dark:text-primary-400 cursor-pointer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  GoalQuest
                </motion.h1>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <div className="relative">
                <motion.button 
                  className="flex items-center focus:outline-none"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=40&h=40" alt="Profile" />
                    <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </motion.button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          {/* Dashboard header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <motion.div 
              className="flex-1 min-w-0"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                Dashboard
              </h2>
            </motion.div>
            
            <motion.div 
              className="mt-4 flex space-x-2 md:mt-0 md:ml-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="mr-2 hidden sm:flex"
                onClick={handleExportClick}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              
              <Link href="/goal/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Add Goal</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            </motion.div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats overview */}
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard 
                  title="Active Goals"
                  value={goals?.filter(g => !g.isCompleted).length.toString() || "0"}
                  icon="goal"
                  linkText="View all goals"
                  linkHref="/goals"
                  tooltipContent="The number of goals you're currently working on that haven't been completed or archived."
                />
                
                <StatsCard 
                  title="Completed Tasks"
                  value={tasks?.filter(t => t.isCompleted).length.toString() || "0"}
                  icon="task"
                  linkText="View all tasks"
                  linkHref="/tasks"
                  tooltipContent="Total number of tasks you've successfully completed across all your goals."
                />
                
                <StatsCard 
                  title="Current Streak"
                  value={`${stats?.currentStreak || 0} days`}
                  icon="streak"
                  linkText="View statistics"
                  linkHref="/stats"
                  tooltipContent="Your current streak of consecutive days with at least one completed task."
                />
              </div>
              
              {/* Goal Sections */}
              <div className="mt-8">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Your Goals</h3>
                
                {/* Short Term Goals */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="h-3 w-3 rounded-full bg-amber-500 mr-2"></span>
                      Short Term Goals
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(&lt; 31 days)</span>
                    </h4>
                    <Link href="/goal/new?type=short">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                      >
                        Add Goal
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {shortTermGoals.length > 0 ? (
                      shortTermGoals.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} tasks={tasks?.filter(t => t.goalId === goal.id) || []} />
                      ))
                    ) : (
                      <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <CardContent className="p-6 text-center">
                          <p className="text-gray-500 dark:text-gray-400">No short term goals yet. Add your first goal!</p>
                          <Link href="/goal/new?type=short">
                            <Button 
                              variant="outline" 
                              className="mt-4"
                            >
                              Add Short Term Goal
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
                
                {/* Medium Term Goals */}
                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="h-3 w-3 rounded-full bg-blue-500 mr-2"></span>
                      Medium Term Goals
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(1-4 months)</span>
                    </h4>
                    <Link href="/goal/new?type=medium">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                      >
                        Add Goal
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {mediumTermGoals.length > 0 ? (
                      mediumTermGoals.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} tasks={tasks?.filter(t => t.goalId === goal.id) || []} />
                      ))
                    ) : (
                      <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <CardContent className="p-6 text-center">
                          <p className="text-gray-500 dark:text-gray-400">No medium term goals yet. Add your first goal!</p>
                          <Link href="/goal/new?type=medium">
                            <Button 
                              variant="outline" 
                              className="mt-4"
                            >
                              Add Medium Term Goal
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
                
                {/* Long Term Goals */}
                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="h-3 w-3 rounded-full bg-purple-500 mr-2"></span>
                      Long Term Goals
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(4+ months)</span>
                    </h4>
                    <Link href="/goal/new?type=long">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                      >
                        Add Goal
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {longTermGoals.length > 0 ? (
                      longTermGoals.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} tasks={tasks?.filter(t => t.goalId === goal.id) || []} />
                      ))
                    ) : (
                      <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <CardContent className="p-6 text-center">
                          <p className="text-gray-500 dark:text-gray-400">No long term goals yet. Add your first goal!</p>
                          <Link href="/goal/new?type=long">
                            <Button 
                              variant="outline" 
                              className="mt-4"
                            >
                              Add Long Term Goal
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Task Calendar */}
              <div className="mt-10">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">This Week's Tasks</h3>
                <TaskCalendar tasks={tasks || []} goals={goals || []} />
              </div>
              
              {/* Activity Summary */}
              <div className="mt-10">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Activity Insights</h3>
                
                <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Completion by goal type */}
                  <Card className="overflow-hidden shadow rounded-lg dark:bg-gray-800">
                    <CardContent className="p-0">
                      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Completed Tasks by Goal Type</h4>
                        </div>
                      </div>
                      
                      <div className="px-4 py-5 sm:p-6">
                        {tasks && tasks.length > 0 ? (
                          <div className="space-y-6">
                            {/* Short term stats */}
                            <div>
                              <div className="flex items-center">
                                <span className="h-3 w-3 rounded-full bg-amber-500 mr-2"></span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Short Term</span>
                                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                                  {tasks.filter(t => t.isCompleted && goals?.find(g => g.id === t.goalId)?.type === "short").length} completed
                                </span>
                              </div>
                              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <motion.div 
                                  className="bg-amber-500 h-2.5 rounded-full" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${
                                    tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "short").length > 0
                                      ? (tasks.filter(t => t.isCompleted && goals?.find(g => g.id === t.goalId)?.type === "short").length / 
                                         tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "short").length) * 100
                                      : 0
                                  }%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                            
                            {/* Medium term stats */}
                            <div>
                              <div className="flex items-center">
                                <span className="h-3 w-3 rounded-full bg-blue-500 mr-2"></span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Medium Term</span>
                                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                                  {tasks.filter(t => t.isCompleted && goals?.find(g => g.id === t.goalId)?.type === "medium").length} completed
                                </span>
                              </div>
                              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <motion.div 
                                  className="bg-blue-500 h-2.5 rounded-full" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${
                                    tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "medium").length > 0
                                      ? (tasks.filter(t => t.isCompleted && goals?.find(g => g.id === t.goalId)?.type === "medium").length / 
                                         tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "medium").length) * 100
                                      : 0
                                  }%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                            
                            {/* Long term stats */}
                            <div>
                              <div className="flex items-center">
                                <span className="h-3 w-3 rounded-full bg-purple-500 mr-2"></span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Long Term</span>
                                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                                  {tasks.filter(t => t.isCompleted && goals?.find(g => g.id === t.goalId)?.type === "long").length} completed
                                </span>
                              </div>
                              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <motion.div 
                                  className="bg-purple-500 h-2.5 rounded-full" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${
                                    tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "long").length > 0
                                      ? (tasks.filter(t => t.isCompleted && goals?.find(g => g.id === t.goalId)?.type === "long").length / 
                                         tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "long").length) * 100
                                      : 0
                                  }%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No task activity data yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Recent Activity */}
                  <Card className="overflow-hidden shadow rounded-lg dark:bg-gray-800">
                    <CardContent className="p-0">
                      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recent Activity</h4>
                        </div>
                      </div>
                      
                      <div className="px-4 py-5 sm:p-6">
                        {tasks && tasks.filter(t => t.isCompleted && t.completedAt).length > 0 ? (
                          <div className="space-y-4">
                            {tasks
                              .filter(t => t.isCompleted && t.completedAt)
                              .sort((a, b) => {
                                const dateA = new Date(a.completedAt || 0);
                                const dateB = new Date(b.completedAt || 0);
                                return dateB.getTime() - dateA.getTime();
                              })
                              .slice(0, 5)
                              .map(task => {
                                const goal = goals?.find(g => g.id === task.goalId);
                                const taskDate = new Date(task.completedAt || 0);
                                const completedDate = new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: 'numeric'
                                }).format(taskDate);
                                
                                return (
                                  <div key={task.id} className="flex items-start">
                                    <div className="flex-shrink-0">
                                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                        goal?.type === "short" 
                                          ? "bg-amber-100 text-amber-600" 
                                          : goal?.type === "medium" 
                                            ? "bg-blue-100 text-blue-600" 
                                            : "bg-purple-100 text-purple-600"
                                      }`}>
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                      </div>
                                    </div>
                                    <div className="ml-3 w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {task.title}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <span>{goal?.title}</span>
                                        <span>•</span>
                                        <span>{completedDate}</span>
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            }
                            <div className="text-center pt-2">
                              <Link href="/stats" className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                                View All Activity
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-6">No recent activity. Complete tasks to see them here!</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Progress Stats Section */}
              <div className="mt-10 mb-10">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Your Progress Insights</h3>
                
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <StatsCard 
                    title="Longest Streak"
                    value={`${stats?.longestStreak || 0} days`}
                    icon="streak"
                    tooltipContent="Your longest consecutive days completing tasks"
                  />
                  
                  <StatsCard 
                    title="Goals Completed"
                    value={goals?.filter(g => g.isCompleted).length.toString() || "0"}
                    icon="goal"
                    tooltipContent="Total number of goals you've successfully completed"
                  />
                  
                  <StatsCard 
                    title="Weekly Tasks"
                    value={tasks?.filter(t => {
                      const taskDate = new Date(t.scheduledDate);
                      const now = new Date();
                      const weekStart = new Date(now);
                      weekStart.setDate(now.getDate() - now.getDay());
                      weekStart.setHours(0, 0, 0, 0);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 7);
                      return taskDate >= weekStart && taskDate < weekEnd;
                    }).length.toString() || "0"}
                    icon="task"
                    tooltipContent="Number of tasks scheduled for this week"
                  />
                  
                  <StatsCard 
                    title="Completion Rate"
                    value={tasks && tasks.length > 0 
                      ? `${Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100)}%` 
                      : "0%"}
                    icon="task"
                    tooltipContent="Percentage of tasks you've completed out of all tasks created"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}