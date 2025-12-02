"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAgent } from "@/hooks/use-agent";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity as ActivityIcon,
  Clock,
  XCircle,
  CircleCheck,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import colors from "tailwindcss/colors";
import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item";
import { AgentCard } from "@/components/agent-card";
import { AgentVersions } from "@/components/agent-versions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTime } from "luxon";
import { Terminal, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { AgentDetail, api } from "@/lib/api-client";

interface Activity {
  id: string;
  type: string;
  status: string;
  duration: number | null;
  createdAt: string;
  agentVersion: string;
}

const chartConfig = {
  tasks: {
    label: "Tasks",
    color: colors.indigo[500],
  },
} satisfies ChartConfig;

export default function AgentOverviewPage() {
  const params = useParams();
  const agentName = params.agentName as string;

  const { agent: baseAgent, loading } = useAgent();
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<"24h" | "48h" | "7d" | "30d" | "60d">(
    "24h"
  );
  const [versionCount, setVersionCount] = useState(0);

  // Fetch Full Agent Card Details
  const { data: agentDetails } = useSWR<AgentDetail>(
    agentName ? ["agent-card", agentName] : null,
    ([, name]: [string, string]) => api.agent.card(name)
  );

  // Use details if available, otherwise fall back to base agent
  const agent = agentDetails || (baseAgent as unknown as AgentDetail);

  useEffect(() => {
    const fetchVersionCount = async () => {
      try {
        const { pagination } = await api.agent.versions(agentName);
        setVersionCount(pagination.total);
      } catch (error) {
        console.error("Failed to fetch version count:", error);
      }
    };
    if (agentName) fetchVersionCount();
  }, [agentName]);

  // Fetch Metrics with SWR
  const {
    data: metrics,
    isLoading: loadingMetrics,
    error: metricsError,
  } = useSWR(
    agentName ? ["metrics", agentName, range] : null,
    ([, name, r]: [string, string, "24h" | "48h" | "7d" | "30d" | "60d"]) =>
      api.agent.telemetry.metrics(name, r).then((m) => ({
        uptimeDays: 0, // Not available in API yet
        successRate: m?.successRate ?? 0,
        avgLatency: m?.avgDurationMs ?? 0,
        totalTasks: m?.totalExecutions ?? 0,
        chartData: (m?.timeSeries || []).map((t) => {
          let format = "HH:mm";
          if (r === "7d" || r === "30d" || r === "60d") {
            format = "MMM dd";
          } else if (r === "48h") {
            format = "ccc HH:mm";
          }
          return {
            name: DateTime.fromISO(t.timestamp).toFormat(format),
            tasks: t.value,
          };
        }),
      })),
    {
      refreshInterval: 30000,
      shouldRetryOnError: false,
    }
  );

  // Fetch Activities with SWR
  const {
    data: tasksResponse,
    isLoading: loadingActivities,
    error: activitiesError,
  } = useSWR(
    agentName ? ["tasks", agentName, page] : null,
    ([, name, p]: [string, string, number]) =>
      api.agent.telemetry.tasks(name, p, 5),
    {
      refreshInterval: 5000,
      shouldRetryOnError: false,
    }
  );

  const activities: Activity[] =
    tasksResponse?.tasks?.map((t) => ({
      id: t.taskId,
      type: "Task",
      status: t.status,
      duration: t.durationMs || 0,
      createdAt: t.startTime,
      agentVersion: t.agentVersion || "?",
    })) || [];

  const pagination = tasksResponse?.pagination || {
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 1,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agent) {
    return <div>Agent not found</div>;
  }

  const hasChartData = metrics?.chartData && metrics.chartData.length > 0;

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Skills</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {agent?.skills?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered capabilities
            </p>
          </CardContent>
        </Card>
        <Card className="gap-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-5 w-16" />
            ) : metricsError ? (
              <div className="text-sm font-bold text-red-500">-</div>
            ) : (
              <div className="text-sm font-bold">
                {(metrics?.successRate ?? 0).toFixed(2)}%
              </div>
            )}
            <p className="text-xs text-muted-foreground">Based on executions</p>
          </CardContent>
        </Card>
        <Card className="gap-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-5 w-16" />
            ) : metricsError ? (
              <div className="text-sm font-bold text-red-500">-</div>
            ) : (
              <div className="text-sm font-bold">
                {metrics?.uptimeDays ?? 0} Days
              </div>
            )}
            <p className="text-xs text-muted-foreground">Since creation</p>
          </CardContent>
        </Card>
        <Card className="gap-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-5 w-16" />
            ) : metricsError ? (
              <div className="text-sm font-bold text-red-500">-</div>
            ) : (
              <div className="text-sm font-bold">
                {metrics?.avgLatency ?? 0}ms
              </div>
            )}
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-9">
          {/* Histogram Chart */}
          <Card className="border-none shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-1">
              <div>
                <CardTitle className="text-sm">Task Executions</CardTitle>
                <CardDescription className="text-xs">
                  Volume of tasks processed by this agent over time.
                </CardDescription>
              </div>
              <Select
                value={range}
                onValueChange={(v) =>
                  setRange(v as "24h" | "48h" | "7d" | "30d" | "60d")
                }
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="48h">Last 2 Days</SelectItem>
                  <SelectItem value="7d">Last Week</SelectItem>
                  <SelectItem value="30d">Last Month</SelectItem>
                  <SelectItem value="60d">Last 2 Months</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loadingMetrics ? (
                <Skeleton className="h-[150px] w-full" />
              ) : metricsError ? (
                <div className="h-[150px] w-full flex items-center justify-center text-muted-foreground text-sm bg-muted/10 rounded-md">
                  Failed to load execution data.
                </div>
              ) : hasChartData ? (
                <ChartContainer
                  config={chartConfig}
                  className="h-[150px] w-full -ml-6"
                >
                  <BarChart data={metrics?.chartData || []}>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="tasks"
                      fill="var(--color-tasks)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[150px] w-full flex items-center justify-center text-muted-foreground text-sm bg-muted/10 rounded-md">
                  No execution data available for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="col-span-3">
          <Card className="border-none shadow-none">
            <CardHeader className="px-2">
              <CardTitle className="text-sm">About</CardTitle>
              <CardDescription className="text-xs font-bold">
                {agent.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <AgentCard info={agent} />
              <Item
                variant="ghost"
                size="xs"
                asChild
                className="hover:text-primary"
              >
                <a href={`/agent/${agentName}/logs`}>
                  <ItemMedia>
                    <ActivityIcon className="size-3" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-xs">Logs</ItemTitle>
                  </ItemContent>
                </a>
              </Item>
              <AgentVersions
                agentName={agentName}
                initialVersionCount={versionCount}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Table */}
      <Card className="border-none shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
            <CardDescription className="text-xs">
              Highlights of recent actions performed by this agent.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loadingActivities}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {pagination?.totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => p + 1)}
              disabled={
                page === (pagination?.totalPages || 1) || loadingActivities
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingActivities ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : activitiesError ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8 text-red-500"
                  >
                    Failed to load recent activity.
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No recent activity found.
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="flex items-center gap-2">
                      {activity.status === "completed" ? (
                        <CircleCheck className="size-4 text-green-500" />
                      ) : (
                        <XCircle className="size-4 text-red-500" />
                      )}
                      <span className="text-xs font-medium">
                        {activity.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {activity.type}
                    </TableCell>
                    <TableCell className="text-xs">
                      v{activity.agentVersion}
                    </TableCell>
                    <TableCell>
                      {activity.duration ? `${activity.duration}ms` : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {DateTime.fromISO(activity.createdAt).toRelative()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
