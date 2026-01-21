// GET TIER FROM DATABASE via tenantConfig
const tier: SubscriptionTier = useMemo(() => {
  const dbTier = (tenantConfig as any)?.subscription_tier;
  if (dbTier === "enterprise" || dbTier === "professional" || dbTier === "starter") {
    return dbTier;
  }
  return "starter";  // ⚠️ BUG: Defaults to STARTER instead of FREE!
}, [(tenantConfig as any)?.subscription_tier]);
```

**Problems:**
1. `SubscriptionTier` type only has `starter | professional | enterprise` - **NO FREE TIER**
2. When new user signs up → no `tenant_config` exists → `subscription_tier` is undefined → defaults to `"starter"`
3. User gets all Starter features ($199/month value) for FREE

---

## ✅ COMPREHENSIVE FIX

### Fix 1: Add FREE Tier to Subscription System

**Tell Lovable:**
```
CRITICAL FIX: Add FREE tier to SubscriptionContext.tsx

1. Update the SubscriptionTier type to include 'free':
   export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise";

2. Add TIER_DEFAULTS for free:
   free: {
     leads_per_month: 10,
     b2b_searches_per_day: 3,
     intent_searches_per_day: 0,
     has_google_search: true,
     has_apollo_access: false,
     has_hunter_access: false,
     has_apify_access: false,
     has_ai_scoring: false,
     has_intent_leads: false,
     has_api_access: false,
     has_white_label: false,
     active_sequences: 1,
     emails_per_day: 10,
     whatsapp_per_day: 5,
     calls_per_day: 2,
     max_users: 1,
     voice_minutes: 10,
   },

3. Add SUBSCRIPTION_TIERS config for free:
   free: {
     id: "free",
     name: "Free Trial",
     price: 0,
     yearlyPrice: 0,
     description: "Try out the platform with limited features",
     limits: TIER_DEFAULTS.free,
     features: [
       "10 leads per month",
       "Google Search only",
       "1 active sequence",
       "10 emails per day",
       "5 WhatsApp messages per day",
       "2 voice calls per day",
       "1 team member",
       "10 voice minutes",
       "Community support",
     ],
   },

4. CRITICAL: Change the default tier from "starter" to "free":
   const tier: SubscriptionTier = useMemo(() => {
     const dbTier = (tenantConfig as any)?.subscription_tier;
     if (dbTier === "enterprise" || dbTier === "professional" || dbTier === "starter" || dbTier === "free") {
       return dbTier;
     }
     return "free";  // Changed from "starter" to "free"
   }, [(tenantConfig as any)?.subscription_tier]);

5. Update the Billing page to show FREE tier as the default/current plan for new users