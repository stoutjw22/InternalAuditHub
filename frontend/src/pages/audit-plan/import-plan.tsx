import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import { Upload, FileText, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { currentUserAtom } from '@/lib/auth';
import { useAuditPlanBulkImport } from '@/generated/hooks';
import type { BulkImportResult } from '@/generated/models/audit-plan';

const ALLOWED_TYPES = [
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function ResultRow({ label, created, updated }: { label: string; created: number; updated: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-600 dark:text-green-400">{created} created</span>
        <span className="text-blue-600 dark:text-blue-400">{updated} updated</span>
      </div>
    </div>
  );
}

export default function ImportPlanPage() {
  const [user] = useAtom(currentUserAtom);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<object | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { mutate: runImport, isPending: importing } = useAuditPlanBulkImport();

  const isAuthorized = user?.role === 'admin' || user?.role === 'audit_manager';

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(null);
    setParseError(null);
    setImportResult(null);
    setConfirmed(false);

    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          setPreview(parsed);
        } catch {
          setParseError('Invalid JSON — please check your file format.');
        }
      };
      reader.readAsText(file);
    }
  }

  function handleValidate() {
    if (!selectedFile) return;
    if (!preview) {
      setParseError('Only JSON files can be validated client-side. For .xlsx files, click "Confirm Import" directly.');
      return;
    }
    toast.success('JSON validated successfully — ready to import.');
    setConfirmed(true);
  }

  function handleConfirmImport() {
    if (!selectedFile) return;

    if (preview) {
      runImport(preview, {
        onSuccess: (result) => {
          setImportResult(result);
          toast.success('Import complete!');
        },
        onError: () => {
          toast.error('Import failed — check the server response.');
        },
      });
    } else {
      // For xlsx: send as FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      runImport(formData, {
        onSuccess: (result) => {
          setImportResult(result);
          toast.success('Import complete!');
        },
        onError: () => {
          toast.error('Import failed — check the server response.');
        },
      });
    }
  }

  if (!isAuthorized) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-red-300/40">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
            <p className="text-muted-foreground mt-2">
              Only Admin and Audit Manager roles can access the Import Plan page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Audit Plan</h1>
          <p className="text-sm text-muted-foreground">
            Bulk-import entities, controls, and plan years from a JSON or XLSX file
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="border-blue-300/30 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> Import Format
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The import endpoint accepts a JSON payload with the following top-level keys:</p>
          <pre className="bg-muted rounded p-3 text-xs overflow-auto">{`{
  "entities":       [ { "au_id": "AU-001", "name": "...", ... } ],
  "plan_years":     [ { "au": <id>, "fiscal_year": 2026, ... } ],
  "controls":       [ { "control_id": "CTL-001", ... } ],
  "grc_themes":     [ { "sub_theme_code": "GOV-1.1", ... } ],
  "mar_engagements":[ { "fiscal_year": 2031, "mar_test_area": "...", ... } ]
}`}</pre>
          <p>
            Existing records are matched by natural key (<code>au_id</code>, <code>control_id</code>,
            etc.) and updated. New records are created. The operation is atomic — if any record
            fails validation the entire import rolls back.
          </p>
          <p>
            Accepted file types: <strong>.json</strong> (client-side preview available) or{' '}
            <strong>.xlsx</strong> (direct upload, no preview).
          </p>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              {selectedFile ? selectedFile.name : 'Click to select a .json or .xlsx file'}
            </p>
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          {parseError && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 rounded p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {parseError}
            </div>
          )}

          {preview && !parseError && (
            <div className="bg-muted rounded p-3">
              <p className="text-xs font-medium text-foreground mb-1">Preview (JSON structure)</p>
              <pre className="text-xs text-muted-foreground overflow-auto max-h-48">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(preview as Record<string, unknown[]>).map(([k, v]) => [
                      k,
                      Array.isArray(v) ? `[${v.length} records]` : v,
                    ]),
                  ),
                  null,
                  2,
                )}
              </pre>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={!selectedFile || importing}
              onClick={handleValidate}
            >
              Validate
            </Button>
            <Button
              disabled={!selectedFile || importing || (!confirmed && !!preview)}
              onClick={handleConfirmImport}
              className="gap-2"
            >
              {importing && <Spinner />}
              Confirm Import
            </Button>
          </div>
          {preview && !confirmed && (
            <p className="text-xs text-muted-foreground">
              Click <strong>Validate</strong> first, then <strong>Confirm Import</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import result */}
      {importResult && (
        <Card className="border-green-300/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResultRow
              label="Auditable Entities"
              created={importResult.results.entities.created}
              updated={importResult.results.entities.updated}
            />
            <ResultRow
              label="Plan Years"
              created={importResult.results.plan_years.created}
              updated={importResult.results.plan_years.updated}
            />
            <ResultRow
              label="Key Controls"
              created={importResult.results.controls.created}
              updated={importResult.results.controls.updated}
            />
            <ResultRow
              label="GRC Themes"
              created={importResult.results.grc_themes.created}
              updated={importResult.results.grc_themes.updated}
            />
            <ResultRow
              label="MAR Engagements"
              created={importResult.results.mar_engagements.created}
              updated={importResult.results.mar_engagements.updated}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
