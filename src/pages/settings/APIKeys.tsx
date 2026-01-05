import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Plus, Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function APIKeys() {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-1">Manage API access keys</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Generate Key</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Use these keys to authenticate API requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No API keys generated</p>
            <p className="text-sm">Generate your first API key to get started</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>Learn how to use our API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-mono">Base URL: https://api.zateceptionist.com/v1</p>
          </div>
          <Button variant="link" className="mt-2 p-0">View Full Documentation →</Button>
        </CardContent>
      </Card>
    </div>
  );
}
