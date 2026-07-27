import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_INTEREST_FORMULAS } from "@/lib/mock-data/interest-formulas";
import { FormulaFormDialog } from "@/features/admin/interest-formulas/formula-form-dialog";

export default function InterestFormulasPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These three calculation methods are fixed by the loan engine — only the label and description are editable.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_INTEREST_FORMULAS.map((formula) => (
          <Card key={formula.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{formula.name}</CardTitle>
                <Badge variant="outline" className="font-mono">{formula.code}</Badge>
              </div>
              <CardDescription>{formula.description}</CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter className="justify-end border-t">
              <FormulaFormDialog formula={formula} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
