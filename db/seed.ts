import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    // Check if we have users already
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length > 0) {
      console.log("Database already has users, skipping seeding");
      return;
    }

    // Create a demo user
    const [demoUser] = await db.insert(schema.users).values({
      username: "demo",
      password: await hashPassword("password"),
    }).returning();

    console.log("Created demo user:", demoUser);

    // Create a set of initial goals for the demo user
    const currentDate = new Date();
    
    // Short term goals (within 31 days)
    const shortTermGoals = [
      {
        title: "Complete Prototype Design",
        description: "Finish the UI prototype for the new mobile app",
        type: "short",
        userId: demoUser.id,
        deadline: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        isCompleted: false,
        isPublic: false,
      },
      {
        title: "Learn Basic Spanish",
        description: "Complete the beginner Spanish course on Duolingo",
        type: "short",
        userId: demoUser.id,
        deadline: new Date(currentDate.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        isCompleted: false,
        isPublic: false,
      },
      {
        title: "Run 5K Without Stopping",
        description: "Build up endurance to run a full 5K without breaks",
        type: "short",
        userId: demoUser.id,
        deadline: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isCompleted: false,
        isPublic: false,
      }
    ];

    const insertedShortGoals = await db.insert(schema.goals).values(shortTermGoals).returning();
    console.log("Created short term goals:", insertedShortGoals.length);

    // Medium term goals (1-4 months)
    const mediumTermGoals = [
      {
        title: "Build Portfolio Website",
        description: "Create a personal portfolio site to showcase my projects",
        type: "medium",
        userId: demoUser.id,
        deadline: new Date(currentDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        isCompleted: false,
        isPublic: false,
      },
      {
        title: "Complete JavaScript Course",
        description: "Finish the advanced JavaScript online course",
        type: "medium",
        userId: demoUser.id,
        deadline: new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        isCompleted: false,
        isPublic: false,
      }
    ];

    const insertedMediumGoals = await db.insert(schema.goals).values(mediumTermGoals).returning();
    console.log("Created medium term goals:", insertedMediumGoals.length);

    // Long term goals (4+ months)
    const longTermGoals = [
      {
        title: "Master React Development",
        description: "Become proficient in React and build a complex application",
        type: "long",
        userId: demoUser.id,
        deadline: new Date(currentDate.getTime() + 240 * 24 * 60 * 60 * 1000), // 240 days from now
        isCompleted: false,
        isPublic: false,
      },
      {
        title: "Launch Side Business",
        description: "Start a small side business selling my handmade crafts",
        type: "long",
        userId: demoUser.id,
        deadline: new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000), // 365 days from now
        isCompleted: false,
        isPublic: false,
      }
    ];

    const insertedLongGoals = await db.insert(schema.goals).values(longTermGoals).returning();
    console.log("Created long term goals:", insertedLongGoals.length);

    // Create some sample tasks for the first short-term goal
    const shortGoalId = insertedShortGoals[0].id;
    
    // Sample tasks for the prototype design goal
    const prototypeTasks = [
      {
        title: "Create wireframes",
        description: "Design initial wireframes for all main screens",
        goalId: shortGoalId,
        scheduledDate: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        isCompleted: true,
        completedAt: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      },
      {
        title: "Design color scheme",
        description: "Choose a color palette that matches brand guidelines",
        goalId: shortGoalId,
        scheduledDate: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        isCompleted: true,
        completedAt: currentDate, // Today
      },
      {
        title: "Create component library",
        description: "Build reusable UI components for the prototype",
        goalId: shortGoalId,
        scheduledDate: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        isCompleted: false,
      },
      {
        title: "User testing",
        description: "Conduct user testing with 5 participants",
        goalId: shortGoalId,
        scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isCompleted: false,
      },
      {
        title: "Finalize prototype",
        description: "Incorporate feedback and finalize the design",
        goalId: shortGoalId,
        scheduledDate: new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        isCompleted: false,
      },
    ];

    await db.insert(schema.tasks).values(prototypeTasks);
    
    // Create sample tasks for the second short-term goal (Spanish)
    const spanishGoalId = insertedShortGoals[1].id;
    
    const spanishTasks = [
      {
        title: "Learn 50 basic words",
        description: "Memorize 50 common Spanish vocabulary words",
        goalId: spanishGoalId,
        scheduledDate: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        isCompleted: false,
      },
      {
        title: "Practice greetings",
        description: "Learn and practice common Spanish greetings",
        goalId: spanishGoalId,
        scheduledDate: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        isCompleted: false,
      },
      {
        title: "Study verb conjugations",
        description: "Learn present tense verb conjugations",
        goalId: spanishGoalId,
        scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isCompleted: false,
      },
    ];

    await db.insert(schema.tasks).values(spanishTasks);
    
    // Create sample tasks for the third short-term goal (5K run)
    const runGoalId = insertedShortGoals[2].id;
    
    const runTasks = [
      {
        title: "Run 1km without stopping",
        description: "Build basic endurance with a 1km run",
        goalId: runGoalId,
        scheduledDate: new Date(currentDate.getTime()), // Today
        isCompleted: true,
        completedAt: new Date(currentDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        title: "Run 2km",
        description: "Extend running distance to 2km",
        goalId: runGoalId,
        scheduledDate: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        isCompleted: false,
      },
      {
        title: "Run 3km",
        description: "Extend running distance to 3km",
        goalId: runGoalId,
        scheduledDate: new Date(currentDate.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        isCompleted: false,
      },
      {
        title: "Run 4km",
        description: "Extend running distance to 4km",
        goalId: runGoalId,
        scheduledDate: new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        isCompleted: false,
      },
      {
        title: "Complete 5K run",
        description: "Run the full 5K without stopping",
        goalId: runGoalId,
        scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isCompleted: false,
      },
    ];

    await db.insert(schema.tasks).values(runTasks);
    
    // Create initial user stats
    await db.insert(schema.userStats).values({
      userId: demoUser.id,
      longestStreak: 5,
      currentStreak: 5,
      goalsCompleted: 0,
      goalsShared: 0,
      tasksCompleted: 3, // Based on the completed tasks above
      tenacityScore: 72,
      achieverScore: 36,
      motivatorScore: 54,
      consistencyScore: 85,
    });

    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Seed error:", error);
  }
}

seed();
