import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { LEAD_STAGES } from '@/config/constants';
import { Lead } from '@/types';
import { LeadCard } from './LeadCard';
import { useTenant } from '@/contexts/TenantContext';

interface PipelineViewProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
}

export function PipelineView({ leads, onLeadClick }: PipelineViewProps) {
  const { t } = useTenant();

  const getLeadsByStage = (stageId: string) => {
    return leads.filter((lead) => lead.status === stageId);
  };

  const getTotalValue = (stageLeads: Lead[]) => {
    return stageLeads.length;
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {LEAD_STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          
          return (
            <div key={stage.id} className="w-[300px] shrink-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <CardTitle className="text-sm font-medium">
                        {stage.label}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stageLeads.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getTotalValue(stageLeads)} {t('leads').toLowerCase()}
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="flex flex-col gap-3 pr-3">
                      {stageLeads.map((lead) => (
                        <div key={lead.id} onClick={() => onLeadClick?.(lead)}>
                          <LeadCard lead={lead} />
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No {t('leads').toLowerCase()} in this stage
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
