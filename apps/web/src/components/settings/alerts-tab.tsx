import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  MessageSquare,
  History,
  Download,
  Send,
  Eye,
  Shield,
  Key,
  Ticket,
} from "lucide-react";
import {
  useAlertSettings,
  useUpdateAlertSettings,
  useSendTestEmail,
  useSendTestSlack,
  useSendAlertsNow,
  useAlertHistory,
} from "@/hooks/use-settings";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { Textarea } from "@/components/ui/textarea";

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
  slackWarrantyWebhookUrl: z.string(),
  slackCertificateWebhookUrl: z.string(),
  slackLicenceWebhookUrl: z.string(),
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
  { value: "every_other_week", label: "Bi-Weekly" },
  { value: "first_day_of_month", label: "First Day of Month" },
  { value: "first_business_day", label: "First Business Day" },
];

const TIME_OPTIONS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(displayHour).padStart(2, "0")}:${m} ${ampm}`;
}

export function AlertsTab() {
  const { data: settings, isLoading } = useAlertSettings();
  const updateSettings = useUpdateAlertSettings();
  const sendTestEmail = useSendTestEmail();
  const sendTestSlack = useSendTestSlack();
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
      slackWarrantyWebhookUrl: "",
      slackCertificateWebhookUrl: "",
      slackLicenceWebhookUrl: "",
      recipients: "",
      scheduleType: "disabled",
      scheduleTime: "09:00",
      scheduleDay: "MONDAY",
    },
  });

  const emailProvider = form.watch("emailProvider");
  const slackWebhookUrl = form.watch("slackWebhookUrl");

  useEffect(() => {
    if (settings) {
      form.reset({
        ...settings,
        smtpPassword: settings.smtpPassword === "********" ? "" : settings.smtpPassword,
        graphClientSecret: settings.graphClientSecret === "********" ? "" : settings.graphClientSecret,
        slackWebhookUrl: settings.slackWebhookUrl?.endsWith("...") ? "" : settings.slackWebhookUrl,
        slackWarrantyWebhookUrl: settings.slackWarrantyWebhookUrl?.endsWith("...") ? "" : (settings.slackWarrantyWebhookUrl ?? ""),
        slackCertificateWebhookUrl: settings.slackCertificateWebhookUrl?.endsWith("...") ? "" : (settings.slackCertificateWebhookUrl ?? ""),
        slackLicenceWebhookUrl: settings.slackLicenceWebhookUrl?.endsWith("...") ? "" : (settings.slackLicenceWebhookUrl ?? ""),
      });
    }
  }, [settings, form]);

  function onSubmit(values: AlertsFormValues) {
    updateSettings.mutate(values, {
      onSuccess: () => toast.success("Alert settings updated"),
      onError: (err) => toast.error(err.message || "Failed to update alert settings"),
    });
  }

  function handleTestEmail() {
    if (!testEmailAddress) return;
    sendTestEmail.mutate(testEmailAddress, {
      onSuccess: (result) => {
        if (result.success) toast.success(result.message);
        else toast.error(result.message);
        setTestEmailOpen(false);
        setTestEmailAddress("");
      },
      onError: (err) => toast.error(err.message || "Failed to send test email"),
    });
  }

  function handleSendNow() {
    sendAlertsNow.mutate(undefined, {
      onSuccess: (result) => {
        if (result.totalAlertsSent === 0) toast.info("No new expiry alerts to send");
        else toast.success(`Sent ${result.totalAlertsSent} alert(s): ${result.warrantyAlerts} warranty, ${result.certificateAlerts} certificate, ${result.licenceAlerts} licence`);
      },
      onError: (err) => toast.error(err.message || "Failed to send alerts"),
    });
  }

  function handleTestSlack() {
    sendTestSlack.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) toast.success(result.message);
        else toast.error(result.message);
      },
      onError: (err) => toast.error(err.message || "Failed to send test Slack message"),
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

  function formatShortDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Config (2/3 width) */}
          <div className="xl:col-span-2 space-y-8">
            {/* Expiry & Schedule Card */}
            <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
              <div className="p-6 border-b flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Expiry & Schedule</h2>
              </div>
              <div className="p-6 space-y-8">
                {/* Toggle switches */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="warrantyEnabled"
                    render={({ field }) => (
                      <label className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer border border-transparent hover:border-primary/20 transition-all">
                        <span className="text-sm font-semibold">Warranty Expiry</span>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </label>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="certificateEnabled"
                    render={({ field }) => (
                      <label className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer border border-transparent hover:border-primary/20 transition-all">
                        <span className="text-sm font-semibold">Certificate Expiry</span>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </label>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licenceEnabled"
                    render={({ field }) => (
                      <label className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer border border-transparent hover:border-primary/20 transition-all">
                        <span className="text-sm font-semibold">Licence Expiry</span>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </label>
                    )}
                  />
                </div>

                {/* Thresholds + Frequency + Time — all inline */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-6 items-start">
                  <FormField
                    control={form.control}
                    name="thresholds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">Alert Thresholds (Days)</FormLabel>
                        <FormControl>
                          <Input placeholder="90, 60, 30, 15, 7, 1" {...field} />
                        </FormControl>
                        <p className="text-[11px] text-muted-foreground">
                          Comma-separated list of days before expiry to trigger alerts.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                      control={form.control}
                      name="scheduleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold">Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
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
                    <FormField
                      control={form.control}
                      name="scheduleTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold">Time</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {formatTimeLabel(t)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
              </div>
            </section>

            {/* Email + Slack side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Email (SMTP) Card */}
              <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Email (SMTP)</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestEmailOpen(true)}
                    className="text-primary text-xs font-bold hover:underline"
                  >
                    Send Test Email
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {emailProvider === "smtp" && (
                    <>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 space-y-1">
                          <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                            SMTP Host
                          </label>
                          <FormField
                            control={form.control}
                            name="smtpHost"
                            render={({ field }) => (
                              <FormControl>
                                <Input className="bg-muted/50" placeholder="smtp.office365.com" {...field} />
                              </FormControl>
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                            Port
                          </label>
                          <FormField
                            control={form.control}
                            name="smtpPort"
                            render={({ field }) => (
                              <FormControl>
                                <Input
                                  className="bg-muted/50"
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                />
                              </FormControl>
                            )}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                          Username
                        </label>
                        <FormField
                          control={form.control}
                          name="smtpUsername"
                          render={({ field }) => (
                            <FormControl>
                              <Input className="bg-muted/50" placeholder="alerts@company.com" {...field} />
                            </FormControl>
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                          Password
                        </label>
                        <FormField
                          control={form.control}
                          name="smtpPassword"
                          render={({ field }) => (
                            <FormControl>
                              <Input className="bg-muted/50" type="password" placeholder="Leave blank to keep current" {...field} />
                            </FormControl>
                          )}
                        />
                      </div>
                    </>
                  )}
                  {emailProvider === "graph" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Tenant ID</label>
                        <FormField control={form.control} name="graphTenantId" render={({ field }) => (<FormControl><Input className="bg-muted/50" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} /></FormControl>)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Client ID</label>
                        <FormField control={form.control} name="graphClientId" render={({ field }) => (<FormControl><Input className="bg-muted/50" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} /></FormControl>)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Client Secret</label>
                        <FormField control={form.control} name="graphClientSecret" render={({ field }) => (<FormControl><Input className="bg-muted/50" type="password" placeholder="Leave blank to keep current" {...field} /></FormControl>)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">From Address</label>
                        <FormField control={form.control} name="graphFromAddress" render={({ field }) => (<FormControl><Input className="bg-muted/50" placeholder="alerts@company.com" {...field} /></FormControl>)} />
                      </div>
                    </>
                  )}
                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                      Alert Recipients (one per line)
                    </label>
                    <FormField
                      control={form.control}
                      name="recipients"
                      render={({ field }) => (
                        <FormControl>
                          <Textarea
                            className="bg-muted/50"
                            rows={3}
                            placeholder={"it-ops@company.com\nadmin@company.com"}
                            {...field}
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                </div>
              </section>

              {/* Slack Integration Card */}
              <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Slack Integration</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestSlack}
                    disabled={sendTestSlack.isPending || !slackWebhookUrl}
                    className="text-primary text-xs font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendTestSlack.isPending ? "Sending..." : "Send Test Slack"}
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                      Webhook URL
                    </label>
                    <FormField
                      control={form.control}
                      name="slackWebhookUrl"
                      render={({ field }) => (
                        <FormControl>
                          <Input className="bg-muted/50" placeholder="https://hooks.slack.com/services/..." {...field} />
                        </FormControl>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                      Warranties Channel
                    </label>
                    <FormField
                      control={form.control}
                      name="slackWarrantyWebhookUrl"
                      render={({ field }) => (
                        <FormControl>
                          <Input className="bg-muted/50" placeholder="#it-alerts-warranties" {...field} />
                        </FormControl>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                      Certificates Channel
                    </label>
                    <FormField
                      control={form.control}
                      name="slackCertificateWebhookUrl"
                      render={({ field }) => (
                        <FormControl>
                          <Input className="bg-muted/50" placeholder="#it-alerts-certs" {...field} />
                        </FormControl>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                      Licences Channel
                    </label>
                    <FormField
                      control={form.control}
                      name="slackLicenceWebhookUrl"
                      render={({ field }) => (
                        <FormControl>
                          <Input className="bg-muted/50" placeholder="#it-alerts-licensing" {...field} />
                        </FormControl>
                      )}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Alert History Card */}
            {history && history.items.length > 0 && (
              <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Alert History</h2>
                  </div>
                  <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium">
                    <Download className="h-4 w-4" />
                    Export Logs
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Type</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Name</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Threshold</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Expiry Date</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.items.map((item) => {
                        const typeStyles: Record<string, { bg: string; text: string; icon: typeof Shield }> = {
                          WARRANTY: { bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", icon: Shield },
                          CERTIFICATE: { bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400", icon: Key },
                          LICENCE: { bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800", text: "text-purple-700 dark:text-purple-400", icon: Ticket },
                        };
                        const style = typeStyles[item.entityType] ?? typeStyles.WARRANTY;
                        const Icon = style.icon;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text}`}>
                                <Icon className="h-3.5 w-3.5" />
                                {item.entityType === "LICENCE" ? "Licence" : item.entityType === "CERTIFICATE" ? "Certificate" : "Warranty"}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-sm">{item.entityName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.thresholdDays} Days</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatShortDate(item.expiryDate)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(item.sentAt)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {history.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {history.page + 1} of {history.totalPages} ({history.totalElements} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={history.page === 0}
                        onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
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
              </section>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-8">
            {/* Summary Card */}
            <section className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="font-bold mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Active Monitoring</span>
                  <span className="text-sm font-bold text-emerald-600">Online</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Next Scheduled Scan</span>
                  <span className="text-sm font-bold">Tomorrow 08:00</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Alerts Sent (30d)</span>
                  <span className="text-sm font-bold">{history?.totalElements ?? 0}</span>
                </div>
              </div>
            </section>

            {/* Manual Operations Card */}
            <section className="bg-primary/5 rounded-xl border border-primary/20 p-6">
              <h2 className="font-bold text-primary mb-4">Manual Operations</h2>
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleSendNow}
                  disabled={sendAlertsNow.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendAlertsNow.isPending ? "Sending..." : "Send Alerts Now"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Daily Report
                </Button>
              </div>
            </section>

            {/* Save Button (sticky on sidebar) */}
            <Button
              type="submit"
              className="w-full"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving..." : "Save Alert Settings"}
            </Button>
          </div>
        </div>
      </form>

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
    </Form>
  );
}
