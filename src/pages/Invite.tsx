import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";

interface InvitationDetails {
  id: string;
  email: string;
  role_id: string;
  role_name: string;
  org_id: string;
  org_name: string;
  inviter_name?: string;
  expires_at: string;
  department?: string;
  title?: string;
}

export default function Invite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // For new user signup
  const [isNewUser, setIsNewUser] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link. No token provided.");
      setLoading(false);
      return;
    }

    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      // Fetch invitation details with correct schema
      const { data: invite, error: inviteError } = await supabase
        .from("team_invitations")
        .select(
          `
          id,
          email,
          role_id,
          org_id,
          expires_at,
          status,
          department,
          title,
          organizations:org_id (
            name
          ),
          roles:role_id (
            display_name
          ),
          inviter:invited_by (
            full_name
          )
        `,
        )
        .eq("token", token)
        .single();

      if (inviteError || !invite) {
        console.error("Invite error:", inviteError);
        setError("Invitation not found or has been revoked.");
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        setError("This invitation has expired. Please request a new one.");
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (invite.status === "accepted") {
        setError("This invitation has already been accepted.");
        setLoading(false);
        return;
      }

      // Check if revoked
      if (invite.status === "revoked") {
        setError("This invitation has been revoked.");
        setLoading(false);
        return;
      }

      // Check if user already exists in auth
      const { data: existingUser } = await supabase.from("users").select("id").eq("email", invite.email).maybeSingle();

      setIsNewUser(!existingUser);

      setInvitation({
        id: invite.id,
        email: invite.email,
        role_id: invite.role_id,
        role_name: (invite.roles as any)?.display_name || "Team Member",
        org_id: invite.org_id,
        org_name: (invite.organizations as any)?.name || "Organization",
        inviter_name: (invite.inviter as any)?.full_name,
        expires_at: invite.expires_at,
        department: invite.department,
        title: invite.title,
      });

      setLoading(false);
    } catch (err) {
      console.error("Error validating invitation:", err);
      setError("Failed to validate invitation. Please try again.");
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    if (isNewUser) {
      if (!fullName.trim()) {
        toast({ title: "Error", description: "Please enter your full name.", variant: "destructive" });
        return;
      }
      if (password.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
        return;
      }
    }

    setAccepting(true);

    try {
      let userId: string;

      if (isNewUser) {
        // Sign up new user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: invitation.email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create user");

        userId = authData.user.id;

        // Create user record
        await supabase.from("users").upsert({
          id: userId,
          email: invitation.email,
          full_name: fullName,
        });
      } else {
        // Existing user - check if logged in
        const { data: session } = await supabase.auth.getSession();

        if (!session.session) {
          // Redirect to login with return URL
          toast({
            title: "Please sign in",
            description: "Sign in with your existing account to accept this invitation.",
          });
          navigate(`/login?redirect=/invite?token=${token}`);
          return;
        }

        userId = session.session.user.id;
      }

      // Create team member record
      const { error: memberError } = await supabase.from("team_members").insert({
        org_id: invitation.org_id,
        user_id: userId,
        role_id: invitation.role_id,
        status: "active",
        department: invitation.department,
        title: invitation.title,
        joined_at: new Date().toISOString(),
      });

      if (memberError) {
        // Check if already a member
        if (memberError.code === "23505") {
          throw new Error("You are already a member of this organization.");
        }
        throw memberError;
      }

      // Mark invitation as accepted
      await supabase
        .from("team_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq("id", invitation.id);

      setSuccess(true);

      toast({
        title: "Welcome!",
        description: `You've joined ${invitation.org_name} as ${invitation.role_name}.`,
      });

      // Redirect after short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome Aboard!</CardTitle>
            <CardDescription>
              You've successfully joined {invitation?.org_name}. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            {invitation?.inviter_name ? (
              <>
                <strong>{invitation.inviter_name}</strong> has invited you to join{" "}
              </>
            ) : (
              <>You've been invited to join </>
            )}
            <strong>{invitation?.org_name}</strong> as a <strong>{invitation?.role_name}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
            <p>
              <strong>Email:</strong> {invitation?.email}
            </p>
            <p>
              <strong>Role:</strong> {invitation?.role_name}
            </p>
            {invitation?.department && (
              <p>
                <strong>Department:</strong> {invitation.department}
              </p>
            )}
            {invitation?.title && (
              <p>
                <strong>Title:</strong> {invitation.title}
              </p>
            )}
            <p>
              <strong>Expires:</strong>{" "}
              {invitation?.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : "N/A"}
            </p>
          </div>

          {isNewUser && (
            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Create your account to get started:</p>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {!isNewUser && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-sm">
              <p className="text-blue-700 dark:text-blue-300">
                ✓ An account with this email already exists. You'll be added to the organization after clicking Accept.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>
              Decline
            </Button>
            <Button className="flex-1" onClick={handleAcceptInvitation} disabled={accepting}>
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Accepting...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
