/**
 * SMTP_PROVIDERS — shared provider preset constants for C.11.
 *
 * Used by both Integrations.tsx (Settings → Integrations → Email) and
 * AgencySettings.tsx (YouTube Agency Settings → SMTP card) to offer
 * pre-filled SMTP provider presets.
 *
 * Each provider includes:
 *  - id: the smtp_provider column value (must match what's written to DB)
 *  - label: user-facing display name
 *  - host: default smtp_host (empty for providers where users must fill in, e.g., AWS SES)
 *  - port: default smtp_port
 *  - secure_mode: default smtp_secure_mode (maps to nodemailer secure/tls behavior)
 *  - helper: one-line helper text shown below the provider dropdown
 *  - fromEmailPatterns: regex patterns used for smart auto-detect from the From Email field
 */

export type SmtpSecureMode = 'ssl' | 'starttls' | 'none' | 'auto';

export interface SmtpProvider {
  id: string;
  label: string;
  host: string;
  port: number;
  secure_mode: SmtpSecureMode;
  helper: string;
  fromEmailPatterns?: RegExp[];
}

export const SMTP_PROVIDERS: readonly SmtpProvider[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure_mode: 'starttls',
    helper:
      'Use an App Password from myaccount.google.com/apppasswords. Your regular Gmail password will not work.',
    fromEmailPatterns: [/@gmail\.com$/i, /@googlemail\.com$/i],
  },
  {
    id: 'hostinger',
    label: 'Hostinger',
    host: 'smtp.hostinger.com',
    port: 465,
    secure_mode: 'ssl',
    helper:
      'Use the password you set when creating the email account in your Hostinger panel.',
    // No reliable from-email pattern for Hostinger (user's own domain)
  },
  {
    id: 'outlook',
    label: 'Outlook / Office 365',
    host: 'smtp.office365.com',
    port: 587,
    secure_mode: 'starttls',
    helper:
      'You may need to enable SMTP AUTH in your Microsoft 365 admin center.',
    fromEmailPatterns: [
      /@outlook\.com$/i,
      /@hotmail\.com$/i,
      /@live\.com$/i,
      /@msn\.com$/i,
    ],
  },
  {
    id: 'sendgrid',
    label: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure_mode: 'starttls',
    helper:
      'Username is literally "apikey". Password is your SendGrid API key.',
  },
  {
    id: 'mailgun',
    label: 'Mailgun',
    host: 'smtp.mailgun.org',
    port: 587,
    secure_mode: 'starttls',
    helper:
      'Get SMTP credentials from your Mailgun dashboard under Sending → Domain Settings.',
  },
  {
    id: 'aws_ses',
    label: 'AWS SES',
    host: '',
    port: 587,
    secure_mode: 'starttls',
    helper:
      'Generate SMTP credentials in IAM (NOT your AWS access keys). Host is region-specific (e.g., email-smtp.us-east-1.amazonaws.com).',
  },
  {
    id: 'zoho',
    label: 'Zoho',
    host: 'smtp.zoho.com',
    port: 587,
    secure_mode: 'starttls',
    helper:
      'Use an App-Specific Password from accounts.zoho.com → Security → App Passwords.',
    fromEmailPatterns: [/@zoho\.com$/i, /@zohomail\.com$/i],
  },
  {
    id: 'custom',
    label: 'Custom',
    host: '',
    port: 587,
    secure_mode: 'auto',
    helper: 'Enter your provider SMTP details manually.',
  },
];

/** Lookup a provider by id. Returns `'custom'` preset if id is unknown/null. */
export function getSmtpProvider(id: string | null | undefined): SmtpProvider {
  if (!id) return SMTP_PROVIDERS.find(p => p.id === 'custom')!;
  return SMTP_PROVIDERS.find(p => p.id === id) ?? SMTP_PROVIDERS.find(p => p.id === 'custom')!;
}

/**
 * Smart auto-detect from email address.
 * Returns the provider id if the email matches a known pattern, else null.
 * Never returns 'custom' (no point detecting custom) or 'hostinger' (no reliable pattern).
 */
export function detectSmtpProviderFromEmail(email: string): string | null {
  if (!email) return null;
  for (const p of SMTP_PROVIDERS) {
    if (!p.fromEmailPatterns) continue;
    for (const pattern of p.fromEmailPatterns) {
      if (pattern.test(email)) return p.id;
    }
  }
  return null;
}

/** Derive secure_mode from port if the user changes port manually. */
export function deriveSecureModeFromPort(port: number | string): SmtpSecureMode {
  const p = typeof port === 'string' ? parseInt(port, 10) : port;
  if (p === 465) return 'ssl';
  if (p === 587) return 'starttls';
  if (p === 25) return 'none';
  return 'auto';
}
