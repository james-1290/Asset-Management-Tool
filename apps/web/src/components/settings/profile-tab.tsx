import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Monitor, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

/**
 * The user's own settings.
 *
 * Name and email are shown but not editable: they come from Microsoft Entra and
 * are re-applied from the sign-in claims on every request, so an edit here would
 * appear to work and then silently revert. The theme is genuinely ours.
 */
const profileSchema = z.object({
  themePreference: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function ProfileTab() {
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const { setTheme: applyTheme } = useTheme();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { themePreference: "system" },
  });

  useEffect(() => {
    if (user) {
      form.reset({ themePreference: user.themePreference ?? "system" });
    }
  }, [user, form]);

  function onProfileSubmit(values: ProfileFormValues) {
    updateProfile.mutate(
      {
        themePreference: values.themePreference === "system" ? null : values.themePreference,
      },
      {
        onSuccess: (updatedUser) => {
          updateUser(updatedUser);
          toast.success("Preferences updated");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update preferences");
        },
      }
    );
  }

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Managed by your organisation in Microsoft Entra.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium">Display name</div>
              <div className="text-sm text-muted-foreground mt-1">{user?.displayName}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Email</div>
              <div className="text-sm text-muted-foreground mt-1">{user?.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Role</div>
              <div className="text-sm text-muted-foreground mt-1">
                {user?.roles?.join(", ") || "None"}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To change your name, email or role, contact your IT administrator — these come
            from your organisation's directory.
          </p>
        </div>
      </section>

      <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">Appearance</h3>
        </div>
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="themePreference"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2">
                      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={field.value === value ? "default" : "outline"}
                          onClick={() => {
                            field.onChange(value);
                            applyTheme(value);
                          }}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {label}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save preferences"}
              </Button>
            </form>
          </Form>
        </div>
      </section>
    </div>
  );
}
