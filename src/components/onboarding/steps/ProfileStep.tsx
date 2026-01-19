// ============================================================
// STEP 3: PROFILE - Business Profile Editing
// ============================================================

import React from 'react';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StepProps } from './index';

const INDUSTRIES = [
  { value: 'healthcare', label: 'Healthcare & Medical', icon: '🏥' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { value: 'restaurant', label: 'Restaurant & Food', icon: '🍽️' },
  { value: 'salon', label: 'Salon & Beauty', icon: '💇' },
  { value: 'legal', label: 'Legal Services', icon: '⚖️' },
  { value: 'fitness', label: 'Fitness & Wellness', icon: '💪' },
  { value: 'education', label: 'Education & Training', icon: '📚' },
  { value: 'automotive', label: 'Automotive', icon: '🚗' },
  { value: 'professional', label: 'Professional Services', icon: '💼' },
  { value: 'retail', label: 'Retail & E-commerce', icon: '🛍️' },
  { value: 'general', label: 'Other', icon: '🏢' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

interface ProfileStepProps extends StepProps {
  companyName: string;
  setCompanyName: (name: string) => void;
  industry: string;
  setIndustry: (industry: string) => void;
  description: string;
  setDescription: (description: string) => void;
  timezone: string;
  setTimezone: (timezone: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  email: string;
  setEmail: (email: string) => void;
  website: string;
  setWebsite: (website: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function ProfileStep({
  onPrevious,
  companyName,
  setCompanyName,
  industry,
  setIndustry,
  description,
  setDescription,
  timezone,
  setTimezone,
  phone,
  setPhone,
  email,
  setEmail,
  website,
  setWebsite,
  onSave,
  saving,
}: ProfileStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Business Profile</h2>
        <p className="text-muted-foreground">
          Review and customize your business information
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry *</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    <span className="flex items-center gap-2">
                      <span>{ind.icon}</span>
                      <span>{ind.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of your business..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourbusiness.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@yourbusiness.com"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          onClick={onSave}
          disabled={!companyName || saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
