'use client';

import { useSession } from '@/lib/auth-client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Shield,
  Smartphone,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DeviceApprovalPage() {
  const { data } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const userCode = searchParams.get('user_code');
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'approve' | 'deny' | null>(null);

  useEffect(() => {
    if (!userCode) {
      router.push('/device');
      return;
    }

    console.log('data', data);
    if (!data?.user) {
      // Redirect to login if not authenticated
      const redirectUrl = encodeURIComponent(
        `/device/approve?user_code=${userCode}`
      );
      window.location.href = `/login?redirect=${redirectUrl}`;
    }
  }, [data?.user, userCode, router]);

  const handleApprove = async () => {
    setIsProcessing(true);
    setAction('approve');

    try {
      const response = await fetch('/api/auth/device/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userCode: userCode,
        }),
      });

      if (response.ok) {
        toast.success('Device approved successfully!', {
          description:
            'The device can now access your OpenHive Platform account.',
        });

        // Redirect after a short delay
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to approve device');
      }
    } catch (error) {
      console.error('Failed to approve device:', error);
      toast.error('Failed to approve device', {
        description:
          'Please try again or contact support if the issue persists.',
      });
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    setAction('deny');

    try {
      const response = await fetch('/api/auth/device/deny', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userCode: userCode,
        }),
      });

      if (response.ok) {
        toast.success('Device access denied', {
          description: 'The device will not be able to access your account.',
        });

        // Redirect after a short delay
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to deny device');
      }
    } catch (error) {
      console.error('Failed to deny device:', error);
      toast.error('Failed to deny device', {
        description:
          'Please try again or contact support if the issue persists.',
      });
      setIsProcessing(false);
      setAction(null);
    }
  };

  if (!data?.user || !userCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              Device Authorization Request
            </CardTitle>
            <CardDescription className="mt-2">
              A device is requesting access to your OpenHive Platform account.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only approve this request if you initiated it from a trusted
              device.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Device Code:
              </span>
              <Badge variant="secondary" className="font-mono text-sm">
                <Smartphone className="w-3 h-3 mr-1" />
                {userCode}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Account:
              </span>
              <div className="text-sm font-medium">
                {data.user.name || data.user.email}
              </div>
            </div>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">This device will be able to:</p>
            <ul className="space-y-1 ml-4">
              <li className="flex items-center text-xs">
                <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
                Deploy and manage your agents
              </li>
              <li className="flex items-center text-xs">
                <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
                View your account information
              </li>
              <li className="flex items-center text-xs">
                <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
                Access platform APIs on your behalf
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleDeny}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing && action === 'deny' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Denying...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny
                </>
              )}
            </Button>

            <Button
              onClick={handleApprove}
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing && action === 'approve' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              You can revoke device access anytime from your{' '}
              <a
                href="/dashboard/api-keys"
                className="text-primary hover:underline"
              >
                account settings
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
