import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Invite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Check auth status
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
  }, []);

  // Validate invitation
  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setIsLoading(false);
      return;
    }

    const validateInvitation = async () => {
      try {
        const { data, error } = await supabase
          .from("team_invitations")
          .select(
            `
            *,
            organizations:org_id (name),
            roles:role_id (display_name, color)
          `,
          )
          .eq("token", token)
          .eq("status", "pending")
          .single();

        if (error || !data) {
          setError("Invalid or expired invitation");
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError("This invitation has expired");
          return;
        }

        setInvitation(data);
        setEmail(data.email);
      } catch (err) {
        setError("Failed to validate invitation");
      } finally {
        setIsLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAccepting(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      // Accept invitation after auth
      await acceptInvitation();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setIsAccepting(false);
    }
  };

  const acceptInvitation = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("accept_invitation", {
        p_token: token,
        p_user_id: user.user.id,
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Welcome to the team!",
          description: `You've joined ${invitation.organizations?.name}`,
        });
        navigate("/dashboard");
      } else {
        throw new Error(data?.error || "Failed to accept invitation");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{invitation.organizations?.name}</strong> as a{" "}
              <strong>{invitation.roles?.display_name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={acceptInvitation} disabled={isAccepting}>
              {isAccepting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Accept & Join Team
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join {invitation.organizations?.name}</CardTitle>
          <CardDescription>
            You've been invited as a <strong>{invitation.roles?.display_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === "signup" ? "Create a password" : "Enter your password"}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isAccepting}>
              {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {authMode === "signup" ? "Create Account & Join" : "Sign In & Join"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {authMode === "signup" ? (
              <p>
                Already have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => setAuthMode("signin")}>
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => setAuthMode("signup")}>
                  Create one
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
