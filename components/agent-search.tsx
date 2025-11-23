"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AgentSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

const FILTERS = [
  { name: "skill", description: "Search by skill ID", type: "value" },
  { name: "host", description: "Filter by host", type: "value" },
  { name: "is:public", description: "Show only public agents", type: "flag" },
  { name: "is:private", description: "Show only private agents", type: "flag" },
];

export function AgentSearch({ onSearch, initialQuery = "" }: AgentSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = () => {
    onSearch(query);
    setIsFocused(false);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
    setIsFocused(false);
  };

  const handleAddFilter = (filter: (typeof FILTERS)[0]) => {
    let newQueryPart = `${filter.name}`;
    if (filter.type === "value") {
      newQueryPart += ":";
    }

    setQuery((prev) => (prev ? `${prev} ${newQueryPart}` : newQueryPart));
    setIsFocused(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const renderHighlightedQuery = () => {
    return query.split(/(\s+)/).map((segment, index) => {
      if (/\s+/.test(segment)) {
        return <span key={index}>{segment}</span>;
      }
      const parts = segment.split(":");
      if (parts.length > 1) {
        const key = parts[0];
        const value = parts.slice(1).join(":");
        return (
          <span key={index}>
            {key}:
            <span className="text-primary font-bold py-0.25 rounded-sm">
              {value}
            </span>
          </span>
        );
      }
      return <span key={index}>{segment}</span>;
    });
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="flex items-center">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 px-3 flex items-center pointer-events-none text-base md:text-sm whitespace-pre">
            {query ? (
              renderHighlightedQuery()
            ) : (
              <span className="text-muted-foreground">
                Search agents by name, skill, etc.
              </span>
            )}
          </div>
          <Input
            placeholder=""
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="rounded-r-none bg-muted/50 text-transparent shadow-none caret-foreground w-full h-9 pr-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 h-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          className="rounded-l-none bg-muted/50"
          variant="ghost"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {isFocused && (
        <Card className="absolute top-full mt-2 w-full z-10">
          <CardContent className="p-2">
            <p className="text-sm font-semibold p-2 text-primary">Filters</p>
            <ul>
              {FILTERS.map((filter) => (
                <li
                  key={filter.name}
                  onClick={() => handleAddFilter(filter)}
                  className="p-2 hover:bg-accent bg-card rounded-md cursor-pointer"
                >
                  <p className="font-mono text-sm">{filter.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {filter.description}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
