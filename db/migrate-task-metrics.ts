import { db, pool } from ".";
import { goalStats, tasks } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateTaskMetrics() {
  try {
    console.log("Starting task metrics migration...");

    // Add completedOnTime field to tasks table
    const alterTasksTableSQL = `
      ALTER TABLE IF EXISTS tasks 
      ADD COLUMN IF NOT EXISTS completed_on_time BOOLEAN;
    `;
    await pool.query(alterTasksTableSQL);
    console.log("Successfully added completed_on_time column to tasks table");

    // Add new metric fields to goal_stats table
    const alterGoalStatsTableSQL = `
      ALTER TABLE IF EXISTS goal_stats 
      ADD COLUMN IF NOT EXISTS tasks_completed_on_time INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS tasks_completed_late INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS recurring_tasks_completed INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS non_recurring_tasks_completed INTEGER DEFAULT 0 NOT NULL;
    `;
    await pool.query(alterGoalStatsTableSQL);
    console.log("Successfully added new metrics columns to goal_stats table");

    // Create goal_stats records for goals that don't have them already
    const goalsWithoutStats = await db.query.goals.findMany();
    console.log(`Found ${goalsWithoutStats.length} goals to process`);

    for (const goal of goalsWithoutStats) {
      // Check if goal already has stats
      const existingStats = await db.query.goalStats.findFirst({
        where: (goalStat, { eq }) => eq(goalStat.goalId, goal.id)
      });

      if (!existingStats) {
        console.log(`Creating goal stats for goal ID ${goal.id}: ${goal.title}`);
        
        // Create new goal stats record
        await db.insert(goalStats).values({
          goalId: goal.id,
          lastUpdated: new Date()
        });
      } else {
        console.log(`Goal ID ${goal.id} already has stats, skipping`);
      }
    }

    // Update existing completed tasks to set completedOnTime based on completion date
    const updateCompletedTasksSQL = `
      UPDATE tasks
      SET completed_on_time = (completed_at <= scheduled_date)
      WHERE is_completed = true AND completed_at IS NOT NULL;
    `;
    await pool.query(updateCompletedTasksSQL);
    console.log("Successfully updated completed_on_time values for existing tasks");

    // Update goal stats based on existing completed tasks
    const allGoalStats = await db.query.goalStats.findMany();
    
    for (const goalStat of allGoalStats) {
      // Get all completed tasks for this goal
      const goalTasks = await db.query.tasks.findMany({
        where: (task, { eq, and }) => 
          and(
            eq(task.goalId, goalStat.goalId),
            eq(task.isCompleted, true)
          )
      });

      if (goalTasks.length === 0) {
        console.log(`No completed tasks for goal ID ${goalStat.goalId}, skipping metrics update`);
        continue;
      }

      // Calculate metrics
      const tasksCompletedMorning = goalTasks.filter(t => t.timeOfDay === "morning").length;
      const tasksCompletedAfternoon = goalTasks.filter(t => t.timeOfDay === "afternoon").length;
      const tasksCompletedEvening = goalTasks.filter(t => t.timeOfDay === "evening").length;
      const tasksCompletedNotSet = goalTasks.filter(t => t.timeOfDay === "not_set" || t.timeOfDay === null).length;
      const tasksCompletedOnTime = goalTasks.filter(t => t.completedOnTime === true).length;
      const tasksCompletedLate = goalTasks.filter(t => t.completedOnTime === false).length;
      const recurringTasksCompleted = goalTasks.filter(t => t.isRepeating).length;
      const nonRecurringTasksCompleted = goalTasks.filter(t => !t.isRepeating).length;

      // Update goal stats
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
        .where(eq(goalStats.goalId, goalStat.goalId));

      console.log(`Updated metrics for goal ID ${goalStat.goalId}`);
    }

    console.log("Task metrics migration completed successfully");
  } catch (error) {
    console.error("Error during task metrics migration:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateTaskMetrics()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export default migrateTaskMetrics;