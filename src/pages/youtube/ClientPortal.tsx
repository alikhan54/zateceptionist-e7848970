import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserCircle,
  Mail,
  MessageSquare,
  Loader2,
  Send,
  Check,
  Clock,
  UserPlus,
} from "lucide-react";
import {
  useYTChannels,
  useYTPortalUsers,
  useCreatePortalUser,
  useYTPortalMessages,
  useSendPortalMessage,
  useMarkPortalMessageRead,
  useYTAssets,
  type YTPortalMessage,
} from "@/hooks/useYouTubeAgency";
import { useToast } from "@/hooks/use-toast";

export default function ClientPortal() {
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteChannelId, setInviteChannelId] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [messageChannelFilter, setMessageChannelFilter] = useState<string>("all");
  const [replyText, setReplyText] = useState("");
  const [replyUserId, setReplyUserId] = useState<string>("");
  const [replyChannelId, setReplyChannelId] = useState<string>("");

  const { data: channels, isLoading: channelsLoading } = useYTChannels();
  const { data: portalUsers, isLoading: usersLoading } = useYTPortalUsers();
  const { data: assets } = useYTAssets();
  const { data: messages, isLoading: messagesLoading } = useYTPortalMessages(
    messageChannelFilter === "all" ? undefined : messageChannelFilter,
  );
  const createPortalUser = useCreatePortalUser();
  const sendMessage = useSendPortalMessage();
  const markRead = useMarkPortalMessageRead();

  const pendingAssets = useMemo(
    () => (assets || []).filter((a) => !a.is_approved),
    [assets],
  );

  const stats = useMemo(() => {
    const users = portalUsers || [];
    const msgs = messages || [];
    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.is_active).length,
      pendingInvites: users.filter((u) => !u.invite_accepted_at && u.invite_sent_at)
        .length,
      unreadMessages: msgs.filter((m) => !m.is_read && m.sender_type === "client")
        .length,
    };
  }, [portalUsers, messages]);

  const getChannelName = (channelId: string | null): string => {
    if (!channelId) return "Unknown";
    const ch = (channels || []).find((c) => c.id === channelId);
    return ch?.channel_name || ch?.handle || "Unknown";
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteChannelId) {
      toast({
        title: "Missing fields",
        description: "Email and channel are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createPortalUser.mutateAsync({
        email: inviteEmail.trim(),
        channel_id: inviteChannelId,
        display_name: inviteDisplayName.trim() || undefined,
      });
      toast({
        title: "Invite sent",
        description: `Portal invite created for ${inviteEmail}`,
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteChannelId("");
      setInviteDisplayName("");
    } catch (err) {
      toast({
        title: "Failed to create invite",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !replyUserId || !replyChannelId) {
      toast({
        title: "Select a recipient",
        description: "Pick a portal user to reply to.",
        variant: "destructive",
      });
      return;
    }
    try {
      await sendMessage.mutateAsync({
        channel_id: replyChannelId,
        portal_user_id: replyUserId,
        message: replyText.trim(),
      });
      toast({ title: "Message sent" });
      setReplyText("");
    } catch (err) {
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleResendInvite = (email: string) => {
    toast({
      title: "Invite resent",
      description: `A new invite link would be emailed to ${email}.`,
    });
  };

  const handleMarkRead = async (msg: YTPortalMessage) => {
    try {
      await markRead.mutateAsync(msg.id);
    } catch (err) {
      toast({
        title: "Failed to mark read",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const renderUserStatusBadge = (user: (typeof portalUsers)[number]) => {
    if (!user.is_active) {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600">
          Disabled
        </Badge>
      );
    }
    if (!user.invite_accepted_at) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
        >
          Pending
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-green-500/10 text-green-600 border-green-500/30"
      >
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Portal Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage portal access, approvals, and client communications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <UserCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
            <p className="text-xs text-muted-foreground">Portal Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Check className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-amber-600">
              {stats.pendingInvites}
            </p>
            <p className="text-xs text-muted-foreground">Pending Invites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Mail className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-blue-600">
              {stats.unreadMessages}
            </p>
            <p className="text-xs text-muted-foreground">Unread Messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Portal Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="h-5 w-5" />
            Portal Users
          </CardTitle>
          <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite New Client
          </Button>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          ) : (portalUsers || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No portal users yet</p>
              <p className="text-xs mt-1">
                Invite your first client to grant them portal access.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 px-2 font-medium">Channel</th>
                    <th className="text-left py-2 px-2 font-medium">Email</th>
                    <th className="text-left py-2 px-2 font-medium">Display Name</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                    <th className="text-left py-2 px-2 font-medium">Last Login</th>
                    <th className="text-right py-2 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(portalUsers || []).map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-2 px-2 font-medium">
                        {getChannelName(user.channel_id)}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="py-2 px-2">{user.display_name || "—"}</td>
                      <td className="py-2 px-2">{renderUserStatusBadge(user)}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="text-right py-2 px-2">
                        {!user.invite_accepted_at && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResendInvite(user.email)}
                          >
                            Resend
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">All assets approved</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingAssets.slice(0, 10).map((asset) => {
                const daysWaiting = Math.floor(
                  (Date.now() - new Date(asset.created_at).getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {asset.asset_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getChannelName(asset.channel_id)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        daysWaiting > 3
                          ? "bg-red-500/10 text-red-600 border-red-500/30"
                          : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                      }
                    >
                      {daysWaiting}d waiting
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Message Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Filter by channel:</Label>
            <Select
              value={messageChannelFilter}
              onValueChange={setMessageChannelFilter}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {(channels || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.channel_name || c.handle || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {messagesLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : (messages || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {(messages || []).map((msg) => {
                const isClient = msg.sender_type === "client";
                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg border ${
                      isClient
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isClient
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : "bg-gray-500/10 text-gray-600 border-gray-500/30"
                          }
                        >
                          {isClient ? "Client" : "Agency"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getChannelName(msg.channel_id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                        {!msg.is_read && isClient && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleMarkRead(msg)}
                          >
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply Form */}
          <div className="pt-4 border-t space-y-3">
            <Label className="text-sm font-semibold">Send a reply</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                value={replyUserId}
                onValueChange={(v) => {
                  setReplyUserId(v);
                  const u = (portalUsers || []).find((pu) => pu.id === v);
                  setReplyChannelId(u?.channel_id || "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a portal user" />
                </SelectTrigger>
                <SelectContent>
                  {(portalUsers || [])
                    .filter((u) => u.is_active && u.channel_id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.display_name || u.email} ({getChannelName(u.channel_id)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleSendReply}
              disabled={sendMessage.isPending || !replyText.trim()}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-channel">Channel</Label>
              <Select value={inviteChannelId} onValueChange={setInviteChannelId}>
                <SelectTrigger id="invite-channel">
                  <SelectValue
                    placeholder={
                      channelsLoading ? "Loading..." : "Select a channel"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(channels || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.channel_name || c.handle || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="client@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Display Name (optional)</Label>
              <Input
                id="invite-name"
                placeholder="John Creator"
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              disabled={createPortalUser.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={createPortalUser.isPending}
            >
              {createPortalUser.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
