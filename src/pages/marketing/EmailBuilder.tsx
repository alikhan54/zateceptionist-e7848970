import { useState, useCallback, useMemo } from 'react';
import { callWebhook, WEBHOOKS, N8N_WEBHOOK_BASE } from '@/integrations/supabase/client';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useMarketingContent } from '@/hooks/useMarketingContent';
import {
  Mail, Plus, Send, Eye, Smartphone, Monitor, Layout, Type,
  Image as ImageIcon, Square, Columns, FileText, Link, Code,
  Sparkles, Save, Trash2, Copy, MoveUp, MoveDown, Settings,
  CheckCircle2, AlertTriangle, GripVertical, Download, Globe,
  Clock, Shield, Zap
} from 'lucide-react';

// ─── Types ───
interface EmailBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'social' | 'footer';
  content: Record<string, any>;
}

// ─── Constants ───
const blockTypes = [
  { type: 'header', icon: Type, label: 'Header' },
  { type: 'text', icon: FileText, label: 'Text Block' },
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'button', icon: Square, label: 'Button' },
  { type: 'divider', icon: Separator, label: 'Divider' },
  { type: 'columns', icon: Columns, label: 'Columns' },
  { type: 'social', icon: Link, label: 'Social Links' },
  { type: 'footer', icon: Layout, label: 'Footer' },
] as const;

const personalizationTokens = [
  { token: '{{first_name}}', label: 'First Name' },
  { token: '{{last_name}}', label: 'Last Name' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{company_name}}', label: 'Company' },
  { token: '{{unsubscribe_link}}', label: 'Unsubscribe' },
];

const templateCategories = ['All', 'Welcome', 'Newsletter', 'Promotional', 'Transactional', 'Re-engagement'] as const;

const SPAM_WORDS = ['free', 'act now', 'limited time', 'click here', 'buy now', 'order now', 'urgent', 'congratulations', 'winner', 'guarantee', 'no obligation', 'risk free', 'cash', 'earn money', 'make money'];

