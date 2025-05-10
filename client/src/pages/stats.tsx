import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { Task, Goal, UserStats } from "@shared/schema";
import { 
  Loader2, Calendar as CalendarIcon, BarChart, TrendingUp, Award, Zap, 
  Flame, Trophy, BarChart2, CheckCircle, Target, Clock, Clock8,
  Coffee, FileText, CalendarCheck, Sparkles, Lightbulb,
  RefreshCw, Shield, Swords, Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, subDays, addDays, startOfMonth, endOfMonth, isAfter, differenceInDays } from "date-fns";
import { GoalHeatmap } from "@/components/goal-heatmap";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { countTasksByDay, countCompletedTasksByDay } from "@/lib/utils";

export default function StatsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [chartType, setChartType] = useState<"progress" | "activity" | "goals" | "progress-over-time">("activity");
  const [activeStatsView, setActiveStatsView] = useState<"motivational" | "useful" | "interesting">("motivational");
  
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: goals, isLoading: isGoalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });
  
  const { data: stats, isLoading: isStatsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
  });
  
  // Statistical data - we track changes for future features
  
  const isLoading = isTasksLoading || isGoalsLoading || isStatsLoading;
  
  // Helper function to calculate recurring vs one-time task ratio
  const calculateRecurringVsOneTime = () => {
    if (!tasks || tasks.length === 0) return { recurring: 0, oneTime: 0, ratio: "0:0" };
    
    // Use our enhanced recurring task detection
    const recurringTasks = tasks.filter(t => 
      t.isRepeating || 
      t.parentTaskId !== null || 
      (t.repeatType && t.repeatType !== "none")
    );
    
    const oneTimeTasks = tasks.filter(t => 
      !t.isRepeating && 
      t.parentTaskId === null && 
      (!t.repeatType || t.repeatType === "none")
    );
    
    const recurringCount = recurringTasks.length;
    const oneTimeCount = oneTimeTasks.length;
    
    // Calculate a simplified ratio (e.g., "3:1" or "1:2")
    let ratio = "0:0";
    if (recurringCount > 0 && oneTimeCount > 0) {
      // Find GCD to simplify the ratio
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(recurringCount, oneTimeCount);
      ratio = `${recurringCount/divisor}:${oneTimeCount/divisor}`;
    } else if (recurringCount > 0) {
      ratio = `${recurringCount}:0`;
    } else if (oneTimeCount > 0) {
      ratio = `0:${oneTimeCount}`;
    }
    
    return {
      recurring: recurringCount,
      oneTime: oneTimeCount,
      ratio,
      percentage: tasks.length > 0 
        ? Math.round((recurringCount / tasks.length) * 100) 
        : 0
    };
  };
  
  // Generate data for charts
  const generateActivityData = () => {
    if (!tasks) return [];
    
    const tasksByDay = countTasksByDay(tasks);
    const completedTasksByDay = countCompletedTasksByDay(tasks);
    
    const today = new Date();
    let startDate;
    
    if (timeRange === "week") {
      startDate = subDays(today, 7);
    } else if (timeRange === "month") {
      startDate = startOfMonth(today);
    } else {
      startDate = subDays(today, 365);
    }
    
    const data = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const formattedDate = format(currentDate, "MMM d");
      
      data.push({
        date: formattedDate,
        scheduled: tasksByDay[dateStr] || 0,
        completed: completedTasksByDay[dateStr] || 0,
      });
      
      currentDate = addDays(currentDate, 1);
    }
    
    // For year view, aggregate by month
    if (timeRange === "year") {
      const monthlyData: any = {};
      
      data.forEach(day => {
        const month = day.date.split(" ")[0];
        if (!monthlyData[month]) {
          monthlyData[month] = { date: month, scheduled: 0, completed: 0 };
        }
        monthlyData[month].scheduled += day.scheduled;
        monthlyData[month].completed += day.completed;
      });
      
      return Object.values(monthlyData);
    }
    
    return data;
  };
  
  const generateGoalProgressData = () => {
    if (!goals || !tasks) return [];
    
    // Get the dates we need based on the time range
    const today = new Date();
    let startDate;
    
    if (timeRange === "week") {
      startDate = subDays(today, 7);
    } else if (timeRange === "month") {
      startDate = subDays(today, 30);
    } else { // year
      startDate = subDays(today, 365);
    }
    
    // Create a series of dates from start to today
    const dates: Date[] = [];
    let currentDate = startDate;
    
    while (currentDate <= today) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    // Group by goal and calculate progress for each date
    const progressByDate = dates.map(date => {
      const dateFormatted = format(date, 'yyyy-MM-dd');
      const result: Record<string, any> = { date: format(date, 'MMM dd') };
      
      // For each goal, calculate progress as of this date
      goals.forEach(goal => {
        const goalTasks = tasks.filter(t => t.goalId === goal.id);
        const tasksAsOfDate = goalTasks.filter(t => {
          // Include all tasks created on or before this date
          const taskDate = new Date(t.createdAt);
          return taskDate <= date;
        });
        
        const totalTasks = tasksAsOfDate.length;
        const completedTasksAsOfDate = tasksAsOfDate.filter(t => {
          if (!t.isCompleted) return false;
          
          // Only count tasks completed on or before this date
          const completionDate = t.completedAt ? new Date(t.completedAt) : null;
          return completionDate && completionDate <= date;
        }).length;
        
        const goalName = goal.title.length > 10 ? goal.title.substring(0, 10) + "..." : goal.title;
        const progress = totalTasks > 0 ? Math.round((completedTasksAsOfDate / totalTasks) * 100) : 0;
        
        // Use the goal id as the key to ensure uniqueness
        result[`goal_${goal.id}`] = progress;
        // Store the goal name separately so we can use it in the legend
        if (!result.goalNames) result.goalNames = {};
        result.goalNames[`goal_${goal.id}`] = goalName;
      });
      
      return result;
    });
    
    return progressByDate;
  };
  
  const generateGoalTypeData = () => {
    if (!goals) return [];
    
    const shortTermGoals = goals.filter(g => g.type === "short").length;
    const mediumTermGoals = goals.filter(g => g.type === "medium").length;
    const longTermGoals = goals.filter(g => g.type === "long").length;
    
    const completedShort = goals.filter(g => g.type === "short" && g.isCompleted).length;
    const completedMedium = goals.filter(g => g.type === "medium" && g.isCompleted).length;
    const completedLong = goals.filter(g => g.type === "long" && g.isCompleted).length;
    
    const activeShort = shortTermGoals - completedShort;
    const activeMedium = mediumTermGoals - completedMedium;
    const activeLong = longTermGoals - completedLong;
    
    // For pie chart, we need each segment to be its own data point
    return [
      { name: "Active Short Term", value: activeShort, fill: "#f59e0b", category: "Active" },
      { name: "Active Medium Term", value: activeMedium, fill: "#3b82f6", category: "Active" },
      { name: "Active Long Term", value: activeLong, fill: "#8b5cf6", category: "Active" },
      { name: "Completed Short Term", value: completedShort, fill: "#fcd34d", category: "Completed" },
      { name: "Completed Medium Term", value: completedMedium, fill: "#93c5fd", category: "Completed" },
      { name: "Completed Long Term", value: completedLong, fill: "#c4b5fd", category: "Completed" },
    ].filter(item => item.value > 0); // Only include segments with values > 0
  };
  
  // Generate goal progress over time data
  const generateGoalProgressOverTimeData = () => {
    if (!goals || !tasks) return [];
    
    // Create a mapping of dates to track progress for each goal type
    const progressByDate: Record<string, {date: string, short: number, medium: number, long: number}> = {};
    
    // Group tasks by goal and calculate when they were completed
    const goalTasksMap: Record<number, Task[]> = {};
    tasks.forEach(task => {
      if (!task.goalId) return;
      
      if (!goalTasksMap[task.goalId]) {
        goalTasksMap[task.goalId] = [];
      }
      goalTasksMap[task.goalId].push(task);
    });
    
    // Get start and end dates based on current timerange
    const today = new Date();
    let startDate;
    
    if (timeRange === "week") {
      startDate = subDays(today, 7);
    } else if (timeRange === "month") {
      startDate = startOfMonth(today);
    } else {
      startDate = subDays(today, 90); // Show last 90 days for year view
    }
    
    // Initialize dates
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const formattedDate = format(currentDate, "MMM d");
      
      // Initialize progress record for this date
      progressByDate[dateStr] = {
        date: formattedDate,
        short: 0,
        medium: 0,
        long: 0
      };
      
      currentDate = addDays(currentDate, 1);
    }
    
    // For each goal, calculate progress on each day
    goals.forEach(goal => {
      if (!goal.id) return;
      
      const goalTasks = goalTasksMap[goal.id] || [];
      const totalTasks = goalTasks.length;
      if (totalTasks === 0) return;
      
      // For each date, count completed tasks up to that date
      Object.keys(progressByDate).forEach(dateStr => {
        const date = new Date(dateStr);
        const completedTasksCount = goalTasks.filter(t => 
          t.isCompleted && 
          t.completedAt && 
          new Date(t.completedAt) <= date
        ).length;
        
        const progressPercent = (completedTasksCount / totalTasks) * 100;
        
        // Add to the appropriate goal type
        if (goal.type === "short") {
          progressByDate[dateStr].short += progressPercent;
        } else if (goal.type === "medium") {
          progressByDate[dateStr].medium += progressPercent;
        } else if (goal.type === "long") {
          progressByDate[dateStr].long += progressPercent;
        }
      });
    });
    
    // Convert to array and correctly represent the percentages
    // We'll calculate the percentage of completed tasks for each type
    const shortTermTasks = tasks.filter(task => 
      goals.find(g => g.id === task.goalId)?.type === "short"
    );
    const mediumTermTasks = tasks.filter(task => 
      goals.find(g => g.id === task.goalId)?.type === "medium"
    );
    const longTermTasks = tasks.filter(task => 
      goals.find(g => g.id === task.goalId)?.type === "long"
    );
    
    // Get the completion rates directly for display in the chart
    const shortTermCompletionRate = shortTermTasks.length > 0
      ? Math.round((shortTermTasks.filter(t => t.isCompleted).length / shortTermTasks.length) * 100)
      : 0;
    const mediumTermCompletionRate = mediumTermTasks.length > 0
      ? Math.round((mediumTermTasks.filter(t => t.isCompleted).length / mediumTermTasks.length) * 100)
      : 0;
    const longTermCompletionRate = longTermTasks.length > 0
      ? Math.round((longTermTasks.filter(t => t.isCompleted).length / longTermTasks.length) * 100)
      : 0;
      
    // Use these values for the latest date in our chart
    const result = Object.values(progressByDate).map(item => {
      // Get the date from our item
      const dateObj = new Date(item.date);
      const today = new Date();
      
      // For the current date, use the actual calculated rates
      if (format(dateObj, 'MMM d') === format(today, 'MMM d')) {
        return {
          date: item.date,
          short: shortTermCompletionRate,
          medium: mediumTermCompletionRate,
          long: longTermCompletionRate,
        };
      }
      
      // For older dates, keep the trend data as it is (historical data)
      return {
        date: item.date,
        short: Math.min(100, Math.round(item.short)),
        medium: Math.min(100, Math.round(item.medium)),
        long: Math.min(100, Math.round(item.long)),
      };
    });
    
    return result;
  };
  
  // Removed character stats data generation function

  const activityData = generateActivityData();
  const goalProgressData = generateGoalProgressData();
  const goalTypeData = generateGoalTypeData();
  const goalProgressOverTimeData = generateGoalProgressOverTimeData();
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate">
                Statistics
              </h2>
            </div>
            
            <div className="flex items-center">
              <button 
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/user/stats/recalculate");
                    // Refetch stats
                    queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
                    toast({
                      title: "Statistics updated",
                      description: "Your statistics have been recalculated based on your latest activity.",
                      variant: "default",
                    });
                  } catch (error) {
                    toast({
                      title: "Update failed",
                      description: "There was an error updating your statistics.",
                      variant: "destructive",
                    });
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate Stats
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats overview */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard 
                  title="Active Goals" 
                  value={`${goals?.filter(g => !g.isCompleted).length || 0}`}
                  icon="goal"
                  tooltipContent="Current goals you're working on"
                />
                
                <StatsCard 
                  title="Completed Tasks"
                  value={`${tasks?.filter(t => t.isCompleted).length || 0}`}
                  icon="task"
                  tooltipContent="Total tasks you've completed"
                />
                
                <StatsCard 
                  title="Current Streak"
                  value={`${stats?.currentStreak || 0} days`}
                  icon="streak"
                  tooltipContent="Days in a row with completed tasks"
                />
              </div>
              
              {/* Charts */}
              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Performance Analytics</CardTitle>
                        <CardDescription>Track your progress across goals and tasks</CardDescription>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Tabs value={chartType} onValueChange={(value: any) => setChartType(value)}>
                          <TabsList>
                            <TabsTrigger value="activity">
                              <Activity className="h-4 w-4 mr-2" />
                              Task Activity 
                            </TabsTrigger>
                            <TabsTrigger value="progress">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Goal Tracking
                            </TabsTrigger>
                            <TabsTrigger value="progress-over-time">
                              <LineChart className="h-4 w-4 mr-2" />
                              Term Progress
                            </TabsTrigger>
                            <TabsTrigger value="goals">
                              <PieChart className="h-4 w-4 mr-2" />
                              Goal Distribution
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {chartType === "activity" && (
                      <>
                        <div className="mb-4 flex justify-end">
                          <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                            <TabsList>
                              <TabsTrigger value="week">Week</TabsTrigger>
                              <TabsTrigger value="month">Month</TabsTrigger>
                              <TabsTrigger value="year">Year</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={activityData}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <RechartsTooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="scheduled"
                                stroke="#8884d8"
                                strokeWidth={3}
                                activeDot={{ r: 8 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="completed" 
                                stroke="#82ca9d"
                                strokeWidth={3}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                    
                    {chartType === "progress" && (
                      <>
                        <div className="mb-4 flex justify-between items-center">
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Goal progress over time (% completed)
                          </h3>
                          <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                            <TabsList>
                              <TabsTrigger value="week">Week</TabsTrigger>
                              <TabsTrigger value="month">Month</TabsTrigger>
                              <TabsTrigger value="year">Year</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={goalProgressData}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 20,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 100]} label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
                              <RechartsTooltip 
                                formatter={(value, name, props) => {
                                  const goalId = name.replace('goal_', '');
                                  const goalName = props.payload?.goalNames[name];
                                  return [`${value}%`, goalName || name];
                                }}
                              />
                              <Legend />
                              {goals?.map((goal, index) => {
                                // Generate a unique color for each goal (instead of using type-based coloring)
                                // Using a predefined set of visually distinct colors
                                const colorPalette = [
                                  '#2563eb', // blue
                                  '#f97316', // orange
                                  '#16a34a', // green
                                  '#9333ea', // purple
                                  '#dc2626', // red
                                  '#0891b2', // cyan
                                  '#ca8a04', // yellow
                                  '#ec4899', // pink
                                  '#64748b', // slate
                                  '#166534', // emerald
                                  '#7c3aed', // violet
                                  '#b91c1c', // rose
                                ];
                                
                                // Use index modulo color palette length to cycle through colors
                                const goalColor = colorPalette[index % colorPalette.length];
                                
                                // Check if this goal has any data in the selected time range
                                const hasDataInTimeRange = goalProgressData.some(
                                  (data) => data[`goal_${goal.id}`] !== undefined && data[`goal_${goal.id}`] !== null
                                );
                                
                                // Only render the line if the goal has data in the selected time range
                                return hasDataInTimeRange ? (
                                  <Line
                                    key={goal.id}
                                    type="monotone"
                                    dataKey={`goal_${goal.id}`}
                                    name={goal.title.length > 15 ? goal.title.substring(0, 15) + "..." : goal.title}
                                    stroke={goalColor}
                                    strokeWidth={3}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 8 }}
                                  />
                                ) : null;
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                    
                    {chartType === "progress-over-time" && (
                      <>
                        <div className="mb-4 flex justify-end">
                          <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                            <TabsList>
                              <TabsTrigger value="week">Week</TabsTrigger>
                              <TabsTrigger value="month">Month</TabsTrigger>
                              <TabsTrigger value="year">Year</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={goalProgressOverTimeData}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 100]} label={{ value: 'Progress %', angle: -90, position: 'insideLeft' }} />
                              <RechartsTooltip 
                                formatter={(value: number, name: string) => {
                                  const formattedName = name === 'short' ? 'Short Term' : 
                                                       name === 'medium' ? 'Medium Term' : 'Long Term';
                                  return [`${value}%`, formattedName];
                                }}
                              />
                              <Legend formatter={(value) => {
                                return value === 'short' ? 'Short Term' : 
                                      value === 'medium' ? 'Medium Term' : 'Long Term';
                              }} />
                              <Line 
                                type="monotone" 
                                dataKey="short" 
                                stroke="#f59e0b" 
                                name="short"
                                activeDot={{ r: 8 }} 
                                strokeWidth={3}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="medium" 
                                stroke="#3b82f6" 
                                name="medium"
                                activeDot={{ r: 8 }} 
                                strokeWidth={3}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="long" 
                                stroke="#8b5cf6" 
                                name="long"
                                activeDot={{ r: 8 }} 
                                strokeWidth={3}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                    
                    {chartType === "goals" && (
                      <div className="h-80">
                        <div className="flex flex-col">
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 text-center">
                            Distribution of Goals by Type and Status
                          </h3>
                          <div className="flex items-center justify-center h-full">
                            <ResponsiveContainer width="100%" height={320}>
                              <PieChart>
                                <Pie
                                  data={goalTypeData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={2}
                                  label={(entry) => entry.name}
                                >
                                  {goalTypeData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={entry.fill} 
                                    />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value, name, props) => {
                                    return [`${value} goal${value !== 1 ? 's' : ''}`, name];
                                  }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                                          <p className="font-medium text-sm">{data.name}</p>
                                          <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {data.value} goal{data.value !== 1 ? 's' : ''}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {data.category === "Active" 
                                              ? "Goals you're currently working on" 
                                              : "Goals you have completed"}
                                          </p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend 
                                  layout="vertical" 
                                  verticalAlign="middle"
                                  align="right"
                                  wrapperStyle={{
                                    paddingLeft: "10px",
                                  }}
                                  payload={
                                    goalTypeData.map((item) => ({
                                      value: item.name,
                                      type: "circle",
                                      id: item.name,
                                      color: item.fill,
                                    }))
                                  }
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Heatmap */}
              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Heatmap</CardTitle>
                    <CardDescription>
                      Visualize your daily activity patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <Tabs defaultValue="all">
                        <TabsList className="w-full grid grid-cols-4">
                          <TabsTrigger value="all">All</TabsTrigger>
                          <TabsTrigger value="short">Short Term</TabsTrigger>
                          <TabsTrigger value="medium">Medium Term</TabsTrigger>
                          <TabsTrigger value="long">Long Term</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="all">
                          <div className="mt-4">
                            <GoalHeatmap 
                              title="All Goals"
                              goalType="all"
                              tasks={tasks || []}
                              showLegend
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="short">
                          <div className="mt-4">
                            <GoalHeatmap 
                              title="Short Term Goals"
                              goalType="short"
                              tasks={tasks?.filter(t => 
                                goals?.find(g => g.id === t.goalId)?.type === "short"
                              ) || []}
                              showLegend
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="medium">
                          <div className="mt-4">
                            <GoalHeatmap 
                              title="Medium Term Goals"
                              goalType="medium"
                              tasks={tasks?.filter(t => 
                                goals?.find(g => g.id === t.goalId)?.type === "medium"
                              ) || []}
                              showLegend
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="long">
                          <div className="mt-4">
                            <GoalHeatmap 
                              title="Long Term Goals"
                              goalType="long"
                              tasks={tasks?.filter(t => 
                                goals?.find(g => g.id === t.goalId)?.type === "long"
                              ) || []}
                              showLegend
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Enhanced Statistics */}
              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <CardTitle>Enhanced Statistics</CardTitle>
                        <CardDescription>
                          Deep insights into your productivity and achievements
                        </CardDescription>
                      </div>
                      
                      <Tabs value={activeStatsView} onValueChange={(value: any) => setActiveStatsView(value)}>
                        <TabsList>
                          <TabsTrigger value="motivational">
                            <Award className="h-4 w-4 mr-2" />
                            Motivational
                          </TabsTrigger>
                          <TabsTrigger value="useful">
                            <BarChart className="h-4 w-4 mr-2" />
                            Useful
                          </TabsTrigger>
                          <TabsTrigger value="interesting">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Interesting
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activeStatsView === "motivational" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/40 p-5 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Milestones Reached</h3>
                              <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-2xl font-bold mt-2 text-amber-700 dark:text-amber-300">{stats?.goalsCompleted || 0}</p>
                            <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                              Each milestone represents a significant achievement in your goal journey
                            </p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Personal Best</h3>
                              <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-2xl font-bold mt-2 text-blue-700 dark:text-blue-300">{stats?.mostTasksCompletedInDay || 0} tasks</p>
                            <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                              Your record for most tasks completed in a single day
                            </p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 p-5 rounded-xl shadow-sm border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Completion Rate</h3>
                              <BarChart2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-2xl font-bold mt-2 text-green-700 dark:text-green-300">
                              {(tasks && tasks.length > 0) ? 
                                Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100) : 0}%
                            </p>
                            <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                              Percentage of all tasks you've successfully completed
                            </p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 p-5 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">Current Streak</h3>
                              <Flame className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="text-2xl font-bold mt-2 text-purple-700 dark:text-purple-300">{stats?.currentStreak || 0} days</p>
                            <p className="text-xs mt-1 text-purple-600 dark:text-purple-400">
                              Keep your momentum going! You're on fire!
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <Award className="h-5 w-5 mr-2 text-primary" />
                              Achievement Insights
                            </h3>

                            <div className="space-y-4">
                              {/* Goal completion rate */}
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Goal Completion Rate</h3>
                                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-2xl font-bold mt-2 text-blue-700 dark:text-blue-300">
                                  {goals && goals.length > 0 
                                    ? Math.round((goals.filter(g => g.isCompleted).length / goals.length) * 100) 
                                    : 0}%
                                </p>
                                <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                                  {goals && goals.filter(g => g.isCompleted).length} of {goals?.length || 0} goals completed
                                </p>
                              </div>
                              
                              {/* Longest streak */}
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 p-5 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">Longest Streak</h3>
                                  <Flame className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <p className="text-2xl font-bold mt-2 text-purple-700 dark:text-purple-300">
                                  {stats?.longestStreak || 0} days
                                </p>
                                <p className="text-xs mt-1 text-purple-600 dark:text-purple-400">
                                  Your best continuous achievement streak
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <Target className="h-5 w-5 mr-2 text-primary" />
                              Goal Achievement
                            </h3>
                            <div className="space-y-5">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg text-center">
                                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Short Term</h4>
                                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {goals?.filter(g => g.type === "short" && g.isCompleted).length || 0} / {goals?.filter(g => g.type === "short").length || 0}
                                  </p>
                                </div>
                                
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center">
                                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Medium Term</h4>
                                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {goals?.filter(g => g.type === "medium" && g.isCompleted).length || 0} / {goals?.filter(g => g.type === "medium").length || 0}
                                  </p>
                                </div>
                                
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg text-center">
                                  <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Long Term</h4>
                                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {goals?.filter(g => g.type === "long" && g.isCompleted).length || 0} / {goals?.filter(g => g.type === "long").length || 0}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-4">
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-sm font-medium">Overall Achievement Rate</p>
                                  <p className="text-sm font-medium">
                                    {goals?.filter(g => g.isCompleted).length || 0} / {goals?.length || 0}
                                  </p>
                                </div>
                                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                                  <div 
                                    style={{ 
                                      width: `${goals && goals.length > 0 
                                        ? (goals.filter(g => g.isCompleted).length / goals.length) * 100 
                                        : 0}%`
                                    }} 
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {activeStatsView === "useful" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">On-Time Completion</h3>
                              <Clock className="h-5 w-5 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{stats?.onTimeCompletionRate || 0}%</p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Percentage of tasks you complete before their deadline
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Most Productive Time</h3>
                              <Clock8 className="h-5 w-5 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{stats?.mostProductiveTime || "Not enough data"}</p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Time of day when you complete the most tasks
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Most Productive Day</h3>
                              <CalendarIcon className="h-5 w-5 text-purple-600" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{stats?.mostProductiveDay || "Not enough data"}</p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Day of the week when you're most productive
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Recurring vs One-Time</h3>
                              <RefreshCw className="h-5 w-5 text-amber-600" />
                            </div>
                            {tasks && (
                              <>
                                <div className="flex items-end gap-2">
                                  <p className="text-2xl font-bold mt-2">{calculateRecurringVsOneTime().ratio}</p>
                                  <p className="text-sm text-gray-600 mb-1">({calculateRecurringVsOneTime().percentage}% recurring)</p>
                                </div>
                                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                  {calculateRecurringVsOneTime().recurring} recurring, {calculateRecurringVsOneTime().oneTime} one-time tasks
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                              Task Completion by Goal Type
                            </h3>
                            <div className="space-y-4">
                              {/* Short term completion rate */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-sm font-medium flex items-center">
                                    <span className="h-3 w-3 rounded-full bg-amber-500 mr-2"></span>
                                    Short Term Goals
                                  </p>
                                  <p className="text-sm font-medium">
                                    {tasks?.filter(t => goals?.find(g => g.id === t.goalId)?.type === "short" && t.isCompleted).length || 0} / {tasks?.filter(t => goals?.find(g => g.id === t.goalId)?.type === "short").length || 0}
                                  </p>
                                </div>
                                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                                  <div 
                                    style={{ 
                                      width: `${tasks && tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "short").length > 0 
                                        ? (tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "short" && t.isCompleted).length / 
                                          tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "short").length) * 100 
                                        : 0}%`
                                    }} 
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Database rate: {stats?.shortTermCompletionRate || 0}%</p>
                              </div>
                              
                              {/* Medium term completion rate */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-sm font-medium flex items-center">
                                    <span className="h-3 w-3 rounded-full bg-blue-500 mr-2"></span>
                                    Medium Term Goals
                                  </p>
                                  <p className="text-sm font-medium">
                                    {tasks?.filter(t => goals?.find(g => g.id === t.goalId)?.type === "medium" && t.isCompleted).length || 0} / {tasks?.filter(t => goals?.find(g => g.id === t.goalId)?.type === "medium").length || 0}
                                  </p>
                                </div>
                                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                                  <div 
                                    style={{ 
                                      width: `${tasks && tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "medium").length > 0 
                                        ? (tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "medium" && t.isCompleted).length / 
                                          tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "medium").length) * 100 
                                        : 0}%`
                                    }} 
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Database rate: {stats?.mediumTermCompletionRate || 0}%</p>
                              </div>
                              
                              {/* Long term completion rate */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-sm font-medium flex items-center">
                                    <span className="h-3 w-3 rounded-full bg-purple-500 mr-2"></span>
                                    Long Term Goals
                                  </p>
                                  <p className="text-sm font-medium">
                                    {tasks?.filter(t => goals?.find(g => g.id === t.goalId)?.type === "long" && t.isCompleted).length || 0} / {tasks?.filter(t => goals?.find(g => g.id === t.goalId)?.type === "long").length || 0}
                                  </p>
                                </div>
                                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                                  <div 
                                    style={{ 
                                      width: `${tasks && tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "long").length > 0 
                                        ? (tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "long" && t.isCompleted).length / 
                                          tasks.filter(t => goals?.find(g => g.id === t.goalId)?.type === "long").length) * 100 
                                        : 0}%`
                                    }} 
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Database rate: {stats?.longTermCompletionRate || 0}%</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                              Productive Patterns
                            </h3>
                            <div className="space-y-4">
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Most Productive Month</h4>
                                <div className="flex items-center justify-between">
                                  <p className="text-lg font-semibold">May</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Based on total task completions</p>
                                </div>
                              </div>
                              
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Task Completion Record</h4>
                                <div className="flex items-center justify-between">
                                  <p className="text-lg font-semibold">{stats?.mostTasksCompletedInDay || 0} tasks</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {stats?.mostTasksCompletedDate 
                                      ? format(new Date(stats.mostTasksCompletedDate), 'MMM d, yyyy') 
                                      : "No date recorded"}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Average Daily Tasks</h4>
                                <div className="flex items-center justify-between">
                                  <p className="text-lg font-semibold">{stats?.avgTasksPerDay || 0} tasks</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">On days with activity</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {activeStatsView === "interesting" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Longest Goal Age</h3>
                              <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{stats?.longestGoalAge || 0} days</p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Age of your oldest active goal
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Longest Break</h3>
                              <Coffee className="h-5 w-5 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{stats?.longestBreakBetweenCompletions || 0} days</p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Longest stretch without completing tasks
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Total Task Volume</h3>
                              <FileText className="h-5 w-5 text-purple-600" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{tasks?.length || 0}</p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Total number of tasks created
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Goal to Task Ratio</h3>
                              <BarChart2 className="h-5 w-5 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold mt-2">
                              {goals && goals.length > 0 && tasks 
                                ? (tasks.length / goals.length).toFixed(1) 
                                : 0}
                            </p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Average number of tasks per goal
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <CalendarCheck className="h-5 w-5 mr-2 text-primary" />
                              Task Distribution
                            </h3>
                            <div className="space-y-4">
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-3">Tasks by Time of Day</h4>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded">
                                    <p className="text-xs text-amber-800 dark:text-amber-300">Morning</p>
                                    <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                                      {tasks?.filter(t => 
                                        t.timeOfDay === "morning" || 
                                        (!t.timeOfDay && (() => {
                                          const hours = new Date(t.scheduledDate).getHours();
                                          return hours >= 5 && hours < 12;
                                        })())
                                      ).length || 0}
                                    </p>
                                  </div>
                                  <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                                    <p className="text-xs text-blue-800 dark:text-blue-300">Afternoon</p>
                                    <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                                      {tasks?.filter(t => 
                                        t.timeOfDay === "afternoon" || 
                                        (!t.timeOfDay && (() => {
                                          const hours = new Date(t.scheduledDate).getHours();
                                          return hours >= 12 && hours < 17;
                                        })())
                                      ).length || 0}
                                    </p>
                                  </div>
                                  <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded">
                                    <p className="text-xs text-purple-800 dark:text-purple-300">Evening</p>
                                    <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                                      {tasks?.filter(t => 
                                        t.timeOfDay === "evening" || 
                                        (!t.timeOfDay && (() => {
                                          const hours = new Date(t.scheduledDate).getHours();
                                          return hours >= 17 || hours < 5;
                                        })())
                                      ).length || 0}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-3">Completion By Weekday</h4>
                                <div className="space-y-2">
                                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => {
                                    const dayTasks = tasks?.filter(t => new Date(t.scheduledDate).getDay() === i) || [];
                                    const completedDayTasks = dayTasks.filter(t => t.isCompleted).length;
                                    const percentage = dayTasks.length > 0 ? (completedDayTasks / dayTasks.length) * 100 : 0;
                                    
                                    return (
                                      <div key={day} className="flex items-center space-x-2">
                                        <p className="text-xs w-20">{day}</p>
                                        <div className="flex-1 overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-600">
                                          <div 
                                            style={{ width: `${percentage}%` }} 
                                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                                          ></div>
                                        </div>
                                        <p className="text-xs w-10 text-right">{Math.round(percentage)}%</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <Zap className="h-5 w-5 mr-2 text-primary" />
                              Productivity Insights
                            </h3>
                            <div className="space-y-4">
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Recurring vs One-Time Tasks</h4>
                                <div className="flex items-center mt-3">
                                  <div className="w-1/2">
                                    <div className="flex items-center">
                                      <span className="h-3 w-3 rounded-full bg-blue-500 mr-2"></span>
                                      <span className="text-xs">One-time</span>
                                    </div>
                                    <p className="text-lg font-semibold mt-1">
                                      {tasks ? calculateRecurringVsOneTime().oneTime : 0}
                                    </p>
                                  </div>
                                  <div className="w-1/2">
                                    <div className="flex items-center">
                                      <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                                      <span className="text-xs">Recurring</span>
                                    </div>
                                    <p className="text-lg font-semibold mt-1">
                                      {tasks ? calculateRecurringVsOneTime().recurring : 0}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Task Completion Timeline</h4>
                                <div className="space-y-2 mt-2">
                                  <div className="flex justify-between items-center text-xs">
                                    <span>Past Week</span>
                                    <span>
                                      {tasks?.filter(t => 
                                        t.isCompleted && 
                                        t.completedAt && 
                                        isAfter(new Date(t.completedAt), subDays(new Date(), 7))
                                      ).length || 0} tasks
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span>Past Month</span>
                                    <span>
                                      {tasks?.filter(t => 
                                        t.isCompleted && 
                                        t.completedAt && 
                                        isAfter(new Date(t.completedAt), subDays(new Date(), 30))
                                      ).length || 0} tasks
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span>All Time</span>
                                    <span>
                                      {tasks?.filter(t => t.isCompleted).length || 0} tasks
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Tasks Created Over Time</h4>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs">All-time average</span>
                                  <span className="text-lg font-semibold">
                                    {tasks && tasks.length > 0 
                                      ? (tasks.length / (differenceInDays(new Date(), new Date(tasks.reduce((min, t) => 
                                          new Date(t.createdAt) < min ? new Date(t.createdAt) : min, 
                                          new Date()
                                        ))) || 1)).toFixed(1)
                                      : 0} per day
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
