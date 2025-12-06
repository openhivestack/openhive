import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Globe, ShieldCheck, Ghost } from "lucide-react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { AgentCard } from "@/components/agent-card";

export const dynamic = 'force-dynamic';

export default async function HubPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  const agents = await prisma.agent.findMany({
    where: {
      verificationStatus: "VERIFIED",
      isPublic: true,
      name: {
        contains: q || "",
        mode: "insensitive",
      },
    },
    include: {
      user: true,
      organization: true,
      _count: {
        select: { executions: true },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      verifiedAt: 'desc',
    }
  });

  const agentList = agents.map((agent) => {
    const latestVersion = agent.versions[0];
    const agentCard = (latestVersion?.agentCard as Record<string, any>) || {};

    return {
      ...agent,
      protocolVersion: (agentCard.protocolVersion as string) || null,
      latestVersion: agent.latestVersion || latestVersion?.version || null,
    };
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden bg-background/50 backdrop-blur-sm">
        <FlickeringGrid
          className="absolute inset-0 z-0 size-full w-full opacity-50 [mask-image:linear-gradient(to_bottom,white,transparent)]"
          squareSize={4}
          gridGap={6}
          color="#60A5FA" // Blue-400 matches primary usually
          maxOpacity={0.5}
          flickerChance={0.1}
          height={400}
        />

        <div className="container relative z-10 mx-auto px-4 py-12 sm:px-4 lg:px-6 flex flex-col items-center text-center gap-6">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
            <ShieldCheck className="w-3 h-3 mr-1" /> Official Registry
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight lg:text-4xl">
            Discover <AnimatedGradientText>Verified Agents</AnimatedGradientText>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore the official OpenHive Hub for secure, reviewed, and community-trusted autonomous agents.
          </p>

          {/* Search Bar - Elevated */}
          <div className="relative w-full max-w-lg mt-4 group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-purple-600/50 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <form action="/hub">
                <Input
                  name="q"
                  placeholder="Search for agents, capabilities, or organizations..."
                  className="pl-10 h-10 w-full bg-background border-border/50 shadow-sm transition-all focus-visible:ring-primary/50"
                  defaultValue={q}
                />
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Results Info */}
        {(q || agents.length > 0) && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {q ? `Search results for "${q}"` : "Recently Verified"}
            </h2>
            <Badge variant="outline" className="text-muted-foreground">
              {agents.length} {agents.length === 1 ? 'agent' : 'agents'} found
            </Badge>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.length === 0 ? (
            <div className="col-span-full py-12 flex justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    <Ghost className="w-12 h-12 text-muted-foreground/50" />
                  </EmptyMedia>
                  <EmptyTitle>No agents found</EmptyTitle>
                  <EmptyDescription>
                    {q
                      ? `We couldn't find any verified agents matching "${q}". Try adjusting your search or browse all agents.`
                      : "There are no verified agents in the Hub yet. Be the first to submit one!"}
                  </EmptyDescription>
                </EmptyHeader>
                {q && (
                  <Button variant="outline" asChild className="mt-4">
                    <Link href="/hub">Clear Search</Link>
                  </Button>
                )}
              </Empty>
            </div>
          ) : (
            agentList.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
