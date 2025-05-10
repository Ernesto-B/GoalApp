import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, Task, UserStats, Achievement } from "@shared/schema";
import { 
  Loader2, Share2, LockOpen, Eye, Award, Trophy, Star, Calendar, 
  Flame, Zap, Crown, Flag, CheckCircle, Lightbulb, Rocket, 
  Sunrise, Moon, Clock, Search, Filter, PieChart, BarChart2, TrendingUp,
  Info, Medal, Target, LucideIcon, Sparkles
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAchievements } from "@/hooks/use-achievements";
import { ScrollToTop } from "@/components/scroll-to-top";

// Map for Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  Flame: Flame,
  Zap: Zap,
  Award: Award,
  Trophy: Trophy,
  Crown: Crown,
  Flag: Flag,
  CheckCircle: CheckCircle,
  Lightbulb: Lightbulb,
  Rocket: Rocket,
  Sunrise: Sunrise,
  Moon: Moon,
  Clock: Clock,
  Star: Star,
  Calendar: Calendar,
  Medal: Medal,
  Target: Target,
  Sparkles: Sparkles
};

// Achievement category metadata
const achievementCategories = [
  {
    id: "streak",
    title: "Streak Achievements",
    description: "Achievements earned by maintaining consistent daily activity",
    icon: Flame,
    color: "bg-amber-500/80 text-white"
  },
  {
    id: "goal_completion",
    title: "Goal Achievements",
    description: "Achievements earned by completing goals",
    icon: Flag,
    color: "bg-emerald-500/80 text-white"
  },
  {
    id: "task_completion",
    title: "Task Achievements",
    description: "Achievements earned by completing tasks",
    icon: CheckCircle,
    color: "bg-blue-500/80 text-white"
  },
  {
    id: "consistency",
    title: "Consistency Achievements",
    description: "Achievements earned through consistent behavior patterns",
    icon: Clock,
    color: "bg-purple-500/80 text-white"
  },
  {
    id: "custom",
    title: "Special Achievements",
    description: "Unique achievements for special milestones",
    icon: Medal,
    color: "bg-rose-500/80 text-white"
  }
];

