// ============================================================
// PROJECT 420: AI-POWERED ONBOARDING WIZARD COMPONENT
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Brain,
  Building2,
  Package,
  Users,
  Bot,
  MessageSquare,
  GraduationCap,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Upload,
  Loader2,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useOnboardingSession,
  useBusinessAnalysis,
  useBusinessProfile,
  useServicesCatalog,
  useTargetPersonas,
  useAITraining,
} from '@/hooks/useOnboardingWizard';
import type {
  OnboardingStepId,
  AIAnalysisResult,
  ServiceCatalogItem,
  TargetPersona,
} from '@/types/onboardingWizard';

// ============================================
// CONSTANTS
// ============================================

const STEPS = [
  { id: 'discover' as const, number: 1, title: 'Discover', icon: Search, description: 'Tell us about your business' },
  { id: 'analyze' as const, number: 2, title: 'Analyze', icon: Brain, description: 'AI extracts your business info' },
  { id: 'profile' as const, number: 3, title: 'Profile', icon: Building2, description: 'Review and customize your profile' },
  { id: 'services' as const, number: 4, title: 'Services', icon: Package, description: 'Define what you offer' },
  { id: 'personas' as const, number: 5, title: 'Customers', icon: Users, description: 'Define your ideal customers' },
  { id: 'ai_config' as const, number: 6, title: 'AI Setup', icon: Bot, description: 'Configure your AI assistant' },
  { id: 'channels' as const, number: 7, title: 'Channels', icon: MessageSquare, description: 'Connect your communication channels' },
  { id: 'training' as const, number: 8, title: 'Training', icon: GraduationCap, description: 'Train your AI agents' },
  { id: 'complete' as const, number: 9, title: 'Complete', icon: CheckCircle, description: "You're all set!" },
];

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

const AI_PERSONALITIES = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive' },
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

