// ============================================================
// STEP 5: PERSONAS - Target Customer Personas
// ============================================================

import React, { useState } from 'react';
import {
  Users,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TargetPersona } from '@/types/onboardingWizard';
import type { StepProps } from './index';

interface PersonasStepProps extends StepProps {
  personas: TargetPersona[];
  addPersona: (persona: Partial<TargetPersona>) => Promise<any>;
  deletePersona: (id: string) => Promise<void>;
  setPrimaryPersona: (id: string) => Promise<any>;
}

export function PersonasStep({
  onNext,
  onPrevious,
  personas,
  addPersona,
  deletePersona,
  setPrimaryPersona,
}: PersonasStepProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPersona, setNewPersona] = useState({
    name: '',
    type: 'b2c' as 'b2c' | 'b2b',
    age_range_min: 25,
    age_range_max: 45,
    pain_points: '',
    goals: '',
  });

  const handleAddPersona = async () => {
    if (!newPersona.name) return;
    
    await addPersona({
      name: newPersona.name,
      type: newPersona.type,
      is_primary: personas.length === 0,
      age_range_min: newPersona.type === 'b2c' ? newPersona.age_range_min : undefined,
      age_range_max: newPersona.type === 'b2c' ? newPersona.age_range_max : undefined,
      locations: [],
      pain_points: newPersona.pain_points.split(',').map(s => s.trim()).filter(Boolean),
      goals: newPersona.goals.split(',').map(s => s.trim()).filter(Boolean),
      interests: [],
      values: [],
      objections: [],
      buying_triggers: [],
      preferred_channels: [],
      high_intent_keywords: [],
      medium_intent_keywords: [],
      low_intent_keywords: [],
    });
    
    setNewPersona({
      name: '',
      type: 'b2c',
      age_range_min: 25,
      age_range_max: 45,
      pain_points: '',
      goals: '',
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Target Customers</h2>
        <p className="text-muted-foreground">
          Define who your ideal customers are
        </p>
      </div>

      <div className="space-y-4">
        {personas.length > 0 ? (
          <div className="grid gap-3">
            {personas.map((persona) => (
              <Card key={persona.id} className="group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{persona.name}</p>
                        {persona.is_primary && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {persona.type.toUpperCase()}
                        </Badge>
                        {persona.type === 'b2c' && persona.age_range_min && persona.age_range_max && (
                          <span className="text-xs text-muted-foreground">
                            Age {persona.age_range_min}-{persona.age_range_max}
                          </span>
                        )}
                      </div>
                      {persona.pain_points.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {persona.pain_points.slice(0, 3).map((point, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">
                              {point}
                            </Badge>
                          ))}
                          {persona.pain_points.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal">
                              +{persona.pain_points.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!persona.is_primary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPrimaryPersona(persona.id)}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deletePersona(persona.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No customer personas defined yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Define your ideal customers to help AI personalize interactions
              </p>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Customer Persona
        </Button>
      </div>

      {/* Add Persona Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="personaName">Persona Name *</Label>
              <Input
                id="personaName"
                value={newPersona.name}
                onChange={(e) => setNewPersona(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Young Professionals, Small Business Owners"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select
                value={newPersona.type}
                onValueChange={(v) => setNewPersona(prev => ({ ...prev, type: v as 'b2c' | 'b2b' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2c">B2C (Consumer)</SelectItem>
                  <SelectItem value="b2b">B2B (Business)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newPersona.type === 'b2c' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ageMin">Min Age</Label>
                  <Input
                    id="ageMin"
                    type="number"
                    value={newPersona.age_range_min}
                    onChange={(e) => setNewPersona(prev => ({ ...prev, age_range_min: parseInt(e.target.value) || 18 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ageMax">Max Age</Label>
                  <Input
                    id="ageMax"
                    type="number"
                    value={newPersona.age_range_max}
                    onChange={(e) => setNewPersona(prev => ({ ...prev, age_range_max: parseInt(e.target.value) || 65 }))}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="painPoints">Pain Points</Label>
              <Textarea
                id="painPoints"
                value={newPersona.pain_points}
                onChange={(e) => setNewPersona(prev => ({ ...prev, pain_points: e.target.value }))}
                placeholder="Separate with commas: e.g., Time constraints, Budget concerns"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              <Textarea
                id="goals"
                value={newPersona.goals}
                onChange={(e) => setNewPersona(prev => ({ ...prev, goals: e.target.value }))}
                placeholder="Separate with commas: e.g., Save money, Get healthier"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPersona} disabled={!newPersona.name}>
              Add Persona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
