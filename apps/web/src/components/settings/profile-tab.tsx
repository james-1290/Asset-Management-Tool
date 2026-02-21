import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Monitor, Sun, Moon, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useChangePassword } from "@/hooks/use-profile";
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

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(200),
  email: z.string().email("Invalid email address"),
  themePreference: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

function PasswordInput({
  placeholder,
  ...props
}: React.ComponentProps<typeof Input> & { placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} placeholder={placeholder} {...props} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ProfileTab() {
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const isSsoUser = !!user?.authProvider && user.authProvider !== "LOCAL";

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      email: "",
      themePreference: "system",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName,
        email: user.email,
        themePreference: user.themePreference ?? "system",
      });
    }
  }, [user, form]);

  function onProfileSubmit(values: ProfileFormValues) {
    updateProfile.mutate(
      {
        displayName: values.displayName,
        email: values.email,
        themePreference: values.themePreference === "system" ? null : values.themePreference,
      },
      {
        onSuccess: (updatedUser) => {
          updateUser(updatedUser);
          toast.success("Profile updated");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update profile");
        },
      }
    );
  }

  function onPasswordSubmit(values: PasswordFormValues) {
    changePassword.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          passwordForm.reset();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to change password");
        },
      }
    );
  }

  return (
    <div className="space-y-8">
      {/* General Profile Card */}
      <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">General Profile</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isSsoUser
              ? "Your name and email are managed by your identity provider."
              : "Manage your public information and account identification."}
          </p>
        </div>
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
              {/* Name + Email side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSsoUser} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={isSsoUser} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Appearance theme picker */}
              <FormField
                control={form.control}
                name="themePreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appearance</FormLabel>
                    <div className="grid grid-cols-3 gap-4 pt-1">
                      {THEME_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = field.value === opt.value;
                        return (
                          <label key={opt.value} className="cursor-pointer group">
                            <input
                              type="radio"
                              className="hidden"
                              name="theme"
                              value={opt.value}
                              checked={isSelected}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <div
                              className={[
                                "border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50",
                                opt.value === "dark" ? "bg-slate-900" : "bg-card",
                              ].join(" ")}
                            >
                              <Icon
                                className={[
                                  "h-5 w-5",
                                  isSelected
                                    ? "text-primary"
                                    : opt.value === "dark"
                                      ? "text-slate-400"
                                      : "text-muted-foreground group-hover:text-primary",
                                ].join(" ")}
                              />
                              <span
                                className={[
                                  "text-xs font-semibold",
                                  opt.value === "dark" && !isSelected
                                    ? "text-slate-400"
                                    : "",
                                ].join(" ")}
                              >
                                {opt.label}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Save button */}
              <div className="pt-4 border-t flex justify-end">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save Profile Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>

      {/* Security & Password Card */}
      {!isSsoUser && (
        <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold">Security & Password</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Update your password to keep your account secure.
            </p>
          </div>
          <div className="p-6">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <div className="space-y-4 max-w-md">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="Min. 8 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="Repeat new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button type="submit" disabled={changePassword.isPending}>
                    {changePassword.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </section>
      )}

      {/* Two-Factor Authentication Card */}
      <section className="bg-card rounded-xl border overflow-hidden shadow-sm opacity-80">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add an extra layer of security to your account.
            </p>
          </div>
          <Button variant="outline" disabled>
            <Shield className="mr-2 h-4 w-4" />
            Configure 2FA
          </Button>
        </div>
      </section>
    </div>
  );
}
