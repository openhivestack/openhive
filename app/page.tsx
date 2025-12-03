"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CommandBox } from "@/components/command-box";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Book, LogIn, Bot } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import { config } from "@/lib/config";
import { useEffect, useState } from "react";
import { Marquee } from "@/components/ui/marquee";
import { ShineBorder } from "@/components/ui/shine-border";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { AgentBlock } from "@/components/agent-block";

export default function HomePage() {
  const { data, isPending } = useSession();
  const isLoggedIn = !!data;
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoadingAgents(true);
        // const data = await api.list();
        setAgents([]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <Spinner className="text-primary size-7" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8 text-center z-10 relative">
      <div className="flex flex-col items-center justify-center gap-2">
        <Logo hideText size="size-12" />
        <AnimatedGradientText className="text-lg font-medium">
          {config.appName}
        </AnimatedGradientText>
        <h1 className="text-xl font-medium text-foreground md:text-3xl font-bold">
          The Operating System for the{" "}
          <span className="text-primary">Agentic Web</span>
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Build, deploy, and orchestrate autonomous agents with the{" "}
          <span className="font-bold text-foreground">Source-First</span>{" "}
          platform. You own the code; we handle the scale.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button size="sm" asChild>
          {isLoggedIn ? (
            <Link href="/agent/list" className="text-foreground">
              <Bot className="mr-1 size-4" />
              All Agents
            </Link>
          ) : (
            <Link href="/login" className="text-foreground">
              <LogIn className="mr-1 size-4" />
              Login
            </Link>
          )}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="https://docs.openhive.sh" target="_blank">
            <Book className="mr-1 size-4" />
            Get Started
          </Link>
        </Button>
      </div>
      <div className="w-full max-w-sm mx-auto">
        <CommandBox command="hive create first-agent" />
      </div>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-8 mx-auto md:grid-cols-3">
        <Card className="relative w-full max-w-[350px] overflow-hidden">
          <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
          <CardHeader className="items-center">
            <CardTitle>Source Scaffolding</CardTitle>
            <CardDescription>
              Scaffold verified agent patterns directly into your codebase. No
              black boxes—you own the logic.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="relative w-full max-w-[350px] overflow-hidden">
          <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
          <CardHeader className="items-center">
            <CardTitle>Global Registry</CardTitle>
            <CardDescription>
              Discover and integrate thousands of skilled agents from the open
              network instantly.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="relative w-full max-w-[350px] overflow-hidden">
          <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
          <CardHeader className="items-center">
            <CardTitle>Enterprise Runtime</CardTitle>
            <CardDescription>
              Secure, serverless execution with built-in identity (DID),
              authentication, and observability.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      {isLoadingAgents ? (
        <Spinner className="text-primary size-7" />
      ) : (
        <div className="rounded-md flex flex-col antialiased items-center justify-center relative overflow-hidden">
          {agents.length > 0 && (
            <>
              <Marquee pauseOnHover className="[--duration:20s]" repeat={5}>
                {agents.map((agent) => (
                  <AgentBlock
                    agent={agent}
                    compact
                    className="w-64"
                    key={agent.id}
                  />
                ))}
              </Marquee>
              <Marquee
                pauseOnHover
                className="[--duration:20s]"
                repeat={5}
                reverse
              >
                {agents.map((agent) => (
                  <AgentBlock
                    agent={agent}
                    compact
                    className="w-64"
                    key={agent.id}
                  />
                ))}
              </Marquee>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="w-full absolute bottom-0 bg-accent px-6 py-3 flex justify-between text-sm font-medium">
        <div className="flex items-center justify-center gap-8">
          <Link
            href="https://docs.openhive.sh/docs/guides/quickstart"
            target="_blank"
            className="text-muted-foreground hover:text-primary"
          >
            Publishing Agents
          </Link>
        </div>
        <div className="flex items-center justify-center gap-8">
          <Link
            href="https://docs.openhive.sh/docs/concepts/registry#how-it-works"
            target="_blank"
            className="text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            How It Works
          </Link>
        </div>
        <div className="flex items-center justify-center gap-8">
          <Link
            href="https://docs.openhive.sh/privacy-policy"
            target="_blank"
            className="text-muted-foreground hover:text-primary"
          >
            Privacy
          </Link>
          <Link
            href="https://docs.openhive.sh/terms-of-service"
            target="_blank"
            className="text-muted-foreground hover:text-primary"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
