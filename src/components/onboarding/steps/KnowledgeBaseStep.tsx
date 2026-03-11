import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload, FileText, Loader2, Check, X, Trash2,
  ArrowRight, SkipForward, ChevronLeft, BookOpen, AlertCircle,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import { OnboardingData, fileToBase64 } from '@/pages/onboarding/constants';

interface KnowledgeBaseStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function KnowledgeBaseStep({ data, updateData, onNext, onBack, onSkip }: KnowledgeBaseStepProps) {
  const { tenantId } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { uploadedFiles, knowledgeText } = data;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    setError(null);

    const newFiles = [...uploadedFiles];
    let progress = 0;

    for (const file of Array.from(files)) {
      // Validate
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Unsupported file type: ${file.name}. Use PDF, DOCX, TXT, or CSV.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Maximum 10MB.`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);

        const response = await callWebhook(
          WEBHOOKS.ANALYZE_DOCUMENT,
          {
            document: base64,
            filename: file.name,
            file_type: file.type,
          },
          tenantId || ''
        );

        newFiles.push({
          name: file.name,
          size: file.size,
          success: response.success,
        });

        progress += (1 / files.length) * 100;
        setUploadProgress(Math.round(progress));
      } catch (err) {
        newFiles.push({
          name: file.name,
          size: file.size,
          success: false,
        });
      }
    }

    updateData({ uploadedFiles: newFiles });
    setIsUploading(false);
    setUploadProgress(0);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    updateData({ uploadedFiles: updated });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const successCount = uploadedFiles.filter(f => f.success).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Train Your AI Knowledge Base</h2>
        <p className="text-muted-foreground mt-1">
          Upload documents and add knowledge to make your AI smarter about your business
        </p>
      </div>

      {/* File Upload */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Label className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Documents
          </Label>

          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isUploading ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm">Analyzing documents...</p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto" />
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">Drop files here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, TXT, CSV — up to 10MB each</p>
              </>
            )}
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Uploaded Files ({successCount}/{uploadedFiles.length} processed)
              </p>
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({formatSize(file.size)})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.success === true && (
                      <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                        <Check className="h-3 w-3 mr-1" /> Processed
                      </Badge>
                    )}
                    {file.success === false && (
                      <Badge variant="outline" className="border-red-500 text-red-600 text-xs">
                        <X className="h-3 w-3 mr-1" /> Failed
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Knowledge */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Label className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Additional Knowledge (Optional)
          </Label>
          <Textarea
            value={knowledgeText}
            onChange={(e) => updateData({ knowledgeText: e.target.value })}
            placeholder="Add any additional information about your business that you want the AI to know. For example: special policies, frequently asked questions, pricing details, common customer objections..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            This text will be added to your AI's knowledge base alongside any uploaded documents.
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" /> Skip
          </Button>
          <Button onClick={onNext}>
            Continue <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
