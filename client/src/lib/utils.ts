import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isThisWeek, startOfWeek, endOfWeek, addDays, addMonths, isBefore, compareDesc } from "date-fns";
import { Goal, Task } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM d, yyyy");
}

export function formatShortDate(date: Date | string) {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM d");
}

export function getGoalTypeClass(type: string, prefix: string = "bg") {
  return `${prefix}-goal-${type}`;
}

export function getTaskTypeClass(type: string) {
  return `bg-task-${type}`;
}

export function getTimeLeft(deadline: Date | string): string {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const today = new Date();
  
  // Calculate the difference in milliseconds
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return "Overdue";
  } else if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "1 day left";
  } else if (diffDays < 31) {
    return `${diffDays} days left`;
  } else if (diffDays < 60) {
    return "1 month left";
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} months left`;
  }
}

export function getCurrentWeekRange() {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = endOfWeek(today, { weekStartsOn: 1 });
  return {
    start,
    end,
    formatted: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
  };
}

export function getWeekDays(startDate: Date) {
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(startDate, i));
  }
  return weekDays;
}

export function isShortTermGoal(deadline: Date | string): boolean {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const thirtyOneDaysFromNow = addDays(new Date(), 31);
  return isBefore(deadlineDate, thirtyOneDaysFromNow);
}

export function isMediumTermGoal(deadline: Date | string): boolean {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const thirtyOneDaysFromNow = addDays(new Date(), 31);
  const fourMonthsFromNow = addMonths(new Date(), 4);
  return !isBefore(deadlineDate, thirtyOneDaysFromNow) && isBefore(deadlineDate, fourMonthsFromNow);
}

export function isLongTermGoal(deadline: Date | string): boolean {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const fourMonthsFromNow = addMonths(new Date(), 4);
  return !isBefore(deadlineDate, fourMonthsFromNow);
}

export function calculateGoalProgress(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  return Math.round((completedTasks / tasks.length) * 100);
}

export function sortGoalsByDeadline(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    return compareDesc(new Date(b.deadline), new Date(a.deadline));
  });
}

export function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter(task => {
    const taskDate = new Date(task.scheduledDate);
    return (
      taskDate.getDate() === date.getDate() &&
      taskDate.getMonth() === date.getMonth() &&
      taskDate.getFullYear() === date.getFullYear()
    );
  });
}

export function getWeekTasks(tasks: Task[]): Task[] {
  return tasks.filter(task => isThisWeek(new Date(task.scheduledDate), { weekStartsOn: 1 }));
}

export function countTasksByDay(tasks: Task[]): Record<string, number> {
  const counts: Record<string, number> = {};
  tasks.forEach(task => {
    const dateStr = format(new Date(task.scheduledDate), 'yyyy-MM-dd');
    counts[dateStr] = (counts[dateStr] || 0) + 1;
  });
  return counts;
}

export function countCompletedTasksByDay(tasks: Task[]): Record<string, number> {
  const counts: Record<string, number> = {};
  tasks.filter(t => t.isCompleted).forEach(task => {
    const dateStr = format(new Date(task.completedAt || task.scheduledDate), 'yyyy-MM-dd');
    counts[dateStr] = (counts[dateStr] || 0) + 1;
  });
  return counts;
}
