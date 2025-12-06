export default function VerificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Verifications</h1>
        <p className="text-muted-foreground">
          Review and approve agent verification requests.
        </p>
      </div>

      <div className="rounded-md border p-4 text-center text-muted-foreground">
        No pending verifications.
      </div>
    </div>
  );
}

