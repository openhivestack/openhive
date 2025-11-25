"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { openhive } from "@/lib/openhive";
import { Agent } from "@/lib/types";
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
  BotIcon,
  Clock,
  Play,
  Pause,
  Loader2,
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
import { ShineBorder } from "@/components/ui/shine-border";
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
import { Badge } from "@/components/ui/badge";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { Terminal, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";

interface Metrics {
  uptimeDays: number;
  successRate: number;
  avgLatency: number;
  chartData: { name: string; tasks: number }[];
  totalTasks: number;
}

interface Activity {
  id: string;
  type: string;
  status: string;
  duration: number | null;
  createdAt: string;
  agentVersion: {
    version: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const chartConfig = {
  tasks: {
    label: "Tasks",
    color: colors.indigo[500],
  },
} satisfies ChartConfig;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentOverviewPage() {
  const params = useParams();
  const agentName = params.agentName as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [page, setPage] = useState(1);
  const [versionCount, setVersionCount] = useState(0);

  const [togglingRuntime, setTogglingRuntime] = useState(false);

  // Fetch Runtime Status with SWR
  const { data: runtimeData, mutate: mutateRuntime } = useSWR(
    `/api/agent/${agentName}/runtime`,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll faster if transitioning
        if (
          data?.status === "STARTING" ||
          data?.status === "STOPPING" ||
          data?.status === "PROVISIONING"
        )
          return 1000;
        // Poll slower if stable
        return 5000;
      },
    }
  );

  const runtimeStatus = runtimeData?.status || "STOPPED";
  const loadingRuntime = !runtimeData && !togglingRuntime;
  const isTransitioning =
    runtimeStatus === "STARTING" ||
    runtimeStatus === "STOPPING" ||
    runtimeStatus === "PROVISIONING";

  // Fetch Agent Metadata
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const data = await openhive.get(agentName);
        // @ts-expect-error - SDK returns AgentCard, but we treat it as Agent
        setAgent(data);
      } catch (error) {
        console.error("Failed to fetch agent:", error);
      } finally {
        setLoading(false);
      }
    };
    if (agentName) fetchAgent();
  }, [agentName]);

  // Fetch Version Count (we can use the separate versions API we made or update the get method)
  // For simplicity, let's just fetch the full list from the new API to get the count
  // Or we can update the Agent fetch to include it.
  // Actually, prisma.registry.ts toAgentCard calculates download count but doesn't seem to expose version count directly.
  // Let's use the new versions API to get the count for now.
  useEffect(() => {
    const fetchVersionCount = async () => {
      try {
        const res = await fetch(`/api/agent/${agentName}/versions`);
        if (res.ok) {
          const data = await res.json();
          setVersionCount(data.versions.length);
        }
      } catch (error) {
        console.error("Failed to fetch version count:", error);
      }
    };
    if (agentName) fetchVersionCount();
  }, [agentName]);

  // Fetch Metrics with SWR
  const { data: metricsData } = useSWR(
    `/api/agent/${agentName}/metrics`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  useEffect(() => {
    if (metricsData) {
      setMetrics(metricsData);
      setLoadingMetrics(false);
    }
  }, [metricsData]);

  // Fetch Activities with SWR
  const { data: activitiesData, isLoading: activitiesLoading } = useSWR(
    `/api/agent/${agentName}/activity?page=${page}&limit=5`,
    fetcher,
    {
      refreshInterval: 5000,
      keepPreviousData: true,
    }
  );

  const activities: Activity[] = activitiesData?.activities || [];
  const pagination: Pagination | null = activitiesData?.pagination || null;
  const loadingActivities = activitiesLoading;

  const toggleRuntime = async () => {
    setTogglingRuntime(true);
    const action = runtimeStatus === "RUNNING" ? "stop" : "start";

    // Optimistic Update
    const optimisticStatus = action === "start" ? "STARTING" : "STOPPING";
    await mutateRuntime({ ...runtimeData, status: optimisticStatus }, false);

    try {
      const res = await fetch(`/api/agent/${agentName}/runtime`, {
        method: "POST",
        body: JSON.stringify({ action }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to toggle runtime");
      }

      toast.success(`Agent ${action === "start" ? "starting" : "stopping"}...`);

      // Trigger a revalidation
      mutateRuntime();
    } catch (error: any) {
      toast.error(error.message);
      // Revalidate to get true status on error
      mutateRuntime();
    } finally {
      setTogglingRuntime(false);
    }
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="relative size-8 overflow-hidden rounded-full flex items-center justify-center border border-border">
            <ShineBorder />
            <BotIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold">{agent.name}</h1>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {agent.version}
              <span className="text-sm text-muted-foreground font-bold">•</span>
              {agent.private ? (
                <span className="text-xs text-red-500">Private</span>
              ) : (
                <span className="text-xs text-green-500">Public</span>
              )}
              <span className="text-sm text-muted-foreground font-bold">•</span>
              A2A {agent.protocolVersion}
              <span className="text-sm text-muted-foreground font-bold">•</span>
              {loadingRuntime ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <Badge
                  variant={runtimeStatus === "RUNNING" ? "running" : "stopped"}
                  size="sm"
                >
                  {runtimeStatus === "RUNNING" ? "Running" : runtimeStatus}
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleRuntime}
            disabled={loadingRuntime || togglingRuntime || isTransitioning}
          >
            {togglingRuntime || loadingRuntime ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : runtimeStatus === "RUNNING" ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Skills</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{agent.skills.length}</div>
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
            ) : (
              <div className="text-sm font-bold">
                {metrics?.successRate ?? 0}%
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
            <CardHeader className="gap-1">
              <CardTitle className="text-sm">
                Task Executions (Last 24 Hours)
              </CardTitle>
              <CardDescription className="text-xs">
                Volume of tasks processed by this agent over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMetrics ? (
                <Skeleton className="h-[150px] w-full" />
              ) : (
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
                    <TableCell>
                      {activity.status === "SUCCESS" ? (
                        <CircleCheck className="size-4 text-green-500" />
                      ) : (
                        <XCircle className="size-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {activity.type}
                    </TableCell>
                    <TableCell className="text-xs">
                      v{activity.agentVersion.version}
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