export default function AchievementsPage() {
  const { toast } = useToast();
  const [achievementType, setAchievementType] = useState<"all" | "completed" | "progress">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const { 
    achievements, 
    isLoading: isAchievementsLoading,
    error: achievementsError,
    categorizedAchievements
  } = useAchievements();
  
  const { data: goals, isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });
  
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: stats, isLoading: isStatsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
  });

  const togglePublicMutation = useMutation({
    mutationFn: async (goalId: number) => {
      await apiRequest("PATCH", `/api/goals/${goalId}/toggle-public`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal visibility updated",
        description: "Your goal's public status has been updated.",
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
  
  const isLoading = isLoadingGoals || isTasksLoading || isStatsLoading || isAchievementsLoading;
  
  // Filter completed and in-progress goals
  const completedGoals = goals?.filter(goal => goal.isCompleted) || [];
  const inProgressGoals = goals?.filter(goal => !goal.isCompleted) || [];
  
  // Get tasks for a goal
  const getTasksForGoal = (goalId: number) => {
    return tasks?.filter(task => task.goalId === goalId) || [];
  };
  
  // Calculate completion percentage
  const calculateCompletion = (goalId: number) => {
    const goalTasks = getTasksForGoal(goalId);
    if (goalTasks.length === 0) return 0;
    
    const completedTasks = goalTasks.filter(task => task.isCompleted).length;
    return Math.round((completedTasks / goalTasks.length) * 100);
  };
  
  // Get badge color class based on goal type
  const getBadgeColorClass = (type: string) => {
    return type === "short" 
      ? "bg-amber-100 text-amber-800 hover:bg-amber-100" 
      : type === "medium" 
        ? "bg-blue-100 text-blue-800 hover:bg-blue-100" 
        : "bg-purple-100 text-purple-800 hover:bg-purple-100";
  };

  // Function to filter achievements
  const getFilteredAchievements = () => {
    if (!achievements || achievements.length === 0) return [];
    
    let filtered = [...achievements];
    
    // Filter by achievement type
    if (achievementType === "completed") {
      filtered = filtered.filter(a => a.isCompleted);
    } else if (achievementType === "progress") {
      filtered = filtered.filter(a => !a.isCompleted);
    }
    
    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(a => a.type === categoryFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(term) || 
        a.description.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // Get total achievement counts
  const getTotalCounts = () => {
    if (!achievements) return { total: 0, completed: 0, inProgress: 0 };
    
    const completed = achievements.filter(a => a.isCompleted).length;
    return {
      total: achievements.length,
      completed,
      inProgress: achievements.length - completed
    };
  };



  const counts = getTotalCounts();
  const filteredAchievements = getFilteredAchievements();
  const categorized = categorizedAchievements();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                Achievements & Milestones
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Track your milestones, collect badges, and celebrate your progress
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : achievements && achievements.length > 0 ? (
            <>
              {/* Achievement Overview */}
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg overflow-hidden shadow-lg"
                >
                  <div className="px-6 py-8 backdrop-blur-sm bg-black/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-white">Your Achievement Journey</h3>
                        <p className="text-white/80">
                          You've unlocked {counts.completed} out of {counts.total} achievements.
                          Keep going to unlock more badges and reach new milestones!
                        </p>
                        <div className="pt-2">
                          <div className="flex justify-between mb-1 text-sm text-white/90">
                            <span>Overall Progress</span>
                            <span>{Math.round((counts.completed / counts.total) * 100)}%</span>
                          </div>
                          <Progress 
                            value={Math.round((counts.completed / counts.total) * 100)} 
                            className="h-2 bg-white/20" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {achievementCategories.slice(0, 4).map((category) => {
                          const categoryAchievements = categorized?.[category.id === "goal_completion" ? "goalCompletion" : 
                                                    category.id === "task_completion" ? "taskCompletion" : 
                                                    category.id as keyof ReturnType<typeof categorizedAchievements>] || [];
                          const completed = categoryAchievements.filter(a => a.isCompleted).length;
                          const total = categoryAchievements.length;
                          
                          return (
                            <motion.div
                              key={category.id}
                              whileHover={{ scale: 1.05 }}
                              className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center justify-center text-center"
                            >
                              <category.icon className="h-8 w-8 text-white mb-2" />
                              <div className="text-sm font-medium text-white">{completed}/{total}</div>
                              <div className="text-xs text-white/70">{category.title.replace(" Achievements", "")}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Category Cards */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8"
              >
                {achievementCategories.map((category, index) => {
                  const categoryAchievements = categorized?.[category.id === "goal_completion" ? "goalCompletion" : 
                                             category.id === "task_completion" ? "taskCompletion" : 
                                             category.id as keyof ReturnType<typeof categorizedAchievements>] || [];
                  const completed = categoryAchievements.filter(a => a.isCompleted).length;
                  const total = categoryAchievements.length;
                  
                  return (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="cursor-pointer"
                      onClick={() => setCategoryFilter(category.id)}
                    >
                      <Card className={cn(
                        "overflow-hidden h-full transition-all duration-300 border-t-4",
                        categoryFilter === category.id ? "ring-2 ring-primary shadow-lg scale-[1.02]" : "",
                        category.id === "streak" ? "border-t-amber-500" : 
                        category.id === "goal_completion" ? "border-t-emerald-500" : 
                        category.id === "task_completion" ? "border-t-blue-500" : 
                        category.id === "consistency" ? "border-t-purple-500" : 
                        "border-t-rose-500"
                      )}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <div className={cn(
                              "p-2 rounded-md",
                              category.id === "streak" ? "bg-amber-100 text-amber-700" : 
                              category.id === "goal_completion" ? "bg-emerald-100 text-emerald-700" : 
                              category.id === "task_completion" ? "bg-blue-100 text-blue-700" : 
                              category.id === "consistency" ? "bg-purple-100 text-purple-700" : 
                              "bg-rose-100 text-rose-700"
                            )}>
                              <category.icon className="h-5 w-5" />
                            </div>
                            <Badge variant="outline" className="text-xs font-normal">
                              {completed}/{total}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h3 className="font-medium text-sm">{category.title.replace(" Achievements", "")}</h3>
                          <div className="w-full h-1 bg-gray-100 rounded-full mt-2 mb-1">
                            <div 
                              className={cn(
                                "h-1 rounded-full",
                                category.id === "streak" ? "bg-amber-500" : 
                                category.id === "goal_completion" ? "bg-emerald-500" : 
                                category.id === "task_completion" ? "bg-blue-500" : 
                                category.id === "consistency" ? "bg-purple-500" : 
                                "bg-rose-500"
                              )}
                              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{category.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
              
              {/* Search and Filter Controls */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="mb-6"
              >
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search achievements..."
                      className="pl-10 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {achievementCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
              
              {/* Achievement Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Tabs value={achievementType} onValueChange={(value: any) => setAchievementType(value)}>
                  <div className="flex justify-between items-center mb-4">
                    <TabsList className="relative">
                      <TabsTrigger value="all" className="relative z-10 transition-all duration-300">
                        <motion.div 
                          className="flex items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          All Achievements
                        </motion.div>
                      </TabsTrigger>
                      <TabsTrigger value="completed" className="relative z-10 transition-all duration-300">
                        <motion.div 
                          className="flex items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completed
                        </motion.div>
                      </TabsTrigger>
                      <TabsTrigger value="progress" className="relative z-10 transition-all duration-300">
                        <motion.div 
                          className="flex items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          In Progress
                        </motion.div>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                
                  <TabsContent value="all" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAchievements.length > 0 ? (
                        filteredAchievements.map((achievement, index) => (
                          <AchievementCard key={achievement.id} achievement={achievement} index={index} />
                        ))
                      ) : (
                        <div className="col-span-full text-center py-12">
                          <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No achievements found</h3>
                          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            No achievements match your current filters. Try adjusting your search or filter criteria.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="completed" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAchievements.length > 0 ? (
                        filteredAchievements.map((achievement, index) => (
                          <AchievementCard key={achievement.id} achievement={achievement} index={index} />
                        ))
                      ) : (
                        <div className="col-span-full text-center py-12">
                          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No completed achievements yet</h3>
                          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            Keep working on your goals and tasks to unlock achievements!
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="progress" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAchievements.length > 0 ? (
                        filteredAchievements.map((achievement, index) => (
                          <AchievementCard key={achievement.id} achievement={achievement} index={index} />
                        ))
                      ) : (
                        <div className="col-span-full text-center py-12">
                          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All achievements completed!</h3>
                          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            Congratulations! You've completed all available achievements in this category.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>


            </>
          ) : (
            <div className="text-center py-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No achievements yet</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                  Complete goals and tasks to earn achievements and unlock badges.
                </p>
              </motion.div>
            </div>
          )}
          
          {/* Completed Goals Section */}
          {completedGoals.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Completed Goals
                </h2>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {completedGoals.slice(0, 3).map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.4,
                      delay: 0.7 + index * 0.1, 
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
                    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300 border-l-4 border-l-green-500">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.7 + index * 0.1 + 0.2 }}
                          >
                            <CardTitle>{goal.title}</CardTitle>
                            <div className="flex items-center mt-1">
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ 
                                  type: "spring", 
                                  stiffness: 500, 
                                  damping: 25,
                                  delay: 0.7 + index * 0.1 + 0.3
                                }}
                              >
                                <Badge 
                                  variant="outline" 
                                  className={getBadgeColorClass(goal.type)}
                                >
                                  {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} term
                                </Badge>
                              </motion.div>
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ 
                                  type: "spring", 
                                  stiffness: 500, 
                                  damping: 25,
                                  delay: 0.7 + index * 0.1 + 0.4
                                }}
                              >
                                <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                                  Completed
                                </Badge>
                              </motion.div>
                            </div>
                          </motion.div>
                          <motion.div 
                            className="flex items-center"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.7 + index * 0.1 + 0.3 }}
                          >
                            {goal.isPublic ? (
                              <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700">
                                <Eye className="h-3 w-3" /> Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <LockOpen className="h-3 w-3" /> Private
                              </Badge>
                            )}
                          </motion.div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                          <motion.div 
                            className="col-span-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.7 + index * 0.1 + 0.4 }}
                          >
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                              {goal.description || "No description provided."}
                            </p>
                            
                            {goal.reflection && (
                              <motion.div 
                                className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 + 0.5 }}
                              >
                                <h4 className="text-sm font-medium mb-2">Reflection</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{goal.reflection}</p>
                              </motion.div>
                            )}
                          </motion.div>
                          
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.7 + index * 0.1 + 0.5 }}
                            className="flex flex-col space-y-4"
                          >
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Completion Date</h4>
                              <p className="text-sm font-medium">{formatDate(goal.completedAt || new Date())}</p>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tasks Completed</h4>
                              <p className="text-sm font-medium">
                                {getTasksForGoal(goal.id).filter(t => t.isCompleted).length}/{getTasksForGoal(goal.id).length}
                              </p>
                            </div>
                          </motion.div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="border-t px-6 py-4 bg-gray-50 dark:bg-gray-800/80">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center space-x-4">
                            <motion.div 
                              className="flex items-center space-x-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.7 + index * 0.1 + 0.6 }}
                            >
                              <Switch
                                id={`public-${goal.id}`}
                                checked={goal.isPublic}
                                onCheckedChange={() => togglePublicMutation.mutate(goal.id)}
                              />
                              <Label htmlFor={`public-${goal.id}`}>Make public</Label>
                            </motion.div>
                            
                            {goal.isPublic && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 + 0.7 }}
                              >
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-blue-600"
                                  >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                  </Button>
                                </motion.div>
                              </motion.div>
                            )}
                          </div>
                          
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.7 + index * 0.1 + 0.7 }}
                          >
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.location.href = `/goal/${goal.id}`}
                              >
                                <Award className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </motion.div>
                          </motion.div>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
                
                {completedGoals.length > 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 1 }}
                    className="flex justify-center mt-4"
                  >
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = "/goals/archived"}
                    >
                      View All Completed Goals ({completedGoals.length})
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Scroll to top button */}
          <ScrollToTop />
        </div>
      </main>
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  index: number;
}

