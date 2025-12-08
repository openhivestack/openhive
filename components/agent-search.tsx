"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupInput, InputGroupAddon } from "./ui/input-group";
import { cn } from "@/lib/utils";

interface AgentSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  className?: string;
}

const FILTERS = [
  { name: "skill", description: "Search by skill ID", type: "value" },
  { name: "host", description: "Filter by host", type: "value" },
  { name: "is:public", description: "Show only public agents", type: "flag" },
  { name: "is:private", description: "Show only private agents", type: "flag" },
];

export function AgentSearch({ onSearch, initialQuery = "", className }: AgentSearchProps) {
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

  return (
    <div className={cn("relative", className)} ref={searchContainerRef}>
      <div className="flex items-center">
        <div className="relative w-full">
          <InputGroup className="rounded-lg">
            <InputGroupInput
              placeholder="Search agents by name, skill, etc."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="caret-foreground bg-transparent w-full h-9"
            />
            <InputGroupAddon align="inline-end">
              {query && (
                <div
                  className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer flex size-6 items-center justify-center rounded-full"
                  onClick={handleClear}
                >
                  <X className="size-3" />
                </div>
              )}
              <div
                className="text-primary-foreground hover:text-primary cursor-pointer flex size-6 items-center justify-center rounded-full"
                onClick={handleSearch}
              >
                <Search className="size-3" />
              </div>
            </InputGroupAddon>
          </InputGroup>
        </div>
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