const builtInTemplates = [
  { id: 'welcome', name: 'Welcome Email', category: 'Welcome', desc: 'Greet new subscribers with a warm welcome', icon: Mail, color: 'bg-primary/10 text-primary', blocks: [
    { id: 'w1', type: 'header' as const, content: { text: 'Welcome to {{company_name}}! 🎉', size: 'h1', align: 'center' } },
    { id: 'w2', type: 'image' as const, content: { src: 'https://via.placeholder.com/600x200/6366f1/ffffff?text=Welcome', alt: 'Welcome banner', width: '100%' } },
    { id: 'w3', type: 'text' as const, content: { html: '<p>Hi {{first_name}},</p><p>Thank you for joining us! We\'re thrilled to have you on board.</p><p>Here\'s what you can expect from us:</p><ul><li>Weekly insights and tips</li><li>Exclusive offers</li><li>Early access to new features</li></ul>' } },
    { id: 'w4', type: 'button' as const, content: { text: 'Get Started', url: '#', color: '#6366f1', textColor: '#ffffff', align: 'center' } },
    { id: 'w5', type: 'footer' as const, content: { text: '© 2024 {{company_name}}. All rights reserved.', unsubscribe: true } },
  ]},
  { id: 'newsletter', name: 'Newsletter', category: 'Newsletter', desc: 'Keep subscribers informed with regular updates', icon: FileText, color: 'bg-blue-500/10 text-blue-500', blocks: [
    { id: 'n1', type: 'header' as const, content: { text: 'Monthly Newsletter', size: 'h1', align: 'center' } },
    { id: 'n2', type: 'text' as const, content: { html: '<p>Hi {{first_name}},</p><p>Here\'s what happened this month:</p>' } },
    { id: 'n3', type: 'columns' as const, content: { left: '<h3>📈 Growth</h3><p>Key metrics and milestones achieved this month.</p>', right: '<h3>🚀 Updates</h3><p>New features and improvements we shipped.</p>' } },
    { id: 'n4', type: 'divider' as const, content: { style: 'solid', color: '#e5e7eb' } },
    { id: 'n5', type: 'text' as const, content: { html: '<h3>📚 Top Articles</h3><p>Curated content you might have missed.</p>' } },
    { id: 'n6', type: 'button' as const, content: { text: 'Read More on Our Blog', url: '#', color: '#3b82f6', textColor: '#ffffff', align: 'center' } },
    { id: 'n7', type: 'footer' as const, content: { text: '© 2024 {{company_name}}.', unsubscribe: true } },
  ]},
  { id: 'promo', name: 'Promotional', category: 'Promotional', desc: 'Drive sales with compelling offers', icon: Zap, color: 'bg-destructive/10 text-destructive', blocks: [
    { id: 'p1', type: 'header' as const, content: { text: '🔥 Limited Time Offer!', size: 'h1', align: 'center' } },
    { id: 'p2', type: 'image' as const, content: { src: 'https://via.placeholder.com/600x300/ef4444/ffffff?text=SALE', alt: 'Sale banner', width: '100%' } },
    { id: 'p3', type: 'text' as const, content: { html: '<p style="text-align:center;font-size:18px;">Get <strong>30% off</strong> your next purchase!</p><p style="text-align:center;">Use code: <strong>SAVE30</strong></p>' } },
    { id: 'p4', type: 'button' as const, content: { text: 'Shop Now →', url: '#', color: '#ef4444', textColor: '#ffffff', align: 'center' } },
    { id: 'p5', type: 'footer' as const, content: { text: 'Offer valid until end of month.', unsubscribe: true } },
  ]},
  { id: 'transactional', name: 'Transactional', category: 'Transactional', desc: 'Order confirmations and receipts', icon: Shield, color: 'bg-green-500/10 text-green-500', blocks: [
    { id: 't1', type: 'header' as const, content: { text: 'Order Confirmed ✓', size: 'h1', align: 'center' } },
    { id: 't2', type: 'text' as const, content: { html: '<p>Hi {{first_name}},</p><p>Your order has been confirmed. Here are the details:</p>' } },
    { id: 't3', type: 'divider' as const, content: { style: 'solid', color: '#e5e7eb' } },
    { id: 't4', type: 'text' as const, content: { html: '<p><strong>Order #:</strong> 12345</p><p><strong>Total:</strong> $99.00</p><p><strong>Estimated Delivery:</strong> 3-5 business days</p>' } },
    { id: 't5', type: 'button' as const, content: { text: 'Track Your Order', url: '#', color: '#22c55e', textColor: '#ffffff', align: 'center' } },
    { id: 't6', type: 'footer' as const, content: { text: '© 2024 {{company_name}}.', unsubscribe: false } },
  ]},
  { id: 'reengage', name: 'Re-engagement', category: 'Re-engagement', desc: 'Win back inactive subscribers', icon: Eye, color: 'bg-orange-500/10 text-orange-500', blocks: [
    { id: 'r1', type: 'header' as const, content: { text: 'We Miss You, {{first_name}}! 💔', size: 'h1', align: 'center' } },
    { id: 'r2', type: 'text' as const, content: { html: '<p>It\'s been a while since we\'ve heard from you. We\'ve been busy making things better!</p><p>Here\'s what you\'ve missed:</p><ul><li>New features launched</li><li>Improved performance</li><li>Special offers just for you</li></ul>' } },
    { id: 'r3', type: 'button' as const, content: { text: 'Come Back & Save 20%', url: '#', color: '#f97316', textColor: '#ffffff', align: 'center' } },
    { id: 'r4', type: 'footer' as const, content: { text: 'If you no longer wish to hear from us, no hard feelings.', unsubscribe: true } },
  ]},
];

// ─── HTML Generator ───
function blockToHtml(block: EmailBlock): string {
  const c = block.content;
  switch (block.type) {
    case 'header': {
      const tag = c.size === 'h1' ? 'h1' : c.size === 'h3' ? 'h3' : 'h2';
      return `<${tag} style="margin:0;padding:16px 24px;text-align:${c.align || 'left'};font-family:Arial,sans-serif;color:#1a1a2e;">${c.text}</${tag}>`;
    }
    case 'text':
      return `<div style="padding:8px 24px;font-family:Arial,sans-serif;color:#333;line-height:1.6;">${c.html}</div>`;
    case 'image':
      return `<div style="padding:8px 24px;text-align:center;"><img src="${c.src}" alt="${c.alt || ''}" style="max-width:100%;width:${c.width || '100%'};border-radius:8px;" /></div>`;
    case 'button':
      return `<div style="padding:16px 24px;text-align:${c.align || 'center'};"><a href="${c.url || '#'}" style="display:inline-block;padding:14px 32px;background-color:${c.color || '#6366f1'};color:${c.textColor || '#fff'};text-decoration:none;border-radius:8px;font-weight:600;font-family:Arial,sans-serif;">${c.text}</a></div>`;
    case 'divider':
      return `<div style="padding:8px 24px;"><hr style="border:none;border-top:1px ${c.style || 'solid'} ${c.color || '#e5e7eb'};"/></div>`;
    case 'columns':
      return `<div style="padding:8px 24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" valign="top" style="padding-right:8px;font-family:Arial,sans-serif;color:#333;line-height:1.6;">${c.left}</td><td width="50%" valign="top" style="padding-left:8px;font-family:Arial,sans-serif;color:#333;line-height:1.6;">${c.right}</td></tr></table></div>`;
    case 'social':
      return `<div style="padding:16px 24px;text-align:center;">${Object.entries(c).filter(([,v]) => v && v !== '#').map(([k,v]) => `<a href="${v}" style="display:inline-block;margin:0 8px;color:#6366f1;text-decoration:none;font-family:Arial,sans-serif;">${k.charAt(0).toUpperCase() + k.slice(1)}</a>`).join('')}</div>`;
    case 'footer':
      return `<div style="padding:16px 24px;text-align:center;font-size:12px;color:#888;font-family:Arial,sans-serif;"><p style="margin:0;">${c.text}</p>${c.unsubscribe ? '<p style="margin:8px 0 0;"><a href="{{unsubscribe_link}}" style="color:#888;text-decoration:underline;">Unsubscribe</a></p>' : ''}</div>`;
    default:
      return '';
  }
}

