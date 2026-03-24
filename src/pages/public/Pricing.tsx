import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_TIERS } from "@/lib/pricing";

const descriptions: Record<string, string> = {
  free_trial: "Try before you buy",
  starter: "For small businesses",
  professional: "For growing teams",
  enterprise: "For large organizations",
};

const ctas: Record<string, string> = {
  free_trial: "Start Free Trial",
  starter: "Get Started",
  professional: "Get Started",
  enterprise: "Contact Sales",
};

const plans = Object.values(SUBSCRIPTION_TIERS).map(tier => ({
  name: tier.name,
  price: tier.price === 0 ? "$0" : `$${tier.price.toLocaleString()}`,
  period: tier.price === 0 ? tier.period : "per month",
  description: descriptions[tier.id] || "",
  features: tier.features,
  cta: ctas[tier.id] || "Get Started",
  popular: tier.popular || false,
}));

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-primary">
            Zate Systems
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/pricing" className="text-sm font-medium text-primary">Pricing</a>
            <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
            <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include our core AI automation features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <a href="/login">{plan.cta}</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards, debit cards, PayPal, and bank transfers for enterprise customers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground">
                Yes, all new accounts start with a 2-day free trial with limited features. No credit card required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my limits?</h3>
              <p className="text-muted-foreground">
                We'll notify you when you're approaching your limits. You can upgrade anytime to continue using the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Zate Systems. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/terms" className="hover:text-foreground">Terms of Service</a>
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>
            <a href="/refund" className="hover:text-foreground">Refund Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
