import { requireAdmin } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          GridLink operations console preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">Account</CardTitle>
          <CardDescription>Your admin profile details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" defaultValue={profile.fullName ?? ""} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org">Organization</Label>
            <Input id="org" defaultValue={profile.companyName ?? "GridLink"} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">Review notifications</CardTitle>
          <CardDescription>
            Where new application and RFP alerts are delivered.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ops-email">Operations email</Label>
            <Input id="ops-email" defaultValue="ops@gridlink.demo" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-sla">Review SLA (business days)</Label>
            <Input id="review-sla" defaultValue="3" readOnly />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
