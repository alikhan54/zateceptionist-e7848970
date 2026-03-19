import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Palette, Sparkles, Save, Eye, Plus, X, RefreshCw } from 'lucide-react';

const TONE_OPTIONS = ['Professional', 'Friendly', 'Authoritative', 'Playful', 'Warm', 'Inspirational', 'Technical'];
const STYLE_OPTIONS = ['Formal', 'Conversational', 'Technical', 'Playful', 'Inspirational'];
const EMOJI_OPTIONS = [
  { value: 'none', label: 'None — No emojis' },
  { value: 'minimal', label: 'Minimal — Rare, key moments only' },
  { value: 'moderate', label: 'Moderate — Natural, occasional use' },
  { value: 'heavy', label: 'Heavy — Frequent, expressive' },
];

function TagInput({ label, tags, onChange, placeholder }: { label: string; tags: string[]; onChange: (tags: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) { onChange([...tags, v]); setInput(''); }
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map((t, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {t} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onChange(tags.filter((_, j) => j !== i))} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrandVoice() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [brandName, setBrandName] = useState('');
  const [tone, setTone] = useState<string[]>([]);
  const [writingStyle, setWritingStyle] = useState('conversational');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandValues, setBrandValues] = useState<string[]>([]);
  const [alwaysUse, setAlwaysUse] = useState<string[]>([]);
  const [neverUse, setNeverUse] = useState<string[]>([]);
  const [exampleContent, setExampleContent] = useState<string[]>(['', '', '']);
  const [competitorDiff, setCompetitorDiff] = useState('');
  const [industryJargon, setIndustryJargon] = useState<string[]>([]);
  const [emojiPolicy, setEmojiPolicy] = useState('moderate');
  const [guidelines, setGuidelines] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [samplePost, setSamplePost] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['brand_voice', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return null;
      const { data } = await supabase
        .from('brand_voice_profiles')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .single();
      return data;
    },
    enabled: !!tenantConfig?.id,
  });

  useEffect(() => {
    if (profile) {
      setBrandName(profile.brand_name || '');
      setTone(profile.tone || []);
      setWritingStyle(profile.writing_style || 'conversational');
      setTargetAudience(profile.target_audience || '');
      setBrandValues(profile.brand_values || []);
      setAlwaysUse(profile.vocabulary_always_use || []);
      setNeverUse(profile.vocabulary_never_use || []);
      setExampleContent(profile.example_content?.length ? profile.example_content : ['', '', '']);
      setCompetitorDiff(profile.competitor_differentiation || '');
      setIndustryJargon(profile.industry_jargon || []);
      setEmojiPolicy(profile.emoji_policy || 'moderate');
      setGuidelines(profile.content_guidelines || '');
      setGeneratedPrompt(profile.generated_system_prompt || '');
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      const data = {
        tenant_id: tenantConfig.id,
        brand_name: brandName,
        tone,
        writing_style: writingStyle,
        target_audience: targetAudience,
        brand_values: brandValues,
        vocabulary_always_use: alwaysUse,
        vocabulary_never_use: neverUse,
        example_content: exampleContent.filter(e => e.trim()),
        competitor_differentiation: competitorDiff,
        industry_jargon: industryJargon,
        emoji_policy: emojiPolicy,
        content_guidelines: guidelines,
        generated_system_prompt: generatedPrompt,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('brand_voice_profiles').upsert(data, { onConflict: 'tenant_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand_voice'] });
      toast({ title: 'Brand voice saved!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const generatePrompt = async () => {
    setIsGenerating(true);
    try {
      const GEMINI_KEYS = [
        'AIzaSyDIAlusEJAIfsERqE10QMOKwtHDnll7AWU',
        'AIzaSyAukisa9vJAL59SILF_URNN0R2XdlTnnYM',
        'AIzaSyDzkJ6JY6cMuAzJyc6tjC2K-OWUtVOOvHQ',
        'AIzaSyBMUyNG2sU_w8_2dNbF9BpNPMkCJgxTyII',
        'AIzaSyAqWCRIshQbFfyFccFK9I24cn4htIPIdPo',
      ];
      const keyIndex = Math.floor(Date.now() / 3600000) % GEMINI_KEYS.length;
      const key = GEMINI_KEYS[keyIndex];

      const prompt = `You are a brand voice consultant. Based on this brand profile, generate a concise system prompt (150-250 words) that can be prepended to any AI content generation request to ensure consistent brand voice.

Brand: ${brandName}
Tone: ${tone.join(', ')}
Writing Style: ${writingStyle}
Target Audience: ${targetAudience}
Brand Values: ${brandValues.join(', ')}
Words to always use: ${alwaysUse.join(', ')}
Words to never use: ${neverUse.join(', ')}
Competitor differentiation: ${competitorDiff}
Industry jargon: ${industryJargon.join(', ')}
Emoji policy: ${emojiPolicy}
Additional guidelines: ${guidelines}
${exampleContent.filter(e => e.trim()).length > 0 ? 'Example content:\n' + exampleContent.filter(e => e.trim()).join('\n---\n') : ''}

Return ONLY the system prompt text, no explanations.`;

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      );
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setGeneratedPrompt(text.trim());
        toast({ title: 'Brand voice prompt generated!' });
      } else {
        toast({ title: 'Generation failed', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const testBrandVoice = async () => {
    if (!generatedPrompt) {
      toast({ title: 'Generate a brand voice prompt first', variant: 'destructive' });
      return;
    }
    setIsTesting(true);
    try {
      const GEMINI_KEYS = [
        'AIzaSyDIAlusEJAIfsERqE10QMOKwtHDnll7AWU',
        'AIzaSyAukisa9vJAL59SILF_URNN0R2XdlTnnYM',
        'AIzaSyDzkJ6JY6cMuAzJyc6tjC2K-OWUtVOOvHQ',
      ];
      const key = GEMINI_KEYS[Math.floor(Date.now() / 3600000) % GEMINI_KEYS.length];

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${generatedPrompt}\n\nWrite a short social media post (2-3 sentences) promoting ${brandName || 'our company'} to ${targetAudience || 'potential customers'}. Topic: Why customers love working with us.` }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 256 },
          }),
        }
      );
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      setSamplePost(text?.trim() || 'Failed to generate sample.');
    } catch (e: any) {
      setSamplePost('Error: ' + e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleTone = (t: string) => {
    setTone(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-purple-500" /> Brand Voice
          </h1>
          <p className="text-muted-foreground">Define your brand personality for consistent AI-generated content</p>
        </div>
        <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="marketing-gradient text-white">
          <Save className="h-4 w-4 mr-2" /> {saveProfile.isPending ? 'Saving...' : 'Save Brand Voice'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Core Identity */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand Name</Label>
                <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder={tenantConfig?.company_name || 'Your Brand'} />
              </div>

              <div className="space-y-2">
                <Label>Tone (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map(t => (
                    <Badge
                      key={t}
                      variant={tone.includes(t) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${tone.includes(t) ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-muted'}`}
                      onClick={() => toggleTone(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Writing Style</Label>
                  <Select value={writingStyle} onValueChange={setWritingStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Emoji Policy</Label>
                  <Select value={emojiPolicy} onValueChange={setEmojiPolicy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMOJI_OPTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                  placeholder="Describe your ideal customer or audience..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Competitor Differentiation</Label>
                <Textarea value={competitorDiff} onChange={e => setCompetitorDiff(e.target.value)}
                  placeholder="What makes you different? e.g., We focus on AI automation while competitors use manual processes" rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vocabulary</CardTitle>
              <CardDescription>Control the words AI uses in your content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TagInput label="Brand Values" tags={brandValues} onChange={setBrandValues} placeholder="e.g., Innovation" />
              <TagInput label="Words to Always Use" tags={alwaysUse} onChange={setAlwaysUse} placeholder="e.g., Transform" />
              <TagInput label="Words to Never Use" tags={neverUse} onChange={setNeverUse} placeholder="e.g., Cheap" />
              <TagInput label="Industry Jargon" tags={industryJargon} onChange={setIndustryJargon} placeholder="e.g., SaaS" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Example Content</CardTitle>
              <CardDescription>Paste 1-3 examples of content that matches your ideal brand voice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {exampleContent.map((ex, i) => (
                <Textarea key={i} value={ex} onChange={e => {
                  const updated = [...exampleContent];
                  updated[i] = e.target.value;
                  setExampleContent(updated);
                }} placeholder={`Example ${i + 1}...`} rows={3} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={guidelines} onChange={e => setGuidelines(e.target.value)}
                placeholder="Any additional guidelines for content generation..." rows={3} />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Generated Prompt + Test */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" /> AI Brand Prompt
              </CardTitle>
              <CardDescription>This prompt is injected into all AI content generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={generatePrompt} disabled={isGenerating} className="w-full" variant="outline">
                <Sparkles className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate Brand Voice Prompt'}
              </Button>
              {generatedPrompt && (
                <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-auto">
                  {generatedPrompt}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" /> Test Brand Voice
              </CardTitle>
              <CardDescription>Preview how your brand voice sounds in a sample post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={testBrandVoice} disabled={isTesting || !generatedPrompt} className="w-full" variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Generating...' : 'Generate Sample Post'}
              </Button>
              {samplePost && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4 text-sm border">
                  <p className="font-medium text-xs text-muted-foreground mb-2">Sample Social Post:</p>
                  <p>{samplePost}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
