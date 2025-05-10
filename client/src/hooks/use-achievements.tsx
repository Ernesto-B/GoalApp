import { useQuery, useMutation } from "@tanstack/react-query";
import { Achievement } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useAchievements() {
  const { toast } = useToast();

  // Get all achievements
  const { 
    data: achievements, 
    isLoading, 
    error 
  } = useQuery<Achievement[]>({
    queryKey: ["/api/achievements"],
    staleTime: 60000, // 1 minute
  });

  // Get achievements by type
  const getAchievementsByType = (type: string) => {
    return useQuery<Achievement[]>({
      queryKey: ["/api/achievements", type],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/achievements/${type}`);
        return res.json();
      },
      staleTime: 60000, // 1 minute
    });
  };

  // Increment achievement progress
  const incrementProgressMutation = useMutation({
    mutationFn: async ({ achievementId, increment }: { achievementId: number, increment: number }) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/achievements/${achievementId}/progress`,
        { increment }
      );
      return res.json();
    },
    onSuccess: (updatedAchievement) => {
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      
      // If achievement was completed, show a toast
      if (updatedAchievement.isCompleted) {
        toast({
          title: "Achievement Unlocked! 🎉",
          description: `You've earned "${updatedAchievement.title}"`,
          variant: "default"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating achievement progress",
        description: error.message,
        variant: "destructive"
      });
    }
  });



  // Categorize achievements
  const categorizedAchievements = () => {
    if (!achievements) return null;
    
    return {
      streak: achievements.filter(a => a.type === "streak"),
      goalCompletion: achievements.filter(a => a.type === "goal_completion"),
      taskCompletion: achievements.filter(a => a.type === "task_completion"),
      consistency: achievements.filter(a => a.type === "consistency"),
      custom: achievements.filter(a => a.type === "custom"),
      completed: achievements.filter(a => a.isCompleted),
      inProgress: achievements.filter(a => !a.isCompleted),
    };
  };

  return {
    achievements,
    isLoading,
    error,
    getAchievementsByType,
    incrementProgressMutation,
    categorizedAchievements,
  };
}