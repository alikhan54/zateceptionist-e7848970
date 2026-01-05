import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Recruitment() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recruitment</h1>
          <p className="text-muted-foreground mt-1">Manage job postings and candidates</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Post Job</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Open Positions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Total Applicants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Interviews Scheduled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Postings</CardTitle>
          <CardDescription>Manage your open positions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No job postings yet</p>
            <p className="text-sm">Create your first job posting</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
