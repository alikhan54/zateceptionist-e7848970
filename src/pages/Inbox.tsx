// src/pages/Inbox.tsx - Query customers table for conversations
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Search, RefreshCcw, MessageSquare, Phone, Mail, Volume2, VolumeX, Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Channel colors
const CHANNEL_CONFIG: Record<string, { icon: typeof MessageSquare; color: string; bg: string }> = {
  whatsapp: { icon: MessageSquare, color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
  instagram: { icon: MessageSquare, color: "text-[#E1306C]", bg: "bg-[#E1306C]/10" },
  facebook: { icon: MessageSquare, color: "text-[#1877F2]", bg: "bg-[#1877F2]/10" },
  email: { icon: Mail, color: "text-[#4285F4]", bg: "bg-[#4285F4]/10" },
  sms: { icon: MessageSquare, color: "text-[#9333EA]", bg: "bg-[#9333EA]/10" },
  voice: { icon: Phone, color: "text-[#F97316]", bg: "bg-[#F97316]/10" },
  web: { icon: MessageSquare, color: "text-[#6B7280]", bg: "bg-[#6B7280]/10" },
};

export default function Inbox() {
  const { tenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Query customers table
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["inbox-customers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const filteredCustomers = customers.filter((c: any) => {
    const name = c.name || c.phone || c.email || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const unreadCount = customers.filter((c: any) => c.status === "active").length;

  const getChannelIcon = (source: string | null) => {
    const channel = source?.toLowerCase() || "web";
    const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.web;
    const Icon = config.icon;
    return <Icon className={cn("h-4 w-4", config.color)} />;
  };

  const getInitials = (name: string | null, phone: string | null) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (phone) return phone.slice(-2);
    return "??";
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-muted-foreground text-sm">
            {customers.length} conversations • {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Conversation List */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredCustomers.map((customer: any) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedId(customer.id)}
                  className={cn(
                    "p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedId === customer.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(customer.name, customer.phone)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        {getChannelIcon(customer.source)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("font-medium truncate", customer.status === "active" && "font-bold")}>
                          {customer.name || customer.phone || customer.email || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {customer.updated_at && formatDistanceToNow(new Date(customer.updated_at), { addSuffix: false })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {customer.notes || "No recent message"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {customer.source || "web"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {customer.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Center Panel - Message Thread */}
        <div className="flex-1 flex flex-col">
          {selectedId ? (
            <>
              <div className="p-4 border-b">
                <h2 className="font-semibold">
                  {customers.find((c: any) => c.id === selectedId)?.name || "Conversation"}
                </h2>
              </div>
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>Select a conversation to view messages</p>
                  <p className="text-sm">Message thread will appear here</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose from the list on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
