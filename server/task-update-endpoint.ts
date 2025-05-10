import { Express } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { tasks, goals } from "@shared/schema";

export function addTaskUpdateEndpoint(app: Express) {
  // Update task's scheduled date (for drag and drop functionality)
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

      // Update the task with the new scheduled date
      const [updatedTask] = await db.update(tasks)
        .set({
          scheduledDate
        })
        .where(eq(tasks.id, taskId))
        .returning();

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}