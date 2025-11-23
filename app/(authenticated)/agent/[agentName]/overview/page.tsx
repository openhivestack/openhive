"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { openhive } from "@/lib/openhive.client";
import { Agent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
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
  Activity,
  ActivityIcon,
  Atom,
  BotIcon,
  Clock,
  Copy,
  Cpu,
  FileJson,
  Globe,
  IdCard,
  Shield,
  Terminal,
  Zap,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// Mock Data for Histogram
const data = [
  { name: "00:00", tasks: 12 },
  { name: "02:00", tasks: 19 },
  { name: "04:00", tasks: 3 },
  { name: "06:00", tasks: 5 },
  { name: "08:00", tasks: 2 },
  { name: "10:00", tasks: 30 },
  { name: "12:00", tasks: 45 },
  { name: "14:00", tasks: 60 },
  { name: "16:00", tasks: 55 },
  { name: "18:00", tasks: 40 },
  { name: "20:00", tasks: 25 },
  { name: "22:00", tasks: 15 },
];

const chartConfig = {
  tasks: {
    label: "Tasks",
    color: colors.indigo[500],
  },
} satisfies ChartConfig;

export default function AgentOverviewPage() {
  const params = useParams();
  const agentName = params.agentName as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Agent Metadata
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const data = await openhive.agents.agent(agentName).get();
        setAgent(data);
      } catch (error) {
        console.error("Failed to fetch agent:", error);
      } finally {
        setLoading(false);
      }
    };
    if (agentName) fetchAgent();
  }, [agentName]);

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

  // Calculate Uptime (Mocked logic for now, ideally diff between createdAt and now)
  const created = new Date(agent.createdAt || Date.now());
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
            <h1 className="text-sm font-bold">{agent.name}</h1>
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
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {agent.url && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`${agent.url}/.well-known/agent-card.json`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="mr-2 h-4 w-4" />
                Agent Card
              </a>
            </Button>
          )}
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
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">98%</div>
            <p className="text-xs text-muted-foreground">+2% from last month</p>
          </CardContent>
        </Card>
        <Card className="gap-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{diffDays} Days</div>
            <p className="text-xs text-muted-foreground">Since creation</p>
          </CardContent>
        </Card>
        <Card className="gap-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">240ms</div>
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
              <ChartContainer
                config={chartConfig}
                className="h-[150px] w-full -ml-6"
              >
                <BarChart data={data}>
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
              <Item
                variant="ghost"
                size="xs"
                asChild
                className="hover:text-primary"
              >
                <a href="#">
                  <ItemMedia>
                    <ActivityIcon className="size-3" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-xs">Activity</ItemTitle>
                  </ItemContent>
                </a>
              </Item>
              <Popover>
                <PopoverTrigger asChild>
                  <Item
                    variant="ghost"
                    size="xs"
                    asChild
                    className="hover:text-primary"
                  >
                    <a href="#">
                      <ItemMedia>
                        <IdCard className="size-3" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-xs">Agent Card</ItemTitle>
                      </ItemContent>
                    </a>
                  </Item>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="flex items-center gap-3 border-b p-4 bg-muted/30">
                    <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                      <BotIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold leading-none">
                        {agent.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>v{agent.version}</span>
                        <span>•</span>
                        <span>A2A v{agent.protocolVersion}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 p-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Endpoint URL
                      </Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono truncate">
                          {agent.url}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0"
                          onClick={() =>
                            navigator.clipboard.writeText(agent.url)
                          }
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Shield className="size-3" /> Capabilities
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities &&
                          Object.entries(agent.capabilities).filter(
                            ([, v]) => v
                          ).length > 0 ? (
                            Object.entries(agent.capabilities).map(
                              ([key, enabled]) =>
                                enabled && (
                                  <Badge
                                    key={key}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 h-5 font-normal capitalize"
                                  >
                                    {key.replace(/([A-Z])/g, " $1").trim()}
                                  </Badge>
                                )
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              -
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Cpu className="size-3" /> Skills
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {agent.skills.length > 0 ? (
                            <>
                              {agent.skills.slice(0, 2).map((skill) => (
                                <Badge
                                  key={skill.id}
                                  variant="outline"
                                  className="text-[10px] px-1.5 h-5 font-normal"
                                >
                                  {skill.name || skill.id}
                                </Badge>
                              ))}
                              {agent.skills.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{agent.skills.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              -
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t bg-muted/30 p-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      asChild
                    >
                      <a
                        href={`${agent.url}/.well-known/agent-card.json`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileJson className="size-3.5" />
                        View Raw JSON
                      </a>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Item
                variant="ghost"
                size="xs"
                asChild
                className="hover:text-primary"
              >
                <a href="#">
                  <ItemMedia>
                    <Atom className="size-3" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-xs">Skills</ItemTitle>
                  </ItemContent>
                </a>
              </Item>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
