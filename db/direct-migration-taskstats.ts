import { db, pool } from ".";

async function runDirectMigration() {
  try {
    console.log("Starting direct schema migration for task stats...");

    // Add the completedOnTime field to the tasks table
    const alterTasksTableSQL = `
      ALTER TABLE IF EXISTS tasks 
      ADD COLUMN IF NOT EXISTS completed_on_time BOOLEAN;
    `;
    await pool.query(alterTasksTableSQL);
    console.log("Successfully added completed_on_time column to tasks table");

    // Check if goal_stats table exists, if not create it
    const checkTableSQL = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'goal_stats'
      );
    `;
    const tableExists = await pool.query(checkTableSQL);
    
    if (!tableExists.rows[0].exists) {
      console.log("goal_stats table does not exist, creating it now");
      
      const createGoalStatsTableSQL = `
        CREATE TABLE goal_stats (
          id SERIAL PRIMARY KEY,
          goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
          longest_streak INTEGER NOT NULL DEFAULT 0,
          current_streak INTEGER NOT NULL DEFAULT 0,
          tasks_completed_morning INTEGER NOT NULL DEFAULT 0,
          tasks_completed_afternoon INTEGER NOT NULL DEFAULT 0,
          tasks_completed_evening INTEGER NOT NULL DEFAULT 0,
          tasks_completed_not_set INTEGER NOT NULL DEFAULT 0,
          tasks_completed_on_time INTEGER NOT NULL DEFAULT 0,
          tasks_completed_late INTEGER NOT NULL DEFAULT 0,
          recurring_tasks_completed INTEGER NOT NULL DEFAULT 0,
          non_recurring_tasks_completed INTEGER NOT NULL DEFAULT 0,
          last_updated TIMESTAMP DEFAULT NOW(),
          UNIQUE(goal_id)
        );
      `;
      await pool.query(createGoalStatsTableSQL);
      console.log("Successfully created goal_stats table");
    } else {
      console.log("goal_stats table already exists, checking for missing columns");
      
      // Add columns that might be missing
      const alterGoalStatsTableSQL = `
        ALTER TABLE goal_stats 
        ADD COLUMN IF NOT EXISTS tasks_completed_on_time INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tasks_completed_late INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS recurring_tasks_completed INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS non_recurring_tasks_completed INTEGER NOT NULL DEFAULT 0;
      `;
      await pool.query(alterGoalStatsTableSQL);
      console.log("Successfully updated goal_stats table structure");
    }

    // Initialize goal_stats for each goal that doesn't have a record
    const initializeGoalStatsSQL = `
      INSERT INTO goal_stats (goal_id, last_updated)
      SELECT id, NOW()
      FROM goals g
      WHERE NOT EXISTS (
        SELECT 1 FROM goal_stats gs WHERE gs.goal_id = g.id
      );
    `;
    await pool.query(initializeGoalStatsSQL);
    console.log("Successfully initialized goal_stats for all goals");

    // Update completedOnTime flag for all completed tasks
    const updateCompletedTasksSQL = `
      UPDATE tasks
      SET completed_on_time = (completed_at <= scheduled_date)
      WHERE is_completed = true AND completed_at IS NOT NULL AND completed_on_time IS NULL;
    `;
    await pool.query(updateCompletedTasksSQL);
    console.log("Successfully updated completed_on_time for existing tasks");

    // Update stats for each goal based on its tasks
    const updateGoalStatsSQL = `
      UPDATE goal_stats gs
      SET 
        tasks_completed_morning = subquery.morning_count,
        tasks_completed_afternoon = subquery.afternoon_count,
        tasks_completed_evening = subquery.evening_count,
        tasks_completed_not_set = subquery.not_set_count,
        tasks_completed_on_time = subquery.on_time_count,
        tasks_completed_late = subquery.late_count,
        recurring_tasks_completed = subquery.recurring_count,
        non_recurring_tasks_completed = subquery.non_recurring_count,
        last_updated = NOW()
      FROM (
        SELECT 
          t.goal_id,
          COUNT(CASE WHEN t.time_of_day = 'morning' THEN 1 END) AS morning_count,
          COUNT(CASE WHEN t.time_of_day = 'afternoon' THEN 1 END) AS afternoon_count,
          COUNT(CASE WHEN t.time_of_day = 'evening' THEN 1 END) AS evening_count,
          COUNT(CASE WHEN t.time_of_day = 'not_set' OR t.time_of_day IS NULL THEN 1 END) AS not_set_count,
          COUNT(CASE WHEN t.completed_on_time = true THEN 1 END) AS on_time_count,
          COUNT(CASE WHEN t.completed_on_time = false THEN 1 END) AS late_count,
          COUNT(CASE WHEN t.is_repeating = true THEN 1 END) AS recurring_count,
          COUNT(CASE WHEN t.is_repeating = false THEN 1 END) AS non_recurring_count
        FROM tasks t
        WHERE t.is_completed = true
        GROUP BY t.goal_id
      ) AS subquery
      WHERE gs.goal_id = subquery.goal_id;
    `;
    await pool.query(updateGoalStatsSQL);
    console.log("Successfully updated statistics for all goals");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the migration if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runDirectMigration()
    .then(() => {
      console.log("Task stats migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Task stats migration failed:", error);
      process.exit(1);
    });
}

export default runDirectMigration;