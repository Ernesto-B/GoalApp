import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, addWeeks, addMonths, isBefore, startOfDay, endOfDay } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Goal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, RepeatIcon, ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Extended task form schema with repeating options and time of day
const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  goalId: z.coerce.number({
    required_error: "Please select a goal",
    invalid_type_error: "Please select a goal",
  }).refine(val => val > 0, {
    message: "Please select a goal"
  }),
  scheduledDate: z.date({
    required_error: "Please select a date",
  }).refine(date => {
    // Ensure scheduled date is within the next 7 days
    const maxDate = addDays(new Date(), 7);
    return isBefore(date, maxDate);
  }, {
    message: "Task must be scheduled within the next 7 days",
  }),
  timeOfDay: z.enum(["not_set", "morning", "afternoon", "evening"]).default("not_set"),
  isRepeating: z.boolean().default(false),
  repeatType: z.enum(["none", "daily", "every_other_day", "weekly", "monthly"]).default("none"),
  repeatUntil: z.date().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  goalId?: number;
  preselectedDate?: Date;
  onSuccess?: () => void;
  task?: any; // Add task parameter for editing
}

export function TaskForm({ goalId, preselectedDate, onSuccess, task }: TaskFormProps) {
  const { toast } = useToast();
  const [showRepeatOptions, setShowRepeatOptions] = useState(task?.isRepeating || false);
  
  // Calculate max allowed date (7 days from today)
  const maxAllowedDate = addDays(new Date(), 7);
  
  // Fetch available goals
  const { data: goals, isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });
  
  // Only show active goals (not completed)
  const activeGoals = goals?.filter(goal => !goal.isCompleted) || [];
  
  // Set up default values, using task data if we're editing
  let defaultValues = {
    title: task?.title || "",
    description: task?.description || "",
    goalId: task?.goalId || goalId || 0,
    scheduledDate: task?.scheduledDate ? new Date(task.scheduledDate) : (preselectedDate || new Date()),
    timeOfDay: task?.timeOfDay || "not_set",
    isRepeating: task?.isRepeating || false,
    repeatType: task?.repeatType || "none",
    repeatUntil: task?.repeatUntil ? new Date(task.repeatUntil) : null,
  };
  
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });
  
  const watchIsRepeating = form.watch("isRepeating");
  const watchRepeatType = form.watch("repeatType");
  
  // Set default repeat until date based on repeat type
  const updateRepeatUntilDate = (repeatType: string) => {
    if (!watchIsRepeating) return;
    
    const today = new Date();
    let repeatUntil: Date;
    
    // First check if there's a goal deadline we can use
    if (selectedGoal && selectedGoal.deadline) {
      // Use goal deadline as default repeat until date
      repeatUntil = new Date(selectedGoal.deadline);
    } else {
      // Otherwise, set based on repeat type
      switch (repeatType) {
        case "daily":
          repeatUntil = addWeeks(today, 2); // 2 weeks for daily
          break;
        case "every_other_day":
          repeatUntil = addWeeks(today, 4); // 4 weeks for every other day
          break;
        case "weekly":
          repeatUntil = addMonths(today, 2); // 2 months for weekly
          break;
        case "monthly":
          repeatUntil = addMonths(today, 6); // 6 months for monthly
          break;
        default:
          repeatUntil = addWeeks(today, 2);
      }
    }
    
    form.setValue("repeatUntil", repeatUntil);
  };
  
  // Get the selected goal data
  const selectedGoalId = form.watch("goalId");
  const selectedGoal = activeGoals.find(goal => goal.id === selectedGoalId);
  
  // Update repeat until when repeat type changes
  const handleRepeatTypeChange = (value: string) => {
    form.setValue("repeatType", value as any);
    updateRepeatUntilDate(value);
  };
  
  // Toggle repeating status
  const handleRepeatToggle = (checked: boolean) => {
    form.setValue("isRepeating", checked);
    if (checked) {
      const currentRepeatType = form.getValues("repeatType");
      if (currentRepeatType === "none") {
        form.setValue("repeatType", "daily");
      }
      updateRepeatUntilDate(form.getValues("repeatType"));
    } else {
      form.setValue("repeatType", "none");
      form.setValue("repeatUntil", null);
    }
    setShowRepeatOptions(checked);
  };
  
  // Helper function to set time based on timeOfDay value
  const setTimeOfDay = (date: Date, timeOfDay: string): Date => {
    const newDate = new Date(date);
    
    switch(timeOfDay) {
      case "morning":
        newDate.setHours(9, 0, 0, 0); // 9:00 AM
        break;
      case "afternoon":
        newDate.setHours(14, 0, 0, 0); // 2:00 PM
        break;
      case "evening":
        newDate.setHours(19, 0, 0, 0); // 7:00 PM
        break;
      case "not_set":
      default:
        // Keep the date as is, just standardize the time
        newDate.setHours(12, 0, 0, 0); // 12:00 PM for "not set" 
    }
    
    return newDate;
  };

  const taskMutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      // Adjust the scheduled date based on time of day selection
      const adjustedDate = setTimeOfDay(values.scheduledDate, values.timeOfDay);
      
      const taskData = {
        ...values,
        scheduledDate: adjustedDate,
        // Only include repeat fields if isRepeating is true
        isRepeating: values.isRepeating,
        repeatType: values.isRepeating ? values.repeatType : "none",
        repeatUntil: values.isRepeating ? 
          (values.repeatUntil ? setTimeOfDay(values.repeatUntil, values.timeOfDay) : null) : null
      };
      
      // If we have an existing task, we're editing - use PATCH instead of POST
      if (task && task.id) {
        const res = await apiRequest("PATCH", `/api/tasks/${task.id}`, taskData);
        return res.json();
      } else {
        // Otherwise create a new task
        const res = await apiRequest("POST", "/api/tasks", taskData);
        return res.json();
      }
    },
    onSuccess: () => {
      // Force a complete refetch of tasks data to ensure we get the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${form.getValues().goalId}/tasks`] });
      
      // Refetch to ensure we have the latest data
      queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
      
      const isEditing = task && task.id;
      
      toast({
        title: isEditing ? "Task updated!" : "Task created!",
        description: isEditing
          ? "Your task has been updated successfully."
          : (watchIsRepeating 
              ? "Your repeating task has been created successfully." 
              : "Your task has been created successfully."),
      });
      
      onSuccess?.();
      form.reset();
      setShowRepeatOptions(false);
    },
    onError: (error: Error) => {
      const isEditing = task && task.id;
      toast({
        title: isEditing ? "Failed to update task" : "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (values: TaskFormValues) => {
    await taskMutation.mutateAsync(values);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter task title..." {...field} />
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
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Add details about this task..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="goalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Related Goal</FormLabel>
              <Select
                value={field.value.toString()}
                onValueChange={(value) => field.onChange(parseInt(value))}
                disabled={isLoadingGoals || goalId !== undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeGoals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id.toString()}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Scheduled Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        // Can't select dates before today or after 7 days from now
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // If there's a selected goal with a deadline, don't let tasks be scheduled after deadline
                        if (selectedGoal && selectedGoal.deadline) {
                          const deadlineDate = startOfDay(new Date(selectedGoal.deadline));
                          const maxDate = maxAllowedDate < deadlineDate ? maxAllowedDate : deadlineDate;
                          return date < today || date > maxDate;
                        }
                        
                        return date < today || date > maxAllowedDate;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription className="text-xs text-muted-foreground">
                  {selectedGoal && selectedGoal.deadline ? (
                    <>Tasks must be scheduled before the goal deadline ({format(new Date(selectedGoal.deadline), "MMM d, yyyy")}).</>
                  ) : (
                    <>Tasks can only be scheduled within the next 7 days.</>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="timeOfDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time of Day</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time of day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="not_set">Not set (No specific time)</SelectItem>
                    <SelectItem value="morning">Morning (Before 12 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                    <SelectItem value="evening">Evening (After 5 PM)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-muted-foreground flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" /> When do you plan to complete this task?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Repeating task toggle */}
        <FormField
          control={form.control}
          name="isRepeating"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Repeat Task</FormLabel>
                <FormDescription className="text-xs">
                  Make this a repeating task
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    handleRepeatToggle(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {/* Show repeat options if repeating is enabled */}
        {showRepeatOptions && (
          <>
            <FormField
              control={form.control}
              name="repeatType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeat Frequency</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleRepeatTypeChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="every_other_day">Every Other Day</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs flex items-center gap-1">
                    <RepeatIcon className="h-3 w-3" /> 
                    {watchRepeatType === "daily" && "This task will repeat every day"}
                    {watchRepeatType === "every_other_day" && "This task will repeat every second day"}
                    {watchRepeatType === "weekly" && "This task will repeat on the same day each week"}
                    {watchRepeatType === "monthly" && "This task will repeat on the same date each month"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="repeatUntil"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Repeat Until</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick an end date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          // Can't select dates before start date
                          const startDate = form.getValues("scheduledDate");
                          
                          // If there's a goal deadline, respect it
                          if (selectedGoal && selectedGoal.deadline) {
                            const deadlineDate = endOfDay(new Date(selectedGoal.deadline));
                            return date < startDate || date > deadlineDate;
                          }
                          
                          return date < startDate;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription className="text-xs flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" /> 
                    {selectedGoal && selectedGoal.deadline ? (
                      <>Task will repeat until this date (deadline: {format(new Date(selectedGoal.deadline), "MMM d, yyyy")})</>
                    ) : (
                      <>Task will repeat until this date</>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={taskMutation.isPending}
          >
            {taskMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {task && task.id ? "Updating..." : "Creating..."}
              </>
            ) : (
              task && task.id ? "Update Task" : "Create Task"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
