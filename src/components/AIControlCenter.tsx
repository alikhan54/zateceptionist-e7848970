import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type AIMode = 'autonomous' | 'assisted' | 'manual';

interface ModuleSettings {
  sales: boolean;
  marketing: boolean;
  hr: boolean;
  support: boolean;
}

export function AIControlCenter() {
  const { tenantConfig } = useTenant();
  
  // Default to assisted mode
  const [mode, setMode] = useState<AIMode>(
    (tenantConfig?.ai_mode as AIMode) || 'assisted'
  );
  
  const [modules, setModules] = useState<ModuleSettings>({
    sales: true,
    marketing: true,
    hr: false,
    support: true,
  });

  const toggleModule = (module: keyof ModuleSettings) => {
    setModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  const getModeColor = () => {
    switch (mode) {
      case 'autonomous':
        return 'text-green-500';
      case 'assisted':
        return 'text-blue-500';
      case 'manual':
        return 'text-muted-foreground';
    }
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Bot className={cn(
            "h-4 w-4 transition-colors",
            getModeColor(),
            mode === 'autonomous' && "animate-pulse"
          )} />
          <span className="hidden sm:inline">AI: {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm">AI Operation Mode</h4>
            <p className="text-xs text-muted-foreground">Control how AI handles tasks</p>
          </div>
          
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as AIMode)} className="space-y-3">
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="autonomous" id="autonomous" className="mt-1" />
              <Label htmlFor="autonomous" className="flex-1 cursor-pointer">
                <span className="font-medium text-green-600">Autonomous</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI handles everything automatically
                </p>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="assisted" id="assisted" className="mt-1" />
              <Label htmlFor="assisted" className="flex-1 cursor-pointer">
                <span className="font-medium text-blue-600">Assisted</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI suggests, you approve
                </p>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="manual" id="manual" className="mt-1" />
              <Label htmlFor="manual" className="flex-1 cursor-pointer">
                <span className="font-medium">Manual</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI disabled, you control everything
                </p>
              </Label>
            </div>
          </RadioGroup>
          
          <Separator />
          
          <div className="space-y-3">
            <h5 className="text-sm font-medium">Per-Module Controls</h5>
            {(['sales', 'marketing', 'hr', 'support'] as const).map((module) => (
              <div key={module} className="flex items-center justify-between">
                <span className="text-sm capitalize">{module} AI</span>
                <Switch 
                  checked={modules[module]} 
                  onCheckedChange={() => toggleModule(module)}
                  disabled={mode === 'manual'}
                />
              </div>
            ))}
          </div>

          {mode === 'manual' && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Per-module controls disabled in manual mode
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
