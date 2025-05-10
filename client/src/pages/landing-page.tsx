import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Target,
  Calendar,
  ListChecks,
  LineChart,
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  Rocket,
  Users,
  Flame,
  BarChart2,
  ArrowRight,
  LogIn,
  UserPlus,
  MousePointerClick
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">GoalQuest</h1>
            </div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <ThemeToggle />
              
              {user ? (
                <Link href="/dashboard">
                  <Button>
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/auth">
                    <Button variant="outline">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          {/* Hero section */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 mb-12">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                <span className="block mb-1">Set Goals, Track Progress,</span>
                <span className="block">Achieve More</span>
              </h2>
              <p className="mt-4 text-lg leading-6 text-indigo-100 max-w-2xl mx-auto">
                GoalQuest is your all-in-one platform for setting purposeful goals, breaking them into actionable tasks, 
                and visualizing your progress with powerful analytics and motivational achievements.
              </p>
              <div className="mt-6 max-w-2xl mx-auto flex flex-wrap justify-center gap-4 text-white">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-300" />
                  <span>Smart goal templates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-300" />
                  <span>Time-based organization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-300" />
                  <span>Visual progress tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-300" />
                  <span>Achievement system</span>
                </div>
              </div>
              <div className="mt-8 flex justify-center">
                <div className="inline-flex rounded-md shadow">
                  {user ? (
                    <Link href="/dashboard">
                      <Button size="lg" className="px-8 py-6 text-lg">
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/auth">
                      <Button size="lg" className="px-8 py-6 text-lg">
                        Start for Free
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* How it works section */}
          <section className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">How GoalQuest Works</h2>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                A simple but powerful system to achieve your goals
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white dark:bg-gray-900 text-lg font-semibold text-gray-900 dark:text-gray-100">Three Step Process</span>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <Card className="border-t-4 border-indigo-500">
                <CardHeader className="pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <CardTitle className="text-center text-xl">1. Set Clear Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-gray-600 dark:text-gray-400">
                      Create specific, time-bound goals in three timeframes:
                    </p>
                    <div className="flex items-center justify-center space-x-2 py-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="font-medium">Short Term</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">(1-31 days)</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 py-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="font-medium">Medium Term</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">(1-4 months)</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 py-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="font-medium">Long Term</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">(4+ months)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Step 2 */}
              <Card className="border-t-4 border-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <CardTitle className="text-center text-xl">2. Break Down Into Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-gray-600 dark:text-gray-400">
                      Divide your goals into smaller, actionable tasks. Schedule them across your calendar.
                    </p>
                    <div className="max-w-xs mx-auto mt-4 space-y-3">
                      <div className="flex items-center border-l-4 border-green-500 pl-3 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm">Complete project outline</span>
                      </div>
                      <div className="flex items-center border-l-4 border-amber-500 pl-3 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <Clock className="h-4 w-4 text-amber-500 mr-2" />
                        <span className="text-sm">Research competitors</span>
                      </div>
                      <div className="flex items-center border-l-4 border-blue-500 pl-3 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                        <span className="text-sm">Set up weekly meetings</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Step 3 */}
              <Card className="border-t-4 border-purple-500">
                <CardHeader className="pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <CardTitle className="text-center text-xl">3. Track & Improve</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-gray-600 dark:text-gray-400">
                      Monitor your progress, stay motivated with streaks and achievements, and adjust your goals as needed.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded flex flex-col items-center">
                        <Flame className="h-5 w-5 text-amber-500 mb-1" />
                        <span className="text-xs font-medium">Streaks</span>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded flex flex-col items-center">
                        <LineChart className="h-5 w-5 text-blue-500 mb-1" />
                        <span className="text-xs font-medium">Progress</span>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded flex flex-col items-center">
                        <Award className="h-5 w-5 text-green-500 mb-1" />
                        <span className="text-xs font-medium">Achievements</span>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded flex flex-col items-center">
                        <BarChart2 className="h-5 w-5 text-purple-500 mb-1" />
                        <span className="text-xs font-medium">Analytics</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
          
          {/* Goal Hierarchy Diagram */}
          <section className="mb-16">
            <Card>
              <CardHeader>
                <CardTitle>The Goal Hierarchy System</CardTitle>
                <CardDescription>
                  How GoalQuest organizes your ambitions into achievable steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative pt-8">
                  <div className="mx-auto max-w-3xl">
                    {/* Level 1: Long-term Goal */}
                    <div className="flex justify-center mb-12">
                      <div className="w-64 p-4 border-2 border-purple-500 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center relative">
                        <span className="absolute -top-8 left-0 right-0 text-sm font-medium text-gray-500 dark:text-gray-400">LONG TERM</span>
                        <Target className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                        <h3 className="font-medium">Write a Novel</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">6 months</p>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-7 w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>
                      </div>
                    </div>
                    
                    {/* Level 2: Medium-term Goals */}
                    <div className="grid grid-cols-2 gap-6 mb-12">
                      <div className="relative">
                        <div className="w-full p-3 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                          <span className="absolute -top-6 left-0 right-0 text-xs font-medium text-gray-500 dark:text-gray-400">MEDIUM TERM</span>
                          <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                          <h4 className="font-medium text-sm">Complete First Draft</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">3 months</p>
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-5 w-0.5 h-6 bg-gray-300 dark:bg-gray-700"></div>
                      </div>
                      <div className="relative">
                        <div className="w-full p-3 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                          <span className="absolute -top-6 left-0 right-0 text-xs font-medium text-gray-500 dark:text-gray-400">MEDIUM TERM</span>
                          <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                          <h4 className="font-medium text-sm">Edit & Revise</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">2 months</p>
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-5 w-0.5 h-6 bg-gray-300 dark:bg-gray-700"></div>
                      </div>
                    </div>
                    
                    {/* Level 3: Short-term Goals */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                      <div className="relative">
                        <div className="w-full p-2 border-2 border-amber-500 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                          <span className="absolute -top-5 left-0 right-0 text-xs font-medium text-gray-500 dark:text-gray-400">SHORT TERM</span>
                          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                          <h5 className="font-medium text-xs">Outline Chapters</h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400">2 weeks</p>
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4 w-0.5 h-5 bg-gray-300 dark:bg-gray-700"></div>
                      </div>
                      <div className="relative">
                        <div className="w-full p-2 border-2 border-amber-500 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                          <span className="absolute -top-5 left-0 right-0 text-xs font-medium text-gray-500 dark:text-gray-400">SHORT TERM</span>
                          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                          <h5 className="font-medium text-xs">Character Profiles</h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400">3 weeks</p>
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4 w-0.5 h-5 bg-gray-300 dark:bg-gray-700"></div>
                      </div>
                      <div className="relative">
                        <div className="w-full p-2 border-2 border-amber-500 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                          <span className="absolute -top-5 left-0 right-0 text-xs font-medium text-gray-500 dark:text-gray-400">SHORT TERM</span>
                          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                          <h5 className="font-medium text-xs">Research Setting</h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400">10 days</p>
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4 w-0.5 h-5 bg-gray-300 dark:bg-gray-700"></div>
                      </div>
                    </div>
                    
                    {/* Level 4: Daily Tasks */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        <h6 className="text-xs font-medium">Write 500 words</h6>
                      </div>
                      <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        <h6 className="text-xs font-medium">Interview expert</h6>
                      </div>
                      <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        <h6 className="text-xs font-medium">Edit chapter 3</h6>
                      </div>
                      <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        <h6 className="text-xs font-medium">Revise dialogue</h6>
                      </div>
                    </div>
                    
                    {/* Labels */}
                    <div className="absolute top-3 left-1 text-xs font-bold text-gray-400 dark:text-gray-500">VISION</div>
                    <div className="absolute bottom-0 left-1 text-xs font-bold text-gray-400 dark:text-gray-500">DAILY ACTION</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          
          {/* Key Features */}
          <section className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Key Features</h2>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                Tools and capabilities designed to maximize your productivity
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="bg-indigo-100 dark:bg-indigo-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                    <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <CardTitle>Smart Goal Blueprint System</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose from pre-made goal templates or create your own custom blueprints with SMART goal guidance. Get workload analysis and deadline recommendations.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded text-xs font-medium">Custom templates</span>
                    <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded text-xs font-medium">Workload analysis</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="bg-amber-100 dark:bg-amber-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                    <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle>Advanced Task Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Google Calendar-style interface with morning/afternoon/evening time periods. Create repeating tasks, use context menus, and search for tasks easily.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded text-xs font-medium">Time periods</span>
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded text-xs font-medium">Repeating tasks</span>
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded text-xs font-medium">Context menus</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="bg-green-100 dark:bg-green-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                    <Flame className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Streaks & Consistency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Build momentum with daily streaks and consistency tracking. Goal-specific streaks show your progress with each objective, alongside your overall activity.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium">Goal-specific streaks</span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium">Consistency badges</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="bg-purple-100 dark:bg-purple-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                    <BarChart2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle>Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Powerful progress tracking with detailed charts and GitHub-style heatmaps. Monitor goal distribution, term progress, and identify your most productive days.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">Activity heatmaps</span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">Progress charts</span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">On-time completion</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="bg-blue-100 dark:bg-blue-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>Achievement System</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Gamification system with achievements and milestone badges that update in real-time. Unlock rewards for consistency, completing goals, and establishing productive habits.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">Milestone badges</span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">Real-time updates</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="bg-pink-100 dark:bg-pink-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                    <MousePointerClick className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <CardTitle>Intuitive User Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Beautiful design with dark/light mode, responsive layout, and delightful micro-animations. Customizable views and right-click context menus for faster interaction.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 rounded text-xs font-medium">Dark mode</span>
                    <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 rounded text-xs font-medium">Micro-animations</span>
                    <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 rounded text-xs font-medium">Context menus</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
          
          {/* Feature Highlights */}
          <section className="mb-16">
            <Card>
              <CardHeader>
                <CardTitle>Powerful Features That Drive Success</CardTitle>
                <CardDescription>
                  How GoalQuest's tools help you achieve your ambitions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col space-y-6">
                    <div className="flex items-start">
                      <div className="bg-amber-100 dark:bg-amber-900/50 rounded-full p-2 mr-4 mt-1">
                        <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg mb-1">Focused Time Management</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          GoalQuest features powerful time-based organization tools to keep you on track:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Google Calendar-style task view with morning/afternoon/evening sections</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Repeatable tasks with customizable frequency (daily, weekly, etc.)</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Time period settings for optimal productivity scheduling</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-2 mr-4 mt-1">
                        <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg mb-1">Insightful Analytics</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Track your progress with detailed metrics that reveal your true performance:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>GitHub-style heatmaps showing your daily activity patterns</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Goal-specific streaks to measure consistent progress</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>On-time task completion percentage to improve time management</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-6">
                    <div className="flex items-start">
                      <div className="bg-indigo-100 dark:bg-indigo-900/50 rounded-full p-2 mr-4 mt-1">
                        <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg mb-1">Goal Framework Structure</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Organize goals in timeframes that naturally align with how humans achieve:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Short-term goals (under 31 days) for immediate achievements</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Medium-term goals (1-4 months) for substantive progress</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Long-term goals (4+ months) for life-changing objectives</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-full p-2 mr-4 mt-1">
                        <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg mb-1">Intuitive Experience</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Designed for maximum productivity with modern interface features:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Right-click context menus for quick actions on goals and tasks</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Customizable views with toggles for your preferred workflow</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span>Celebration animations and micro-interactions for motivation</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          
          {/* Call to Action */}
          {/* Why Choose GoalQuest */}
          <section className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Why Choose GoalQuest</h2>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">
                GoalQuest stands apart from other productivity tools with our unique approach to goal achievement
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="mb-4 bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-full flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Beyond Basic To-Do Lists</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Unlike simple to-do apps, GoalQuest connects your daily tasks directly to your bigger life goals, creating meaning and purpose in your everyday actions.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="mb-4 bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Motivation Through Achievement</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Our achievement system celebrates your progress at every step, helping you stay motivated when other apps leave you feeling disconnected from your progress.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="mb-4 bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center">
                  <LineChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Data-Driven Success</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  GoalQuest provides detailed analytics on your productivity patterns, helping you make smarter decisions about how and when to tackle your most important tasks.
                </p>
              </div>
            </div>
          </section>
          
          <section className="mb-10">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl px-6 py-10 sm:py-12 md:px-12 text-center text-white shadow-lg">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Transform Your Goals Into Reality?</h2>
              <p className="max-w-2xl mx-auto mb-8 text-blue-100">
                Start organizing your ambitions, tracking your progress, and celebrating your achievements today.
              </p>
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" variant="secondary" className="px-8">
                      <Rocket className="h-5 w-5 mr-2" />
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/auth">
                    <Button size="lg" variant="secondary" className="px-8">
                      <Rocket className="h-5 w-5 mr-2" />
                      Get Started
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <footer className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Privacy Policy
            </a>
            <Link href="/about" className="text-gray-400 hover:text-gray-500">
              Example Workflows
            </Link>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} GoalQuest. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}