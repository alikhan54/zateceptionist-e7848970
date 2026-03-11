import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Globe, Building2, Sparkles, Loader2, Upload, FileText,
  ArrowRight, SkipForward, Check, ChevronLeft, AlertCircle,
  Linkedin, Instagram, Facebook, X, Plus, Trash2,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import {
  INDUSTRIES, CompanyData, OnboardingData, DEFAULT_COMPANY_DATA,
  transformAPIResponse, safelyMergeCompanyData, fileToBase64, APIAnalysisData,
} from '@/pages/onboarding/constants';

interface DiscoveryStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function DiscoveryStep({ data, updateData, onNext, onBack, onSkip }: DiscoveryStepProps) {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState('website');
  const [websiteUrl, setWebsiteUrl] = useState(data.companyData.social_links?.website || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(data.scrapeConfidence > 0);
  const [confidence, setConfidence] = useState(data.scrapeConfidence);
  const [extractedData, setExtractedData] = useState<APIAnalysisData | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Social profile URLs for Layer 2
  const [socialUrls, setSocialUrls] = useState({
    linkedin: data.companyData.social_links?.linkedin || '',
    instagram: data.companyData.social_links?.instagram || '',
    facebook: data.companyData.social_links?.facebook || '',
  });

  // Document upload for Layer 3
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  // Manual entry state (Layer 4)
  const [companyData, setCompanyData] = useState<CompanyData>(data.companyData);
  const [newService, setNewService] = useState('');

  // Layer 1: Website deep scrape
  const analyzeWebsite = async () => {
    if (!websiteUrl) return;
    setIsAnalyzing(true);
    setScrapeError(null);

    try {
      const response = await callWebhook<{ data: APIAnalysisData; confidence?: number }>(
        WEBHOOKS.DEEP_SCRAPE,
        { url: websiteUrl, layers: ['website'] },
        tenantId || ''
      );

      if (response.success && response.data) {
        const apiData = (response.data as any).data || response.data;
        const conf = (response.data as any).confidence || apiData.confidence || 80;
        setExtractedData(apiData);
        setConfidence(conf);

        const transformed = transformAPIResponse(apiData);
        const merged = safelyMergeCompanyData(companyData, transformed);
        setCompanyData(merged);
        setAnalysisComplete(true);

        updateData({
          companyData: merged,
          scrapeConfidence: conf,
          scrapeSource: 'website',
        });

        // Layer 2: Auto-trigger social if confidence < 60%
        if (conf < 60) {
          setScrapeError('Website analysis incomplete. Try adding social profiles for better results.');
          setActiveTab('social');
        }
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Website analysis failed';
      setScrapeError(`${message}. Try adding social profiles or entering info manually.`);
      setActiveTab('social');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Layer 2: Social media analysis
  const analyzeSocial = async () => {
    const hasUrls = Object.values(socialUrls).some(u => u.trim());
    if (!hasUrls) return;

    setIsAnalyzing(true);
    setScrapeError(null);

    try {
      const response = await callWebhook<{ data: APIAnalysisData; confidence?: number }>(
        WEBHOOKS.ANALYZE_SOCIAL || '/onboarding/analyze-social',
        { social_urls: socialUrls },
        tenantId || ''
      );

      if (response.success && response.data) {
        const apiData = (response.data as any).data || response.data;
        const conf = (response.data as any).confidence || 70;
        const transformed = transformAPIResponse(apiData);
        const merged = safelyMergeCompanyData(companyData, transformed);
        setCompanyData(merged);
        setConfidence(Math.max(confidence, conf));
        setAnalysisComplete(true);
        setExtractedData({ ...extractedData, ...apiData });

        updateData({
          companyData: merged,
          scrapeConfidence: Math.max(confidence, conf),
          scrapeSource: 'social',
        });
      }
    } catch (err) {
      setScrapeError('Social analysis failed. You can enter your info manually below.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Layer 3: Document upload analysis
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setDocFiles(prev => [...prev, ...files]);
    setIsUploadingDocs(true);

    try {
      for (const file of files) {
        const base64Content = await fileToBase64(file);
        const response = await callWebhook(
          WEBHOOKS.ANALYZE_DOCUMENT,
          {
            filename: file.name,
            content: base64Content,
            content_type: file.type || 'application/octet-stream',
          },
          tenantId || ''
        );

        if (response.success && response.data) {
          const apiData = (response.data as any).data || response.data;
          const transformed = transformAPIResponse(apiData);
          const merged = safelyMergeCompanyData(companyData, transformed);
          setCompanyData(merged);
          setAnalysisComplete(true);

          updateData({
            companyData: merged,
            scrapeConfidence: Math.max(confidence, 65),
            scrapeSource: 'document',
          });
        }
      }
    } catch (err) {
      setScrapeError('Some documents could not be analyzed. You can still proceed.');
    } finally {
      setIsUploadingDocs(false);
    }
  };

  // Add/remove services
  const addService = () => {
    if (newService.trim()) {
      setCompanyData(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()],
      }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setCompanyData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  // Save and proceed
  const handleContinue = () => {
    updateData({
      companyData,
      scrapeConfidence: confidence || 100, // Manual = 100% confidence
      scrapeSource: data.scrapeSource || 'manual',
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Tell us about your business</h2>
        <p className="text-muted-foreground">
          We'll use this to train your AI assistant across all departments
        </p>
      </div>

      {scrapeError && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{scrapeError}</AlertDescription>
        </Alert>
      )}

      {/* Input tabs: Website / Social / Documents */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="website">
            <Globe className="h-4 w-4 mr-2" /> Website
          </TabsTrigger>
          <TabsTrigger value="social">
            <Linkedin className="h-4 w-4 mr-2" /> Social
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Upload className="h-4 w-4 mr-2" /> Documents
          </TabsTrigger>
        </TabsList>

        {/* Layer 1: Website URL */}
        <TabsContent value="website" className="space-y-4">
          <div className="space-y-2">
            <Label>Your Website URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://yourcompany.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isAnalyzing}
              />
              <Button onClick={analyzeWebsite} disabled={!websiteUrl || isAnalyzing}>
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : analysisComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Our AI will deep-crawl your site: homepage, about, services, pricing, team, and more
            </p>
          </div>
        </TabsContent>

        {/* Layer 2: Social Profiles */}
        <TabsContent value="social" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add your social profiles for richer AI training data
          </p>
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600 shrink-0" />
              <Input
                placeholder="https://linkedin.com/company/yourcompany"
                value={socialUrls.linkedin}
                onChange={(e) => setSocialUrls(prev => ({ ...prev, linkedin: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-500 shrink-0" />
              <Input
                placeholder="https://facebook.com/yourpage"
                value={socialUrls.facebook}
                onChange={(e) => setSocialUrls(prev => ({ ...prev, facebook: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500 shrink-0" />
              <Input
                placeholder="https://instagram.com/yourhandle"
                value={socialUrls.instagram}
                onChange={(e) => setSocialUrls(prev => ({ ...prev, instagram: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={analyzeSocial} disabled={isAnalyzing || !Object.values(socialUrls).some(u => u.trim())}>
            {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Analyze Social Profiles
          </Button>
        </TabsContent>

        {/* Layer 3: Document Upload */}
        <TabsContent value="documents" className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <Input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv"
              className="hidden"
              id="discovery-file-upload"
              onChange={handleDocUpload}
            />
            <label htmlFor="discovery-file-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Upload business documents</p>
              <p className="text-sm text-muted-foreground mt-1">
                Brochures, catalogs, SOPs — PDF, DOCX, TXT, CSV
              </p>
            </label>
          </div>
          {isUploadingDocs && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing documents...
            </div>
          )}
          {docFiles.length > 0 && (
            <div className="space-y-2">
              {docFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(0)} KB</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Extracted Data Preview + Manual Edit (always visible) */}
      {analysisComplete && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              AI-Extracted Data
              <Badge variant="secondary" className="ml-auto">{confidence}% confidence</Badge>
            </CardTitle>
            <CardDescription>Review and edit before continuing</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Manual edit form (Layer 4 — always visible, pre-populated if scraped) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Details</CardTitle>
          <CardDescription>
            {analysisComplete ? 'Edit any auto-detected fields' : 'Enter your business information'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                placeholder="Your Company Name"
                value={companyData.company_name}
                onChange={(e) => setCompanyData(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select
                value={companyData.industry}
                onValueChange={(v) => setCompanyData(prev => ({ ...prev, industry: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.icon} {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What does your business do?"
              value={companyData.description}
              onChange={(e) => setCompanyData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Services / Products</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {companyData.services.map((s, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {s}
                  <button onClick={() => removeService(i)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a service or product"
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
              />
              <Button variant="outline" size="sm" onClick={addService} disabled={!newService.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={companyData.contact.phone}
                onChange={(e) => setCompanyData(prev => ({
                  ...prev,
                  contact: { ...prev.contact, phone: e.target.value },
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="contact@company.com"
                value={companyData.contact.email}
                onChange={(e) => setCompanyData(prev => ({
                  ...prev,
                  contact: { ...prev.contact, email: e.target.value },
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip} className="gap-2">
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
          <Button onClick={handleContinue} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
