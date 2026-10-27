import { useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "@/hooks/auth/useAuth"

export type LoginPayload = {
  email: string
  rememberMe: boolean
}

type LoginPageProps = {
  onLogin?: (payload: LoginPayload) => void
  onNavigateToRegister?: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login, isLoading, error: authError } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await login({ email: email.trim(), password }, rememberMe)
    onLogin?.({ email: email.trim(), rememberMe })
    navigate("/")
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f7f5f0] p-4 font-sans text-[#192e28] select-none">
      <div className="pointer-events-none absolute -top-24 left-1/2 z-0 size-[600px] -translate-x-1/2 rounded-full bg-[#1e463e]/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-14 items-center justify-center rounded-2xl bg-[#1e463e] text-2xl font-bold text-[#f7f5f0] shadow-md">
            T
            <span className="absolute -top-1 -right-1 size-4 rounded-full border-2 border-[#f7f5f0] bg-[#d96c4a]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#192e28]">
            Bienvenue sur TrackMyApply
          </h1>
          <p className="text-xs text-[#6b7c77] sm:text-sm">
            Connectez-vous pour piloter vos candidatures et votre recherche
            d&apos;alternance.
          </p>
        </header>

        <section className="space-y-6 rounded-2xl border border-[#ddd8ce] bg-[#fcfaf7] p-6 shadow-sm sm:p-8">
          {authError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-bold tracking-wider text-[#1e463e] uppercase"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#8b9b95]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="votre.mail@exemple.fr"
                  className="w-full rounded-xl border border-[#ddd8ce] bg-white py-3 pr-4 pl-11 text-sm text-[#192e28] placeholder-[#a0b0aa] transition focus:border-transparent focus:ring-2 focus:ring-[#1e463e] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold tracking-wider text-[#1e463e] uppercase"
                >
                  Mot de passe
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#d96c4a] hover:underline"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#8b9b95]" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#ddd8ce] bg-white py-3 pr-11 pl-11 text-sm text-[#192e28] placeholder-[#a0b0aa] transition focus:border-transparent focus:ring-2 focus:ring-[#1e463e] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-lg p-1 text-[#8b9b95] transition hover:text-[#1e463e]"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 pt-1 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-4 cursor-pointer rounded border-[#ddd8ce] accent-[#1e463e] focus:ring-[#1e463e]"
              />
              <span className="text-xs font-medium text-[#6b7c77]">
                Maintenir ma session active
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e463e] px-4 py-3.5 text-sm font-bold text-[#f7f5f0] shadow-sm transition-all hover:bg-[#16352f] active:bg-[#0f2621] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span
                  className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-label="Connexion en cours"
                />
              ) : (
                <>
                  <span>Accéder à mon espace</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-[#eae5da]" />
            <span className="absolute bg-[#fcfaf7] px-3 text-[10px] font-bold tracking-wider text-[#8b9b95] uppercase">
              Authentification sécurisée JWT
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#eae5da] bg-[#f7f5f0] p-3 text-xs text-[#4a5d57]">
            <ShieldCheck className="size-5 shrink-0 text-[#16a34a]" />
            <span>
              Isolation stricte : vos candidatures et CV restent 100% privés.
            </span>
          </div>
        </section>

        <p className="text-center text-xs text-[#6b7c77]">
          Pas encore de compte ?{" "}
          <Link
            to="/register"
            className="cursor-pointer font-bold text-[#d96c4a] hover:underline"
          >
            Créer mon espace TrackMyApply
          </Link>
        </p>
      </div>
    </main>
  )
}
