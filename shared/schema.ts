import { pgTable, text, serial, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  goals: many(goals),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Goal Types Enum
export const goalTypeEnum = pgEnum("goal_type", ["short", "medium", "long"]);

// Goals
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: goalTypeEnum("type").notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  parentGoalId: integer("parent_goal_id")
    .references(() => goals.id, { onDelete: "set null" }),
  deadline: timestamp("deadline").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
  longestStreak: integer("longest_streak").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  lastUpdated: timestamp("last_updated"),
});

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  parentGoal: one(goals, {
    fields: [goals.parentGoalId],
    references: [goals.id],
    relationName: "childGoals"
  }),
  childGoals: many(goals, { relationName: "childGoals" })
}));

export const insertGoalSchema = createInsertSchema(goals, {
  title: (schema) => schema.min(1, "Title is required"),
  type: (schema) => schema,
  deadline: (schema) => schema,
}).omit({ 
  id: true, 
  userId: true, 
  createdAt: true, 
  completedAt: true, 
  isCompleted: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Repeat Types Enum
export const repeatTypeEnum = pgEnum("repeat_type", ["none", "daily", "every_other_day", "weekly", "monthly"]);

// Time of Day Enum
export const timeOfDayEnum = pgEnum("time_of_day", ["morning", "afternoon", "evening", "not_set"]);

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  goalId: integer("goal_id")
    .references(() => goals.id, { onDelete: "cascade" })
    .notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedOnTime: boolean("completed_on_time"),  // Track if the task was completed on or before due date
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  // Recurring task fields
  isRepeating: boolean("is_repeating").default(false).notNull(),
  repeatType: repeatTypeEnum("repeat_type").default("none").notNull(),
  repeatUntil: timestamp("repeat_until"),
  parentTaskId: integer("parent_task_id"),  // self-reference for recurring instances
  timeOfDay: timeOfDayEnum("time_of_day").default("not_set"),  // morning, afternoon, evening
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  goal: one(goals, {
    fields: [tasks.goalId],
    references: [goals.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "childTasks",
  }),
}));

export const insertTaskSchema = createInsertSchema(tasks, {
  title: (schema) => schema.min(1, "Title is required"),
  scheduledDate: (schema) => schema,
}).omit({ 
  id: true, 
  createdAt: true, 
  completedAt: true, 
  isCompleted: true,
  parentTaskId: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// User Stats
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  goalsCompleted: integer("goals_completed").default(0).notNull(),
  goalsShared: integer("goals_shared").default(0).notNull(),
  tasksCompleted: integer("tasks_completed").default(0).notNull(),
  // Most productive metrics
  mostProductiveDay: text("most_productive_day"), // Day of week with most completed tasks
  mostProductiveTime: text("most_productive_time"), // Morning/afternoon/evening
  mostTasksCompletedInDay: integer("most_tasks_completed_in_day").default(0).notNull(),
  mostTasksCompletedDate: timestamp("most_tasks_completed_date"), // Date of most productive day
  // Useful metrics
  onTimeCompletionRate: integer("on_time_completion_rate").default(0).notNull(), // Percentage of tasks completed before deadline
  recurringTaskAdherence: integer("recurring_task_adherence").default(0).notNull(), // Percentage of recurring tasks completed
  shortTermCompletionRate: integer("short_term_completion_rate").default(0).notNull(),
  mediumTermCompletionRate: integer("medium_term_completion_rate").default(0).notNull(),
  longTermCompletionRate: integer("long_term_completion_rate").default(0).notNull(),
  // Interesting metrics
  longestGoalAge: integer("longest_goal_age").default(0).notNull(), // In days
  longestBreakBetweenCompletions: integer("longest_break_between_completions").default(0).notNull(), // In days
  avgTasksPerDay: integer("avg_tasks_per_day").default(0).notNull(), // Average tasks completed per active day
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export type UserStats = typeof userStats.$inferSelect;

// User preferences for UI settings
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  showTimeOfDayDividers: boolean("show_time_of_day_dividers").default(true).notNull(),
  showSimplifiedTasks: boolean("show_simplified_tasks").default(false).notNull(),
  defaultCalendarView: text("default_calendar_view").default("week").notNull(),
  theme: text("theme").default("system").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { 
    fields: [userPreferences.userId], 
    references: [users.id] 
  }),
}));

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// Goal stats for tracking goal-specific metrics
export const goalStats = pgTable("goal_stats", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .references(() => goals.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  // Time-of-day metrics
  tasksCompletedMorning: integer("tasks_completed_morning").default(0).notNull(),
  tasksCompletedAfternoon: integer("tasks_completed_afternoon").default(0).notNull(),
  tasksCompletedEvening: integer("tasks_completed_evening").default(0).notNull(),
  tasksCompletedNotSet: integer("tasks_completed_not_set").default(0).notNull(),
  // Task timeliness metrics
  tasksCompletedOnTime: integer("tasks_completed_on_time").default(0).notNull(),
  tasksCompletedLate: integer("tasks_completed_late").default(0).notNull(),
  // Recurring vs non-recurring metrics
  recurringTasksCompleted: integer("recurring_tasks_completed").default(0).notNull(), 
  nonRecurringTasksCompleted: integer("non_recurring_tasks_completed").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const goalStatsRelations = relations(goalStats, ({ one }) => ({
  goal: one(goals, {
    fields: [goalStats.goalId],
    references: [goals.id],
  }),
}));

export type GoalStats = typeof goalStats.$inferSelect;

// Achievement milestones
export const milestoneTypeEnum = pgEnum("milestone_type", [
  "streak", 
  "goal_completion", 
  "task_completion", 
  "consistency",
  "custom"
]);

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: milestoneTypeEnum("type").notNull(),
  iconName: text("icon_name").notNull(), // Name of the Lucide icon
  badgeColor: text("badge_color").notNull(), // Color code for the badge
  thresholdValue: integer("threshold_value").notNull(), // The value needed to achieve this milestone
  currentValue: integer("current_value").default(0).notNull(), // Current progress towards the milestone
  isCompleted: boolean("is_completed").default(false).notNull(), 
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

export type Achievement = typeof achievements.$inferSelect;