function generateFullHtml(blocks: EmailBlock[], subject: string, previewText: string): string {
  const bodyHtml = blocks.map(blockToHtml).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:24px 0;"><table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">\n<tr><td>${bodyHtml}</td></tr>\n</table></td></tr></table></body></html>`;
}

// ─── Spam Score Calculator ───
function calculateSpamScore(subject: string, htmlContent: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;
  const text = (subject + ' ' + htmlContent).toLowerCase();
  
  // ALL CAPS words
  const capsWords = (subject + ' ' + htmlContent).match(/\b[A-Z]{3,}\b/g);
  if (capsWords && capsWords.length > 0) {
    score += Math.min(capsWords.length * 8, 30);
    issues.push(`${capsWords.length} ALL CAPS word(s)`);
  }
  
  // Exclamation marks
  const excl = (subject + ' ' + htmlContent).match(/!/g);
  if (excl && excl.length > 2) {
    score += Math.min((excl.length - 2) * 5, 20);
    issues.push(`${excl.length} exclamation marks`);
  }
  
  // Spam words
  const foundSpam = SPAM_WORDS.filter(w => text.includes(w));
  if (foundSpam.length > 0) {
    score += foundSpam.length * 7;
    issues.push(`Spam trigger words: ${foundSpam.join(', ')}`);
  }
  
  // No unsubscribe link
  if (!text.includes('unsubscribe')) {
    score += 15;
    issues.push('Missing unsubscribe link');
  }
  
  return { score: Math.min(score, 100), issues };
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function EmailBuilder() {
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const { toast } = useToast();
  const { templates, isLoading: templatesLoading, createTemplate, stats: templateStats } = useEmailTemplates();
  const { createContent } = useMarketingContent();
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  // Main state
  const [activeTab, setActiveTab] = useState('templates');
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [emailSubject, setEmailSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Settings state
  const [fromName, setFromName] = useState(tenantConfig?.vocabulary?.smtp_from_name || tenantConfig?.company_name || '');
  const [fromEmail, setFromEmail] = useState(tenantConfig?.vocabulary?.smtp_from_email || '');
  const [replyTo, setReplyTo] = useState(tenantConfig?.vocabulary?.reply_to || '');
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);

  // Dialogs
  const [spamResult, setSpamResult] = useState<{ score: number; issues: string[] } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSendTestOpen, setIsSendTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendScheduleOpen, setIsSendScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('general');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');

  // ─── Computed ───
  const fullHtml = useMemo(() => generateFullHtml(emailBlocks, emailSubject, previewText), [emailBlocks, emailSubject, previewText]);

  // ─── Block manipulation ───
  const addBlock = (type: string) => {
    const newBlock: EmailBlock = { id: Date.now().toString(), type: type as any, content: getDefaultContent(type) };
    setEmailBlocks(prev => [...prev, newBlock]);
  };

  const getDefaultContent = (type: string): Record<string, any> => {
    switch (type) {
      case 'header': return { text: 'New Header', size: 'h2', align: 'left' };
      case 'text': return { html: '<p>Add your text here...</p>' };
      case 'image': return { src: 'https://via.placeholder.com/600x300', alt: 'Image', width: '100%' };
      case 'button': return { text: 'Click Here', url: '#', color: '#6366f1', textColor: '#ffffff', align: 'center' };
      case 'divider': return { style: 'solid', color: '#e5e7eb' };
      case 'columns': return { left: '<p>Left column</p>', right: '<p>Right column</p>' };
      case 'social': return { facebook: '#', twitter: '#', linkedin: '#', instagram: '#' };
      case 'footer': return { text: '© 2024 Your Company', unsubscribe: true };
      default: return {};
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...emailBlocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setEmailBlocks(newBlocks);
  };

  const deleteBlock = (id: string) => {
    setEmailBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlock?.id === id) setSelectedBlock(null);
  };

  const duplicateBlock = (block: EmailBlock) => {
    const index = emailBlocks.findIndex(b => b.id === block.id);
    const dup: EmailBlock = { ...block, id: Date.now().toString(), content: { ...block.content } };
    const newBlocks = [...emailBlocks];
    newBlocks.splice(index + 1, 0, dup);
    setEmailBlocks(newBlocks);
  };

  const updateBlockContent = useCallback((id: string, updates: Record<string, any>) => {
    setEmailBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, ...updates } } : b));
    setSelectedBlock(prev => prev?.id === id ? { ...prev, content: { ...prev.content, ...updates } } : prev);
  }, []);

  // ─── Template loading ───
  const loadTemplate = (blocks: EmailBlock[], subject: string) => {
    setEmailBlocks(blocks.map(b => ({ ...b, id: Date.now().toString() + Math.random() })));
    setEmailSubject(subject);
    setActiveTab('builder');
  };

  // ─── Actions ───
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await createTemplate.mutateAsync({
        name: emailSubject || 'Untitled Email',
        subject: emailSubject,
        category: 'general',
        body_html: fullHtml,
        variables: Object.fromEntries(personalizationTokens.map(t => [t.token, t.label])),
      });
    } catch {}
    setIsSaving(false);
  };

  const handleSaveDraft = async () => {
    try {
      await createContent.mutateAsync({
        content_type: 'email',
        title: emailSubject || 'Untitled Email',
        body: fullHtml,
        status: 'draft',
        ai_generated: false,
      });
      toast({ title: 'Draft Saved', description: 'Email saved to Content Studio as draft.' });
    } catch {
      toast({ title: 'Failed to save draft', variant: 'destructive' });
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setIsSendingTest(true);
    try {
      const endpoint = `${N8N_WEBHOOK_BASE}/marketing/send-test-email`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantUuid || tenantId,
          subject: emailSubject,
          html_content: fullHtml,
          test_email: testEmail,
          from_name: fromName,
          from_email: fromEmail,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: '✅ Test Email Sent!', description: `Check ${testEmail}` });
      setIsSendTestOpen(false);
    } catch {
      toast({ title: 'Failed to send test email', description: 'Check SMTP settings in Settings > Integrations', variant: 'destructive' });
    }
    setIsSendingTest(false);
  };

  const handleSendOrSchedule = async (mode: 'now' | 'schedule') => {
    try {
      const scheduledAt = mode === 'now' ? new Date().toISOString() : new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const { error } = await supabase.from('marketing_campaigns').insert({
        tenant_id: tenantUuid,
        name: emailSubject || 'Email Campaign',
        channel: 'email',
        status: 'scheduled',
        scheduled_at: scheduledAt,
        content: { subject: emailSubject, html: fullHtml, preview_text: previewText },
      });
      if (error) throw error;
      toast({
        title: mode === 'now' ? '🚀 Campaign Scheduled!' : '📅 Campaign Scheduled!',
        description: mode === 'now' ? 'Campaign will be sent shortly.' : `Scheduled for ${scheduleDate} at ${scheduleTime}`,
      });
      setIsSendScheduleOpen(false);
    } catch (err: any) {
      toast({ title: 'Failed to create campaign', description: err.message, variant: 'destructive' });
    }
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(fullHtml);
    toast({ title: 'HTML Copied!', description: 'Email HTML copied to clipboard' });
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${emailSubject || 'email'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCheckSpam = () => {
    const textContent = emailBlocks.map(b => {
      if (b.type === 'text') return b.content.html;
      if (b.type === 'header') return b.content.text;
      if (b.type === 'button') return b.content.text;
      return '';
    }).join(' ');
    setSpamResult(calculateSpamScore(emailSubject, textContent));
  };

  const handleGenerateTemplate = async (templateType: string) => {
    if (!tenantConfig?.id) { toast({ title: 'No tenant configured', variant: 'destructive' }); return; }
    setIsGeneratingTemplate(true);
    try {
      const result = await callWebhook(WEBHOOKS.EMAIL_TEMPLATE_GENERATE, {
        template_type: templateType,
        subject: newTemplateSubject || '',
        company_name: tenantConfig?.company_name || 'Your Company',
        primary_color: '#6366f1',
      }, tenantConfig.id);
      if (result.success && (result.data as any)?.template) {
        const tmpl = (result.data as any).template;
        await createTemplate.mutateAsync({
          name: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template`,
          subject: tmpl.subject || '',
          category: templateType,
          body_html: tmpl.html_content || '',
        });
        toast({ title: '✨ AI Template Generated!' });
      } else {
        toast({ title: 'Generation Unavailable', variant: 'destructive' });
      }
    } catch { toast({ title: 'Template generation failed', variant: 'destructive' }); }
    setIsGeneratingTemplate(false);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      await createTemplate.mutateAsync({ name: newTemplateName, subject: newTemplateSubject, category: newTemplateCategory, body_html: '' });
      setIsCreateTemplateOpen(false);
      setNewTemplateName('');
      setNewTemplateSubject('');
    } catch {}
  };

  // ─── Block preview renderer ───
  const renderBlock = (block: EmailBlock) => {
    const c = block.content;
    switch (block.type) {
      case 'header': {
        const Tag = c.size === 'h1' ? 'h1' : c.size === 'h3' ? 'h3' : 'h2';
        return <Tag className={`font-bold ${c.size === 'h1' ? 'text-2xl' : c.size === 'h3' ? 'text-lg' : 'text-xl'}`} style={{ textAlign: c.align }}>{c.text}</Tag>;
      }
      case 'text': return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: c.html }} />;
      case 'image': return <img src={c.src} alt={c.alt} className="max-w-full rounded-lg" style={{ width: c.width }} />;
      case 'button': return <div style={{ textAlign: c.align }}><span className="inline-block px-6 py-3 rounded-lg font-semibold cursor-default" style={{ backgroundColor: c.color, color: c.textColor }}>{c.text}</span></div>;
      case 'divider': return <hr className="my-2" style={{ borderColor: c.color }} />;
      case 'columns': return <div className="grid grid-cols-2 gap-4"><div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: c.left }} /><div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: c.right }} /></div>;
      case 'social': return <div className="text-center space-x-3 text-sm">{Object.entries(c).filter(([,v]) => v).map(([k]) => <span key={k} className="text-primary underline cursor-default">{k}</span>)}</div>;
      case 'footer': return <div className="text-center text-xs text-muted-foreground"><p>{c.text}</p>{c.unsubscribe && <p className="mt-1 underline">Unsubscribe</p>}</div>;
      default: return null;
    }
  };

  // ─── Properties panel for selected block ───
  const renderProperties = () => {
    if (!selectedBlock) return (
      <div className="text-center py-8 text-muted-foreground">
        <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a block to edit its properties</p>
      </div>
    );

    const c = selectedBlock.content;
    const update = (k: string, v: any) => updateBlockContent(selectedBlock.id, { [k]: v });

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="capitalize">{selectedBlock.type}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setSelectedBlock(null)}>✕</Button>
        </div>
        <Separator />

        {selectedBlock.type === 'header' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Text</Label><Input value={c.text} onChange={e => update('text', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Size</Label>
              <div className="flex gap-1">{['h1','h2','h3'].map(s => <Button key={s} size="sm" variant={c.size === s ? 'default' : 'outline'} onClick={() => update('size', s)}>{s.toUpperCase()}</Button>)}</div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Align</Label>
              <div className="flex gap-1">{['left','center','right'].map(a => <Button key={a} size="sm" variant={c.align === a ? 'default' : 'outline'} className="capitalize" onClick={() => update('align', a)}>{a}</Button>)}</div>
            </div>
          </>
        )}

        {selectedBlock.type === 'text' && (
          <div className="space-y-1"><Label className="text-xs">HTML Content</Label><Textarea value={c.html} onChange={e => update('html', e.target.value)} rows={6} className="font-mono text-xs" /></div>
        )}

        {selectedBlock.type === 'image' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Image URL</Label><Input value={c.src} onChange={e => update('src', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Alt Text</Label><Input value={c.alt} onChange={e => update('alt', e.target.value)} /></div>
          </>
        )}

        {selectedBlock.type === 'button' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Button Text</Label><Input value={c.text} onChange={e => update('text', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Link URL</Label><Input value={c.url} onChange={e => update('url', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">BG Color</Label><Input type="color" value={c.color} onChange={e => update('color', e.target.value)} className="h-8 p-1" /></div>
              <div className="space-y-1"><Label className="text-xs">Text Color</Label><Input type="color" value={c.textColor} onChange={e => update('textColor', e.target.value)} className="h-8 p-1" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Align</Label>
              <div className="flex gap-1">{['left','center','right'].map(a => <Button key={a} size="sm" variant={c.align === a ? 'default' : 'outline'} className="capitalize text-xs" onClick={() => update('align', a)}>{a}</Button>)}</div>
            </div>
          </>
        )}

        {selectedBlock.type === 'divider' && (
          <div className="space-y-1"><Label className="text-xs">Color</Label><Input type="color" value={c.color} onChange={e => update('color', e.target.value)} className="h-8 p-1" /></div>
        )}

        {selectedBlock.type === 'columns' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Left Column HTML</Label><Textarea value={c.left} onChange={e => update('left', e.target.value)} rows={4} className="font-mono text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Right Column HTML</Label><Textarea value={c.right} onChange={e => update('right', e.target.value)} rows={4} className="font-mono text-xs" /></div>
          </>
        )}

        {selectedBlock.type === 'social' && (
          <>
            {['facebook','twitter','linkedin','instagram'].map(platform => (
              <div key={platform} className="space-y-1"><Label className="text-xs capitalize">{platform} URL</Label><Input value={c[platform] || ''} onChange={e => update(platform, e.target.value)} placeholder={`https://${platform}.com/...`} /></div>
            ))}
          </>
        )}

        {selectedBlock.type === 'footer' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Footer Text</Label><Input value={c.text} onChange={e => update('text', e.target.value)} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">Unsubscribe Link</Label><Switch checked={c.unsubscribe} onCheckedChange={v => update('unsubscribe', v)} /></div>
          </>
        )}
      </div>
    );
  };

  // ─── Filtered templates ───
  const filteredBuiltIn = selectedCategory === 'All' ? builtInTemplates : builtInTemplates.filter(t => t.category === selectedCategory);
  const filteredDb = selectedCategory === 'All' ? templates : templates.filter((t: any) => t.category?.toLowerCase() === selectedCategory.toLowerCase());

  if (templatesLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-4 gap-4">{Array.from({length:8}).map((_,i) => <Skeleton key={i} className="h-48" />)}</div></div>;
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email Builder</h1>
          <p className="text-muted-foreground mt-1">Create, preview, and send beautiful email campaigns</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'builder' && emailBlocks.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyHtml}><Copy className="h-4 w-4 mr-1" />Copy HTML</Button>
              <Button variant="outline" size="sm" onClick={handleDownloadHtml}><Download className="h-4 w-4 mr-1" />Download</Button>
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}><Eye className="h-4 w-4 mr-1" />Preview</Button>
              <Button variant="outline" size="sm" onClick={handleSaveDraft}><Save className="h-4 w-4 mr-1" />Save Draft</Button>
              <Button variant="outline" size="sm" onClick={() => setIsSendTestOpen(true)}><Send className="h-4 w-4 mr-1" />Send Test</Button>
              <Button size="sm" onClick={() => setIsSendScheduleOpen(true)}><Send className="h-4 w-4 mr-1" />Send / Schedule</Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates ({templateStats.total + builtInTemplates.length})</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ─── TEMPLATES TAB ─── */}
        <TabsContent value="templates" className="space-y-6">
          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {templateCategories.map(cat => (
              <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
            ))}
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => setIsCreateTemplateOpen(true)}><Plus className="h-4 w-4 mr-1" />New Template</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Blank template */}
            {selectedCategory === 'All' && (
              <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all group" onClick={() => { setEmailBlocks([]); setEmailSubject(''); setActiveTab('builder'); }}>
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 transition-colors"><Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary" /></div>
                  <p className="font-semibold">Blank Template</p>
                  <p className="text-sm text-muted-foreground mt-1">Start from scratch</p>
                </CardContent>
              </Card>
            )}

            {/* Built-in templates */}
            {filteredBuiltIn.map(tmpl => (
              <Card key={tmpl.id} className="cursor-pointer hover:border-primary hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${tmpl.color} flex items-center justify-center mx-auto mb-3`}>
                    <tmpl.icon className="h-6 w-6" />
                  </div>
                  <p className="font-semibold text-center">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">{tmpl.desc}</p>
                  <Badge variant="secondary" className="mt-2 mx-auto block w-fit text-xs">{tmpl.category}</Badge>
                  <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" className="flex-1" onClick={() => loadTemplate(tmpl.blocks, tmpl.name)}>Use Template</Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* AI Generated */}
            {selectedCategory === 'All' && (
              <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all border-primary/30 bg-primary/5 group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3"><Sparkles className="h-6 w-6 text-primary" /></div>
                  <p className="font-semibold text-center">AI Generated</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">Custom for your industry</p>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" className="w-full" disabled={isGeneratingTemplate} onClick={() => handleGenerateTemplate('promotional')}>
                      {isGeneratingTemplate ? '✨ Generating...' : '✨ Generate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* DB templates */}
            {filteredDb.map((template: any) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary hover:shadow-md transition-all group" onClick={() => { setEmailSubject(template.subject || template.name); if (template.body_html) { setEmailBlocks([]); /* will use raw HTML preview */ } setActiveTab('builder'); }}>
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3"><Mail className="h-7 w-7 text-primary" /></div>
                  <p className="font-semibold">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{template.subject || 'No subject'}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">{template.category}</Badge>
                  {template.times_sent > 0 && <p className="text-xs text-muted-foreground mt-1">Used {template.times_sent}×</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── BUILDER TAB ─── */}
        <TabsContent value="builder">
          <div className="grid lg:grid-cols-[240px_1fr_260px] gap-4">
            {/* Left: Block Palette */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Blocks</CardTitle></CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                    {blockTypes.map(block => (
                      <Button key={block.type} variant="outline" size="sm" className="w-full justify-start gap-2 h-9" onClick={() => addBlock(block.type)}>
                        <block.icon className="h-3.5 w-3.5" />{block.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Personalization</CardTitle></CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {personalizationTokens.map(token => (
                      <Badge key={token.token} variant="secondary" className="cursor-pointer text-xs hover:bg-primary/20 transition-colors" onClick={() => { navigator.clipboard.writeText(token.token); toast({ title: 'Copied!', description: token.token }); }}>
                        {token.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Click to copy, then paste into text blocks</p>
                </CardContent>
              </Card>
            </div>

            {/* Center: Live Preview */}
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Live Preview</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant={previewMode === 'desktop' ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewMode('desktop')}><Monitor className="h-3.5 w-3.5" /></Button>
                    <Button variant={previewMode === 'mobile' ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewMode('mobile')}><Smartphone className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Subject bar */}
                <div className="mx-4 mb-2 p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Subject: <span className="font-medium text-foreground">{emailSubject || '(no subject)'}</span></p>
                  {previewText && <p className="text-xs text-muted-foreground mt-0.5">Preview: {previewText}</p>}
                </div>

                {emailBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center mx-4 mb-4 border-2 border-dashed rounded-lg">
                    <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
                    <h3 className="font-semibold mb-1">Start Building Your Email</h3>
                    <p className="text-sm text-muted-foreground mb-4">Add blocks from the left panel or choose a template</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addBlock('header')}><Plus className="h-4 w-4 mr-1" />Add Header</Button>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('templates')}>Browse Templates</Button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    <div className={`mx-auto border rounded-lg overflow-hidden bg-white transition-all ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'}`}>
                      <ScrollArea className="h-[520px]">
                        <div className="p-4 space-y-1">
                          {emailBlocks.map((block, index) => (
                            <div
                              key={block.id}
                              className={`group relative rounded transition-all cursor-pointer ${selectedBlock?.id === block.id ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
                              onClick={() => setSelectedBlock(block)}
                            >
                              <div className="p-2">{renderBlock(block)}</div>
                              <div className="absolute -right-1 top-0 hidden group-hover:flex flex-col gap-0.5 bg-background shadow-md rounded-md border p-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); moveBlock(index, 'up'); }} disabled={index === 0}><MoveUp className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); moveBlock(index, 'down'); }} disabled={index === emailBlocks.length - 1}><MoveDown className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); duplicateBlock(block); }}><Copy className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); deleteBlock(block.id); }}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Properties */}
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Properties</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3 space-y-4">
                {renderProperties()}
                <Separator />
                {/* Spam Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Spam Score</Label>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCheckSpam}>Check</Button>
                  </div>
                  {spamResult && (
                    <div className={`p-2 rounded-md text-xs space-y-1 ${spamResult.score < 30 ? 'bg-green-500/10' : spamResult.score < 60 ? 'bg-yellow-500/10' : 'bg-destructive/10'}`}>
                      <div className="flex items-center gap-1.5">
                        {spamResult.score < 30 ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className={`h-3.5 w-3.5 ${spamResult.score < 60 ? 'text-yellow-500' : 'text-destructive'}`} />}
                        <span className="font-semibold">{spamResult.score}/100</span>
                        <span className="text-muted-foreground">— {spamResult.score < 30 ? 'Low risk ✓' : spamResult.score < 60 ? 'Moderate risk' : 'High risk!'}</span>
                      </div>
                      {spamResult.issues.length > 0 && (
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {spamResult.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── SETTINGS TAB ─── */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Email Settings</CardTitle><CardDescription>Subject line and preview text</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Subject Line</Label><span className={`text-xs ${emailSubject.length > 60 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{emailSubject.length}/60</span></div>
                  <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Your email subject line" />
                  {emailSubject.length > 60 && <p className="text-xs text-destructive">⚠️ Subject lines over 60 characters may be truncated in inboxes</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Preview Text</Label><span className={`text-xs ${previewText.length > 90 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{previewText.length}/90</span></div>
                  <Input value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Preview text shown in inbox..." />
                  {previewText.length > 90 && <p className="text-xs text-destructive">⚠️ Preview text over 90 characters may be truncated</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Sender Settings</CardTitle><CardDescription>Auto-filled from your integration settings</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>From Name</Label><Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your Company Name" /></div>
                <div className="space-y-2"><Label>From Email</Label><Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="hello@company.com" /></div>
                <div className="space-y-2"><Label>Reply-To</Label><Input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="support@company.com" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tracking</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><p className="font-medium text-sm">Track Opens</p><p className="text-xs text-muted-foreground">Track when recipients open the email</p></div><Switch checked={trackOpens} onCheckedChange={setTrackOpens} /></div>
                <div className="flex items-center justify-between"><div><p className="font-medium text-sm">Track Clicks</p><p className="text-xs text-muted-foreground">Track when recipients click links</p></div><Switch checked={trackClicks} onCheckedChange={setTrackClicks} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Export</CardTitle><CardDescription>Download or copy your email HTML</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={handleCopyHtml} disabled={emailBlocks.length === 0}><Copy className="h-4 w-4 mr-2" />Copy HTML to Clipboard</Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleDownloadHtml} disabled={emailBlocks.length === 0}><Download className="h-4 w-4 mr-2" />Download as .html File</Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setIsPreviewOpen(true)} disabled={emailBlocks.length === 0}><Eye className="h-4 w-4 mr-2" />Full Preview (Desktop + Mobile)</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── PREVIEW MODAL ─── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle><DialogDescription>See how your email will look on different devices</DialogDescription></DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1"><Monitor className="h-4 w-4" /> Desktop (600px)</p>
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                <iframe srcDoc={fullHtml} className="w-full h-[500px] bg-white" title="Desktop Preview" sandbox="" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1"><Smartphone className="h-4 w-4" /> Mobile (375px)</p>
              <div className="border rounded-lg overflow-hidden bg-muted/30 max-w-[375px] mx-auto">
                <iframe srcDoc={fullHtml} className="w-full h-[500px] bg-white" title="Mobile Preview" sandbox="" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── SEND TEST MODAL ─── */}
      <Dialog open={isSendTestOpen} onOpenChange={setIsSendTestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Test Email</DialogTitle><DialogDescription>Send a preview to yourself before launching</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Recipient Email</Label><Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" type="email" /></div>
            <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground">
              <p><strong>Subject:</strong> {emailSubject || '(no subject)'}</p>
              <p><strong>From:</strong> {fromName || 'Not set'} &lt;{fromEmail || 'Not set'}&gt;</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendTestOpen(false)}>Cancel</Button>
            <Button onClick={handleSendTest} disabled={!testEmail || isSendingTest}><Send className="h-4 w-4 mr-2" />{isSendingTest ? 'Sending...' : 'Send Test'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SEND / SCHEDULE MODAL ─── */}
      <Dialog open={isSendScheduleOpen} onOpenChange={setIsSendScheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send or Schedule Campaign</DialogTitle><DialogDescription>Choose when to send this email campaign</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-sm">
              <p><strong>Subject:</strong> {emailSubject || '(no subject)'}</p>
              <p><strong>Blocks:</strong> {emailBlocks.length}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-20 flex-col gap-1" onClick={() => handleSendOrSchedule('now')}>
                <Send className="h-5 w-5" />
                <span className="text-sm font-semibold">Send Now</span>
                <span className="text-xs opacity-70">Deliver immediately</span>
              </Button>
              <div className="space-y-2">
                <Label className="text-xs">Schedule for later</Label>
                <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                <Button variant="outline" className="w-full" disabled={!scheduleDate} onClick={() => handleSendOrSchedule('schedule')}>
                  <Clock className="h-4 w-4 mr-1" />Schedule
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE TEMPLATE MODAL ─── */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Template Name</Label><Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="e.g., Welcome Email" /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={newTemplateSubject} onChange={e => setNewTemplateSubject(e.target.value)} placeholder="Email subject..." /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={newTemplateCategory} onChange={e => setNewTemplateCategory(e.target.value)} placeholder="e.g., welcome" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>{createTemplate.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
