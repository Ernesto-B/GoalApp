import { db, pool } from ".";

async function runDirectMigration() {
  try {
    console.log("Starting direct schema migration...");

    // SQL to add the missing columns to the goals table
    const alterGoalsTableSQL = `
      ALTER TABLE IF EXISTS goals 
      ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP;
    `;

    // Execute the SQL to alter the goals table
    await pool.query(alterGoalsTableSQL);
    console.log("Successfully added current_streak and last_updated columns to goals table");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during direct migration:", error);
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
      console.log("Direct migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Direct migration failed:", error);
      process.exit(1);
    });
}

export default runDirectMigration;