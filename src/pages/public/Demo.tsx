import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BOOKING_URL = "https://calendly.com/zatesystems/30min";

const demoPoints = [
  "See how the AI finds, enriches, and contacts leads autonomously",
  "Watch multi-channel outreach in action (email, WhatsApp, SMS, voice)",
  "Get a personalized ROI estimate for your business",
];

export default function Demo() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/landing" className="text-2xl font-bold text-primary">Zate Systems</a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="/demo" className="text-sm font-medium text-primary">Book Demo</a>
            <Button asChild size="sm"><a href="/login">Sign In</a></Button>
          </nav>
        </div>
      </header>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              See the 420 AI Platform in Action
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              15 minutes. No credit card. No pressure. Just see what AI automation can do for your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">What you will see:</h2>
                <ul className="space-y-3">
                  {demoPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    After the demo, you will get a free 14-day trial with full access to all features. No credit card required.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Book your slot:</h2>
                <div className="rounded-lg overflow-hidden border bg-background" style={{ minHeight: 500 }}>
                  <iframe
                    src={BOOKING_URL}
                    width="100%"
                    height="500"
                    frameBorder="0"
                    title="Book a demo"
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Or email us directly at{" "}
                  <a href="mailto:adeel@zatesystems.com" className="text-primary hover:underline">
                    adeel@zatesystems.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
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
