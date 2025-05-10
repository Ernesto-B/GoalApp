import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  Flame, CheckCircle, Users, LineChart, AlertCircle, Target, Star, HelpCircle,
  Shield, Swords, Activity
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string;
  icon?: "goal" | "task" | "streak";
  linkText?: string;
  linkHref?: string;
  footerText?: string;
  change?: number;
  tooltipContent?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  linkText, 
  linkHref,
  footerText,
  change,
  tooltipContent
}: StatsCardProps) {
  // Render the icon based on the type
  const renderIcon = () => {
    switch (icon) {
      case "goal":
        return (
          <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
            <Target className="h-6 w-6 text-primary-600" />
          </div>
        );
      case "task":
        return (
          <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        );
      case "streak":
        return (
          <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
            <Flame className="h-6 w-6 text-yellow-600" />
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
            <Star className="h-6 w-6 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
    >
      <Card className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-all duration-300">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {renderIcon()}
            </motion.div>
            <div className="ml-5 w-0 flex-1">
              <dt className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-300">
                <span className="truncate">{title}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button 
                        className="ml-1.5"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <HelpCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                      <p>{tooltipContent || 'No additional information available'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </dt>
              <motion.dd 
                className="flex items-baseline"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex items-center">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {value}
                  </div>
                  {change && (
                    <motion.div 
                      className="ml-2 flex items-baseline text-sm font-semibold text-green-600 dark:text-green-400"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 self-center text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      {change}
                    </motion.div>
                  )}
                </div>
              </motion.dd>
            </div>
          </div>
        </CardContent>
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
          <div className="text-sm">
            {linkText && linkHref ? (
              <Link href={linkHref} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center group">
                <span>{linkText}</span>
                <motion.span 
                  className="inline-block ml-1"
                  initial={{ x: 0 }}
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  →
                </motion.span>
                <span className="sr-only"> {title}</span>
              </Link>
            ) : (
              <p className="font-medium text-gray-500 dark:text-gray-400">{footerText}</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
