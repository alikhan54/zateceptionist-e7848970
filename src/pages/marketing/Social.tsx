import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Plus, Instagram, Facebook, Twitter, Linkedin } from 'lucide-react';

export default function SocialCommander() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social Commander</h1>
          <p className="text-muted-foreground mt-1">Manage all your social media in one place</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Create Post</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
          { name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
          { name: 'Twitter', icon: Twitter, color: 'text-sky-500' },
          { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
        ].map((platform) => (
          <Card key={platform.name}>
            <CardContent className="p-6 text-center">
              <platform.icon className={`h-8 w-8 mx-auto mb-2 ${platform.color}`} />
              <p className="font-medium">{platform.name}</p>
              <p className="text-sm text-muted-foreground">Not connected</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled posts</p>
            <p className="text-sm">Create your first social post</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
