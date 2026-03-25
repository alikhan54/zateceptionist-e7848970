import { ArrowRight, Bot, Mail, Phone, BarChart3, Users, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SUBSCRIPTION_TIERS } from "@/lib/pricing";

const tools = [
  { old: "Apollo.io", cost: "$49-99/mo", what: "Lead database" },
  { old: "Instantly.ai", cost: "$97/mo", what: "Cold email" },
  { old: "HubSpot CRM", cost: "$45-500/mo", what: "CRM" },
  { old: "Calendly", cost: "$12/mo", what: "Meeting booking" },
  { old: "Intercom", cost: "$74/mo", what: "Chat & support" },
  { old: "Mailchimp", cost: "$20-300/mo", what: "Email marketing" },
];

const features = [
  { icon: Bot, title: "AI Lead Discovery", desc: "Finds leads from Google Maps, LinkedIn, and web scraping. Enriches with email, phone, and company data." },
  { icon: Mail, title: "6-Channel Outreach", desc: "Email, WhatsApp, SMS, AI voice calls, LinkedIn, and social. All personalized. All autonomous." },
  { icon: BarChart3, title: "AI Scoring & Qualification", desc: "ML-powered lead scoring, ICP matching, signal stacking. Knows which leads to prioritize." },
  { icon: Calendar, title: "Auto Meeting Booking", desc: "Detects buying intent from replies, sends booking links, tracks document opens." },
  { icon: Users, title: "Full CRM", desc: "Customer 360 view, deal pipeline, team management, activity tracking. No separate CRM needed." },
  { icon: Phone, title: "AI Voice Agent", desc: "Answers calls, books appointments, handles FAQs. Works 24/7 across industries." },
];

const tiers = Object.values(SUBSCRIPTION_TIERS).filter(t => t.id !== "free_trial");

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/landing" className="text-2xl font-bold text-primary">Zate Systems</a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="/demo" className="text-sm text-muted-foreground hover:text-foreground">Book Demo</a>
            <Button asChild size="sm"><a href="/login">Sign In</a></Button>
          </nav>
        </div>
      </header>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            The AI That Runs Your{" "}
            <span className="text-primary">Entire Business</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Lead generation. Enrichment. Multi-channel outreach. CRM. Meeting booking.
            Analytics. All autonomous. All in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/demo" className="gap-2">Book a Demo <ArrowRight className="h-4 w-4" /></a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/pricing">See Pricing</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 border-t">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Replace Your Entire Sales &amp; Marketing Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Card key={tool.old} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-destructive line-through text-sm">{tool.old} \u2014 {tool.cost}</div>
                  <div className="text-muted-foreground text-xs mt-1">{tool.what}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <div className="text-4xl font-bold text-green-500">= $297-1,032/month saved</div>
            <div className="text-muted-foreground mt-2">420 AI Platform: from $199/month</div>
          </div>
        </div>
      </section>

      <section className="py-16 border-t">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">What the AI Does (Autonomously)</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="p-6">
                  <f.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30 border-t">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-10">Built Different. Proven Results.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { val: "72+", label: "AI Workflows" },
              { val: "98%", label: "Email Discovery" },
              { val: "6", label: "Outreach Channels" },
              { val: "8-Step", label: "Smart Sequences" },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-4xl font-bold text-primary">{m.val}</div>
                <div className="text-muted-foreground text-sm mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card key={tier.id} className={tier.popular ? "border-primary shadow-lg" : ""}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg">{tier.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-bold">${tier.price.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">/mo</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {tier.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={tier.popular ? "default" : "outline"} asChild>
                    <a href="/pricing">Learn More</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 text-center border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Automate Your Business?</h2>
          <p className="text-muted-foreground mb-8">15-minute demo. No credit card required.</p>
          <Button size="lg" asChild>
            <a href="/demo" className="gap-2">Book Your Demo <ArrowRight className="h-4 w-4" /></a>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Zate Systems. AI-Powered Business Automation.</p>
          <div className="mt-2 space-x-4">
            <a href="/pricing" className="hover:text-foreground">Pricing</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
