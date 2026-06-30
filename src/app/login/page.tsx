"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "login" | "signup";

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return "Correo o contraseña incorrectos. Verifica tus datos.";
  }
  if (m.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
  }
  if (m.includes("user already registered")) {
    return "Este correo ya está registrado. Inicia sesión en su lugar.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "El correo ingresado no es válido. Usa un correo real (ej: nombre@gmail.com) ya que necesitamos enviar un mensaje de confirmación.";
  }
  if (m.includes("password") && m.includes("short")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("email rate limit")) {
    return "Demasiados intentos de registro. Supabase limita los correos enviados por hora. Espera 10 minutos e intenta de nuevo, o usa otro correo electrónico.";
  }
  return msg;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateAuthError(error.message));
      } else {
        router.push(returnTo);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(translateAuthError(error.message));
      } else {
        setMessage("¡Listo! Revisa tu correo electrónico para confirmar tu cuenta y luego inicia sesión.");
        setMode("login");
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MapPin className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LatamEasy</h1>
          <p className="text-sm text-muted-foreground">Clientes latinos en Estados Unidos</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "login" ? "Inicia sesión en tu cuenta" : "Crea tu cuenta"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Ingresa tus credenciales para acceder al dashboard"
                : "Completa tus datos para comenzar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">
                    Usa un correo real — te enviaremos un enlace de confirmación.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  {message}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Cargando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                    className="font-medium text-primary hover:underline"
                  >
                    Regístrate
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                    className="font-medium text-primary hover:underline"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
