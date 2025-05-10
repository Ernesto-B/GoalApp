import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, addMonths } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InsertGoal, Goal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Create schema based on the InsertGoal type but with client-side validation
const goalFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["short", "medium", "long"]),
  deadline: z.date({
    required_error: "A deadline is required",
  }),
  isPublic: z.boolean().default(false),
  parentGoalId: z.number().nullable().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormProps {
  type?: "short" | "medium" | "long";
  onSuccess?: () => void;
}

export function GoalForm({ type = "short", onSuccess }: GoalFormProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  
  // Fetch existing goals for parent goal selection
  const { data: goals, isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Set default values based on goal type
  const getDefaultDeadline = () => {
    const today = new Date();
    if (type === "short") {
      return addDays(today, 14); // Default to 2 weeks for short term
    } else if (type === "medium") {
      return addMonths(today, 2); // Default to 2 months for medium term
    } else {
      return addMonths(today, 6); // Default to 6 months for long term
    }
  };
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type,
      deadline: getDefaultDeadline(),
      isPublic: false,
      parentGoalId: null
    },
  });
  
  const createGoalMutation = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const res = await apiRequest("POST", "/api/goals", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal created!",
        description: "Your new goal has been created successfully.",
      });
      onSuccess?.();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (values: GoalFormValues) => {
    await createGoalMutation.mutateAsync(values);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter goal title..." {...field} />
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
                <Textarea placeholder="What do you want to achieve?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Deadline</FormLabel>
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
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="parentGoalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Goal (Optional)</FormLabel>
              <Select
                value={field.value?.toString() || ""}
                onValueChange={(value) => field.onChange(value && value !== "null" ? parseInt(value) : null)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent goal (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">No parent goal</SelectItem>
                  {goals?.filter(g => !g.isCompleted && !g.isArchived).map((goal) => (
                    <SelectItem key={goal.id} value={goal.id.toString()}>
                      {goal.title} ({goal.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={createGoalMutation.isPending}
          >
            {createGoalMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Goal"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
