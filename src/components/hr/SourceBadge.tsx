import { Badge } from '@/components/ui/badge';
import {
  Linkedin, Search, Briefcase, Github, Users, History, Globe, User,
  Mail, Building2, GraduationCap, AlertCircle, Wand2,
} from 'lucide-react';

const SOURCE_MAP: Record<string, { icon: any; label: string; cls: string }> = {
  linkedin_apify:           { icon: Linkedin,    label: 'LinkedIn',          cls: 'bg-[#0A66C2] text-white hover:bg-[#084d96]' },
  linkedin_google:          { icon: Search,      label: 'LinkedIn (Search)', cls: 'bg-blue-500 text-white hover:bg-blue-600' },
  linkedin_sales_navigator: { icon: Linkedin,    label: 'Sales Navigator',   cls: 'bg-blue-700 text-white' },
  indeed:                   { icon: Briefcase,   label: 'Indeed',            cls: 'bg-indigo-600 text-white' },
  naukri:                   { icon: Briefcase,   label: 'Naukri',            cls: 'bg-purple-600 text-white' },
  bayt:                     { icon: Briefcase,   label: 'Bayt',              cls: 'bg-emerald-600 text-white' },
  github:                   { icon: Github,      label: 'GitHub',            cls: 'bg-gray-900 text-white' },
  angellist:                { icon: Building2,   label: 'AngelList',         cls: 'bg-black text-white' },
  website:                  { icon: Globe,       label: 'Website',           cls: 'bg-green-600 text-white' },
  referral:                 { icon: Users,       label: 'Referral',          cls: 'bg-purple-500 text-white' },
  past_applicant:           { icon: History,     label: 'Past Applicant',    cls: 'bg-amber-500 text-white' },
  university_partner:       { icon: GraduationCap, label: 'University',      cls: 'bg-rose-600 text-white' },
  job_board:                { icon: Briefcase,   label: 'Job Board',         cls: 'bg-slate-600 text-white' },
  cold_email:               { icon: Mail,        label: 'Cold Email',        cls: 'bg-orange-500 text-white' },
  cold_outreach:            { icon: Mail,        label: 'Cold Outreach',     cls: 'bg-orange-600 text-white' },
  manual:                   { icon: User,        label: 'Manual',            cls: 'bg-gray-500 text-white' },
  ai_sourcing:              { icon: Wand2,       label: 'AI Sourcing',       cls: 'bg-violet-600 text-white' },
};

interface SourceBadgeProps {
  source?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export function SourceBadge({ source, className, size = 'sm' }: SourceBadgeProps) {
  const c = SOURCE_MAP[source || ''] || { icon: AlertCircle, label: source || 'unknown', cls: 'bg-muted text-muted-foreground' };
  const Icon = c.icon;
  return (
    <Badge className={`${c.cls} ${className || ''} ${size === 'sm' ? 'text-xs' : ''} gap-1`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {c.label}
    </Badge>
  );
}

export default SourceBadge;
