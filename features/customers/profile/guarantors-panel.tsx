"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { GUARANTOR_RELATIONSHIPS, type GuarantorRelationship } from "@/types/enums";
import { addGuarantor, removeGuarantor } from "@/features/customers/actions";
import type { Guarantor } from "@/types/guarantor";

const EMPTY = { name: "", phone: "", nidaNumber: "", relationship: "relative" as GuarantorRelationship, address: "", occupation: "" };

export function GuarantorsPanel({ customerId, guarantors }: { customerId: string; guarantors: Guarantor[] }) {
  const [form, setForm] = React.useState(EMPTY);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await addGuarantor(customerId, {
        name: form.name,
        phone: form.phone,
        nidaNumber: form.nidaNumber || null,
        relationship: form.relationship,
        address: form.address || null,
        occupation: form.occupation || null,
      });
      if (result.ok) {
        toast.success(result.message);
        setForm(EMPTY);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Relationship</Label>
          <Select value={form.relationship} onValueChange={(v) => v && setForm({ ...form, relationship: v as GuarantorRelationship })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GUARANTOR_RELATIONSHIPS.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>NIDA Number (optional)</Label>
          <Input value={form.nidaNumber} onChange={(e) => setForm({ ...form, nidaNumber: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Occupation (optional)</Label>
          <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Address (optional)</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="button" onClick={handleAdd} disabled={pending || !form.name || !form.phone}>
            <Plus className="size-4" />
            Add Guarantor
          </Button>
        </div>
      </div>

      {guarantors.length === 0 ? (
        <EmptyState icon={Users} title="No guarantors on file" />
      ) : (
        <ul className="space-y-2">
          {guarantors.map((g) => (
            <li key={g.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {g.relationship} · {g.phone}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => removeGuarantor(g.id, customerId)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
