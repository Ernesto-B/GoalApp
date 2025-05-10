import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "@db";
import { tasks, goals, userStats, userPreferences, goalTypeEnum, goalStats, achievements, milestoneTypeEnum } from "@shared/schema";
import { eq, and, desc, isNull, inArray, gte, lte, sql, ne } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Get all goals for the current user
  app.get("/api/goals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      // Filter out archived goals by default
      const userGoals = await db.query.goals.findMany({
        where: and(
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, false) // Only get non-archived goals
        ),
        orderBy: [desc(goals.createdAt)],
      });
      res.json(userGoals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  // Get archived goals for the user
  app.get("/api/goals/archived", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const archivedGoals = await db.query.goals.findMany({
        where: and(
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, true)
        ),
        orderBy: [desc(goals.archivedAt)],
      });

      res.json(archivedGoals);
    } catch (error) {
      console.error("Error fetching archived goals:", error);
      res.status(500).json({ message: "Failed to fetch archived goals" });
    }
  });

  // Get a specific goal
  app.get("/api/goals/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      res.json(goal);
    } catch (error) {
      console.error("Error fetching goal:", error);
      res.status(500).json({ message: "Failed to fetch goal" });
    }
  });
  
  // Get goal stats for a specific goal
  app.get("/api/goals/:id/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      // First verify that the goal belongs to the user
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // Get the goal stats
      let stats = await db.query.goalStats.findFirst({
        where: eq(goalStats.goalId, goalId),
      });
      
      // If no stats exist yet, create a default stats object
      if (!stats) {
        // Create default stats record
        const [newStats] = await db.insert(goalStats)
          .values({
            goalId: goalId,
            lastUpdated: new Date()
          })
          .returning();
          
        stats = newStats;
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching goal stats:", error);
      res.status(500).json({ message: "Failed to fetch goal stats" });
    }
  });

  // Create a new goal
  app.post("/api/goals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    // Validate goal type
    const goalTypeSchema = z.enum(["short", "medium", "long"]);
    const goalSchema = z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional().nullable(),
      type: goalTypeSchema,
      deadline: z.string().or(z.date()),
      isPublic: z.boolean().default(false),
    });

    try {
      const validatedData = goalSchema.parse(req.body);
      
      // Count user's active goals of this type (not completed, not archived)
      const goalsOfType = await db.query.goals.findMany({
        where: and(
          eq(goals.userId, req.user.id),
          eq(goals.type, validatedData.type),
          eq(goals.isCompleted, false),
          eq(goals.isArchived, false)
        ),
      });

      // Check if user has reached the maximum number of goals for this type
      const maxGoals = 3; // 3 goals per type (short, medium, long)
      if (goalsOfType.length >= maxGoals) {
        return res.status(400).json({
          message: `You can only have a maximum of ${maxGoals} active ${validatedData.type}-term goals`
        });
      }

      // Create the new goal
      const [newGoal] = await db.insert(goals).values({
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        userId: req.user.id,
        deadline: new Date(validatedData.deadline),
        isPublic: validatedData.isPublic,
      }).returning();

      res.status(201).json(newGoal);
    } catch (error) {
      console.error("Error creating goal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  // Update a goal
  app.patch("/api/goals/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    // Validate update data
    const updateSchema = z.object({
      title: z.string().min(1, "Title is required").optional(),
      description: z.string().optional().nullable(),
      deadline: z.string().optional(),
    });

    try {
      const validatedData = updateSchema.parse(req.body);
      
      // Check if goal exists and belongs to the user
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      if (goal.isCompleted) {
        return res.status(400).json({ message: "Completed goals cannot be edited" });
      }

      if (goal.isArchived) {
        return res.status(400).json({ message: "Archived goals cannot be edited" });
      }

      // Prepare update data
      const updateData: Record<string, any> = {};
      if (validatedData.title) updateData.title = validatedData.title;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.deadline) updateData.deadline = new Date(validatedData.deadline);

      // Update the goal
      const [updatedGoal] = await db.update(goals)
        .set(updateData)
        .where(eq(goals.id, goalId))
        .returning();

      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating goal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  // Mark a goal as completed
  app.patch("/api/goals/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Update the goal
      const [updatedGoal] = await db.update(goals)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          reflection: req.body.reflection,
        })
        .where(eq(goals.id, goalId))
        .returning();

      // Update user stats
      const userStat = await db.query.userStats.findFirst({
        where: eq(userStats.userId, req.user.id),
      });

      if (userStat) {
        await db.update(userStats)
          .set({
            goalsCompleted: userStat.goalsCompleted + 1,
            lastUpdated: new Date(),
          })
          .where(eq(userStats.userId, req.user.id));
      }
      
      // Update goal completion achievements
      try {
        console.log(`Starting achievement updates for user ${req.user.id} after completing goal ${goalId}`);
        
        // Get all goal completion achievements for the user
        const goalAchievements = await db.query.achievements.findMany({
          where: and(
            eq(achievements.userId, req.user.id),
            eq(achievements.type, "goal_completion")
          ),
        });
        
        console.log(`Found ${goalAchievements.length} goal achievement(s) to update`);
        
        if (goalAchievements.length > 0) {
          // Update each relevant achievement
          for (const achievement of goalAchievements) {
            // Skip if already completed
            if (achievement.isCompleted) continue;
            
            // Increment the current value
            const newCurrentValue = achievement.currentValue + 1;
            
            // Check if the achievement should be completed
            const isCompleted = newCurrentValue >= achievement.thresholdValue;
            
            // Update the achievement
            await db.update(achievements)
              .set({
                currentValue: newCurrentValue,
                isCompleted: isCompleted,
                completedAt: isCompleted ? new Date() : achievement.completedAt,
              })
              .where(eq(achievements.id, achievement.id));
            
            console.log(`Updated goal achievement: ${achievement.title}, new value: ${newCurrentValue}, completed: ${isCompleted}`);
          }
        }
      } catch (error) {
        console.error("Error updating goal achievements:", error);
        // Don't fail the whole request if achievements update fails
      }

      res.json(updatedGoal);
    } catch (error) {
      console.error("Error completing goal:", error);
      res.status(500).json({ message: "Failed to complete goal" });
    }
  });

  // Archive a goal
  app.patch("/api/goals/:id/archive", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Update the goal
      const [updatedGoal] = await db.update(goals)
        .set({
          isArchived: true,
          archivedAt: new Date(),
        })
        .where(eq(goals.id, goalId))
        .returning();

      res.json(updatedGoal);
    } catch (error) {
      console.error("Error archiving goal:", error);
      res.status(500).json({ message: "Failed to archive goal" });
    }
  });

  // Unarchive a goal
  app.patch("/api/goals/:id/unarchive", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, true)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Archived goal not found" });
      }

      // Update the goal
      const [updatedGoal] = await db.update(goals)
        .set({
          isArchived: false,
          archivedAt: null,
        })
        .where(eq(goals.id, goalId))
        .returning();

      res.json(updatedGoal);
    } catch (error) {
      console.error("Error unarchiving goal:", error);
      res.status(500).json({ message: "Failed to unarchive goal" });
    }
  });
  
  // Delete a goal and all its tasks
  app.delete("/api/goals/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // First delete all tasks associated with this goal
      await db.delete(tasks)
        .where(eq(tasks.goalId, goalId));
      
      // Then delete the goal itself
      await db.delete(goals)
        .where(eq(goals.id, goalId));

      res.status(200).json({ message: "Goal and associated tasks deleted successfully" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Toggle goal public/private status
  app.patch("/api/goals/:id/toggle-public", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Toggle the public status
      const [updatedGoal] = await db.update(goals)
        .set({
          isPublic: !goal.isPublic,
        })
        .where(eq(goals.id, goalId))
        .returning();

      // If the goal is newly public and completed, update user stats
      if (updatedGoal.isPublic && !goal.isPublic && updatedGoal.isCompleted) {
        const userStat = await db.query.userStats.findFirst({
          where: eq(userStats.userId, req.user.id),
        });

        if (userStat) {
          await db.update(userStats)
            .set({
              goalsShared: userStat.goalsShared + 1,
              lastUpdated: new Date(),
            })
            .where(eq(userStats.userId, req.user.id));
        }
      }

      res.json(updatedGoal);
    } catch (error) {
      console.error("Error toggling goal public status:", error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  // Get tasks for a specific goal
  app.get("/api/goals/:id/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const goalId = parseInt(req.params.id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    try {
      // First verify that the goal belongs to the user
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Get tasks for the goal
      const goalTasks = await db.query.tasks.findMany({
        where: eq(tasks.goalId, goalId),
        orderBy: [desc(tasks.scheduledDate)],
      });

      res.json(goalTasks);
    } catch (error) {
      console.error("Error fetching tasks for goal:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get all tasks for the current user
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      // Get all non-archived goals for the user
      const userGoals = await db.query.goals.findMany({
        where: and(
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, false) // Only get tasks for non-archived goals
        ),
      });

      const goalIds = userGoals.map(g => g.id);

      if (goalIds.length === 0) {
        return res.json([]);
      }

      // Get all tasks for these goals
      const userTasks = await db.query.tasks.findMany({
        where: inArray(tasks.goalId, goalIds),
        orderBy: [desc(tasks.scheduledDate)],
      });

      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create a new task
  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const taskSchema = z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional().nullable(),
      goalId: z.number({
        required_error: "Goal ID is required",
        invalid_type_error: "Goal ID must be a number"
      }),
      scheduledDate: z.string().or(z.date()),
      // Repeating task fields
      isRepeating: z.boolean().default(false),
      repeatType: z.enum(["none", "daily", "every_other_day", "weekly", "monthly"]).default("none"),
      repeatUntil: z.string().or(z.date()).nullable().optional(),
    });

    try {
      const validatedData = taskSchema.parse(req.body);
      
      // Verify that the goal exists, belongs to the user, and is not archived
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, validatedData.goalId),
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, false)
        ),
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found or is archived" });
      }

      // Check if the user has reached the maximum number of tasks for this day and goal
      const scheduledDate = new Date(validatedData.scheduledDate);
      const startOfDay = new Date(scheduledDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(scheduledDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Simply get all tasks for this goal
      const allTasksForGoal = await db.query.tasks.findMany({
        where: eq(tasks.goalId, validatedData.goalId),
      });
      
      // Filter tasks for this day using JavaScript
      const tasksForDay = allTasksForGoal.filter(task => {
        const taskDate = new Date(task.scheduledDate);
        return taskDate >= startOfDay && taskDate <= endOfDay;
      });

      // Check if user has reached the maximum number of tasks per day per goal
      const maxTasksPerDayPerGoal = 5;
      if (tasksForDay.length >= maxTasksPerDayPerGoal) {
        return res.status(400).json({
          message: `You can only have a maximum of ${maxTasksPerDayPerGoal} tasks per day per goal`
        });
      }

      // Handle repeating tasks
      if (validatedData.isRepeating && validatedData.repeatUntil) {
        const isRepeating = validatedData.isRepeating;
        const repeatType = validatedData.repeatType;
        const repeatUntil = new Date(validatedData.repeatUntil);
        
        // Create the parent task first
        const [parentTask] = await db.insert(tasks).values({
          title: validatedData.title,
          description: validatedData.description,
          goalId: validatedData.goalId,
          scheduledDate: new Date(validatedData.scheduledDate),
          isRepeating,
          repeatType,
          repeatUntil,
        }).returning();
        
        // Generate the repeating task instances
        let nextDate = new Date(scheduledDate);
        const taskInstances = [];
        
        // Calculate next date based on repeat type
        const getNextDate = (currentDate: Date, type: string): Date => {
          const nextDate = new Date(currentDate);
          switch (type) {
            case "daily":
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case "every_other_day":
              nextDate.setDate(nextDate.getDate() + 2);
              break;
            case "weekly":
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case "monthly":
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            default:
              nextDate.setDate(nextDate.getDate() + 1);
          }
          return nextDate;
        };
        
        // Generate tasks until repeatUntil date
        while (true) {
          nextDate = getNextDate(nextDate, repeatType);
          
          // Stop if we've reached the end date
          if (nextDate > repeatUntil) {
            break;
          }
          
          // Create instance data
          taskInstances.push({
            title: validatedData.title,
            description: validatedData.description,
            goalId: validatedData.goalId,
            scheduledDate: new Date(nextDate),
            isRepeating: false, // Child instances aren't themselves repeating
            repeatType: "none" as const, // Using as const to specify the enum value
            parentTaskId: parentTask.id, // Reference to parent task
          });
        }
        
        // Insert all task instances if there are any
        if (taskInstances.length > 0) {
          await db.insert(tasks).values(taskInstances);
        }
        
        res.status(201).json(parentTask);
      } else {
        // Create a regular non-repeating task
        const [newTask] = await db.insert(tasks).values({
          title: validatedData.title,
          description: validatedData.description,
          goalId: validatedData.goalId,
          scheduledDate: new Date(validatedData.scheduledDate),
          isRepeating: false,
          repeatType: "none" as const, // Using as const to specify the enum value
        }).returning();

        res.status(201).json(newTask);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Mark a task as completed
  app.patch("/api/tasks/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify that the task belongs to a goal owned by the user and is not archived
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, task.goalId),
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, false)
        ),
      });

      if (!goal) {
        return res.status(403).json({ message: "You don't have permission to update this task or the goal is archived" });
      }

      // Get time of day from request body or default to not_set
      const timeOfDay = req.body.timeOfDay || task.timeOfDay || "not_set";
      
      // Determine if the task is being completed on time
      const now = new Date();
      const scheduledDate = new Date(task.scheduledDate);
      const completedOnTime = now <= scheduledDate;
      
      // Mark the task as completed
      const [updatedTask] = await db.update(tasks)
        .set({
          isCompleted: true,
          completedAt: now,
          timeOfDay: timeOfDay,
          completedOnTime: completedOnTime
        })
        .where(eq(tasks.id, taskId))
        .returning();

      // Helper functions for date calculations
      const getTodayISODate = (): string => {
        return new Date().toISOString().split('T')[0];
      };
      
      const getDateISOString = (date: Date): string => {
        return date.toISOString().split('T')[0];
      };
      
      // Get today's date in YYYY-MM-DD format
      const todayISODate = getTodayISODate();
      
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISODate = getDateISOString(yesterday);
      
      // Update user stats
      const userStat = await db.query.userStats.findFirst({
        where: eq(userStats.userId, req.user.id),
      });

      if (userStat) {
        // Update tasks completed count
        let tasksCompleted = userStat.tasksCompleted + 1;
        
        // Calculate the current streak correctly based on task completions
        // Get all tasks completed by this user, sorted by date
        const allCompletedTasks = await db.query.tasks.findMany({
          where: and(
            eq(tasks.isCompleted, true),
            sql`${tasks.goalId} IN (SELECT id FROM goals WHERE user_id = ${req.user.id})`
          ),
          orderBy: desc(tasks.completedAt),
        }) || [];
        
        // Group tasks by completion date (YYYY-MM-DD)
        const completionByDate: Record<string, boolean> = {};
        
        allCompletedTasks.forEach(task => {
          if (task.completedAt) {
            const dateKey = getDateISOString(new Date(task.completedAt));
            completionByDate[dateKey] = true;
          }
        });
        
        // Calculate streak by checking consecutive days with completions
        let currentStreak = 0;
        let checkDate = new Date(); // Start from today
        
        // Check today first - if there's no completion today, the streak may be from yesterday
        const todayKey = getDateISOString(checkDate);
        if (completionByDate[todayKey]) {
          currentStreak = 1;
        }
        
        // Check previous days
        let dayToCheck = new Date();
        let consecutiveDays = currentStreak > 0;
        
        // We'll check up to 100 days back to be safe
        for (let i = 1; i < 100; i++) {
          dayToCheck.setDate(dayToCheck.getDate() - 1);
          const dateKey = getDateISOString(dayToCheck);
          
          // If this day has a completion, add to streak
          if (completionByDate[dateKey]) {
            if (consecutiveDays || currentStreak === 0) {
              currentStreak++;
              consecutiveDays = true;
            }
          } else {
            // Break if we find a day with no completions
            if (currentStreak > 0) {
              break;
            }
          }
        }
        
        // Update longest streak if current streak is longer
        const longestStreak = Math.max(userStat.longestStreak, currentStreak);
        
        await db.update(userStats)
          .set({
            tasksCompleted,
            currentStreak,
            longestStreak,
            lastUpdated: new Date(),
          })
          .where(eq(userStats.userId, req.user.id));
      }
      
      // Update the goal's streak information
      // First get the latest task completion for this goal (excluding current task)
      const lastCompletedTask = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.goalId, goal.id),
          eq(tasks.isCompleted, true),
          sql`${tasks.id} != ${taskId}` // Exclude the current task
        ),
        orderBy: desc(tasks.completedAt),
      });
      
      // Calculate goal streak
      let goalStreak = 1; // Start with 1 for this completion
      
      if (lastCompletedTask && lastCompletedTask.completedAt) {
        const lastCompletionDate = getDateISOString(new Date(lastCompletedTask.completedAt));
        
        // If the last completion was yesterday, increment the streak
        if (lastCompletionDate === yesterdayISODate) {
          goalStreak = (goal.currentStreak || 0) + 1;
        } 
        // If the last completion was today, keep the streak the same
        else if (lastCompletionDate === todayISODate) {
          goalStreak = goal.currentStreak || 1;
        }
        // Otherwise, this is a new streak
      }
      
      // Update the goal with streak information
      const longestGoalStreak = Math.max(goal.longestStreak || 0, goalStreak);
      
      await db.update(goals)
        .set({
          currentStreak: goalStreak,
          longestStreak: longestGoalStreak,
          lastUpdated: new Date(),
        })
        .where(eq(goals.id, goal.id));
        
      // Update goal stats
      const goalStat = await db.query.goalStats.findFirst({
        where: eq(goalStats.goalId, goal.id)
      });
      
      if (goalStat) {
        // Increment the appropriate time of day counter
        let tasksCompletedMorning = goalStat.tasksCompletedMorning;
        let tasksCompletedAfternoon = goalStat.tasksCompletedAfternoon;
        let tasksCompletedEvening = goalStat.tasksCompletedEvening;
        let tasksCompletedNotSet = goalStat.tasksCompletedNotSet;
        
        // Update task time period counters
        switch (timeOfDay) {
          case "morning":
            tasksCompletedMorning += 1;
            break;
          case "afternoon":
            tasksCompletedAfternoon += 1;
            break;
          case "evening":
            tasksCompletedEvening += 1;
            break;
          default:
            tasksCompletedNotSet += 1;
            break;
        }
        
        // Update task timeliness counters
        let tasksCompletedOnTime = goalStat.tasksCompletedOnTime;
        let tasksCompletedLate = goalStat.tasksCompletedLate;
        
        if (completedOnTime) {
          tasksCompletedOnTime += 1;
        } else {
          tasksCompletedLate += 1;
        }
        
        // Update recurring task counters
        let recurringTasksCompleted = goalStat.recurringTasksCompleted;
        let nonRecurringTasksCompleted = goalStat.nonRecurringTasksCompleted;
        
        if (task.isRepeating) {
          recurringTasksCompleted += 1;
        } else {
          nonRecurringTasksCompleted += 1;
        }
        
        // Update the goal stats
        await db.update(goalStats)
          .set({
            tasksCompletedMorning,
            tasksCompletedAfternoon,
            tasksCompletedEvening,
            tasksCompletedNotSet,
            tasksCompletedOnTime,
            tasksCompletedLate,
            recurringTasksCompleted,
            nonRecurringTasksCompleted,
            lastUpdated: new Date()
          })
          .where(eq(goalStats.goalId, goal.id));
      } else {
        // Create a new goal stats entry if it doesn't exist
        await db.insert(goalStats).values({
          goalId: goal.id,
          tasksCompletedMorning: timeOfDay === "morning" ? 1 : 0,
          tasksCompletedAfternoon: timeOfDay === "afternoon" ? 1 : 0,
          tasksCompletedEvening: timeOfDay === "evening" ? 1 : 0,
          tasksCompletedNotSet: (timeOfDay === "not_set" || !timeOfDay) ? 1 : 0,
          tasksCompletedOnTime: completedOnTime ? 1 : 0,
          tasksCompletedLate: completedOnTime ? 0 : 1,
          recurringTasksCompleted: task.isRepeating ? 1 : 0,
          nonRecurringTasksCompleted: task.isRepeating ? 0 : 1,
          lastUpdated: new Date()
        });
      }
      
      // Update achievements
      try {
        console.log(`Starting achievement updates for user ${req.user.id} after completing task ${taskId}`);
        
        // Update task completion achievements
        const taskAchievements = await db.query.achievements.findMany({
          where: and(
            eq(achievements.userId, req.user.id),
            eq(achievements.type, "task_completion")
          ),
        });
        
        console.log(`Found ${taskAchievements.length} task achievement(s) to update`);
        
        // Update on-time completion flag for Perfect Planner achievement analysis
        let wasCompletedOnTime = false;
        if (now <= scheduledDate) {
          wasCompletedOnTime = true;
          console.log(`Task completed on time. Scheduled: ${scheduledDate.toISOString()}, Completed: ${now.toISOString()}`);
        }
        
        if (taskAchievements.length > 0) {
          // Update each relevant achievement
          for (const achievement of taskAchievements) {
            // Skip if already completed
            if (achievement.isCompleted) continue;
            
            // Increment the current value
            const newCurrentValue = achievement.currentValue + 1;
            
            // Check if the achievement should be completed
            const isCompleted = newCurrentValue >= achievement.thresholdValue;
            
            // Update the achievement
            await db.update(achievements)
              .set({
                currentValue: newCurrentValue,
                isCompleted: isCompleted,
                completedAt: isCompleted ? new Date() : achievement.completedAt,
              })
              .where(eq(achievements.id, achievement.id));
            
            console.log(`Updated task achievement: ${achievement.title}, new value: ${newCurrentValue}, completed: ${isCompleted}`);
          }
        }
        
        // Update streak achievements if current streak is notable
        if (userStat && userStat.currentStreak >= 3) {
          console.log(`Checking streak achievements for user ${req.user.id} with current streak: ${userStat.currentStreak}`);
          
          const streakAchievements = await db.query.achievements.findMany({
            where: and(
              eq(achievements.userId, req.user.id),
              eq(achievements.type, "streak")
            ),
          });
          
          console.log(`Found ${streakAchievements.length} streak achievement(s) to check`);
          
          if (streakAchievements.length > 0) {
            // Update each relevant achievement
            for (const achievement of streakAchievements) {
              // Skip if already completed
              if (achievement.isCompleted) continue;
              
              // Set current value to current streak if higher
              if (userStat.currentStreak > achievement.currentValue) {
                // Check if the achievement should be completed
                const isCompleted = userStat.currentStreak >= achievement.thresholdValue;
                
                // Update the achievement
                await db.update(achievements)
                  .set({
                    currentValue: userStat.currentStreak,
                    isCompleted: isCompleted,
                    completedAt: isCompleted ? new Date() : achievement.completedAt,
                  })
                  .where(eq(achievements.id, achievement.id));
                
                console.log(`Updated streak achievement: ${achievement.title}, new value: ${userStat.currentStreak}, completed: ${isCompleted}`);
              }
            }
          }
        }
        
        // Update consistency achievements based on time of day
        if (timeOfDay && timeOfDay !== "not_set") {
          console.log(`Checking consistency achievements for time of day: ${timeOfDay}`);
          
          const consistencyAchievements = await db.query.achievements.findMany({
            where: and(
              eq(achievements.userId, req.user.id),
              eq(achievements.type, "consistency")
            ),
          });
          
          console.log(`Found ${consistencyAchievements.length} consistency achievement(s) to check`);
          console.log(`Achievements found: ${JSON.stringify(consistencyAchievements.map(a => a.title))}`);
          console.log(`wasCompletedOnTime: ${wasCompletedOnTime}`);
          
          if (consistencyAchievements.length > 0) {
            // Update each relevant achievement
            for (const achievement of consistencyAchievements) {
              // Skip if already completed
              if (achievement.isCompleted) continue;
              
              // Check if this is a morning or evening achievement
              let shouldUpdate = false;
              
              console.log(`Checking achievement: ${achievement.title}, type: ${achievement.type}, time: ${timeOfDay}, onTime: ${wasCompletedOnTime}`);
              
              if ((achievement.title.includes("Early Riser") || achievement.title.toLowerCase().includes("morning")) && timeOfDay === "morning") {
                shouldUpdate = true;
                console.log(`Updating Early Riser achievement: Morning task`);
              } else if ((achievement.title.includes("Night Owl") || achievement.title.toLowerCase().includes("evening")) && timeOfDay === "evening") {
                shouldUpdate = true;
                console.log(`Updating Night Owl achievement: Evening task`);
              } else if (achievement.title.includes("Perfect Planner") && wasCompletedOnTime) {
                shouldUpdate = true;
                console.log(`Updating Perfect Planner achievement: Task completed on time`);
              }
              
              if (shouldUpdate) {
                // Increment the current value
                const newCurrentValue = achievement.currentValue + 1;
                
                // Check if the achievement should be completed
                const isCompleted = newCurrentValue >= achievement.thresholdValue;
                
                // Update the achievement
                await db.update(achievements)
                  .set({
                    currentValue: newCurrentValue,
                    isCompleted: isCompleted,
                    completedAt: isCompleted ? new Date() : achievement.completedAt,
                  })
                  .where(eq(achievements.id, achievement.id));
                
                console.log(`Updated consistency achievement: ${achievement.title}, new value: ${newCurrentValue}, completed: ${isCompleted}`);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error updating achievements:", error);
        // Don't fail the whole request if achievements update fails
      }
      
      // Recalculate user stats to ensure they're up-to-date with current task completion
      try {
        await recalculateUserStats(req.user.id);
        console.log(`Successfully recalculated stats for user ${req.user.id} after task completion`);
      } catch (statsError) {
        console.error(`Error recalculating user stats for user ${req.user.id} after completing task:`, statsError);
        // Don't fail the whole request if stats recalculation fails
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });
  
  // Endpoint to undo task completion
  app.patch("/api/tasks/:id/uncomplete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify that the task belongs to a goal owned by the user and is not archived
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, task.goalId),
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, false)
        ),
      });

      if (!goal) {
        return res.status(403).json({ message: "You don't have permission to update this task or the goal is archived" });
      }

      // Make sure task is actually completed before trying to uncomplete it
      if (!task.isCompleted) {
        return res.status(400).json({ message: "Task is not completed" });
      }

      // Mark the task as not completed
      const [updatedTask] = await db.update(tasks)
        .set({
          isCompleted: false,
          completedAt: null,
          timeOfDay: "not_set", // Reset time of day when uncompleting
        })
        .where(eq(tasks.id, taskId))
        .returning();

      // Update user stats
      const userStat = await db.query.userStats.findFirst({
        where: eq(userStats.userId, req.user.id),
      });

      if (userStat && userStat.tasksCompleted > 0) {
        // Decrement tasks completed count
        let tasksCompleted = userStat.tasksCompleted - 1;
        
        // Note: We don't modify the user streak here as it would be complex to recalculate
        // Ideally, we would need to check if there are other completed tasks today
        // For simplicity, we keep the user streak intact
        
        await db.update(userStats)
          .set({
            tasksCompleted,
            lastUpdated: new Date(),
          })
          .where(eq(userStats.userId, req.user.id));
      }
      
      // Recalculate the goal streak by finding the most recent completed task
      const recentCompletedTasks = await db.query.tasks.findMany({
        where: and(
          eq(tasks.goalId, goal.id),
          eq(tasks.isCompleted, true)
        ),
        orderBy: desc(tasks.completedAt),
        limit: 2 // Get the two most recent for comparison
      });
      
      // Helper functions for date calculation
      const getDateISOString = (date: Date): string => {
        return date.toISOString().split('T')[0];
      };
      
      // Update goal streak information
      let newGoalStreak = 0;
      
      if (recentCompletedTasks.length > 0 && recentCompletedTasks[0].completedAt) {
        // There's at least one completed task left
        newGoalStreak = 1;
        
        // If there are at least 2 completed tasks, check if they form a streak
        if (recentCompletedTasks.length > 1 && recentCompletedTasks[1].completedAt) {
          const mostRecentDate = getDateISOString(new Date(recentCompletedTasks[0].completedAt));
          const secondMostRecentDate = getDateISOString(new Date(recentCompletedTasks[1].completedAt));
          
          // Calculate date difference
          const date1 = new Date(mostRecentDate);
          const date2 = new Date(secondMostRecentDate);
          const diffTime = Math.abs(date1.getTime() - date2.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          // If they're consecutive days
          if (diffDays === 1) {
            newGoalStreak = 2;
          }
        }
      }
      
      // Update the goal streak (don't update longestStreak - that remains as the historical best)
      await db.update(goals)
        .set({
          currentStreak: newGoalStreak,
          lastUpdated: new Date(),
        })
        .where(eq(goals.id, goal.id));
        
      // Recalculate user stats to ensure they're up-to-date after uncompleting a task
      try {
        await recalculateUserStats(req.user.id);
        console.log(`Successfully recalculated stats for user ${req.user.id} after task uncomplete`);
      } catch (statsError) {
        console.error(`Error recalculating user stats for user ${req.user.id} after uncompleting task:`, statsError);
        // Don't fail the whole request if stats recalculation fails
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error uncompleting task:", error);
      res.status(500).json({ message: "Failed to uncomplete task" });
    }
  });
  
  // Update task's scheduled date
  app.patch("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      // Validate the request body
      if (!req.body.scheduledDate) {
        return res.status(400).json({ message: "scheduledDate is required" });
      }
      
      // Parse the date
      const scheduledDate = new Date(req.body.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      // Get the task to verify ownership
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify that the task belongs to a goal owned by the user and is not archived
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, task.goalId),
          eq(goals.userId, req.user.id),
          eq(goals.isArchived, false)
        ),
      });

      if (!goal) {
        return res.status(403).json({ message: "You do not have permission to modify this task" });
      }
      
      // Don't allow updating recurring child tasks
      if (task.parentTaskId) {
        return res.status(400).json({ 
          message: "Cannot reschedule a task from a recurring series" 
        });
      }

      console.log(`Updating task #${taskId} scheduled date:`, {
        oldDate: task.scheduledDate,
        newDate: scheduledDate
      });

      // Update the task with all provided fields
      const updateData: any = {
        scheduledDate
      };
      
      // Add any other fields that were provided in the request
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.isCompleted !== undefined) updateData.isCompleted = req.body.isCompleted;
      if (req.body.goalId) updateData.goalId = req.body.goalId;
      if (req.body.timeOfDay) updateData.timeOfDay = req.body.timeOfDay;
      if (req.body.isRepeating !== undefined) updateData.isRepeating = req.body.isRepeating;
      if (req.body.repeatType) updateData.repeatType = req.body.repeatType;
      if (req.body.repeatUntil) updateData.repeatUntil = new Date(req.body.repeatUntil);
      
      console.log(`Updating task #${taskId} with:`, updateData);
      
      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, taskId))
        .returning();

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Delete a task
  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      // Get the task to verify ownership
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify that the task belongs to a goal owned by the user
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, task.goalId),
          eq(goals.userId, req.user.id)
        ),
      });

      if (!goal) {
        return res.status(403).json({ message: "You do not have permission to delete this task" });
      }
      
      // Don't allow deleting recurring parent tasks (would orphan child tasks)
      if (task.isRepeating) {
        return res.status(400).json({ 
          message: "Cannot delete a parent recurring task" 
        });
      }

      // Delete the task
      await db.delete(tasks)
        .where(eq(tasks.id, taskId));

      // If the task was completed, update user stats
      if (task.isCompleted) {
        const userStat = await db.query.userStats.findFirst({
          where: eq(userStats.userId, req.user.id),
        });

        if (userStat && userStat.tasksCompleted > 0) {
          await db.update(userStats)
            .set({
              tasksCompleted: userStat.tasksCompleted - 1,
              lastUpdated: new Date(),
            })
            .where(eq(userStats.userId, req.user.id));
        }
      }
      
      // Recalculate user stats to ensure they're up-to-date after deleting a task
      try {
        await recalculateUserStats(req.user.id);
        console.log(`Successfully recalculated stats for user ${req.user.id} after task deletion`);
      } catch (statsError) {
        console.error(`Error recalculating user stats for user ${req.user.id} after deleting task:`, statsError);
        // Don't fail the whole request if stats recalculation fails
      }

      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user stats
  app.get("/api/user/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const stats = await db.query.userStats.findFirst({
        where: eq(userStats.userId, req.user.id),
      });

      if (!stats) {
        // Create initial stats if they don't exist
        const [newStats] = await db.insert(userStats).values({
          userId: req.user.id,
          longestStreak: 0,
          currentStreak: 0,
          goalsCompleted: 0,
          goalsShared: 0,
          tasksCompleted: 0,
          tenacityScore: 0,
          achieverScore: 0,
          motivatorScore: 0,
          consistencyScore: 0,
          milestonesReached: 0,
          mostTasksCompletedInDay: 0,
          onTimeCompletionRate: 0,
          recurringTaskAdherence: 0,
          shortTermCompletionRate: 0,
          mediumTermCompletionRate: 0,
          longTermCompletionRate: 0,
          longestGoalAge: 0,
          longestBreakBetweenCompletions: 0,
          avgTasksPerDay: 0,
        }).returning();
        
        return res.json(newStats);
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });
  
  // Function to recalculate user stats that can be called internally
  async function recalculateUserStats(userId: number): Promise<void> {
    try {
      // Get all user's goals
      const userGoals = await db.query.goals.findMany({
        where: eq(goals.userId, userId),
        orderBy: desc(goals.createdAt)
      });
      
      // Get user's goals IDs
      const userGoalIds = userGoals.map(goal => goal.id);
      
      // Get all user's tasks through goal relation (since tasks don't have userId directly)
      const userTasks = await db.query.tasks.findMany({
        where: inArray(tasks.goalId, userGoalIds),
        orderBy: desc(tasks.createdAt)
      });
      
      // Current stats (or create new if not exist)
      let stats = await db.query.userStats.findFirst({
        where: eq(userStats.userId, userId),
      });
      
      if (!stats) {
        // Create initial stats if they don't exist
        const [newStats] = await db.insert(userStats).values({
          userId: userId,
          longestStreak: 0,
          currentStreak: 0,
          goalsCompleted: 0,
          goalsShared: 0,
          tasksCompleted: 0,
          mostTasksCompletedInDay: 0,
          onTimeCompletionRate: 0,
          recurringTaskAdherence: 0,
          shortTermCompletionRate: 0,
          mediumTermCompletionRate: 0,
          longTermCompletionRate: 0,
          longestGoalAge: 0,
          longestBreakBetweenCompletions: 0,
          avgTasksPerDay: 0,
        }).returning();
        
        stats = newStats;
      }
      
      // Calculate enhanced statistics
      
      // Helper function to convert UTC dates to local date strings (YYYY-MM-DD format)
      const toLocalDateString = (date: Date): string => {
        // Get local date parts
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // 1. Most productive day of week
      const dayCount: Record<string, number> = {
        'Sunday': 0, 'Monday': 0, 'Tuesday': 0,
        'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0
      };
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Also track completions by date string for "most productive day" (specific date, not day of week)
      const completionsBySpecificDate: Record<string, number> = {};
      
      // Include today's date in our calculations for today's tasks
      const currentDate = new Date();
      const todayDateStr = toLocalDateString(currentDate);
      completionsBySpecificDate[todayDateStr] = 0;
      
      console.log(`Today's date for stats calculations: ${todayDateStr}`);
      
      // Count completion by day of week and specific date
      userTasks.forEach(task => {
        if (task.isCompleted && task.completedAt) {
          // For day of week stats - using local timezone for day calculation
          const completedDate = new Date(task.completedAt);
          const dayOfWeek = completedDate.getDay();
          dayCount[dayNames[dayOfWeek]]++;
          
          // For specific date stats - using local timezone date string
          const dateStr = toLocalDateString(completedDate);
          completionsBySpecificDate[dateStr] = (completionsBySpecificDate[dateStr] || 0) + 1;
          
          // Log tasks completed today for debugging
          if (dateStr === todayDateStr) {
            console.log(`Found task completed today: ${task.title} (ID: ${task.id})`);
          }
        }
      });
      
      // Log totals for debugging
      console.log(`Tasks completed today (${todayDateStr}): ${completionsBySpecificDate[todayDateStr] || 0}`);
      
      console.log("Completions by day:", completionsBySpecificDate);
      
      // Find most productive day of week
      let mostProductiveDay = 'Not enough data';
      let maxCompletions = 0;
      
      Object.entries(dayCount).forEach(([day, count]) => {
        console.log(`Day: ${day}, Count: ${count}`);
        if (count > maxCompletions) {
          mostProductiveDay = day;
          maxCompletions = count;
        }
      });
      
      // Find the specific most productive date
      let mostProductiveDateStr = '';
      let mostProductiveDateCount = 0;
      
      Object.entries(completionsBySpecificDate).forEach(([dateStr, count]) => {
        if (count > mostProductiveDateCount) {
          mostProductiveDateStr = dateStr;
          mostProductiveDateCount = count;
        }
      });
      
      // 2. Most productive time of day
      const timeCount: Record<string, number> = {
        'Morning': 0, 'Afternoon': 0, 'Evening': 0
      };
      
      userTasks.forEach(task => {
        if (task.isCompleted && task.completedAt) {
          // First check if the task has an explicit timeOfDay set
          if (task.timeOfDay && task.timeOfDay !== "not_set") {
            // Map the timeOfDay enum values to our display values
            if (task.timeOfDay === "morning") {
              timeCount['Morning']++;
            } else if (task.timeOfDay === "afternoon") {
              timeCount['Afternoon']++;
            } else if (task.timeOfDay === "evening") {
              timeCount['Evening']++;
            }
          } else {
            // Fall back to hour-based calculation if timeOfDay is not_set
            const hour = new Date(task.completedAt).getHours();
            if (hour >= 5 && hour < 12) {
              timeCount['Morning']++;
            } else if (hour >= 12 && hour < 17) {
              timeCount['Afternoon']++;
            } else {
              timeCount['Evening']++;
            }
          }
        }
      });
      
      let mostProductiveTime = 'Not enough data';
      maxCompletions = 0;
      
      Object.entries(timeCount).forEach(([time, count]) => {
        if (count > maxCompletions) {
          mostProductiveTime = time;
          maxCompletions = count;
        }
      });
      
      // 3. On-time completion rate
      const completedTasks = userTasks.filter(task => task.isCompleted && task.completedAt);
      
      // Improved on-time completion detection
      const onTimeCompletions = completedTasks.filter(task => {
        if (!task.completedAt) return false;
        
        // Get the task completion date (just the date part, not time)
        const completedDate = new Date(task.completedAt);
        
        // Get the scheduled date (just the date part, not time)
        const scheduledDate = new Date(task.scheduledDate);
        
        // Set both to midnight for date comparison only
        completedDate.setHours(0, 0, 0, 0);
        scheduledDate.setHours(0, 0, 0, 0);
        
        // Consider completed on time if completed on or before the scheduled date
        return completedDate <= scheduledDate;
      }).length;
      
      // Calculate based on completed tasks, not all tasks
      const onTimeCompletionRate = completedTasks.length > 0 
        ? Math.round((onTimeCompletions / completedTasks.length) * 100) 
        : 0;
        
      console.log(`Calculating on-time completion rate: ${onTimeCompletions}/${completedTasks.length} = ${onTimeCompletionRate}%`);
      
      // 4. Goal type completion rates
      const shortTermTasks = userTasks.filter(task => 
        userGoals.find(g => g.id === task.goalId)?.type === "short"
      );
      
      const mediumTermTasks = userTasks.filter(task => 
        userGoals.find(g => g.id === task.goalId)?.type === "medium"
      );
      
      const longTermTasks = userTasks.filter(task => 
        userGoals.find(g => g.id === task.goalId)?.type === "long"
      );
      
      const shortTermCompletionRate = shortTermTasks.length > 0
        ? Math.round((shortTermTasks.filter(t => t.isCompleted).length / shortTermTasks.length) * 100)
        : 0;
        
      const mediumTermCompletionRate = mediumTermTasks.length > 0
        ? Math.round((mediumTermTasks.filter(t => t.isCompleted).length / mediumTermTasks.length) * 100)
        : 0;
        
      const longTermCompletionRate = longTermTasks.length > 0
        ? Math.round((longTermTasks.filter(t => t.isCompleted).length / longTermTasks.length) * 100)
        : 0;
      
      // 5. Most tasks completed in a day (personal best)
      // We'll use our toLocalDateString helper for consistent date handling across all calculations
      
      const completionsByDate: Record<string, {count: number, dateObj: Date}> = {};
      
      userTasks.forEach(task => {
        if (task.isCompleted && task.completedAt) {
          // Use the local date string to ensure consistent date handling in the user's timezone
          const completedDate = new Date(task.completedAt);
          const dateStr = toLocalDateString(completedDate);
          
          if (!completionsByDate[dateStr]) {
            completionsByDate[dateStr] = { count: 0, dateObj: completedDate };
          }
          completionsByDate[dateStr].count += 1;
        }
      });
      
      // Find the max completed in any day
      let mostTasksCompletedInDay = 0;
      let mostProductiveDateObj: Date | null = null;
      
      // Make sure completionsByDate uses the same local date string format we're using for todayDateStr
      // Always include today's tasks in completionsByDate, even if already present
      if (completionsBySpecificDate[todayDateStr]) {
        if (!completionsByDate[todayDateStr]) {
          completionsByDate[todayDateStr] = { 
            count: completionsBySpecificDate[todayDateStr], 
            dateObj: currentDate
          };
        } else {
          // If today already exists in completionsByDate, ensure it matches completionsBySpecificDate
          // This is important for ensuring consistency between the two calculations
          completionsByDate[todayDateStr].count = completionsBySpecificDate[todayDateStr];
        }
        console.log(`Added today's tasks to completionsByDate: ${completionsBySpecificDate[todayDateStr]} tasks`);
      }
      
      console.log("Completions by date (for personal best):", completionsByDate);
      
      Object.entries(completionsByDate).forEach(([dateStr, data]) => {
        console.log(`Date: ${dateStr}, Count: ${data.count}`);
        if (data.count > mostTasksCompletedInDay) {
          mostTasksCompletedInDay = data.count;
          mostProductiveDateObj = data.dateObj;
          mostProductiveDateStr = dateStr;
        }
      });
      
      // 6. Recurring task adherence
      // Improve recurring task detection to match our other code
      const recurringTasks = userTasks.filter(t => 
        t.isRepeating || 
        t.parentTaskId !== null || 
        (t.repeatType && t.repeatType !== "none")
      );
      console.log(`Found ${recurringTasks.length} recurring tasks out of ${userTasks.length} total tasks`);
      
      const completedRecurringTasks = recurringTasks.filter(t => t.isCompleted && t.completedAt);
      
      // Calculate on-time recurring tasks (recurring tasks completed on or before due date)
      const onTimeRecurringCompletions = completedRecurringTasks.filter(task => {
        if (!task.completedAt) return false;
        
        // Get the task completion date (just the date part, not time)
        const completedDate = new Date(task.completedAt);
        
        // Get the scheduled date (just the date part, not time)
        const scheduledDate = new Date(task.scheduledDate);
        
        // Set both to midnight for date comparison only
        completedDate.setHours(0, 0, 0, 0);
        scheduledDate.setHours(0, 0, 0, 0);
        
        // Consider completed on time if completed on or before the scheduled date
        return completedDate <= scheduledDate;
      }).length;
      
      const recurringTaskAdherence = completedRecurringTasks.length > 0
        ? Math.round((onTimeRecurringCompletions / completedRecurringTasks.length) * 100)
        : 0;
      
      // 7. Longest goal age
      const oldestActiveGoal = userGoals
        .filter(g => !g.isCompleted && !g.isArchived)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      
      const longestGoalAge = oldestActiveGoal
        ? Math.floor((new Date().getTime() - new Date(oldestActiveGoal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      // 8. Average tasks per day
      // Get distinct active days
      const activeDays = new Set();
      userTasks.forEach(task => {
        if (task.completedAt) {
          activeDays.add(new Date(task.completedAt).toDateString());
        }
      });
      
      const avgTasksPerDay = activeDays.size > 0
        ? Math.round(userTasks.filter(t => t.isCompleted).length / activeDays.size)
        : 0;
      
      // 9. Longest break
      let longestBreakBetweenCompletions = 0;
      
      if (userTasks.filter(t => t.isCompleted && t.completedAt).length > 1) {
        // Sort completed tasks by completion date
        const completedTasks = userTasks
          .filter(t => t.isCompleted && t.completedAt)
          .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());
        
        let maxBreak = 0;
        for (let i = 1; i < completedTasks.length; i++) {
          const gap = Math.floor(
            (new Date(completedTasks[i].completedAt!).getTime() - new Date(completedTasks[i-1].completedAt!).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          maxBreak = Math.max(maxBreak, gap);
        }
        
        longestBreakBetweenCompletions = maxBreak;
      }
      
      // Calculate basic stats for user progress
      const completedGoalsCount = userGoals.filter(g => g.isCompleted).length;
      const totalGoalsCount = userGoals.length;
      const completedTasksCount = userTasks.filter(t => t.isCompleted).length;
      const totalTasksCount = userTasks.length;
      const streakValue = stats?.currentStreak || 0;
      // Character stats have been removed - only collecting basic task and goal statistics
      const taskCompletionRate = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
      
      // Calculate the day the stats were last updated
      const lastUpdateDateIso = new Date().toISOString().split('T')[0];
      const lastUpdateDate = stats?.lastUpdated 
        ? new Date(stats.lastUpdated).toISOString().split('T')[0] 
        : '';
      
      // Prepare the update data
      const updateData: Record<string, any> = {
        // Core stats fields
        goalsCompleted: completedGoalsCount,
        tasksCompleted: completedTasksCount,
        
        // Newly calculated fields
        mostProductiveDay,
        mostProductiveTime,
        onTimeCompletionRate,
        recurringTaskAdherence,
        shortTermCompletionRate,
        mediumTermCompletionRate,
        longTermCompletionRate,
        mostTasksCompletedInDay,
        longestGoalAge,
        longestBreakBetweenCompletions,
        avgTasksPerDay,
        
        // Update timestamp
        lastUpdated: new Date()
      };
      
      // Only add the mostTasksCompletedDate if we have a valid date
      if (mostProductiveDateStr) {
        updateData.mostTasksCompletedDate = new Date(mostProductiveDateStr);
      }
      
      // Update the user stats
      await db.update(userStats)
        .set(updateData)
        .where(eq(userStats.userId, userId))
        .returning();
      
      console.log(`Updated stats for user ${userId} with mostProductiveDay=${mostProductiveDay} and mostTasksCompletedInDay=${mostTasksCompletedInDay}`);
    } catch (error) {
      console.error(`Error recalculating user stats for user ${userId}:`, error);
      throw error;
    }
  }

  // Recalculate user stats endpoint
  app.post("/api/user/stats/recalculate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      await recalculateUserStats(req.user.id);
      
      // Get the updated stats to return to the client
      const updatedStats = await db.query.userStats.findFirst({
        where: eq(userStats.userId, req.user.id),
      });
      
      res.json(updatedStats);
    } catch (error) {
      console.error("Error recalculating user stats via API:", error);
      res.status(500).json({ message: "Failed to recalculate stats" });
    }
  });
  
  // Get user preferences
  app.get("/api/user/preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, req.user.id),
      });

      if (!preferences) {
        // Create default preferences if they don't exist
        const [newPreferences] = await db.insert(userPreferences).values({
          userId: req.user.id,
          showTimeOfDayDividers: true,
          defaultCalendarView: "week",
          theme: "system",
        }).returning();
        
        return res.json(newPreferences);
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });
  
  // Update user preferences
  app.patch("/api/user/preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      // Validate input data
      const allowedFields = ["showTimeOfDayDividers", "defaultCalendarView", "theme", "showSimplifiedTasks"];
      const updateData: Record<string, any> = {};
      
      allowedFields.forEach(field => {
        if (field in req.body) {
          updateData[field] = req.body[field];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      // Add updatedAt timestamp
      updateData.updatedAt = new Date();
      
      // Find existing preferences
      const existingPrefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, req.user.id),
      });
      
      let result;
      
      if (existingPrefs) {
        // Update existing preferences
        const [updated] = await db.update(userPreferences)
          .set(updateData)
          .where(eq(userPreferences.userId, req.user.id))
          .returning();
          
        result = updated;
      } else {
        // Create new preferences if they don't exist
        const [newPrefs] = await db.insert(userPreferences).values({
          userId: req.user.id,
          ...updateData,
        }).returning();
        
        result = newPrefs;
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });
  
  // Get all achievements for the current user
  app.get("/api/achievements", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const userAchievements = await db.query.achievements.findMany({
        where: eq(achievements.userId, req.user.id),
        orderBy: [
          desc(achievements.isCompleted),
          desc(achievements.completedAt),
          desc(achievements.currentValue)
        ],
      });
      res.json(userAchievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Get achievements by type
  app.get("/api/achievements/:type", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const achievementType = req.params.type as string;
    
    // Validate achievement type
    if (!["all", "streak", "goal_completion", "task_completion", "consistency", "custom"].includes(achievementType)) {
      return res.status(400).json({ message: "Invalid achievement type" });
    }

    try {
      let userAchievements;
      
      if (achievementType === "all") {
        userAchievements = await db.query.achievements.findMany({
          where: eq(achievements.userId, req.user.id),
          orderBy: [
            desc(achievements.isCompleted),
            desc(achievements.completedAt),
            desc(achievements.currentValue)
          ],
        });
      } else {
        userAchievements = await db.query.achievements.findMany({
          where: and(
            eq(achievements.userId, req.user.id),
            eq(achievements.type, achievementType as any)
          ),
          orderBy: [
            desc(achievements.isCompleted),
            desc(achievements.completedAt),
            desc(achievements.currentValue)
          ],
        });
      }
      
      res.json(userAchievements);
    } catch (error) {
      console.error(`Error fetching ${achievementType} achievements:`, error);
      res.status(500).json({ message: `Failed to fetch ${achievementType} achievements` });
    }
  });

  // Update achievement progress (this endpoint will be called by task completion, goal completion, etc.)
  app.patch("/api/achievements/:id/progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    const achievementId = parseInt(req.params.id);
    if (isNaN(achievementId)) {
      return res.status(400).json({ message: "Invalid achievement ID" });
    }

    try {
      // Verify the achievement belongs to the user
      const achievement = await db.query.achievements.findFirst({
        where: and(
          eq(achievements.id, achievementId),
          eq(achievements.userId, req.user.id)
        ),
      });

      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      // Validate the increment amount
      const incrementSchema = z.object({
        increment: z.number().int().min(1),
      });

      const validatedData = incrementSchema.parse(req.body);
      
      // Calculate new values
      const newCurrentValue = achievement.currentValue + validatedData.increment;
      
      // Check if achievement is completed
      const isCompleted = !achievement.isCompleted && newCurrentValue >= achievement.thresholdValue;
      
      // Update achievement
      const [updatedAchievement] = await db.update(achievements)
        .set({
          currentValue: newCurrentValue,
          isCompleted: isCompleted,
          completedAt: isCompleted ? new Date() : achievement.completedAt,
        })
        .where(eq(achievements.id, achievementId))
        .returning();

      res.json(updatedAchievement);
    } catch (error) {
      console.error("Error updating achievement progress:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update achievement progress" });
    }
  });

  // Run achievements migration
  app.post("/api/admin/run-achievements-migration", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const { exec } = require('child_process');
      
      exec('npm run db:achievements', (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error(`Error: ${error}`);
          return res.status(500).json({ message: "Error running migration", error: error.message });
        }
        
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          // Note: We're not returning here because some CLI tools write to stderr even on success
        }
        
        console.log(`stdout: ${stdout}`);
        res.status(200).json({ message: "Achievements migration executed successfully" });
      });
    } catch (error) {
      console.error("Error running achievements migration:", error);
      res.status(500).json({ message: "Failed to run achievements migration" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
