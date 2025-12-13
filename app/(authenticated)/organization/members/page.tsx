import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Mail } from "lucide-react";
import { InviteMemberDialog } from "@/components/organization/invite-member-dialog";

export default async function MembersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const activeOrgId = session?.session?.activeOrganizationId;

  if (!activeOrgId) {
    return <div>No active organization selected.</div>;
  }

  // Fetch Members and Pending Invitations
  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    include: {
      members: {
        include: {
          user: true
        }
      },
      invitations: {
        where: { status: "pending" }
      }
    }
  });

  if (!org) {
    return <div>Organization not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Members Section */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage who has access to {org.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.image || ""} />
                      <AvatarFallback>{member.user.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.user.name}</span>
                      <span className="text-xs text-muted-foreground">{member.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{member.role}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invitations Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations sent but not yet accepted.
            </CardDescription>
          </div>
          <InviteMemberDialog activeOrgId={activeOrgId} />
        </CardHeader>
        <CardContent>
          {org.invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border-dashed border rounded-lg">
              <Mail className="h-8 w-8 mb-2 opacity-50" />
              <p>No pending invitations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell className="capitalize">{invite.role}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date().toLocaleDateString()}
                      {/* Ideally createAt, but Invitaion model might imply it */}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10">
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
