"use client";

import { authClient } from "@/lib/auth-client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Copy, Plus, Key, Check } from "lucide-react";
import { DateTime } from "luxon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ApiKey = {
  id: string;
  name: string | null;
  prefix: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  lastRequest: Date | null;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const { data, error } = await authClient.apiKey.list();
      if (error) {
        toast.error(error.message || "Failed to fetch API keys");
        return;
      }
      if (data) {
        setKeys(data as unknown as ApiKey[]);
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred while fetching keys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await authClient.apiKey.create({
        name: newKeyName,
      });

      if (error) {
        toast.error(error.message || "Failed to create API key");
        return;
      }

      if (data) {
        setNewKey(data.key);
        toast.success("API key created successfully");
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred while creating the key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await authClient.apiKey.delete({
        keyId: id,
      });

      if (error) {
        toast.error(error.message || "Failed to delete API key");
        return;
      }

      toast.success("API key deleted successfully");
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred while deleting the key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setNewKey(null);
      setNewKeyName("");
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 p-4">
      <div className="w-full space-y-6">
        <div className="container mx-auto max-w-2/3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-primary mb-2">
                  Your API Key
                </p>
                <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 size-4" />
                      Generate New Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Generate API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key to authenticate your requests.
                      </DialogDescription>
                    </DialogHeader>

                    {!newKey ? (
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Key Name</Label>
                          <Input
                            id="name"
                            placeholder="e.g. Development, CI/CD"
                            autoComplete="off"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 py-4">
                        <div className="rounded-md bg-muted p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Your API Key
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => copyToClipboard(newKey)}
                            >
                              {copied ? (
                                <Check className="size-4 text-green-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </div>
                          <div className="break-all font-mono text-sm bg-background p-2 rounded border">
                            {newKey}
                          </div>
                          <p className="text-xs text-destructive mt-4">
                            Make sure to copy this key now. You won&apos;t be
                            able to see it again!
                          </p>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      {!newKey ? (
                        <Button
                          onClick={handleCreateKey}
                          disabled={isCreating || !newKeyName.trim()}
                        >
                          {isCreating && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          )}
                          Create Key
                        </Button>
                      ) : (
                        <Button onClick={() => handleDialogChange(false)}>
                          Done
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                These keys can be used to authenticate with the OpenHive CLI and
                SDKs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Key className="size-12 mb-4 opacity-20" />
                  <h3 className="text-lg font-semibold">No API keys yet</h3>
                  <p className="text-sm max-w-sm mt-2">
                    Generate your first API key to start building with OpenHive.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">
                          {key.name || "Untitled"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {key.prefix}
                          ••••••••
                        </TableCell>
                        <TableCell>
                          {DateTime.fromJSDate(
                            new Date(key.createdAt)
                          ).toRelative()}
                        </TableCell>
                        <TableCell>
                          {key.lastRequest
                            ? DateTime.fromJSDate(
                                new Date(key.lastRequest)
                              ).toRelative()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
