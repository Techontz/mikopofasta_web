"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UpdateCompanyProfileInputSchema, type CompanyProfile, type UpdateCompanyProfileInput } from "@/types/organization";
import type { Branch } from "@/types/branch";
import { updateCompanyProfile } from "@/features/admin/organization/company-profile-actions";

export function CompanyProfileForm({ profile, branches, canEdit }: { profile: CompanyProfile; branches: Branch[]; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateCompanyProfileInput>({
    resolver: zodResolver(UpdateCompanyProfileInputSchema),
    defaultValues: {
      legalName: profile.legalName,
      tradingName: profile.tradingName,
      registrationNumber: profile.registrationNumber,
      tinNumber: profile.tinNumber,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      headquartersBranchId: profile.headquartersBranchId,
    },
  });

  function onSubmit(values: UpdateCompanyProfileInput) {
    startTransition(async () => {
      const result = await updateCompanyProfile(values);
      if (result.ok) toast.success(result.message ?? "Saved.");
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <CardDescription>Core identity used across statements, receipts, and staff correspondence.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" disabled={!canEdit} {...register("legalName")} />
            {errors.legalName && <p className="text-xs text-destructive">{errors.legalName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tradingName">Trading name</Label>
            <Input id="tradingName" disabled={!canEdit} {...register("tradingName")} />
            {errors.tradingName && <p className="text-xs text-destructive">{errors.tradingName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input id="registrationNumber" disabled={!canEdit} {...register("registrationNumber")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tinNumber">TIN</Label>
            <Input id="tinNumber" disabled={!canEdit} {...register("tinNumber")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" disabled={!canEdit} {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" disabled={!canEdit} {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Registered address</Label>
            <Textarea id="address" disabled={!canEdit} {...register("address")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Headquarters branch</Label>
            <Select
              disabled={!canEdit}
              value={watch("headquartersBranchId")}
              onValueChange={(v) => v && setValue("headquartersBranchId", v, { shouldDirty: true })}
            >
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue>{(v: string) => branches.find((b) => b.id === v)?.name ?? "Select branch"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        {canEdit && (
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
