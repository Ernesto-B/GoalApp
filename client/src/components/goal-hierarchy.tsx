import { useState } from "react";
import { Link } from "wouter";
import { Goal } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, getGoalTypeClass } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";

interface GoalHierarchyProps {
  goals: Goal[];
}

export function GoalHierarchy({ goals }: GoalHierarchyProps) {
  const [expandedGoals, setExpandedGoals] = useState<number[]>([]);

  // Get root goals (those without a parent)
  const rootGoals = goals?.filter(goal => !goal.parentGoalId);

  // Function to get child goals for a parent
  const getChildGoals = (parentId: number) => {
    return goals?.filter(goal => goal.parentGoalId === parentId);
  };

  // Toggle expanded state for a goal
  const toggleExpand = (goalId: number) => {
    setExpandedGoals(prev => 
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  // Function to expand all goals
  const expandAll = () => {
    setExpandedGoals(goals.map(g => g.id));
  };

  // Function to collapse all goals
  const collapseAll = () => {
    setExpandedGoals([]);
  };

  // Recursive component to render a goal and its children
  const renderGoalTree = (goal: Goal, level: number = 0) => {
    const children = getChildGoals(goal.id);
    const hasChildren = children && children.length > 0;
    const isExpanded = expandedGoals.includes(goal.id);
    
    return (
      <div key={goal.id} className="mb-3">
        <div 
          className={cn(
            "border rounded-lg p-4 transition-all hover:shadow-md",
            getGoalTypeClass(goal.type, "border"),
            level > 0 && "ml-6"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {hasChildren && (
                <button 
                  onClick={() => toggleExpand(goal.id)} 
                  className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
              )}
              <div>
                <div className="flex items-center">
                  <Link href={`/goal/${goal.id}`}>
                    <a className="text-lg font-medium hover:underline">{goal.title}</a>
                  </Link>
                  <Badge className={cn("ml-2", getGoalTypeClass(goal.type, "bg"))}>
                    {goal.type}
                  </Badge>
                  {goal.isCompleted && (
                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/40">
                      Completed
                    </Badge>
                  )}
                  {goal.isArchived && (
                    <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                      Archived
                    </Badge>
                  )}
                </div>
                {goal.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Deadline: {formatDate(goal.deadline)}
                </div>
              </div>
            </div>
            <div>
              <Link href={`/goal/${goal.id}`}>
                <Button variant="outline" size="sm">View Details</Button>
              </Link>
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {children?.map(childGoal => renderGoalTree(childGoal, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // Visual hierarchical representation (framework-style)
  const renderHierarchicalView = () => {
    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Goal Timeline</h3>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-6">
          {rootGoals?.map(goal => (
            <div key={goal.id} className="flex-1 min-w-[300px]">
              <div 
                className={cn(
                  "border rounded-lg p-4 transition-all hover:shadow-md",
                  getGoalTypeClass(goal.type, "border")
                )}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/goal/${goal.id}`}>
                      <a className="text-lg font-semibold hover:underline">{goal.title}</a>
                    </Link>
                    <Badge className={cn(getGoalTypeClass(goal.type, "bg"))}>
                      {goal.type}
                    </Badge>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{goal.description}</p>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Deadline: {formatDate(goal.deadline)}
                  </div>
                </div>
              </div>
              
              {/* First level children */}
              {getChildGoals(goal.id)?.length > 0 && (
                <div className="mt-4 pl-4 space-y-3">
                  {getChildGoals(goal.id)?.map(childGoal => (
                    <div key={childGoal.id} className="relative">
                      {/* Connector line */}
                      <div className="absolute top-0 left-0 h-full w-0.5 -ml-4 bg-gray-200 dark:bg-gray-700"></div>
                      
                      <div 
                        className={cn(
                          "border rounded-lg p-3 transition-all hover:shadow-md",
                          getGoalTypeClass(childGoal.type, "border")
                        )}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-1">
                            <Link href={`/goal/${childGoal.id}`}>
                              <a className="text-md font-medium hover:underline">{childGoal.title}</a>
                            </Link>
                            <Badge className={cn(getGoalTypeClass(childGoal.type, "bg"), "text-xs")}>
                              {childGoal.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Deadline: {formatDate(childGoal.deadline)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Second level children */}
                      {getChildGoals(childGoal.id)?.length > 0 && (
                        <div className="mt-2 ml-4 pl-4 space-y-2">
                          {getChildGoals(childGoal.id)?.map(grandchildGoal => (
                            <div key={grandchildGoal.id} className="relative">
                              {/* Connector line */}
                              <div className="absolute top-0 left-0 h-full w-0.5 -ml-4 bg-gray-200 dark:bg-gray-700"></div>
                              
                              <div 
                                className={cn(
                                  "border rounded-lg p-2 transition-all hover:shadow-md",
                                  getGoalTypeClass(grandchildGoal.type, "border")
                                )}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between">
                                    <Link href={`/goal/${grandchildGoal.id}`}>
                                      <a className="text-sm font-medium hover:underline">{grandchildGoal.title}</a>
                                    </Link>
                                    <Badge className={cn(getGoalTypeClass(grandchildGoal.type, "bg"), "text-xs")}>
                                      {grandchildGoal.type}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Goal Tree View</h3>
        <div className="space-y-4">
          {rootGoals?.map(goal => renderGoalTree(goal))}
        </div>
      </div>
      
      {renderHierarchicalView()}
    </div>
  );
}