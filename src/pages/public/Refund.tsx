export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-primary">
            Zate Systems
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
            <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 24, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Zate Systems, we want you to be completely satisfied with our AI Business Automation Platform. This Refund Policy outlines the terms and conditions for requesting a refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Free Trial</h2>
            <p className="text-muted-foreground leading-relaxed">
              We offer a 2-day free trial for all new accounts. During this trial period, you can explore our platform's features without any financial commitment. No credit card is required to start your free trial.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Subscription Refunds</h2>
            <h3 className="text-xl font-medium mt-4 mb-2">30-Day Money-Back Guarantee</h3>
            <p className="text-muted-foreground leading-relaxed">
              We offer a 30-day money-back guarantee for first-time subscribers. If you are not satisfied with our Service within the first 30 days of your paid subscription, you may request a full refund.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-2">Eligibility Requirements</h3>
            <p className="text-muted-foreground leading-relaxed">
              To be eligible for a refund under our 30-day guarantee:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>You must be a first-time subscriber to our paid plans</li>
              <li>The refund request must be made within 30 days of your initial payment</li>
              <li>Your account must not have violated our Terms of Service</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-2">After 30 Days</h3>
            <p className="text-muted-foreground leading-relaxed">
              After the initial 30-day period, subscription fees are non-refundable. You may cancel your subscription at any time, and you will retain access to the Service until the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Pro-Rated Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not offer pro-rated refunds for partial months of service. When you cancel your subscription, you will continue to have access to the Service until the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Downgrades</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you downgrade your subscription plan, the change will take effect at the start of your next billing cycle. No refunds will be issued for the difference in plan pricing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Service Interruptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              In the event of significant service interruptions or outages caused by Zate Systems that last more than 24 consecutive hours, we may offer service credits or partial refunds at our discretion. This does not apply to scheduled maintenance or circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed">
              To request a refund, please contact our support team:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Email: billing@zatesystems.com</li>
              <li>Include your account email and reason for the refund request</li>
              <li>Allow 5-10 business days for processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Refund Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Approved refunds will be processed within 5-10 business days. Refunds will be issued to the original payment method used for the purchase. Depending on your bank or credit card company, it may take an additional 5-10 business days for the refund to appear on your statement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Enterprise Plans</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refund terms for Enterprise plans may differ based on individual contract agreements. Please refer to your specific contract or contact your account manager for details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about our Refund Policy, please contact us:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: billing@zatesystems.com<br />
              Website: https://zatesystems.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
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
