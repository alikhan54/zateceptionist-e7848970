export interface ProviderOption {
  provider: string;
  description: string;
  capabilities: {
    label: string;
    value: string;
    status: 'yes' | 'no' | 'warn';
  }[];
}

export interface CountryVoiceConfig {
  name: string;
  code: string;
  flag: string;
  recommended: ProviderOption;
  alternative?: ProviderOption;
  warning?: string;
  steps: string[];
}

export const VOICE_COUNTRY_DATA: Record<string, CountryVoiceConfig> = {
  US: {
    name: 'United States',
    code: '+1',
    flag: '🇺🇸',
    recommended: {
      provider: 'Twilio',
      description: 'Full voice, SMS, and MMS support. Lowest latency for US calls. Native VAPI integration.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS / MMS', value: 'Yes', status: 'yes' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: 'Lowest', status: 'yes' },
      ],
    },
    alternative: {
      provider: 'Telnyx',
      description: 'Competitive alternative with similar coverage and pricing.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS / MMS', value: 'Yes', status: 'yes' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: 'Low', status: 'yes' },
      ],
    },
    steps: [
      'Sign up for Twilio (or use platform-managed number)',
      'Buy a US local number (~$1/month)',
      'Enable international voice permissions in Twilio console',
      'Import number into VAPI via Settings > Phone Numbers',
      'Set as primary outbound in Voice AI > Outbound settings',
    ],
  },
  AE: {
    name: 'UAE',
    code: '+971',
    flag: '🇦🇪',
    recommended: {
      provider: 'Telnyx + SIP trunk',
      description: 'UAE has strict anti-spoofing laws. Outbound from UAE numbers requires SIP BYO with local Etisalat/DU gateway for best quality and compliance.',
      capabilities: [
        { label: 'Outbound calls', value: 'Via SIP only', status: 'warn' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'Limited', status: 'warn' },
        { label: 'VAPI import', value: 'SIP BYO', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + SIP trunk', status: 'warn' },
        { label: 'Call latency', value: 'Best with local SBC', status: 'yes' },
      ],
    },
    alternative: {
      provider: 'Telnyx direct import',
      description: 'Simpler setup but higher latency (3-4 seconds via US routing). Local numbers available with DNCR registration.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes (restrictions)', status: 'warn' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'No', status: 'no' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: '3-4 seconds', status: 'warn' },
      ],
    },
    warning: 'UAE law prohibits VoIP call spoofing. You must register with Etisalat or DU DNCR (Do Not Call Registry). Telemarketing hours: 9 AM – 6 PM only. Numbers used without registration may be permanently blocked.',
    steps: [
      'Create a Telnyx account and complete business verification',
      'Buy a UAE local number (requires DNCR registration proof)',
      'Register with DNCR: du.ae/business/do-not-call-registry or etisalat.ae/en/smb/dncr',
      'For best quality: Set up SIP trunk to local Etisalat/DU PRI gateway',
      'For simpler setup: Import Telnyx number directly into VAPI',
      'Configure as your primary number in Settings > Voice AI > Outbound',
      'Set telemarketing hours to 9 AM – 6 PM in Settings > Voice AI > AI Personality',
    ],
  },
  PK: {
    name: 'Pakistan',
    code: '+92',
    flag: '🇵🇰',
    recommended: {
      provider: 'Telnyx',
      description: 'Twilio does not sell Pakistani numbers. Telnyx offers local +92 numbers with business documentation requirements.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'Check availability', status: 'warn' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: 'Moderate', status: 'warn' },
      ],
    },
    warning: 'Business documentation is required for Pakistani phone numbers. Telnyx compliance team reviews all applications. Processing typically takes 3-5 business days.',
    steps: [
      'Create a Telnyx account and complete business verification',
      'Submit required documentation for Pakistan number (business registration)',
      'Wait for compliance approval (3-5 business days)',
      'Buy a +92 local number from the Telnyx portal',
      'Import into VAPI via Settings > Phone Numbers',
      'Set as primary outbound for Pakistan-based operations',
    ],
  },
  SA: {
    name: 'Saudi Arabia',
    code: '+966',
    flag: '🇸🇦',
    recommended: {
      provider: 'Telnyx',
      description: 'Local Saudi numbers available starting at $1/month. Business documentation required for compliance.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'Check availability', status: 'warn' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: 'Moderate', status: 'warn' },
      ],
    },
    warning: 'Business documentation is required for KSA numbers. Telnyx compliance reviews all applications.',
    steps: [
      'Create a Telnyx account and complete verification',
      'Submit Saudi Arabia business documentation',
      'Buy a +966 local number after approval',
      'Import into VAPI via Settings > Phone Numbers',
      'Configure in Voice AI settings as your primary outbound number',
    ],
  },
  QA: {
    name: 'Qatar',
    code: '+974',
    flag: '🇶🇦',
    recommended: {
      provider: 'Telnyx',
      description: 'Toll-free numbers available for Qatar. Local numbers are not yet offered by major VoIP providers. Best for inbound customer support lines.',
      capabilities: [
        { label: 'Outbound calls', value: 'Toll-free only', status: 'warn' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'No', status: 'no' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: 'Higher (toll-free rates)', status: 'warn' },
        { label: 'Call latency', value: 'Moderate', status: 'warn' },
      ],
    },
    warning: 'Only toll-free numbers are currently available for Qatar. Local +974 numbers are not yet offered by any major VoIP provider. Best suited for inbound support lines.',
    steps: [
      'Create a Telnyx account',
      'Buy a Qatar toll-free number',
      'Import into VAPI via Settings > Phone Numbers',
      'Configure for inbound calls in Voice AI settings',
      'For outbound to Qatar: use a US or UK number (international calling)',
    ],
  },
  GB: {
    name: 'United Kingdom',
    code: '+44',
    flag: '🇬🇧',
    recommended: {
      provider: 'Twilio',
      description: 'Full coverage with local and mobile numbers. Voice and SMS support. Low latency for UK and European calls.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'Yes', status: 'yes' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: 'Low', status: 'yes' },
      ],
    },
    alternative: {
      provider: 'Telnyx',
      description: 'Equal coverage and competitive pricing. Good alternative.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'Yes', status: 'yes' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: 'Low', status: 'yes' },
      ],
    },
    steps: [
      'Sign up for Twilio (or Telnyx)',
      'Buy a UK local number (+44)',
      'Import into VAPI via Settings > Phone Numbers',
      'Set as primary outbound in Voice AI > Outbound settings',
    ],
  },
  CA: {
    name: 'Canada',
    code: '+1',
    flag: '🇨🇦',
    recommended: {
      provider: 'Twilio',
      description: 'Full coverage with local and toll-free numbers. Shares +1 country code with US for seamless North American calling.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS / MMS', value: 'Yes', status: 'yes' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo + usage', status: 'yes' },
        { label: 'Call latency', value: 'Lowest', status: 'yes' },
      ],
    },
    alternative: {
      provider: 'Telnyx',
      description: 'Equal coverage for Canada.',
      capabilities: [
        { label: 'Outbound calls', value: 'Yes', status: 'yes' },
        { label: 'Inbound calls', value: 'Yes', status: 'yes' },
        { label: 'SMS', value: 'Yes', status: 'yes' },
        { label: 'VAPI import', value: 'Native', status: 'yes' },
        { label: 'Monthly cost', value: '~$1/mo', status: 'yes' },
        { label: 'Call latency', value: 'Low', status: 'yes' },
      ],
    },
    steps: [
      'Sign up for Twilio (or Telnyx)',
      'Buy a Canadian local number',
      'Import into VAPI via Settings > Phone Numbers',
      'Configure in Voice AI settings',
    ],
  },
};

export const DEFAULT_VOICE_CONFIG: CountryVoiceConfig = {
  name: 'Your country',
  code: '',
  flag: '🌍',
  recommended: {
    provider: 'Telnyx',
    description: 'Telnyx has the widest international coverage with numbers in 80+ countries. Check telnyx.com/global-coverage for your specific country.',
    capabilities: [
      { label: 'Outbound calls', value: 'Check coverage', status: 'warn' },
      { label: 'Inbound calls', value: 'Check coverage', status: 'warn' },
      { label: 'SMS', value: 'Varies by country', status: 'warn' },
      { label: 'VAPI import', value: 'Native', status: 'yes' },
      { label: 'Monthly cost', value: 'From $1/mo', status: 'yes' },
      { label: 'Call latency', value: 'Varies', status: 'warn' },
    ],
  },
  warning: 'Check telnyx.com/global-coverage for number availability in your country. Some countries require business documentation or local address verification.',
  steps: [
    'Check number availability at telnyx.com/global-coverage',
    'Create a Telnyx account if numbers are available for your country',
    'Complete any required documentation or verification',
    'Buy a local number for your country',
    'Import into VAPI via Settings > Phone Numbers',
    'Configure in Voice AI settings',
  ],
};
