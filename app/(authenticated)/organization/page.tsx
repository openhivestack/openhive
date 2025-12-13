import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, Bot, MessageSquare } from "lucide-react";
import Link from "next/link"; // Ensure Link is imported

export default async function OrganizationDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const activeOrgId = session?.session?.activeOrganizationId;

  if (!activeOrgId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="rounded-full bg-muted p-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No Active Organization</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Please select or create an organization to view the dashboard.
        </p>
      </div>
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    include: {
      _count: {
        select: {
          members: true,
          agents: true,
        }
      },
      agents: {
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              conversations: true
            }
          }
        }
      }
    }
  });

  if (!org) {
    return <div>Organization not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{org._count.agents}</div>
            <p className="text-xs text-muted-foreground">
              Across {org.name}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{org._count.members}</div>
            <p className="text-xs text-muted-foreground">
              Active users
            </p>
          </CardContent>
        </Card>
        {/* Placeholder for real usage stats later */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {org.agents.reduce((acc, agent) => acc + agent._count.conversations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total interactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Organization Agents</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No agents deployed in this organization.
                  </TableCell>
                </TableRow>
              ) : (
                org.agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{agent.name}</span>
                        <span className="text-xs text-muted-foreground">v{agent.latestVersion || '0.0.0'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.isPublic ? "default" : "secondary"}>
                        {agent.isPublic ? "Public" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{agent.runtime || 'N/A'}</TableCell>
                    <TableCell>{agent._count.conversations}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/agent/${agent.name}`} className="text-sm text-primary hover:underline">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
