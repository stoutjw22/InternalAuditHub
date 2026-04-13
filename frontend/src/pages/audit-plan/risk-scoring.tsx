import { motion } from 'motion/react';
import { Target, BookOpen, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import {
  useAuditPlanRiskScoring,
  useAuditPlanEffectivenessScale,
} from '@/generated/hooks';

function ScoreCell({ label }: { label: string }) {
  return (
    <TableCell className="text-sm text-muted-foreground max-w-[140px]">
      {label}
    </TableCell>
  );
}

export default function RiskScoringPage() {
  const { data: scoringData, isLoading: scoringLoading } = useAuditPlanRiskScoring();
  const { data: scaleData, isLoading: scaleLoading } = useAuditPlanEffectivenessScale();

  const factors = scoringData?.results ?? [];
  const scale = scaleData?.results ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Risk Scoring Engine</h1>
          <p className="text-sm text-muted-foreground">
            Weighted scoring factors and control effectiveness definitions
          </p>
        </div>
      </div>

      {/* Residual Risk Formula */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Residual Risk Formula
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-base text-foreground">
              Residual Risk = Inherent Risk Score × (1 − Control Effectiveness)
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A control effectiveness of <strong>1.00</strong> (Fully Effective) reduces
              residual risk to zero. A value of <strong>0.00</strong> (No Control) means
              residual risk equals inherent risk.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Scoring Factors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Risk Scoring Factors
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scoringLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : factors.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              No scoring factors loaded. Run{' '}
              <code className="bg-muted px-1 rounded text-xs">python manage.py seed_audit_plan</code>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factor</TableHead>
                  <TableHead className="text-center">Weight</TableHead>
                  <TableHead className="text-center">Score 1</TableHead>
                  <TableHead className="text-center">Score 2</TableHead>
                  <TableHead className="text-center">Score 3</TableHead>
                  <TableHead className="text-center">Score 4</TableHead>
                  <TableHead className="text-center">Score 5</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factors.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.factor}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-bold text-primary text-sm">
                        {f.weight_percent}
                      </span>
                    </TableCell>
                    <ScoreCell label={f.score_1_label} />
                    <ScoreCell label={f.score_2_label} />
                    <ScoreCell label={f.score_3_label} />
                    <ScoreCell label={f.score_4_label} />
                    <ScoreCell label={f.score_5_label} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Control Effectiveness Scale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" /> Control Effectiveness Scale
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scaleLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : scale.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              No scale data. Run{' '}
              <code className="bg-muted px-1 rounded text-xs">python manage.py seed_audit_plan</code>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 text-center">Score</TableHead>
                  <TableHead className="w-44">Label</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead>Typical Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scale.map((s) => {
                  const scoreNum = parseFloat(s.score);
                  const scoreColor =
                    scoreNum >= 0.9 ? 'text-green-600 dark:text-green-400' :
                    scoreNum >= 0.65 ? 'text-lime-600 dark:text-lime-400' :
                    scoreNum >= 0.4 ? 'text-yellow-600 dark:text-yellow-400' :
                    scoreNum >= 0.15 ? 'text-orange-600 dark:text-orange-400' :
                    'text-red-600 dark:text-red-400';
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-center">
                        <span className={`font-mono font-bold text-lg ${scoreColor}`}>
                          {s.score}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{s.label}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.meaning}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.typical_signal}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
