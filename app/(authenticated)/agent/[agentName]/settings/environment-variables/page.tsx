"use client";

import Link from "next/link";
import { ExternalLink, Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";

type EnvVar = {
  key: string;
  value: string;
  visible?: boolean;
};

export default function EnvironmentVariablesPage() {
  const params = useParams();
  const agentName = params.agentName as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Check Runtime Status
        const statusRes = await fetch(`/api/agent/${agentName}/runtime`);
        if (!statusRes.ok) throw new Error("Failed to check status");
        const statusData = await statusRes.json();

        const serviceStatus = statusData.details?.status;
        if (serviceStatus === "NOT_FOUND") {
          setIsDeployed(false);
          setLoading(false);
          return;
        }

        setIsDeployed(true);

        // 2. Fetch Env Vars
        const envRes = await fetch(`/api/agent/${agentName}/env`);
        if (envRes.ok) {
          const envData = await envRes.json();
          const vars = Object.entries(envData.env || {}).map(
            ([key, value]) => ({
              key,
              value: value as string,
              visible: false,
            })
          );
          setEnvVars(vars);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load environment variables");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [agentName]);

  const handleAdd = () => {
    setEnvVars([...envVars, { key: "", value: "", visible: false }]);
  };

  const handleRemove = (index: number) => {
    const newVars = [...envVars];
    newVars.splice(index, 1);
    setEnvVars(newVars);
  };

  const handleChange = (index: number, field: "key" | "value", val: string) => {
    const newVars = [...envVars];
    newVars[index][field] = val;
    setEnvVars(newVars);
  };

  const toggleVisibility = (index: number) => {
    const newVars = [...envVars];
    newVars[index].visible = !newVars[index].visible;
    setEnvVars(newVars);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert to object
      const envObj: Record<string, string> = {};
      envVars.forEach((v) => {
        if (v.key.trim()) {
          envObj[v.key.trim()] = v.value;
        }
      });

      const res = await fetch(`/api/agent/${agentName}/env`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ env: envObj }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Environment variables updated");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save environment variables");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isDeployed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <Loader2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Agent Not Deployed</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Environment variables can only be configured for deployed agents.
          Please deploy your agent first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">Environment Variables</h1>
        <p className="text-sm text-muted-foreground">
          In order to provide your Deployment with Environment Variables at
          Build and Runtime, you may enter them right here, for the Environment
          of your choice.{" "}
          <Link
            href="https://docs.openhive.sh/docs/concepts/environment-variables"
            target="_blank"
            className="text-primary hover:text-primary/80"
          >
            Learn more <ExternalLink className="size-3 inline-block -mt-0.5" />
          </Link>
        </p>
        <p className="text-sm text-muted-foreground mt-6">
          A new Deployment is required for your changes to take effect.
        </p>
      </div>

      <div className="space-y-4">
        {envVars.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <InputGroup>
                <InputGroupAddon>Key</InputGroupAddon>
                <InputGroupInput
                  placeholder="EXAMPLE_KEY"
                  value={item.key}
                  onChange={(e) => handleChange(index, "key", e.target.value)}
                />
              </InputGroup>
              <InputGroup>
                <InputGroupAddon>Value</InputGroupAddon>
                <InputGroupInput
                  placeholder="Value"
                  type={item.visible ? "text" : "password"}
                  value={item.value}
                  onChange={(e) => handleChange(index, "value", e.target.value)}
                />
                <InputGroupButton onClick={() => toggleVisibility(index)}>
                  {item.visible ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroup>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {envVars.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No environment variables configured.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Variable
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
