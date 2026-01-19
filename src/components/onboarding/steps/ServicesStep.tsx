// ============================================================
// STEP 4: SERVICES - Services Catalog
// ============================================================

import React, { useState } from 'react';
import {
  Package,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
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
import type { ServiceCatalogItem, AIAnalysisResult } from '@/types/onboardingWizard';
import type { StepProps } from './index';

interface ServicesStepProps extends StepProps {
  services: ServiceCatalogItem[];
  addService: (service: Partial<ServiceCatalogItem>) => Promise<any>;
  deleteService: (id: string) => Promise<void>;
  bulkAddServices: (services: Partial<ServiceCatalogItem>[]) => Promise<any>;
  analysisResult: AIAnalysisResult | null;
}

export function ServicesStep({
  onNext,
  onPrevious,
  services,
  addService,
  deleteService,
  bulkAddServices,
  analysisResult,
}: ServicesStepProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    type: 'service' as const,
    price_type: 'quote' as const,
  });

  const handleAddService = async () => {
    if (!newService.name) return;
    
    await addService({
      name: newService.name,
      description: newService.description,
      type: newService.type,
      price_type: newService.price_type,
      currency: 'USD',
      is_active: true,
      is_featured: false,
      keywords: [],
      faq_entries: [],
      display_order: services.length,
    });
    
    setNewService({ name: '', description: '', type: 'service', price_type: 'quote' });
    setIsAddDialogOpen(false);
  };

  const handleImportAll = async () => {
    if (!analysisResult?.services?.length) return;
    
    await bulkAddServices(
      analysisResult.services.map((s, i) => ({
        name: s.name,
        description: s.description,
        type: 'service' as const,
        price_type: 'quote' as const,
        currency: 'USD',
        is_active: true,
        is_featured: i === 0,
        keywords: [],
        faq_entries: [],
        display_order: i,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Your Services</h2>
        <p className="text-muted-foreground">
          Define the services or products you offer
        </p>
      </div>

      <div className="space-y-4">
        {/* AI-detected services prompt */}
        {analysisResult?.services && analysisResult.services.length > 0 && services.length === 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI-detected services</p>
                  <p className="text-sm text-muted-foreground">
                    We found {analysisResult.services.length} services from your website
                  </p>
                </div>
                <Button size="sm" onClick={handleImportAll}>
                  Import All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services list */}
        {services.length > 0 ? (
          <div className="grid gap-3">
            {services.map((service) => (
              <Card key={service.id} className="group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{service.name}</p>
                      {service.is_featured && (
                        <Badge variant="secondary" className="text-xs">Featured</Badge>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {service.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {service.price_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteService(service.id)}
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
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No services added yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your services or import from AI analysis
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
          Add Service
        </Button>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input
                id="serviceName"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Consultation, Haircut, Property Tour"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceDescription">Description</Label>
              <Textarea
                id="serviceDescription"
                value={newService.description}
                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the service..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newService.type}
                  onValueChange={(v) => setNewService(prev => ({ ...prev, type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pricing</Label>
                <Select
                  value={newService.price_type}
                  onValueChange={(v) => setNewService(prev => ({ ...prev, price_type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="range">Price Range</SelectItem>
                    <SelectItem value="quote">Request Quote</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddService} disabled={!newService.name}>
              Add Service
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
