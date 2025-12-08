
import { prisma } from "@/lib/db";
import { VerificationActions } from "./verification-actions";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AgentDetail } from "@/lib/api-client";
import { VerificationsTable } from "./verifications-table";

export const dynamic = "force-dynamic";

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page || "1");
  const limit = 10;
  const skip = (page - 1) * limit;

  const [pendingAgents, totalCount] = await Promise.all([
    prisma.agent.findMany({
      where: {
        verificationStatus: "PENDING",
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
            username: true,
          },
        },
        organization: {
          select: {
            name: true,
            logo: true,
            slug: true,
          },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.agent.count({
      where: {
        verificationStatus: "PENDING",
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Verifications</h1>
          <p className="text-muted-foreground">
            Review and approve agent verification requests.
          </p>
        </div>
      </div>

      {pendingAgents.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <p>No pending verifications.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <VerificationsTable
            agents={pendingAgents.map(a => ({
              ...a,
              createdAt: a.createdAt.toISOString(),
              updatedAt: a.updatedAt.toISOString(),
              verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
              creator: a.user ? { name: a.user.name, image: a.user.image, username: a.user.username } : null,
              version: a.latestVersion || "0.0.1",
              latestVersion: a.latestVersion || "0.0.1",
              status: "UNKNOWN",
            }))}
          />
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            asChild
          >
            <Link href={`/system/verifications?page=${page - 1}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            asChild
          >
            <Link href={`/system/verifications?page=${page + 1}`}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

