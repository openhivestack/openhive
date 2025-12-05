import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { QueryParser } from "@/lib/query-parser";
import { validateAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { query, page = 1, limit = 20 } = await req.json();
  const auth = await validateAuth();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  try {
    // Default: Public agents + My Private agents (if logged in)
    const where: any = {
      OR: [
        { isPublic: true },
        ...(auth?.user ? [{ userId: auth.user.id }] : []),
      ],
    };

    if (query) {
      const parser = new QueryParser();
      const parsed = parser.parse(query);
      const andConditions: any[] = [];

      // 1. Handle Field Filters (e.g. runtime:node, skill:chat)
      for (const filter of parsed.fieldFilters) {
        if (filter.field === "is") {
          if (filter.value === "private") {
            if (auth?.user) {
              where.isPublic = false;
              where.userId = auth.user.id;
            } else {
              // Not authenticated, return nothing for private search
              where.isPublic = false;
              where.userId = "unauthenticated";
            }
          } else if (filter.value === "public") {
            where.isPublic = true;
            if (where.userId) delete where.userId;
          }
          continue;
        }

        if (filter.operator === "has_skill" || filter.field === "tags") {
          andConditions.push({ tags: { has: filter.value } });
        } else if (
          filter.operator === "includes" ||
          filter.operator === "equals"
        ) {
          // Whitelist allowed fields to prevent querying arbitrary columns
          const allowedFields = [
            "name",
            "description",
            "runtime",
            "latestVersion",
          ];

          if (allowedFields.includes(filter.field)) {
            andConditions.push({
              [filter.field]: { contains: filter.value, mode: "insensitive" },
            });
          }
        }
      }

      // 2. Handle General Filters (Free text)
      for (const filter of parsed.generalFilters) {
        const orConditions: any[] = filter.fields.map((field) => ({
          [field]: { contains: filter.term, mode: "insensitive" },
        }));

        // Also search tags
        orConditions.push({ tags: { has: filter.term } });

        andConditions.push({ OR: orConditions });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }
    }

    const [total, agents] = await Promise.all([
      prisma.agent.count({ where }),
      prisma.agent.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          user: {
            select: {
              name: true,
              image: true,
              username: true,
            },
          },
        },
      }),
    ]);

    const enrichedAgents = agents.map((agent) => {
      const latestVersion = agent.versions[0];
      const agentCard = (latestVersion?.agentCard as Record<string, any>) || {};

      return {
        ...agentCard,
        ...agent,
        // Prioritize DB description if set, else fall back to card
        description: agent.description || agentCard.description,
        versions: undefined, // Remove raw versions array
        installCount: latestVersion?.installCount || 0,
      };
    });

    return NextResponse.json({
      "@context": {
        "@vocab": "https://w3id.org/a2a/vocab#",
        "dcat": "http://www.w3.org/ns/dcat#",
        "dcterms": "http://purl.org/dc/terms/",
        "foaf": "http://xmlns.com/foaf/0.1/"
      },
      "@type": "dcat:Catalog",
      agents: enrichedAgents.map(a => ({ ...a, "@type": "dcat:Dataset" })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