function AchievementCard({ achievement, index }: AchievementCardProps) {
  // Calculate percentage towards achievement
  const percentage = Math.min(
    Math.round((achievement.currentValue / achievement.thresholdValue) * 100),
    100
  );
  
  // Get the appropriate icon
  const IconComponent = iconMap[achievement.iconName as keyof typeof iconMap] || Trophy;
  
  // Determine card styling based on completion status
  const isCompleted = achievement.isCompleted;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -5 }}
    >
      <Card className={cn(
        "overflow-hidden h-full transition-all duration-300",
        isCompleted 
          ? "border-green-200 dark:border-green-900/30 shadow-sm" 
          : "border-gray-200 dark:border-gray-700"
      )}>
        <CardHeader className={cn(
          "pb-2",
          isCompleted ? "bg-green-50/50 dark:bg-green-900/10" : ""
        )}>
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div 
                className="p-3 rounded-lg mr-3" 
                style={{ 
                  backgroundColor: isCompleted 
                    ? `${achievement.badgeColor}20`
                    : "var(--background)",
                  color: achievement.badgeColor 
                }}
              >
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        className={cn(
                          "mb-1",
                          achievement.type === "streak" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : 
                          achievement.type === "goal_completion" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : 
                          achievement.type === "task_completion" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : 
                          achievement.type === "consistency" ? "bg-purple-100 text-purple-800 hover:bg-purple-100" : 
                          "bg-rose-100 text-rose-800 hover:bg-rose-100"
                        )}
                      >
                        {achievement.type === "goal_completion" ? "Goal" : 
                         achievement.type === "task_completion" ? "Task" : 
                         achievement.type.charAt(0).toUpperCase() + achievement.type.slice(1)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {achievement.type === "streak" ? "Earned by maintaining streaks" : 
                         achievement.type === "goal_completion" ? "Earned by completing goals" : 
                         achievement.type === "task_completion" ? "Earned by completing tasks" : 
                         achievement.type === "consistency" ? "Earned through consistent behavior" : 
                         "Special achievement"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <h3 className="font-medium text-base">{achievement.title}</h3>
              </div>
            </div>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2
                }}
              >
                <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </motion.div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {achievement.description}
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400">Progress</span>
              <span className="font-medium">{achievement.currentValue}/{achievement.thresholdValue}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
              <motion.div 
                className={cn(
                  "h-2.5 rounded-full",
                  isCompleted ? "bg-green-500" : "bg-primary"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: index * 0.05 + 0.3 }}
              ></motion.div>
            </div>
          </div>
          
          {isCompleted && achievement.completedAt && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Achieved on {formatDate(achievement.completedAt)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}