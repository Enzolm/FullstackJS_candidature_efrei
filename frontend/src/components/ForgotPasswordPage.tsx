import { useState } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, KeyRound, Lock, Mail } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "@/hooks/auth/useAuth"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [success, setSuccess] = useState("")
  const { resetPassword, isLoading, error } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccess("")

    if (newPassword !== confirmPassword) {
      return
    }

    try {
      await resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      })
    } catch {
      return
    }
    setSuccess("Votre mot de passe a été réinitialisé.")
    window.setTimeout(() => navigate("/login"), 1200)
  }

  const passwordsDoNotMatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f7f5f0] p-4 font-sans text-[#192e28]">
      <div className="pointer-events-none absolute -top-24 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-[#1e463e]/5 blur-3xl" />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-14 items-center justify-center rounded-2xl bg-[#1e463e] text-2xl font-bold text-[#f7f5f0] shadow-md">
            T
            <span className="absolute -top-1 -right-1 size-4 rounded-full border-2 border-[#f7f5f0] bg-[#d96c4a]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Réinitialiser le mot de passe
          </h1>
          <p className="text-xs text-[#6b7c77] sm:text-sm">
            Utilisez le code de démonstration pour définir un nouveau mot de passe.
          </p>
        </header>

        <section className="space-y-5 rounded-2xl border border-[#ddd8ce] bg-[#fcfaf7] p-6 shadow-sm sm:p-8">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
          {passwordsDoNotMatch && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>Les mots de passe ne correspondent pas.</span>
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
              {success}
            </div>
          )}

          <div className="rounded-xl border border-[#eae5da] bg-[#f7f5f0] p-3 text-xs text-[#4a5d57]">
            Code de démonstration :{" "}
            <strong className="text-[#1e463e]">123456</strong>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              id="reset-email"
              label="Adresse email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="votre.mail@exemple.fr"
              icon={<Mail className="size-4" />}
            />
            <Field
              id="reset-code"
              label="Code de réinitialisation"
              value={code}
              onChange={setCode}
              placeholder="123456"
              icon={<KeyRound className="size-4" />}
            />
            <Field
              id="new-password"
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="••••••••"
              icon={<Lock className="size-4" />}
            />
            <Field
              id="confirm-new-password"
              label="Confirmer le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              icon={<Lock className="size-4" />}
            />
            <button
              type="submit"
              disabled={isLoading || passwordsDoNotMatch}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e463e] px-4 py-3.5 text-sm font-bold text-[#f7f5f0] transition hover:bg-[#16352f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <span>Réinitialiser le mot de passe</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </section>

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-center text-xs font-bold text-[#d96c4a] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Retour à la connexion
        </Link>
      </div>
    </main>
  )
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  icon: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-bold tracking-wider text-[#1e463e] uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8b9b95]">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required
          minLength={type === "password" ? 8 : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#ddd8ce] bg-white py-3 pr-4 pl-10 text-sm text-[#192e28] placeholder-[#a0b0aa] transition focus:border-transparent focus:ring-2 focus:ring-[#1e463e] focus:outline-none"
        />
      </div>
    </div>
  )
}
