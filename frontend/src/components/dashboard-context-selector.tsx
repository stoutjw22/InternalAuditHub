import { useMemo, useState } from "react";
import { Filter, X, Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AuditEngagement, AuditUser, EngagementAuditor } from "@/generated/models";

interface DashboardContextSelectorProps {
  /** All engagements available for selection. */
  engagements: AuditEngagement[];
  /** All auditors available for filtering. */
  auditors: AuditUser[];
  /** All engagement-auditor assignments (used to scope auditor list). */
  engagementAuditors: EngagementAuditor[];
  /** Currently selected engagement ID, or null for all. */
  selectedEngagement: string | null;
  /** Currently selected auditor IDs. */
  selectedAuditors: string[];
  /** Called when the engagement selection changes. */
  onEngagementChange: (id: string | null) => void;
  /** Called when the auditor selection changes. */
  onAuditorsChange: (ids: string[]) => void;
}

export function DashboardContextSelector({
  engagements,
  auditors,
  engagementAuditors,
  selectedEngagement,
  selectedAuditors,
  onEngagementChange,
  onAuditorsChange,
}: DashboardContextSelectorProps) {
  const [auditorPopoverOpen, setAuditorPopoverOpen] = useState(false);

  // When an engagement is selected, narrow the auditor list to those assigned to it.
  const availableAuditors = useMemo(() => {
    if (!selectedEngagement) return auditors;
    const assignedIds = new Set(
      engagementAuditors
        .filter(ea => ea.auditengagement?.id === selectedEngagement)
        .map(ea => ea.audituser?.id)
        .filter(Boolean)
    );
    return auditors.filter(a => assignedIds.has(a.id));
  }, [auditors, engagementAuditors, selectedEngagement]);

  const selectedEngagementObj = engagements.find(e => e.id === selectedEngagement);

  function toggleAuditor(id: string) {
    if (selectedAuditors.includes(id)) {
      onAuditorsChange(selectedAuditors.filter(a => a !== id));
    } else {
      onAuditorsChange([...selectedAuditors, id]);
    }
  }

  function clearAll() {
    onEngagementChange(null);
    onAuditorsChange([]);
  }

  const hasActiveFilters = !!selectedEngagement || selectedAuditors.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-xl border">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span>Context</span>
      </div>

      {/* Engagement selector */}
      <Select
        value={selectedEngagement ?? "all"}
        onValueChange={v => onEngagementChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-56 h-8 text-sm bg-background">
          <SelectValue placeholder="All engagements" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All engagements</SelectItem>
          {engagements.map(e => (
            <SelectItem key={e.id} value={e.id}>
              {e.engagementname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Auditor multi-select */}
      <Popover open={auditorPopoverOpen} onOpenChange={setAuditorPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-sm gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            {selectedAuditors.length === 0
              ? "All auditors"
              : `${selectedAuditors.length} auditor${selectedAuditors.length !== 1 ? "s" : ""}`}
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              {selectedEngagement
                ? `Auditors on "${selectedEngagementObj?.engagementname}"`
                : "All auditors"}
            </p>
            {availableAuditors.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">
                {selectedEngagement ? "No auditors assigned to this engagement." : "No auditors available."}
              </p>
            ) : (
              availableAuditors.map(auditor => (
                <div
                  key={auditor.id}
                  className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted cursor-pointer"
                  onClick={() => toggleAuditor(auditor.id)}
                >
                  <Checkbox
                    id={`auditor-${auditor.id}`}
                    checked={selectedAuditors.includes(auditor.id)}
                    onCheckedChange={() => toggleAuditor(auditor.id)}
                  />
                  <Label
                    htmlFor={`auditor-${auditor.id}`}
                    className="text-sm cursor-pointer leading-none"
                  >
                    {auditor.auditusername}
                  </Label>
                </div>
              ))
            )}
            {selectedAuditors.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs text-muted-foreground"
                onClick={() => onAuditorsChange([])}
              >
                Clear auditor filter
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {selectedEngagement && (
        <Badge variant="secondary" className="gap-1 text-xs h-6">
          {selectedEngagementObj?.engagementname ?? "Engagement"}
          <button
            onClick={() => {
              onEngagementChange(null);
              // Also clear auditors that may no longer be relevant
              onAuditorsChange([]);
            }}
            className="ml-0.5 hover:text-destructive transition-colors"
            aria-label="Clear engagement filter"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
      {selectedAuditors.map(id => {
        const auditor = auditors.find(a => a.id === id);
        if (!auditor) return null;
        return (
          <Badge key={id} variant="outline" className="gap-1 text-xs h-6">
            {auditor.auditusername}
            <button
              onClick={() => toggleAuditor(id)}
              className="ml-0.5 hover:text-destructive transition-colors"
              aria-label={`Remove ${auditor.auditusername} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        );
      })}

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={clearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
