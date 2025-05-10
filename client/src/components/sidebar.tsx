import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  Home,
  CheckSquare,
  BarChart2,
  Clock,
  Award,
  Settings,
  LogOut,
  Archive,
  HelpCircle,
  Target,
  ListTree,
  Plus
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useMobile();
  const { toast } = useToast();

  if (isMobile) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutateAsync();
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "U";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="mr-3 h-5 w-5" /> },
    { href: "/tasks", label: "Tasks", icon: <CheckSquare className="mr-3 h-5 w-5" /> },
    { href: "/goals", label: "Goals", icon: <ListTree className="mr-3 h-5 w-5" /> },
    { href: "/stats", label: "Statistics", icon: <BarChart2 className="mr-3 h-5 w-5" /> },
    { href: "/achievements", label: "Achievements", icon: <Award className="mr-3 h-5 w-5" /> },
    { href: "/goals/archived", label: "Archived Goals", icon: <Archive className="mr-3 h-5 w-5" /> },
    { href: "/about", label: "About", icon: <HelpCircle className="mr-3 h-5 w-5" /> },
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm z-20">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/">
            <motion.h1 
              className="text-xl font-bold text-primary-600 dark:text-primary-400 hover:opacity-80 transition-opacity cursor-pointer" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              GoalQuest
            </motion.h1>
          </Link>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
          <motion.nav 
            className="flex-1 px-2 space-y-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, staggerChildren: 0.1 }}
          >
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Link 
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    location === item.href
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="mr-3"
                  >
                    {item.icon}
                  </motion.div>
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </motion.nav>
        </div>
        
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex-shrink-0 w-full">
            <div className="flex items-center justify-between mb-3">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=40&h=40" alt="Profile" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.username || "User"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
