import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAlertSettings, useUpdateAlertSettings } from "@/hooks/use-settings";
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

const alertsSchema = z.object({
  warrantyEnabled: z.boolean(),
  certificateEnabled: z.boolean(),
  licenceEnabled: z.boolean(),
  thresholds: z.string().min(1, "At least one threshold is required"),
  smtpHost: z.string(),
  smtpPort: z.number().min(1).max(65535),
  smtpUsername: z.string(),
  smtpPassword: z.string(),
  smtpFromAddress: z.string(),
  slackWebhookUrl: z.string(),
  recipients: z.string(),
});

type AlertsFormValues = z.infer<typeof alertsSchema>;

export function AlertsTab() {
  const { data: settings, isLoading } = useAlertSettings();
  const updateSettings = useUpdateAlertSettings();

  const form = useForm<AlertsFormValues>({
    resolver: zodResolver(alertsSchema),
    defaultValues: {
      warrantyEnabled: true,
      certificateEnabled: true,
      licenceEnabled: true,
      thresholds: "90,30,14,7",
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      smtpFromAddress: "",
      slackWebhookUrl: "",
      recipients: "",
    },
  });

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

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Email (SMTP)</CardTitle>
            <CardDescription>
              Configure SMTP settings for email alerts. Leave blank to disable email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
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
    </Form>
  );
}
