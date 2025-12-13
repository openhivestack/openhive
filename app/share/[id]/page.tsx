import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      },
      agent: true
    }
  });

  if (!conversation || !conversation.isPublic) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4 space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{conversation.agentName}</h1>
          <p className="text-muted-foreground text-sm">
            Shared conversation • {new Date(conversation.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary">Read Only</Badge>
      </div>

      <div className="space-y-6">
        {conversation.messages.map((m) => (
          <div key={m.id} className="flex gap-4">
            <div className="shrink-0 mt-1">
              {m.role === 'user' ? (
                <div className="size-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                  <User className="size-4 text-muted-foreground" />
                </div>
              ) : (
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="size-4 text-primary" />
                </div>
              )}
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {m.role}
              </span>
              <div className="prose prose-sm dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap">
                {/* 
                        If content is JSON, we need to parse. 
                        Prisma Json type is weird, let's cast string if needed or handle object.
                        Since we saved string in persistence step, it should be fine. 
                        Wait, in persistence step (step 287), we saved 'lastMessage.content' which is whatever UI sent.
                        UI sends 'text' usually? Or 'parts'? 
                        If it's 'text', it's a string. If 'parts', it's JSON. 
                        Let's try to render strictly as string for now.
                      */}
                {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
