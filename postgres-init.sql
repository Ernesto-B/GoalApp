-- PostgreSQL initialization script for GoalQuest application
-- This script creates all tables and required enums

-- Create enums first
CREATE TYPE goal_type AS ENUM ('short', 'medium', 'long');
CREATE TYPE repeat_type AS ENUM ('none', 'daily', 'every_other_day', 'weekly', 'monthly');
CREATE TYPE time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'not_set');
CREATE TYPE milestone_type AS ENUM (
  'first_goal', 'first_task', 'daily_streak',
  'complete_goal', 'short_term_master', 'medium_term_achiever',
  'long_term_planner', 'task_machine', 'consistent_user',
  'balanced_planner', 'completion_rate', 'all_types_user'
);

-- Create tables
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  show_time_of_day_dividers BOOLEAN NOT NULL DEFAULT TRUE,
  theme VARCHAR(50) DEFAULT 'system',
  week_start_day INTEGER DEFAULT 0, -- 0 = Sunday, 1 = Monday, etc.
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type goal_type NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  parent_goal_id INTEGER REFERENCES goals(id),
  deadline TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  target_tasks_count INTEGER DEFAULT 1,
  completed_tasks_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  due_date TIMESTAMP NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  repeat_type repeat_type NOT NULL DEFAULT 'none',
  repeat_until TIMESTAMP,
  time_of_day time_of_day DEFAULT 'not_set',
  parent_task_id INTEGER REFERENCES tasks(id)
);

-- User statistics
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  total_completed_tasks INTEGER DEFAULT 0,
  total_goals INTEGER DEFAULT 0,
  completed_goals INTEGER DEFAULT 0,
  short_term_goals INTEGER DEFAULT 0,
  medium_term_goals INTEGER DEFAULT 0,
  long_term_goals INTEGER DEFAULT 0,
  completed_short_term_goals INTEGER DEFAULT 0,
  completed_medium_term_goals INTEGER DEFAULT 0,
  completed_long_term_goals INTEGER DEFAULT 0,
  streak_start_date TIMESTAMP,
  last_activity_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completion_rate NUMERIC(5, 2) DEFAULT 0,
  total_active_days INTEGER DEFAULT 0,
  avg_tasks_per_day NUMERIC(5, 2) DEFAULT 0
);

-- Goal statistics
CREATE TABLE IF NOT EXISTS goal_stats (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  progress_percentage NUMERIC(5, 2) DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  streak_start_date TIMESTAMP,
  last_activity_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_goal_id FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon_name VARCHAR(100),
  unlocked_at TIMESTAMP,
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  milestone_type milestone_type NOT NULL,
  milestone_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_deadline ON goals(deadline);
CREATE INDEX idx_goals_type ON goals(type);
CREATE INDEX idx_goals_parent_goal_id ON goals(parent_goal_id);

-- Express session tables required for authentication
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Add sample user for testing (username: demo, password: password123)
-- INSERT INTO users (username, password) 
-- VALUES ('demo', '5d41402abc4b2a76b9719d911017c592.a54f88cba7c64e6b2ca70c3eb33323a59e09b15ee99f7f3a'); -- Use your actual password hashing method