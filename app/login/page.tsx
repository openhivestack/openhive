"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { signIn, signUp } from "@/lib/auth-client";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { config } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = (provider: string) => {
    void signIn.social({
      provider: provider as "github",
      callbackURL: "/agent/list",
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp.email({
          email,
          password,
          name,
          callbackURL: "/agent/list",
        });

        if (error) {
          toast.error(error.message);
        } else {
          // Explicitly redirect on success
          router.push("/agent/list");
        }
      } else {
        const { error } = await signIn.email({
          email,
          password,
          callbackURL: "/agent/list",
        });

        if (error) {
          toast.error(error.message);
        } else {
          // Explicitly redirect on success
          router.push("/agent/list");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-6">
      <Logo hideText size="size-12" />
      <span className="text-lg font-bold">
        Welcome to <AnimatedGradientText>{config.appName}</AnimatedGradientText>
      </span>

      <div className="w-full max-w-sm space-y-4 px-4">
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("github")}
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              className="mr-2 h-4 w-4 dark:fill-white fill-black"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            GitHub
          </Button>
        </div>

        <div className="text-center text-sm">
          {isSignUp ? (
            <p>
              Already have an account?{" "}
              <button
                className="underline hover:text-primary"
                onClick={() => setIsSignUp(false)}
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{" "}
              <button
                className="underline hover:text-primary"
                onClick={() => setIsSignUp(true)}
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4 w-56 mt-4">
        By clicking continue, you agree to our{" "}
        <a href="https://docs.openhive.cloud/terms-of-service" target="_blank">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="https://docs.openhive.cloud/privacy-policy" target="_blank">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