// ============================================
// MAIN COMPONENT
// ============================================

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { toast } = useToast();
  const { session, goToStep, completeStep } = useOnboardingSession();
  const { analyzing, result, confidence, analyzeURL, analyzeSocial, analyzeDocument, clearResult } = useBusinessAnalysis();
  const { profile, saveProfile, saving: savingProfile } = useBusinessProfile();
  const { services, addService, updateService, deleteService, bulkAddServices } = useServicesCatalog();
  const { personas, addPersona, updatePersona, deletePersona } = useTargetPersonas();
  const { training, trainAllAgents, trainedModules } = useAITraining();

  // Local state
  const [currentStep, setCurrentStep] = useState(session?.current_step || 1);
  const [inputType, setInputType] = useState<'website' | 'social' | 'document' | 'manual'>('website');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<'instagram' | 'facebook' | 'linkedin'>('instagram');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Profile form state
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [industry, setIndustry] = useState(profile?.industry || 'general');
  const [description, setDescription] = useState(profile?.short_description || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/New_York');
  const [phone, setPhone] = useState(profile?.primary_phone || '');
  const [email, setEmail] = useState(profile?.primary_email || '');
  const [website, setWebsite] = useState(profile?.website_url || '');

  // AI config state
  const [aiName, setAiName] = useState('Zate');
  const [aiRole, setAiRole] = useState('AI Assistant');
  const [aiPersonality, setAiPersonality] = useState('friendly');
  const [aiGreeting, setAiGreeting] = useState('');

  // Channels state
  const [channels, setChannels] = useState({
    whatsapp: false,
    email: true,
    sms: false,
    voice: false,
    instagram: false,
    facebook: false,
  });

  // Calculate progress
  const progress = useMemo(() => {
    return Math.round((currentStep / STEPS.length) * 100);
  }, [currentStep]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const stepId = STEPS[currentStep - 1]?.id;
    if (stepId) {
      await completeStep(stepId);
    }
    
    if (currentStep < STEPS.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await goToStep(nextStep);
    }
  }, [currentStep, completeStep, goToStep]);

  const handlePrevious = useCallback(async () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      await goToStep(prevStep);
    }
  }, [currentStep, goToStep]);

  const handleGoToStep = useCallback(async (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
      await goToStep(step);
    }
  }, [goToStep]);

  // Analysis handlers
  const handleAnalyze = useCallback(async () => {
    try {
      let analysisResult: AIAnalysisResult | undefined;

      if (inputType === 'website' && websiteUrl) {
        analysisResult = await analyzeURL(websiteUrl);
      } else if (inputType === 'social' && socialUrl) {
        analysisResult = await analyzeSocial(socialPlatform, socialUrl);
      } else if (inputType === 'document' && uploadedFile) {
        analysisResult = await analyzeDocument(uploadedFile);
      }

      if (analysisResult) {
        // Pre-fill form with analysis results
        if (analysisResult.company_name) setCompanyName(analysisResult.company_name);
        if (analysisResult.industry) setIndustry(analysisResult.industry);
        if (analysisResult.description) setDescription(analysisResult.description);
        if (analysisResult.contact?.email) setEmail(analysisResult.contact.email);
        if (analysisResult.contact?.phone) setPhone(analysisResult.contact.phone);
        if (analysisResult.suggested_ai_config) {
          if (analysisResult.suggested_ai_config.name) setAiName(analysisResult.suggested_ai_config.name);
          if (analysisResult.suggested_ai_config.role) setAiRole(analysisResult.suggested_ai_config.role);
          if (analysisResult.suggested_ai_config.personality) setAiPersonality(analysisResult.suggested_ai_config.personality);
          if (analysisResult.suggested_ai_config.greeting) setAiGreeting(analysisResult.suggested_ai_config.greeting);
        }

        toast({
          title: 'Analysis Complete',
          description: `We've extracted information with ${Math.round(confidence * 100)}% confidence.`,
        });

        // Auto-advance to next step
        handleNext();
      }
    } catch (error) {
      console.error('Analysis error:', error);
    }
  }, [inputType, websiteUrl, socialUrl, socialPlatform, uploadedFile, analyzeURL, analyzeSocial, analyzeDocument, confidence, toast, handleNext]);

  // Profile save handler
  const handleSaveProfile = useCallback(async () => {
    try {
      await saveProfile({
        company_name: companyName,
        industry,
        short_description: description,
        timezone,
        primary_phone: phone,
        primary_email: email,
        website_url: website,
      });
      handleNext();
    } catch (error) {
      console.error('Save profile error:', error);
    }
  }, [companyName, industry, description, timezone, phone, email, website, saveProfile, handleNext]);

  // Training handler
  const handleTraining = useCallback(async () => {
    try {
      await trainAllAgents();
      handleNext();
    } catch (error) {
      console.error('Training error:', error);
    }
  }, [trainAllAgents, handleNext]);

  // Complete handler
  const handleComplete = useCallback(() => {
    toast({
      title: '🎉 Setup Complete!',
      description: 'Your AI assistant is ready to start helping your business.',
    });
    onComplete?.();
  }, [toast, onComplete]);

  // ============================================
  // RENDER STEP CONTENT
  // ============================================

  const renderStepContent = () => {
    const step = STEPS[currentStep - 1];
    
    switch (step?.id) {
      case 'discover':
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
                <Button onClick={handleNext} className="gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || (!websiteUrl && !socialUrl && !uploadedFile)}
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

      case 'analyze':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">AI Analysis in Progress</h2>
              <p className="text-muted-foreground">
                Our AI is extracting information about your business
              </p>
            </div>

            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-primary/10 animate-pulse" />
                  <Brain className="h-12 w-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">Analyzing your business...</p>
                  <p className="text-sm text-muted-foreground">This usually takes 15-30 seconds</p>
                </div>
              </div>
            ) : result ? (
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      Analysis Complete
                    </CardTitle>
                    <Badge variant="secondary">
                      {Math.round(confidence * 100)}% confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Company Name</p>
                      <p className="font-medium">{result.company_name || 'Not detected'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{result.industry || 'Not detected'}</p>
                    </div>
                  </div>
                  {result.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{result.description}</p>
                    </div>
                  )}
                  {result.services && result.services.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Services Detected</p>
                      <div className="flex flex-wrap gap-2">
                        {result.services.map((service, i) => (
                          <Badge key={i} variant="outline">{service.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No analysis results yet</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrevious} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} disabled={analyzing} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'profile':
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
              <Button variant="outline" onClick={handlePrevious} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={!companyName || savingProfile}
                className="gap-2"
              >
                {savingProfile ? (
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

      case 'services':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Your Services</h2>
              <p className="text-muted-foreground">
                Define the services or products you offer
              </p>
            </div>

            <div className="space-y-4">
              {result?.services && result.services.length > 0 && services.length === 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">AI-detected services</p>
                        <p className="text-sm text-muted-foreground">
                          We found {result.services.length} services from your website
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          bulkAddServices(result.services!.map((s, i) => ({
                            name: s.name,
                            description: s.description,
                            type: 'service' as const,
                            price_type: 'quote' as const,
                            currency: 'USD',
                            is_active: true,
                            is_featured: i === 0,
                            keywords: [],
                            faq_entries: [],
                            display_order: i,
                          })));
                        }}
                      >
                        Import All
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {services.length > 0 ? (
                <div className="grid gap-3">
                  {services.map((service) => (
                    <Card key={service.id} className="group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteService(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No services added yet</p>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrevious} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'personas':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Target Customers</h2>
              <p className="text-muted-foreground">
                Define who your ideal customers are
              </p>
            </div>

            <div className="space-y-4">
              {personas.length > 0 ? (
                <div className="grid gap-3">
                  {personas.map((persona) => (
                    <Card key={persona.id} className="group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{persona.name}</p>
                              {persona.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {persona.type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deletePersona(persona.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No customer personas defined yet</p>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Customer Persona
              </Button>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrevious} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'ai_config':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Configure Your AI Assistant</h2>
              <p className="text-muted-foreground">
                Customize how your AI represents your business
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aiName">AI Name</Label>
                  <Input
                    id="aiName"
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    placeholder="e.g., Zate, Alex, Luna"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aiRole">AI Role</Label>
                  <Input
                    id="aiRole"
                    value={aiRole}
                    onChange={(e) => setAiRole(e.target.value)}
                    placeholder="e.g., Customer Support, Sales Assistant"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>AI Personality</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {AI_PERSONALITIES.map((p) => (
                    <Card
                      key={p.value}
                      className={`cursor-pointer transition-all ${
                        aiPersonality === p.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setAiPersonality(p.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <p className="font-medium">{p.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiGreeting">Custom Greeting (Optional)</Label>
                <Textarea
                  id="aiGreeting"
                  value={aiGreeting}
                  onChange={(e) => setAiGreeting(e.target.value)}
                  placeholder="Hi! I'm [AI Name], your [Role]. How can I help you today?"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrevious} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'channels':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Communication Channels</h2>
              <p className="text-muted-foreground">
                Choose which channels your AI should handle
              </p>
            </div>

            <div className="grid gap-4">
              {[
                { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, description: 'Handle WhatsApp Business messages' },
                { key: 'email', label: 'Email', icon: Mail, description: 'Respond to email inquiries' },
                { key: 'sms', label: 'SMS', icon: MessageSquare, description: 'Text message support' },
                { key: 'voice', label: 'Voice/Phone', icon: Phone, description: 'AI-powered phone support' },
                { key: 'instagram', label: 'Instagram DMs', icon: Instagram, description: 'Handle Instagram direct messages' },
                { key: 'facebook', label: 'Facebook Messenger', icon: Facebook, description: 'Respond to Facebook messages' },
              ].map((channel) => (
                <Card key={channel.key} className="group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <channel.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{channel.label}</p>
                        <p className="text-sm text-muted-foreground">{channel.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={channels[channel.key as keyof typeof channels]}
                      onCheckedChange={(checked) =>
                        setChannels((prev) => ({ ...prev, [channel.key]: checked }))
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrevious} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Train Your AI</h2>
              <p className="text-muted-foreground">
                Final step: Let our AI learn about your business
              </p>
            </div>

            {training ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-primary/10 animate-pulse" />
                  <GraduationCap className="h-12 w-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">Training AI agents...</p>
                  <p className="text-sm text-muted-foreground">
                    This may take a minute
                  </p>
                </div>
              </div>
            ) : trainedModules.length > 0 ? (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    Training Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {trainedModules.map((module) => (
                      <Badge key={module} variant="secondary">
                        {module}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <GraduationCap className="h-16 w-16 mx-auto text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Train</h3>
                  <p className="text-muted-foreground mb-6">
                    Your AI will learn from your business profile, services, and knowledge base
                    to provide accurate and helpful responses.
                  </p>
                  <Button onClick={handleTraining} size="lg" className="gap-2">
                    <Sparkles className="h-5 w-5" />
                    Start Training
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handlePrevious} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} disabled={training} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4 py-8">
              <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">You're All Set! 🎉</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your AI assistant is now configured and ready to help your business.
                Start engaging with your customers today!
              </p>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">What's Next?</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Test your AI</p>
                      <p className="text-sm text-muted-foreground">
                        Try the chat widget to see how your AI responds
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Connect more channels</p>
                      <p className="text-sm text-muted-foreground">
                        Add WhatsApp, email, and other integrations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Review conversations</p>
                      <p className="text-sm text-muted-foreground">
                        Monitor AI responses and improve over time
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
              <Button onClick={handleComplete} size="lg" className="gap-2">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">Setup Your AI Assistant</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="hidden md:flex items-center justify-between mt-4 -mx-2">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => handleGoToStep(step.number)}
                  disabled={step.number > currentStep + 1}
                  className={`flex flex-col items-center gap-1 px-2 transition-all ${
                    isActive
                      ? 'text-primary'
                      : isCompleted
                      ? 'text-primary/70 hover:text-primary'
                      : 'text-muted-foreground'
                  } ${step.number > currentStep + 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden lg:block">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingWizard;
