import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { callWebhook } from "@/lib/api/webhooks";

interface ParsedRow {
  account_number: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  product_type: string;
  original_amount: string;
  outstanding_balance: string;
  monthly_payment: string;
  currency: string;
  dpd: string;
  due_date: string;
  [key: string]: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export default function AccountImport() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast({ title: "Invalid File", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast({ title: "Empty File", description: "CSV must have at least a header and one data row.", variant: "destructive" });
        return;
      }

      const headerLine = lines[0];
      const cols = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(cols);

      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: any = {};
        cols.forEach((col, idx) => {
          row[col] = values[idx] || "";
        });
        rows.push(row);
      }
      setParsedRows(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!tenantId || parsedRows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const accounts = parsedRows.map((row) => ({
        tenant_id: tenantId,
        account_number: row.account_number || "",
        client_name: row.client_name || "",
        client_phone: row.client_phone || null,
        client_email: row.client_email || null,
        product_type: row.product_type || "personal_loan",
        original_amount: parseFloat(row.original_amount) || 0,
        outstanding_balance: parseFloat(row.outstanding_balance) || 0,
        monthly_payment: parseFloat(row.monthly_payment) || null,
        currency: row.currency || tenantConfig?.currency || "",
        dpd: parseInt(row.dpd) || 0,
        due_date: row.due_date || null,
        status: "active",
        bucket: getBucket(parseInt(row.dpd) || 0),
      }));

      const response = await callWebhook("/collections-action", {
        action: "import_accounts",
        tenant_id: tenantId,
        accounts,
      }, tenantId || '');

      const resData = response as any;
      setResult({
        success: true,
        imported: resData?.imported || parsedRows.length,
        errors: resData?.errors || [],
      });

      toast({ title: "Import Complete", description: `${resData?.imported || parsedRows.length} accounts imported.` });
    } catch (err: any) {
      setResult({
        success: false,
        imported: 0,
        errors: [err.message || "Import failed"],
      });
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const getBucket = (dpd: number): string => {
    if (dpd <= 0) return "B0";
    if (dpd <= 30) return "B1";
    if (dpd <= 60) return "B2";
    if (dpd <= 90) return "B3";
    if (dpd <= 120) return "B4";
    if (dpd <= 150) return "B5";
    if (dpd <= 180) return "B6";
    return "B7";
  };

  const clearFile = () => {
    setFile(null);
    setParsedRows([]);
    setHeaders([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Accounts</h1>
        <p className="text-muted-foreground mt-1">
          Bulk import debtor accounts from CSV
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-8">
          {!file ? (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Click to upload CSV file</p>
              <p className="text-sm text-muted-foreground mt-1">
                Required columns: account_number, client_name, outstanding_balance, dpd
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {parsedRows.length} rows &middot; {headers.length} columns
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Preview */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Detected Columns:</p>
                <div className="flex flex-wrap gap-1">
                  {headers.map((h) => (
                    <Badge key={h} variant="secondary" className="text-xs">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Data Preview */}
              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      {headers.slice(0, 6).map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                      {headers.length > 6 && (
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          +{headers.length - 6} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        {headers.slice(0, 6).map((h) => (
                          <td key={h} className="px-3 py-2 truncate max-w-[150px]">
                            {row[h] || "-"}
                          </td>
                        ))}
                        {headers.length > 6 && <td className="px-3 py-2">...</td>}
                      </tr>
                    ))}
                    {parsedRows.length > 10 && (
                      <tr className="border-t">
                        <td
                          colSpan={Math.min(headers.length, 6) + 2}
                          className="px-3 py-2 text-center text-muted-foreground"
                        >
                          ... and {parsedRows.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Import Button */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Buckets will be auto-assigned based on DPD values.
                </p>
                <Button onClick={handleImport} disabled={importing || parsedRows.length === 0}>
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {parsedRows.length} Accounts
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={result.success ? "border-green-500/30" : "border-red-500/30"}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              <p className="text-lg font-medium">
                {result.success ? "Import Successful" : "Import Failed"}
              </p>
            </div>
            {result.imported > 0 && (
              <p className="text-sm text-muted-foreground">
                {result.imported} accounts imported successfully.
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">CSV Template</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Download a template CSV with the required columns for importing accounts.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const template =
                "account_number,client_name,client_phone,client_email,product_type,original_amount,outstanding_balance,monthly_payment,currency,dpd,due_date\n" +
                "ACC-2024-100,Sample Client,+971501234567,sample@email.com,personal_loan,50000,45000,2500,AED,45,2024-01-15\n";
              const blob = new Blob([template], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "collections_import_template.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
