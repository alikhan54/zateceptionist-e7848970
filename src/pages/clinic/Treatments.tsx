import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClinicTreatments } from "@/hooks/useClinicTreatments";
import { Clock, DollarSign, AlertCircle, CheckCircle } from "lucide-react";

export default function Treatments() {
  const { treatments, isLoading, categories } = useClinicTreatments();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filtered = selectedCategory === "all" ? treatments : treatments.filter(t => t.category === selectedCategory);

  const categoryLabels: Record<string, string> = {
    aesthetics: "Aesthetics", dermatology: "Dermatology", body: "Body", hair: "Hair", skincare: "Skincare",
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treatments</h1>
        <p className="text-muted-foreground">Treatment catalog and service management</p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          <TabsTrigger value="all">All ({treatments.length})</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {categoryLabels[cat] || cat} ({treatments.filter(t => t.category === cat).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Loading treatments...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((treatment) => (
            <Card key={treatment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{treatment.name}</CardTitle>
                  <Badge>{treatment.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{treatment.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {treatment.duration_minutes} min</span>
                  <span className="flex items-center gap-1 font-semibold"><DollarSign className="h-4 w-4" /> {treatment.currency} {treatment.price}</span>
                </div>
                <div className="flex gap-2">
                  {treatment.requires_consultation && (
                    <Badge variant="secondary" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Consultation Required</Badge>
                  )}
                  {treatment.requires_consent && (
                    <Badge variant="outline" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Consent Form</Badge>
                  )}
                </div>
                {treatment.pre_care_instructions && (
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Pre-Care Instructions</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 line-clamp-3">{treatment.pre_care_instructions}</p>
                  </div>
                )}
                {treatment.post_care_instructions && (
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Post-Care Instructions</h4>
                    <p className="text-xs text-green-600 dark:text-green-400 line-clamp-3">{treatment.post_care_instructions}</p>
                  </div>
                )}
                {treatment.contraindications && (
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Contraindications</h4>
                    <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">{treatment.contraindications}</p>
                  </div>
                )}
                {treatment.recommended_products && treatment.recommended_products.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-1">Recommended Products</h4>
                    <div className="flex flex-wrap gap-1">
                      {treatment.recommended_products.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
