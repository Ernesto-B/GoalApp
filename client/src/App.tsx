import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import GoalDetails from "@/pages/goal-details";
import GoalCreationPage from "@/pages/goal-creation-new";
import TasksPage from "@/pages/tasks";
import StatsPage from "@/pages/stats";
import AchievementsPage from "@/pages/achievements-new";
import ArchivedGoalsPage from "@/pages/archived-goals";
import AboutPage from "@/pages/about-page";
import LandingPage from "@/pages/landing-page";
import GoalsPage from "@/pages/goals-fixed";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { UserPreferencesProvider } from "./hooks/use-user-preferences";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/goals" component={GoalsPage} />
      <ProtectedRoute path="/goals/archived" component={ArchivedGoalsPage} />
      <ProtectedRoute path="/goal/new" component={GoalCreationPage} />
      <ProtectedRoute path="/goal/:id" component={GoalDetails} />
      <ProtectedRoute path="/tasks" component={TasksPage} />
      <ProtectedRoute path="/stats" component={StatsPage} />
      <ProtectedRoute path="/achievements" component={AchievementsPage} />
      <ProtectedRoute path="/about" component={AboutPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserPreferencesProvider>
          <Router />
          <Toaster />
        </UserPreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
