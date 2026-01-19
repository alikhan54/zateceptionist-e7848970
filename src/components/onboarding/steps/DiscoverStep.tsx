// ============================================================
// STEP 1: DISCOVER - URL/Social/Document Input
// ============================================================

import React, { useState } from 'react';
import {
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Upload,
  Edit2,
  ArrowRight,
  Loader2,
  Sparkles,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StepProps } from './index';

interface DiscoverStepProps extends StepProps {
  inputType: 'website' | 'social' | 'document' | 'manual';
  setInputType: (type: 'website' | 'social' | 'document' | 'manual') => void;
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  socialUrl: string;
  setSocialUrl: (url: string) => void;
  socialPlatform: 'instagram' | 'facebook' | 'linkedin';
  setSocialPlatform: (platform: 'instagram' | 'facebook' | 'linkedin') => void;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  onAnalyze: () => Promise<void>;
  analyzing: boolean;
}

export function DiscoverStep({
  onNext,
  inputType,
  setInputType,
  websiteUrl,
  setWebsiteUrl,
  socialUrl,
  setSocialUrl,
  socialPlatform,
  setSocialPlatform,
  uploadedFile,
  setUploadedFile,
  onAnalyze,
  analyzing,
}: DiscoverStepProps) {
  const canAnalyze = inputType === 'website' ? !!websiteUrl : 
                     inputType === 'social' ? !!socialUrl : 
                     inputType === 'document' ? !!uploadedFile : false;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">How would you like to get started?</h2>
        <p className="text-muted-foreground">
          Share your business info and our AI will set everything up for you
        </p>
      </div>

      <Tabs value={inputType} onValueChange={(v) => setInputType(v as typeof inputType)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Website</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            <span className="hidden sm:inline">Social</span>
          </TabsTrigger>
          <TabsTrigger value="document" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Document</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            <span className="hidden sm:inline">Manual</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="website" className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Website URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://yourbusiness.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Our AI will analyze your website to extract business information
            </p>
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="flex gap-2">
                {(['instagram', 'facebook', 'linkedin'] as const).map((platform) => (
                  <Button
                    key={platform}
                    variant={socialPlatform === platform ? 'default' : 'outline'}
                    onClick={() => setSocialPlatform(platform)}
                    className="flex-1"
                  >
                    {platform === 'instagram' && <Instagram className="h-4 w-4 mr-2" />}
                    {platform === 'facebook' && <Facebook className="h-4 w-4 mr-2" />}
                    {platform === 'linkedin' && <Linkedin className="h-4 w-4 mr-2" />}
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Profile URL</Label>
              <Input
                placeholder={`https://${socialPlatform}.com/yourbusiness`}
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="document" className="space-y-4 mt-6">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-2">
                Supports PDF, Word, or text files
              </p>
            </label>
            {uploadedFile && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
                <Check className="h-4 w-4" />
                {uploadedFile.name}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-6">
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <Edit2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Enter your details manually</p>
            <p className="text-sm text-muted-foreground mt-2">
              Skip the AI analysis and fill in your business information directly
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        {inputType === 'manual' ? (
          <Button onClick={onNext} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onAnalyze}
            disabled={analyzing || !canAnalyze}
            className="gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze with AI
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
