import { format, startOfWeek, endOfWeek, eachDayOfInterval, differenceInCalendarWeeks, addDays, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Task } from "@shared/schema";

interface GoalHeatmapProps {
  title: string;
  goalType: string;
  tasks: Task[];
  showLegend?: boolean;
}

export function GoalHeatmap({ title, goalType, tasks, showLegend = false }: GoalHeatmapProps) {
  const today = new Date();
  const currentYear = today.getFullYear();

  // 1) Define full calendar-year grid (Mon of week with Jan 1 → Sun of week with Dec 31)
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd   = new Date(currentYear, 11, 31);
  const graphStart = startOfWeek(yearStart, { weekStartsOn: 1 });
  const graphEnd   = endOfWeek(yearEnd,   { weekStartsOn: 1 });

  // 2) Cell sizing and label offset
  const CELL_SIZE = 10;
  const CELL_GAP  = 2;
  const COL_WIDTH = CELL_SIZE + CELL_GAP;
  const LABEL_OFFSET_WEEKS = 3; // shift month labels right by 4 columns

  // 3) Build day→count map
  const getTaskCountsPerDay = (): Record<string, number> => {
    const counts: Record<string, number> = {};
    eachDayOfInterval({ start: graphStart, end: graphEnd }).forEach(date => {
      counts[format(date, "yyyy-MM-dd")] = 0;
    });
    tasks.forEach(task => {
      if (task.isCompleted && task.completedAt) {
        let d: Date;
        try {
          d = typeof task.completedAt === 'string'
            ? parseISO(task.completedAt)
            : new Date(task.completedAt);
          if (!isNaN(d.getTime())) {
            const key = format(d, "yyyy-MM-dd");
            if (counts[key] !== undefined) counts[key]++;
          }
        } catch {
          // ignore invalid
        }
      }
    });
    return counts;
  };
  const taskCounts = getTaskCountsPerDay();

  // 4) Color intensity with scaled shading based on task count
  const getColorIntensity = (count: number): string => {
    const baseColors: Record<string, string[]> = {
      short:  [
        "#ffedd5", // 0 tasks
        "#fed7aa", // 1 task
        "#fdba74", // 2 tasks
        "#fb923c", // 3 tasks
        "#f97316", // 4 tasks
        "#ea580c", // 5 tasks
        "#c2410c", // 6-7 tasks
        "#9a3412", // 8-9 tasks
        "#7c2d12"  // 10+ tasks
      ],
      medium: [
        "#dbeafe", // 0 tasks
        "#bfdbfe", // 1 task
        "#93c5fd", // 2 tasks
        "#60a5fa", // 3 tasks
        "#3b82f6", // 4 tasks
        "#2563eb", // 5 tasks
        "#1d4ed8", // 6-7 tasks
        "#1e40af", // 8-9 tasks
        "#1e3a8a"  // 10+ tasks
      ],
      all: [
        "#e0e7ff", // 0 tasks
        "#c7d2fe", // 1 task
        "#a5b4fc", // 2 tasks
        "#818cf8", // 3 tasks
        "#6366f1", // 4 tasks
        "#4f46e5", // 5 tasks
        "#4338ca", // 6-7 tasks
        "#3730a3", // 8-9 tasks
        "#312e81"  // 10+ tasks
      ],
      long: [
        "#f3e8ff", // 0 tasks
        "#e9d5ff", // 1 task
        "#d8b4fe", // 2 tasks
        "#c084fc", // 3 tasks
        "#a855f7", // 4 tasks
        "#9333ea", // 5 tasks
        "#7e22ce", // 6-7 tasks
        "#6b21a8", // 8-9 tasks
        "#581c87"  // 10+ tasks
      ]
    };
    
    const colors = baseColors[goalType] ?? baseColors.long;
    
    // Return different intensities based on count thresholds
    if (count === 0) return colors[0];
    if (count === 1) return colors[1];
    if (count === 2) return colors[2];
    if (count === 3) return colors[3];
    if (count === 4) return colors[4];
    if (count === 5) return colors[5];
    if (count <= 7) return colors[6];
    if (count <= 9) return colors[7];
    return colors[8]; // 10+ tasks - darkest shade
  };

  // 5) Month labels (shifted right by LABEL_OFFSET_WEEKS)
  const generateMonthLabels = () => {
    const labels: React.ReactNode[] = [];
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(currentYear, m, 1);
      const weekIndex = differenceInCalendarWeeks(monthDate, graphStart, { weekStartsOn: 1 });
      labels.push(
        <div
          key={m}
          className="absolute"
          style={{ left: `${(weekIndex + LABEL_OFFSET_WEEKS) * COL_WIDTH}px` }}
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(monthDate, 'MMM')}
          </span>
        </div>
      );
    }
    return <div className="relative h-6 mb-1">{labels}</div>;
  };

  // 6) Weekday labels aligned per-row via grid
  const weekdayLabels = () => {
    const days = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    return (
      <div className="grid grid-rows-7 gap-[2px] h-[82px] mr-2 text-xs text-gray-500 dark:text-gray-400">
        {days.map((d, i) => (
          <span key={i} className="h-[10px] leading-[10px]">
            {d}
          </span>
        ))}
      </div>
    );
  };

  // 7) Render heatmap cells
  const renderCells = () => {
    const numWeeks = differenceInCalendarWeeks(graphEnd, graphStart, { weekStartsOn: 1 }) + 1;
    const cols: React.ReactNode[] = [];
    for (let w = 0; w < numWeeks; w++) {
      const weekStart = addDays(graphStart, w * 7);
      const days: React.ReactNode[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d);
        const key = format(date, 'yyyy-MM-dd');
        const count = taskCounts[key] || 0;
        const color = getColorIntensity(count);
        const highlight = isSameDay(date, today)
          ? 'ring-1 ring-gray-400 dark:ring-gray-600'
          : '';
        days.push(
          <div
            key={key}
            className={`h-[10px] w-[10px] rounded-sm ${highlight}`}
            style={{ backgroundColor: color }}
            title={`${format(date, 'MMM d, yyyy')}: ${count} task${count === 1 ? '' : 's'}`}
          />
        );
      }
      cols.push(
        <div key={w} className="flex flex-col gap-[2px]">
          {days}
        </div>
      );
    }
    return <div className="flex gap-[2px] overflow-x-auto pb-2">{cols}</div>;
  };

  return (
    <Card className="dark:border-gray-800">
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <span
              className={`h-3 w-3 rounded-full mr-2 $
                goalType === 'short'
                  ? 'bg-amber-500 dark:bg-amber-600'
                  : goalType === 'medium'
                  ? 'bg-blue-500 dark:bg-blue-600'
                  : goalType === 'all'
                  ? 'bg-primary dark:bg-primary/80'
                  : 'bg-purple-500 dark:bg-purple-600'`}
            ></span>
            {title}
          </h4>
          {showLegend && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Less</span>
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(0) }} title="0 tasks" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(1) }} title="1 task" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(2) }} title="2 tasks" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(3) }} title="3 tasks" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(4) }} title="4 tasks" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(5) }} title="5 tasks" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(6) }} title="6-7 tasks" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(8) }} title="8-9 tasks" />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: getColorIntensity(10) }} title="10+ tasks" />
              <span>More</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:p-6 overflow-x-auto">
        <div className="flex justify-center">
          <div className="flex flex-col">
            {generateMonthLabels()}
            <div className="flex">
              {weekdayLabels()}
              {renderCells()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}