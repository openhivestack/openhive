"use client";

import { AgentSearch } from "@/components/agent-search";
import {
  Empty,
  EmptyHeader,
  EmptyDescription,
  EmptyTitle,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  LayoutGrid,
  Rows3,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AgentTable } from "@/components/agent-table";
import { ToggleGroupItem, ToggleGroup } from "@/components/ui/toggle-group";
import { AgentDetail, PaginationMeta, api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentBlock } from "@/components/agent-block";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";

export default function AgentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [agents, setAgents] = useState<AgentDetail[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const query = searchParams.get("q") || "";
  const layout = searchParams.get("layout") || "grid";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      setError(null);

      try {
        let fetchedData;
        if (query) {
          fetchedData = await api.agent.search(query, page);
        } else {
          fetchedData = await api.agent.list(page);
        }
        setAgents(fetchedData.agents);
        setPagination(fetchedData.pagination);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, [query, page]);

  const handleSearch = (newQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery.trim()) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }
    params.set("page", "1"); // Reset to page 1 on new search
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const setView = (view: "grid" | "table") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("layout", view);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header>
        <div className="flex items-center gap-2 justify-between w-full">
          <AgentSearch
            onSearch={handleSearch}
            initialQuery={query}
            className="w-lg"
          />

          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              size="sm"
              className="border border-border rounded-md"
              value={layout}
              onValueChange={(value) => {
                if (value) setView(value as "grid" | "table");
              }}
            >
              <ToggleGroupItem value="grid" aria-label="Toggle grid">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Toggle table">
                <Rows3 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </Header>
      <div className="px-4 py-2 flex-1 flex flex-col">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        )}

        {error && <p className="text-destructive">Error: {error.message}</p>}

        {!loading && !error && agents.length > 0 && (
          <>
            {layout === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {agents.map((agent) => (
                  <Link key={agent.name} href={`/agent/${agent.name}/overview`}>
                    <AgentBlock agent={agent} />
                  </Link>
                ))}
              </div>
            ) : (
              <AgentTable agents={agents} />
            )}

            <div className="flex items-center justify-end space-x-2 py-4 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {pagination?.page || 1} of {pagination?.totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= (pagination?.totalPages || 1) || loading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {!loading && !error && agents.length === 0 && (
          <div className="flex justify-center items-center w-full flex-1">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No agents found</EmptyTitle>
                <EmptyDescription>
                  Try adjusting your search or filter criteria.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}
