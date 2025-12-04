"use client";

import { Logo } from "@/components/logo";
import Link from "next/link";
import { CommandBox } from "@/components/command-box";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedSpan } from "@/components/ui/terminal";
import { TypingAnimation } from "@/components/ui/terminal";
import { Terminal } from "@/components/ui/terminal";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Book, Bot, Flame, Info, LogIn, Star } from "lucide-react";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShineBorder } from "@/components/ui/shine-border";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function HomePage() {
  const { data, isPending } = useSession();
  const isLoggedIn = !!data;

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <Spinner className="text-primary size-7" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col gap-10">
      <div className="w-full flex items-center gap-2 -mb-10 border-b bg-secondary py-2.5">
        <div className="container mx-auto w-full max-w-7xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Logo size="size-6" animated />

            <Link href="/docs">
              <Button variant="link">
                What is OpenHive?
              </Button>
            </Link>

            <Link href="/docs/guides/quickstart">
              <Button variant="link">
                Quick Start
              </Button>
            </Link>

            <Link href="https://github.com/openhivestack">
              <Button variant="link">
                GitHub
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Button size="sm" variant="outline" asChild>
              {isLoggedIn ? (
                <Link href="/agent/list" className="text-foreground">
                  <Bot className="mr-1 size-4" />
                  Agents
                </Link>
              ) : (
                <Link href="/login" className="text-foreground">
                  <LogIn className="mr-1 size-4" />
                  Login
                </Link>
              )}
            </Button>

            <AnimatedThemeToggler variant="ghost" size="icon" />
          </div>
        </div>
      </div>
      {/* Hero Section */}
      <div className="bg-background relative h-[300px] w-full overflow-hidden rounded-lg">
        <FlickeringGrid
          className="absolute inset-0 z-0 size-full w-full opacity-80 [mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
          squareSize={4}
          gridGap={6}
          color="#60A5FA"
          maxOpacity={0.5}
          flickerChance={0.1}
          height={300}
        />

        <div className="container relative z-10 mx-auto w-full max-w-6xl mt-20 flex justify-between gap-2">
          <div className="flex flex-col gap-1 mt-10">
            <h1 className="text-2xl font-bold">Operating System of the <AnimatedGradientText>Agentic Web</AnimatedGradientText></h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Build, deploy, and orchestrate autonomous agents with the <span className="text-primary">Source-First</span> platform. You own the code; we handle the scale.
            </p>
            <CommandBox
              command="hive create first-agent"
              className="w-full max-w-sm mt-6"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Terminal className="w-[450px] shadow-lg">
              <TypingAnimation className="text-xs">
                $ hive create first-agent
              </TypingAnimation>
              <AnimatedSpan className="text-green-500 text-xs flex items-center gap-1">
                Creating a new OpenHive agent:{" "}
                <span className="text-blue-500">first-agent</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-green-500 text-xs flex items-center gap-1">
                ✔ Agent project created successfully!
              </AnimatedSpan>
            </Terminal>
          </div>
        </div>
      </div>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-8 mx-auto md:grid-cols-3">
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

      {/* Documentation Overview Section */}
      <div className="container mx-auto w-full max-w-6xl grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Concepts</h2>
          <ul className="flex flex-col gap-1">
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/concepts/agents">
                Basic structure of an agent
              </Link>
            </li>
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/concepts/registry#registry--discovery">
                How does agent discovery work?
              </Link>
            </li>
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/concepts/a2a-protocol">
                Working with A2A Protocol
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">OpenHive Cloud</h2>
          <ul className="flex flex-col gap-1">
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/guides/deployment">Getting Started</Link>
            </li>
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/api-reference/cli">Agent Management</Link>
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">For Developers</h2>
          <ul className="flex flex-col gap-1">
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/resources/faq">FAQs</Link>
            </li>
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/guides/quickstart">Development Quickstart</Link>
            </li>
            <li className="text-primary hover:text-primary/80 cursor-pointer text-blue-500">
              <Link href="/docs/tutorials/first-agent">
                Browse our tutorials
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Try it out Section */}
      <div className="container mx-auto w-full max-w-6xl">
        <h2 className="text-lg font-bold flex items-center gap-2">
          Try it out{" "}
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-4 cursor-pointer text-primary" />
            </TooltipTrigger>
            <TooltipContent className="w-md whitespace-wrap text-wrap">
              These are common cli actions. You can also use the{" "}
              <code>hive</code> command to interact with the CLI.
            </TooltipContent>
          </Tooltip>
        </h2>
        <Tabs
          defaultValue="start"
          orientation="vertical"
          className="gap-4 mt-4 h-[350px]"
        >
          <TabsList className="min-w-1/3 p-4 gap-4 bg-background">
            <TabsTrigger
              value="start"
              className="cursor-pointer justify-start px-4"
            >
              Starting an agent
            </TabsTrigger>
            <TabsTrigger
              value="call"
              className="cursor-pointer justify-start px-4"
            >
              Chat with an Agent
            </TabsTrigger>
            <TabsTrigger
              value="publish"
              className="cursor-pointer justify-start px-4"
            >
              Publish an agent
            </TabsTrigger>
            <TabsTrigger
              value="deploy"
              className="cursor-pointer justify-start px-4"
            >
              Deploy
            </TabsTrigger>
          </TabsList>
          <TabsContent value="start">
            <Terminal className="w-full shadow-lg" startOnView={false}>
              <TypingAnimation className="text-xs">
                $ cd first-agent && hive start
              </TypingAnimation>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1">
                Found local .agent-card.json, starting agent...
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1">
                Agent: first-agent
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1">
                Runtime: node
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1">
                <br />
                🚀 A2A Agent &quot;first-agent&quot; listening on port 8080
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1">
                📋 Agent Card: http://localhost:8080/.well-known/agent-card.json
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1">
                🔧 Skills: chat
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1">
                <br />
                💡 Try sending a message:
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1 pl-6">
                - &quot;Hello&quot;
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1 pl-6">
                - &quot;What can you do?&quot;
              </AnimatedSpan>
              <AnimatedSpan className="text-blue-500 text-xs flex items-center gap-1 pl-6">
                - &quot;Tell me a joke&quot;
              </AnimatedSpan>
            </Terminal>
          </TabsContent>
          <TabsContent value="call">
            <Terminal className="w-full shadow-lg" startOnView={false}>
              <TypingAnimation className="text-xs">
                $ hive call first-agent --message &quot;Hi, how are you?&quot;
              </TypingAnimation>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                <span className="text-green-500">✔</span> Resolving agent...
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                <span className="text-green-500">✔</span> Connecting to{" "}
                <span className="text-blue-500">
                  openhive:agent:first-agent
                </span>
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                <br />
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                <span className="text-green-500">--- Response ---</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                Hello! I&apos;m{" "}
                <span className="text-blue-500">first-agent</span>, your AI
                assistant. How can I help you today?
              </AnimatedSpan>
            </Terminal>
          </TabsContent>
          <TabsContent value="publish">
            <Terminal className="w-full shadow-lg" startOnView={false}>
              <TypingAnimation className="text-xs">
                $ cd first-agent && hive publish
              </TypingAnimation>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                <br />
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span> Publishing to
                OpenHive Platform...
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span> package size:
                16.3 kB
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span> 6 files
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span> unpublished
                checksum: 81CJAqH7...
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span>
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span>{" "}
                first-agent@1.0.0 published successfully!
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                hive <span className="text-blue-500">notice</span>
              </AnimatedSpan>
            </Terminal>
          </TabsContent>
          <TabsContent value="deploy">
            <Terminal className="w-full shadow-lg" startOnView={false}>
              <TypingAnimation className="text-xs">
                $ hive deploy first-agent@0.1.0
              </TypingAnimation>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                <br />
              </AnimatedSpan>
              <AnimatedSpan className="text-xs flex items-center gap-1">
                Triggering deployment for the latest version of &quot;
                <span className="text-blue-500">first-agent</span>&quot;...
              </AnimatedSpan>
              <AnimatedSpan className="text-xs text-green-500 flex items-center gap-1">
                ✅ Deployment initiated
              </AnimatedSpan>
            </Terminal>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Section */}
      <footer className="container mx-auto w-full max-w-6xl border-t border-border pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="flex flex-col gap-2 col-span-5">
            <div className="flex items-center gap-2">
              <Logo size="size-8" className="!justify-start" animated={false} />
            </div>
            <p className="text-sm text-muted-foreground">
              The foundational layer for the agentic web. Build, deploy, and
              connect autonomous agents.
            </p>
          </div>

          <div className="flex flex-col gap-2 col-span-2">
            <h3 className="font-semibold text-foreground">Product</h3>
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/docs/concepts/agents"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Agents
            </Link>
            <Link
              href="/docs/guides/deployment"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Platform
            </Link>
          </div>

          <div className="flex flex-col gap-2 col-span-2">
            <h3 className="font-semibold text-foreground">Community</h3>
            <a
              href="https://discord.gg/qsfG2tJ6mJ"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Discord
            </a>
            <a
              href="https://github.com/openhivestack"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              GitHub
            </a>
            <a
              href="mailto:support@openhive.sh"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Support
            </a>
          </div>

          <div className="flex flex-col gap-2 col-span-2">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <Link
              href="/privacy-policy"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Fusion Core Inc. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/openhivestack"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Star className="size-4" />
            </a>
            <a
              href="https://discord.gg/qsfG2tJ6mJ"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Flame className="size-4" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
