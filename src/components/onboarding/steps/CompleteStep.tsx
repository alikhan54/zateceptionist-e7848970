// ============================================================
// STEP 9: COMPLETE - Completion Celebration
// ============================================================

import React from 'react';
import {
  CheckCircle,
  ArrowRight,
  MessageSquare,
  BarChart3,
  Settings,
  Sparkles,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import type { StepProps } from './index';

interface CompleteStepProps extends Omit<StepProps, 'onPrevious'> {
  companyName: string;
  aiName: string;
  onComplete: () => void;
}

export function CompleteStep({
  companyName,
  aiName,
  onComplete,
}: CompleteStepProps) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center space-y-4 py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
        >
          <CheckCircle className="h-10 w-10 text-primary" />
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            You're All Set! <PartyPopper className="h-8 w-8" />
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mt-2">
            {aiName} is now configured and ready to help {companyName || 'your business'}.
            Start engaging with your customers today!
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What's Next?
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Test your AI</p>
                  <p className="text-sm text-muted-foreground">
                    Try the chat widget to see how {aiName} responds to customers
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Settings className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Connect your channels</p>
                  <p className="text-sm text-muted-foreground">
                    Link your WhatsApp, email, and social media accounts
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Review conversations</p>
                  <p className="text-sm text-muted-foreground">
                    Monitor AI responses and improve over time
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="text-sm font-medium">Open Inbox</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="text-sm font-medium">View Dashboard</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardContent className="p-4 text-center">
            <Settings className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="text-sm font-medium">Settings</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex justify-center pt-4"
      >
        <Button onClick={onComplete} size="lg" className="gap-2">
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
