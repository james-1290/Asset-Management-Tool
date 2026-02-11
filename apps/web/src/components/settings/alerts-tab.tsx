import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  useAlertSettings,
  useUpdateAlertSettings,
  useSendTestEmail,
  useSendAlertsNow,
  useAlertHistory,
} from "@/hooks/use-settings";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const alertsSchema = z.object({
  warrantyEnabled: z.boolean(),
  certificateEnabled: z.boolean(),
  licenceEnabled: z.boolean(),
  thresholds: z.string().min(1, "At least one threshold is required"),
  emailProvider: z.string(),
  smtpHost: z.string(),
  smtpPort: z.number().min(1).max(65535),
  smtpUsername: z.string(),
  smtpPassword: z.string(),
  smtpFromAddress: z.string(),
  graphTenantId: z.string(),
  graphClientId: z.string(),
  graphClientSecret: z.string(),
  graphFromAddress: z.string(),
  slackWebhookUrl: z.string(),
  recipients: z.string(),
  scheduleType: z.string(),
  scheduleTime: z.string(),
  scheduleDay: z.string(),
});

type AlertsFormValues = z.infer<typeof alertsSchema>;

const SCHEDULE_TYPES = [
  { value: "disabled", label: "Disabled" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "every_other_week", label: "Every Other Week" },
  { value: "first_day_of_month", label: "First Day of Month" },
  { value: "first_business_day", label: "First Business Day of Month" },
];

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

export function AlertsTab() {
  const { data: settings, isLoading } = useAlertSettings();
  const updateSettings = useUpdateAlertSettings();
  const sendTestEmail = useSendTestEmail();
  const sendAlertsNow = useSendAlertsNow();
  const [historyPage, setHistoryPage] = useState(0);
  const { data: history } = useAlertHistory(historyPage);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const form = useForm<AlertsFormValues>({
    resolver: zodResolver(alertsSchema),
    defaultValues: {
      warrantyEnabled: true,
      certificateEnabled: true,
      licenceEnabled: true,
      thresholds: "90,30,14,7",
      emailProvider: "smtp",
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      smtpFromAddress: "",
      graphTenantId: "",
      graphClientId: "",
      graphClientSecret: "",
      graphFromAddress: "",
      slackWebhookUrl: "",
      recipients: "",
      scheduleType: "disabled",
      scheduleTime: "09:00",
      scheduleDay: "MONDAY",
    },
  });

  const scheduleType = form.watch("scheduleType");
  const emailProvider = form.watch("emailProvider");
  const showDaySelect = scheduleType === "weekly" || scheduleType === "every_other_week";

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  function onSubmit(values: AlertsFormValues) {
    updateSettings.mutate(values, {
      onSuccess: () => {
        toast.success("Alert settings updated");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update alert settings");
      },
    });
  }

  function handleTestEmail() {
    if (!testEmailAddress) return;
    sendTestEmail.mutate(testEmailAddress, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
        setTestEmailOpen(false);
        setTestEmailAddress("");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to send test email");
      },
    });
  }

  function handleSendNow() {
    sendAlertsNow.mutate(undefined, {
      onSuccess: (result) => {
        if (result.totalAlertsSent === 0) {
          toast.info("No new expiry alerts to send");
        } else {
          toast.success(
            `Sent ${result.totalAlertsSent} alert(s): ${result.warrantyAlerts} warranty, ${result.certificateAlerts} certificate, ${result.licenceAlerts} licence`
          );
        }
      },
      onError: (err) => {
        toast.error(err.message || "Failed to send alerts");
      },
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Expiry Alerts Card */}
        <Card>
          <CardHeader>
            <CardTitle>Expiry Alerts</CardTitle>
            <CardDescription>
              Configure which expiry alerts are enabled and when they trigger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="warrantyEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Warranty Alerts</FormLabel>
                    <FormDescription>Send alerts for expiring warranties</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="certificateEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Certificate Alerts</FormLabel>
                    <FormDescription>Send alerts for expiring certificates</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="licenceEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Licence Alerts</FormLabel>
                    <FormDescription>Send alerts for expiring licences</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thresholds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Thresholds (days)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 90,30,14,7" {...field} />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of days before expiry to send alerts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Schedule Card */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              Configure when alert emails are automatically sent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {scheduleType !== "disabled" && (
              <FormField
                control={form.control}
                name="scheduleTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription>Time of day to send alerts (24h)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showDaySelect && (
              <FormField
                control={form.control}
                name="scheduleDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Email Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>
              Choose an email provider and configure its settings. Leave blank to disable email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="emailProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="graph">Microsoft Graph (Entra ID)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {emailProvider === "graph"
                      ? "Send emails via Microsoft Graph API using an Entra ID Enterprise App"
                      : "Send emails via a traditional SMTP server"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {emailProvider === "smtp" && (
              <>
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpFromAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Address</FormLabel>
                      <FormControl>
                        <Input placeholder="alerts@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {emailProvider === "graph" && (
              <>
                <FormField
                  control={form.control}
                  name="graphTenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant ID</FormLabel>
                      <FormControl>
                        <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormDescription>Entra ID (Azure AD) tenant ID</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="graphClientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormDescription>Enterprise App (application) client ID</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="graphClientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Client secret value" {...field} />
                      </FormControl>
                      <FormDescription>Enterprise App client secret</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="graphFromAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Address</FormLabel>
                      <FormControl>
                        <Input placeholder="alerts@company.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Shared mailbox or user mailbox the app has permission to send as
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="recipients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Recipients</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com, admin@example.com" {...field} />
                  </FormControl>
                  <FormDescription>Comma-separated email addresses</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Slack Card */}
        <Card>
          <CardHeader>
            <CardTitle>Slack</CardTitle>
            <CardDescription>
              Configure a Slack webhook for alert notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-md">
            <FormField
              control={form.control}
              name="slackWebhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://hooks.slack.com/services/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Saving..." : "Save Alert Settings"}
        </Button>
      </form>

      <Separator className="my-6" />

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Test your email configuration or manually trigger alert processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setTestEmailOpen(true)}
          >
            Send Test Email
          </Button>
          <Button
            variant="outline"
            onClick={handleSendNow}
            disabled={sendAlertsNow.isPending}
          >
            {sendAlertsNow.isPending ? "Sending..." : "Send Alerts Now"}
          </Button>
        </CardContent>
      </Card>

      {/* Test Email Dialog */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Enter an email address to send a test email using your current email settings.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="test@example.com"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestEmail}
              disabled={sendTestEmail.isPending || !testEmailAddress}
            >
              {sendTestEmail.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert History */}
      {history && history.items.length > 0 && (
        <>
          <Separator className="my-6" />
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>
                Recent alert emails that have been sent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{item.entityType}</Badge>
                      </TableCell>
                      <TableCell>{item.entityName}</TableCell>
                      <TableCell>{item.thresholdDays} days</TableCell>
                      <TableCell>{formatDate(item.expiryDate)}</TableCell>
                      <TableCell>{formatDate(item.sentAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {history.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {history.page + 1} of {history.totalPages} ({history.totalElements} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={history.page === 0}
                      onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={history.page >= history.totalPages - 1}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Form>
  );
}
