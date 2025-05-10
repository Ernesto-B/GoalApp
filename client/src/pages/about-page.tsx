import { Sidebar } from "@/components/sidebar";
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
  Briefcase,
  CheckCircle2,
  Clock,
  Award,
  Rocket,
  Users,
  Flame,
  BarChart2,
  ArrowRight,
  Brain,
  BookOpen,
  HeartPulse,
  DollarSign,
  GraduationCap,
  Home,
  Sparkles,
  Lightbulb
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.7 }
  }
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-1 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <motion.div 
            className="md:flex md:items-center md:justify-between mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
                Example Workflows
              </h1>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                Powerful ways to apply GoalQuest to different areas of your life
              </p>
            </div>
          </motion.div>
          
          {/* Hero section */}
          <motion.div 
            className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div 
              className="absolute inset-0 opacity-30 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:24px_24px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 1.5 }}
            ></motion.div>
            <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
              <motion.h2 
                className="text-3xl font-extrabold text-white sm:text-4xl"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <motion.span 
                  className="block mb-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >Success Blueprints</motion.span>
                <motion.span 
                  className="block"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >For Any Goal</motion.span>
              </motion.h2>
              <motion.p 
                className="mt-4 text-lg leading-6 text-indigo-100 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                Discover proven frameworks to achieve success in career advancement, personal development,
                health transformation, financial growth, and more.
              </motion.p>
            </div>
          </motion.div>
          
          {/* Career Growth Workflow */}
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-16"
          >
            <motion.div 
              variants={itemVariants}
              className="text-center mb-10"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
                Career Growth Blueprint
              </h2>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                Strategically advance your professional life with structured goal planning
              </p>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="mb-8 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-900/50 w-10 h-10 rounded-full flex items-center justify-center mr-4">
                      <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Career Advancement Timeline</CardTitle>
                      <CardDescription>From entry level to leadership in structured steps</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Long Term Goal Example */}
                    <div className="border-l-4 border-purple-500 pl-4 py-2">
                      <div className="flex items-center mb-2">
                        <div className="bg-purple-100 dark:bg-purple-900/50 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Long-term Goal (1-2 years)</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Secure Senior Management Position</p>
                        </div>
                      </div>
                      
                      {/* Medium Term Goals */}
                      <div className="ml-11 mb-4 space-y-4">
                        <div className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center mb-2">
                            <div className="bg-blue-100 dark:bg-blue-900/50 w-7 h-7 rounded-full flex items-center justify-center mr-3">
                              <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-medium">Medium-term Goal (3-4 months)</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">Lead a High-Impact Project</p>
                            </div>
                          </div>
                          
                          {/* Short Term Goals */}
                          <div className="ml-10 space-y-3">
                            <div className="border-l-4 border-amber-500 pl-4 py-2">
                              <div className="flex items-center">
                                <div className="bg-amber-100 dark:bg-amber-900/50 w-6 h-6 rounded-full flex items-center justify-center mr-3">
                                  <Target className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <h5 className="font-medium text-sm">Short-term Goal (2-3 weeks)</h5>
                                  <p className="text-gray-600 dark:text-gray-400 text-sm">Develop Project Proposal</p>
                                </div>
                              </div>
                              
                              {/* Tasks */}
                              <div className="ml-9 mt-2 space-y-1.5">
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-sm">Research industry trends - Monday (morning)</span>
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-sm">Identify 3 pain points - Tuesday (afternoon)</span>
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-sm">Draft solution outline - Thursday (evening)</span>
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-sm">Create project timeline - Friday (morning)</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-l-4 border-amber-500 pl-4 py-2">
                              <div className="flex items-center">
                                <div className="bg-amber-100 dark:bg-amber-900/50 w-6 h-6 rounded-full flex items-center justify-center mr-3">
                                  <Target className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <h5 className="font-medium text-sm">Short-term Goal (1 month)</h5>
                                  <p className="text-gray-600 dark:text-gray-400 text-sm">Secure Executive Sponsorship</p>
                                </div>
                              </div>
                              
                              {/* Tasks sample */}
                              <div className="ml-9 mt-2 space-y-1.5">
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-sm">Create executive summary deck</span>
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-sm">Schedule meetings with potential sponsors</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center">
                            <div className="bg-blue-100 dark:bg-blue-900/50 w-7 h-7 rounded-full flex items-center justify-center mr-3">
                              <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-medium">Medium-term Goal (2-3 months)</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">Develop Leadership Skills</p>
                            </div>
                          </div>
                          
                          {/* Short Term Goals */}
                          <div className="ml-10 mt-2 space-y-1.5">
                            <div className="flex items-center">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              <span className="text-sm">Complete leadership training course</span>
                            </div>
                            <div className="flex items-center">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              <span className="text-sm">Find a mentor within the organization</span>
                            </div>
                            <div className="flex items-center">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              <span className="text-sm">Practice public speaking at team meetings</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
                      <div className="text-center">
                        <h3 className="font-medium mb-2">Key Benefits</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex flex-col items-center">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                              <Rocket className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span>Focused Progress</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="bg-blue-100 dark:bg-blue-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                              <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span>Measurable Growth</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="bg-amber-100 dark:bg-amber-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span>Strategic Thinking</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="bg-purple-100 dark:bg-purple-900/50 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span>Visibility to Leaders</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link to="/goal/new" className="w-full">
                    <Button variant="outline" className="w-full" size="sm">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Apply Blueprint
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.section>
          
          {/* Personal Development Workflow */}
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-16"
          >
            <motion.div 
              variants={itemVariants}
              className="text-center mb-10"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
                Personal Development Blueprint
              </h2>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                Transform your life with intentional skill acquisition and habit formation
              </p>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="mb-8 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center">
                    <div className="bg-purple-100 dark:bg-purple-900/50 w-10 h-10 rounded-full flex items-center justify-center mr-4">
                      <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle>Mind & Skill Mastery System</CardTitle>
                      <CardDescription>Deliberate practice and continuous learning framework</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div className="bg-amber-100 dark:bg-amber-900/50 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                            <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-medium">Long-term Goal</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Master a New Language</p>
                          </div>
                        </div>
                        
                        <div className="ml-11 space-y-2 border-l-2 border-dashed border-gray-300 dark:border-gray-700 pl-4 py-2">
                          <div>
                            <h5 className="text-sm font-medium">Medium Goals (3 months each)</h5>
                            <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Achieve A1 Proficiency</span>
                              </li>
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Achieve A2 Proficiency</span>
                              </li>
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Achieve B1 Proficiency</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium">Weekly Tasks</h5>
                            <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>30 minutes daily vocabulary</span>
                              </li>
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Language exchange (2x weekly)</span>
                              </li>
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Grammar exercises (3x weekly)</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div className="bg-purple-100 dark:bg-purple-900/50 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-medium">Long-term Goal</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Develop Creative Writing Skills</p>
                          </div>
                        </div>
                        
                        <div className="ml-11 space-y-2 border-l-2 border-dashed border-gray-300 dark:border-gray-700 pl-4 py-2">
                          <div>
                            <h5 className="text-sm font-medium">Medium Goals</h5>
                            <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Complete 10 Short Stories</span>
                              </li>
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Join Writing Workshop</span>
                              </li>
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Start Novel Draft</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium">Weekly Tasks</h5>
                            <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Daily writing (500 words)</span>
                              </li>
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Read craft books (3x weekly)</span>
                              </li>
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Analyze published work</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div className="bg-blue-100 dark:bg-blue-900/50 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                            <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-medium">Long-term Goal</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Earn Professional Certification</p>
                          </div>
                        </div>
                        
                        <div className="ml-11 space-y-2 border-l-2 border-dashed border-gray-300 dark:border-gray-700 pl-4 py-2">
                          <div>
                            <h5 className="text-sm font-medium">Medium Goals</h5>
                            <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Complete Core Modules</span>
                              </li>
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Pass Practice Exams</span>
                              </li>
                              <li className="flex items-center">
                                <Target className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0" />
                                <span>Obtain Certification</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium">Weekly Tasks</h5>
                            <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Study sessions (5x weekly)</span>
                              </li>
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Practice exercises (daily)</span>
                              </li>
                              <li className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                <span>Review sessions (2x weekly)</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link to="/goal/new" className="w-full">
                    <Button variant="outline" className="w-full" size="sm">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Apply Blueprint
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.section>
          
          {/* Health Transformation Workflow */}
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-16"
          >
            <motion.div 
              variants={itemVariants}
              className="text-center mb-10"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
                Health Transformation Blueprint
              </h2>
              <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                Achieve your fitness and wellbeing goals with a structured approach
              </p>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="mb-8 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center">
                    <div className="bg-green-100 dark:bg-green-900/50 w-10 h-10 rounded-full flex items-center justify-center mr-4">
                      <HeartPulse className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <CardTitle>Holistic Wellness Roadmap</CardTitle>
                      <CardDescription>Balanced approach to physical, mental, and nutritional health</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-6">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      This blueprint helps you create balanced, achievable health goals with consistent daily tasks that build lasting habits. The focus is on sustainable progress rather than quick fixes.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="bg-purple-100 dark:bg-purple-900/50 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">Long-term Goal (1 year)</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Complete Olympic Triathlon</p>
                        </div>
                      </div>
                      
                      <div className="ml-11 space-y-3">
                        <div className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center mb-2">
                            <div className="bg-blue-100 dark:bg-blue-900/50 w-7 h-7 rounded-full flex items-center justify-center mr-3">
                              <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h5 className="font-medium text-sm">Medium Goal (4 months)</h5>
                              <p className="text-gray-600 dark:text-gray-400 text-xs">Build Base Endurance</p>
                            </div>
                          </div>
                          
                          <div className="ml-10 space-y-2">
                            <div className="border-l-4 border-amber-500 pl-4 py-2">
                              <div className="flex items-center">
                                <div className="bg-amber-100 dark:bg-amber-900/50 w-6 h-6 rounded-full flex items-center justify-center mr-3">
                                  <Target className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <h6 className="font-medium text-xs">Short Goal (1 month)</h6>
                                  <p className="text-gray-600 dark:text-gray-400 text-xs">Swim 500m without stopping</p>
                                </div>
                              </div>
                              
                              <div className="ml-9 mt-2 space-y-1.5">
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-xs">Swim practice 3x weekly</span>
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-xs">Technique drills 2x weekly</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-l-4 border-amber-500 pl-4 py-2">
                              <div className="flex items-center">
                                <div className="bg-amber-100 dark:bg-amber-900/50 w-6 h-6 rounded-full flex items-center justify-center mr-3">
                                  <Target className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <h6 className="font-medium text-xs">Short Goal (1 month)</h6>
                                  <p className="text-gray-600 dark:text-gray-400 text-xs">Run 5K without walking</p>
                                </div>
                              </div>
                              
                              <div className="ml-9 mt-2 space-y-1.5">
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-xs">Run/walk intervals 3x weekly</span>
                                </div>
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                  <span className="text-xs">Strength training 2x weekly</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <h5 className="font-medium text-sm mb-2 flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-blue-500" />
                            Daily Habit Formation
                          </h5>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">Morning Routine (6:00 AM)</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">10 min stretching, 16 oz water, healthy breakfast</p>
                              </div>
                            </li>
                            <li className="flex items-start">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">Lunch Break (12:30 PM)</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">10 min walk, balanced meal with protein</p>
                              </div>
                            </li>
                            <li className="flex items-start">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">Evening Wind-down (9:00 PM)</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">5 min meditation, sleep preparation</p>
                              </div>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <h5 className="font-medium text-sm mb-2 flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-green-500" />
                            Weekly Schedule Template
                          </h5>
                          <div className="text-xs grid grid-cols-7 gap-1">
                            <div className="text-center font-medium">Mon</div>
                            <div className="text-center font-medium">Tue</div>
                            <div className="text-center font-medium">Wed</div>
                            <div className="text-center font-medium">Thu</div>
                            <div className="text-center font-medium">Fri</div>
                            <div className="text-center font-medium">Sat</div>
                            <div className="text-center font-medium">Sun</div>
                            
                            <div className="text-center bg-blue-100 dark:bg-blue-900/50 p-1 rounded text-xs">Swim AM</div>
                            <div className="text-center bg-red-100 dark:bg-red-900/50 p-1 rounded text-xs">Run PM</div>
                            <div className="text-center bg-purple-100 dark:bg-purple-900/50 p-1 rounded text-xs">Rest</div>
                            <div className="text-center bg-amber-100 dark:bg-amber-900/50 p-1 rounded text-xs">Bike AM</div>
                            <div className="text-center bg-green-100 dark:bg-green-900/50 p-1 rounded text-xs">Strength</div>
                            <div className="text-center bg-blue-100 dark:bg-blue-900/50 p-1 rounded text-xs">Long Run</div>
                            <div className="text-center bg-purple-100 dark:bg-purple-900/50 p-1 rounded text-xs">Rest</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link to="/goal/new" className="w-full">
                    <Button variant="outline" className="w-full" size="sm">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Apply Blueprint
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.section>

          {/* Call to Action */}
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-16 relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.2] [mask-image:radial-gradient(white,transparent_85%)]"></div>
            <div className="relative px-6 py-12 sm:px-12 text-center">
              <motion.h2 
                variants={itemVariants}
                className="text-2xl font-bold text-white sm:text-3xl"
              >
                Start Your Journey Today
              </motion.h2>
              <motion.p 
                variants={itemVariants}
                className="max-w-2xl mx-auto text-gray-200 mt-4 mb-6"
              >
                Begin with one of these blueprints or create your own custom goal structure.
                GoalQuest's flexible system adapts to your unique needs and aspirations.
              </motion.p>
              <motion.div variants={itemVariants}>
                <Link to="/goal/new">
                  <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                    Create Your First Goal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}