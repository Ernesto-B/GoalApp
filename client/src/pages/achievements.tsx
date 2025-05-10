import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Goal, Task, UserStats } from "@shared/schema";
import { Loader2, Share2, LockOpen, Eye, Award, Trophy, Star, Calendar } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function AchievementsPage() {
  const { toast } = useToast();
  const [achievementType, setAchievementType] = useState<"completed" | "progress">("completed");
  
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
  
  const isLoading = isLoadingGoals || isTasksLoading || isStatsLoading;
  
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
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Achievements
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Track your completed goals and share your achievements
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Achievement Stats */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {/* Define the animation variants for the cards */}
                {[
                  {
                    title: "Completed Goals",
                    value: completedGoals.length,
                    icon: <Trophy className="h-6 w-6 text-green-600" />,
                    iconBg: "bg-green-100",
                    footer: completedGoals.length > 0 
                      ? `Last completed: ${formatDate(completedGoals[0].completedAt || new Date())}`
                      : "No goals completed yet"
                  },
                  {
                    title: "Completion Rate",
                    value: goals && goals.length > 0 
                      ? `${Math.round((completedGoals.length / goals.length) * 100)}%` 
                      : "0%",
                    icon: <Star className="h-6 w-6 text-primary-600" />,
                    iconBg: "bg-primary-100",
                    footer: `${goals?.length || 0} total goals`
                  },
                  {
                    title: "Public Goals",
                    value: goals?.filter(g => g.isPublic)?.length || 0,
                    icon: <Eye className="h-6 w-6 text-blue-600" />,
                    iconBg: "bg-blue-100",
                    footer: `${stats?.goalsShared || 0} people motivated`
                  },
                  {
                    title: "Longest Streak",
                    value: `${stats?.longestStreak || 0} days`,
                    icon: <Calendar className="h-6 w-6 text-purple-600" />,
                    iconBg: "bg-purple-100",
                    footer: `Current: ${stats?.currentStreak || 0} days`
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.5,
                      delay: index * 0.1, 
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
                    <Card className="bg-white shadow rounded-lg overflow-hidden h-full hover:shadow-md transition-shadow duration-300">
                      <CardContent className="p-0 h-full flex flex-col">
                        <div className="p-5 flex-grow">
                          <div className="flex items-center">
                            <motion.div 
                              className={`flex-shrink-0 ${stat.iconBg} rounded-md p-3`}
                              initial={{ scale: 0.8, rotate: -10 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 260, 
                                damping: 20,
                                delay: index * 0.1 + 0.2
                              }}
                            >
                              {stat.icon}
                            </motion.div>
                            <div className="ml-5">
                              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                              <motion.p 
                                className="text-2xl font-semibold text-gray-900"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ 
                                  duration: 0.5,
                                  delay: index * 0.1 + 0.3
                                }}
                              >
                                {stat.value}
                              </motion.p>
                            </div>
                          </div>
                        </div>
                        <motion.div 
                          className="bg-gray-50 px-5 py-3 mt-auto"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ 
                            duration: 0.3,
                            delay: index * 0.1 + 0.4
                          }}
                        >
                          <div className="text-sm text-gray-500">
                            {stat.footer}
                          </div>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              
              {/* Achievement Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.5,
                  delay: 0.5, 
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <Tabs value={achievementType} onValueChange={(value: any) => setAchievementType(value)}>
                  <div className="flex justify-between items-center mb-4">
                    <TabsList className="relative">
                      <TabsTrigger value="completed" className="relative z-10 transition-all duration-300">
                        <motion.div 
                          className="flex items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Completed Goals
                        </motion.div>
                      </TabsTrigger>
                      <TabsTrigger value="progress" className="relative z-10 transition-all duration-300">
                        <motion.div 
                          className="flex items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          In Progress
                        </motion.div>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                
                <TabsContent value="completed">
                  <div className="grid grid-cols-1 gap-6">
                    {completedGoals.length > 0 ? (
                      completedGoals.map((goal, index) => (
                        <motion.div
                          key={goal.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            duration: 0.4,
                            delay: index * 0.1, 
                            ease: [0.4, 0, 0.2, 1]
                          }}
                        >
                          <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
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
                                        delay: index * 0.1 + 0.3
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
                                        delay: index * 0.1 + 0.4
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
                                  transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
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
                                  transition={{ duration: 0.4, delay: index * 0.1 + 0.4 }}
                                >
                                  <p className="text-sm text-gray-600 mb-4">
                                    {goal.description || "No description provided."}
                                  </p>
                                  
                                  {goal.reflection && (
                                    <motion.div 
                                      className="mt-4 bg-gray-50 p-4 rounded-lg"
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                                    >
                                      <h4 className="text-sm font-medium mb-2">Reflection</h4>
                                      <p className="text-sm text-gray-600 italic">"{goal.reflection}"</p>
                                    </motion.div>
                                  )}
                                </motion.div>
                                
                                <motion.div 
                                  className="space-y-4"
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.4, delay: index * 0.1 + 0.5 }}
                                >
                                  <motion.div 
                                    className="bg-gray-50 p-4 rounded-lg"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                  >
                                    <h4 className="text-xs font-medium text-gray-500 mb-1">Completed On</h4>
                                    <p className="text-sm font-medium">{formatDate(goal.completedAt || new Date())}</p>
                                  </motion.div>
                                  
                                  <motion.div 
                                    className="bg-gray-50 p-4 rounded-lg"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                  >
                                    <h4 className="text-xs font-medium text-gray-500 mb-1">Tasks Completed</h4>
                                    <p className="text-sm font-medium">
                                      {getTasksForGoal(goal.id).filter(t => t.isCompleted).length} / {getTasksForGoal(goal.id).length}
                                    </p>
                                  </motion.div>
                                </motion.div>
                              </div>
                            </CardContent>
                            
                            <CardFooter className="border-t px-6 py-4 bg-gray-50">
                              <div className="flex justify-between items-center w-full">
                                <div className="flex items-center space-x-4">
                                  <motion.div 
                                    className="flex items-center space-x-2"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 + 0.6 }}
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
                                      transition={{ duration: 0.3, delay: index * 0.1 + 0.7 }}
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
                                  transition={{ duration: 0.3, delay: index * 0.1 + 0.7 }}
                                >
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button variant="outline" size="sm" onClick={() => window.location.href = `/goal/${goal.id}`}>
                                      <Award className="h-4 w-4 mr-2" />
                                      View Details
                                    </Button>
                                  </motion.div>
                                </motion.div>
                              </div>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <Card>
                          <CardContent className="p-12 text-center">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.5, delay: 0.3 }}
                            >
                              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            </motion.div>
                            <motion.h3 
                              className="text-lg font-medium text-gray-900 mb-1"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.4 }}
                            >
                              No completed goals yet
                            </motion.h3>
                            <motion.p 
                              className="text-gray-500 max-w-md mx-auto mb-6"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.5 }}
                            >
                              When you complete your goals, they'll appear here where you can reflect on your achievements and share them with others.
                            </motion.p>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.6 }}
                            >
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button variant="outline">Go to Dashboard</Button>
                              </motion.div>
                            </motion.div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="progress">
                  <div className="grid grid-cols-1 gap-6">
                    {inProgressGoals.length > 0 ? (
                      inProgressGoals.map((goal, index) => {
                        const completion = calculateCompletion(goal.id);
                        const progressColorClass = goal.type === "short" 
                          ? "bg-amber-500" 
                          : goal.type === "medium" 
                            ? "bg-blue-500" 
                            : "bg-purple-500";
                        
                        return (
                          <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              duration: 0.4,
                              delay: index * 0.1, 
                              ease: [0.4,
                              0.2, 1]
                            }}
                          >
                            <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                              <CardHeader>
                                <div className="flex justify-between items-start">
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
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
                                          delay: index * 0.1 + 0.3
                                        }}
                                      >
                                        <Badge 
                                          variant="outline" 
                                          className={getBadgeColorClass(goal.type)}
                                        >
                                          {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} term
                                        </Badge>
                                      </motion.div>
                                    </div>
                                  </motion.div>
                                  <motion.div 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
                                  >
                                    <Badge variant="outline">
                                      {formatDate(goal.deadline)}
                                    </Badge>
                                  </motion.div>
                                </div>
                              </CardHeader>
                              
                              <CardContent>
                                <div className="grid md:grid-cols-3 gap-4">
                                  <motion.div 
                                    className="col-span-2"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 + 0.4 }}
                                  >
                                    <p className="text-sm text-gray-600 mb-4">
                                      {goal.description || "No description provided."}
                                    </p>
                                    
                                    <motion.div 
                                      className="mt-4"
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                                    >
                                      <div className="flex justify-between mb-1">
                                        <p className="text-xs font-medium text-gray-700">Progress</p>
                                        <p className="text-xs font-medium text-gray-700">{completion}%</p>
                                      </div>
                                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                        <motion.div 
                                          style={{ width: 0 }}
                                          animate={{ width: `${completion}%` }}
                                          transition={{ duration: 0.8, delay: index * 0.1 + 0.6, ease: "easeOut" }}
                                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${progressColorClass}`}
                                        ></motion.div>
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                  
                                  <motion.div 
                                    className="space-y-4"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 + 0.5 }}
                                  >
                                    <motion.div 
                                      className="bg-gray-50 p-4 rounded-lg"
                                      whileHover={{ scale: 1.02 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                      <h4 className="text-xs font-medium text-gray-500 mb-1">Created On</h4>
                                      <p className="text-sm font-medium">{formatDate(goal.createdAt)}</p>
                                    </motion.div>
                                    
                                    <motion.div 
                                      className="bg-gray-50 p-4 rounded-lg"
                                      whileHover={{ scale: 1.02 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                      <h4 className="text-xs font-medium text-gray-500 mb-1">Tasks Completed</h4>
                                      <p className="text-sm font-medium">
                                        {getTasksForGoal(goal.id).filter(t => t.isCompleted).length} / {getTasksForGoal(goal.id).length}
                                      </p>
                                    </motion.div>
                                  </motion.div>
                                </div>
                              </CardContent>
                              
                              <CardFooter className="border-t px-6 py-4 bg-gray-50">
                                <div className="flex justify-end items-center w-full">
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 + 0.7 }}
                                  >
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/goal/${goal.id}`}>
                                        View Details
                                      </Button>
                                    </motion.div>
                                  </motion.div>
                                </div>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <Card>
                          <CardContent className="p-12 text-center">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.5, delay: 0.3 }}
                            >
                              <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            </motion.div>
                            <motion.h3 
                              className="text-lg font-medium text-gray-900 mb-1"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.4 }}
                            >
                              No goals in progress
                            </motion.h3>
                            <motion.p 
                              className="text-gray-500 max-w-md mx-auto mb-6"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.5 }}
                            >
                              Start setting goals to track your progress and achieve your dreams.
                            </motion.p>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.6 }}
                            >
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button variant="outline">Create a Goal</Button>
                              </motion.div>
                            </motion.div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
