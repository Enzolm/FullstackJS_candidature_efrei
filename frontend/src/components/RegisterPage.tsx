import { useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react"
import { Link } from "react-router"

export type RegisterPayload = {
  firstName: string
  lastName: string
  email: string
  targetRole: string
}

type RegisterPageProps = {
  onRegister?: (payload: RegisterPayload) => void
  onNavigateToLogin?: () => void
}

export function RegisterPage({
  onRegister,
  onNavigateToLogin,
}: RegisterPageProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    targetRole: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const updateField = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }))
    if (error) setError("")
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }
    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (!formData.acceptTerms) {
      setError("Veuillez accepter les conditions d’utilisation.")
      return
    }

    setIsLoading(true)
    window.setTimeout(() => {
      setIsLoading(false)
      onRegister?.({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        targetRole: formData.targetRole.trim(),
      })
    }, 1200)
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f7f5f0] px-4 py-10 font-sans text-[#192e28]">
      <div className="pointer-events-none absolute -top-24 left-1/2 z-0 size-[650px] -translate-x-1/2 rounded-full bg-[#1e463e]/5 blur-3xl" />
      <div className="relative z-10 w-full max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-14 items-center justify-center rounded-2xl bg-[#1e463e] text-2xl font-bold text-[#f7f5f0] shadow-md">
            T
            <span className="absolute -top-1 -right-1 size-4 rounded-full border-2 border-[#f7f5f0] bg-[#d96c4a]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#192e28]">
            Créer votre espace
          </h1>
          <p className="text-xs text-[#6b7c77] sm:text-sm">
            Centralisez vos candidatures, vos documents et vos relances en un
            seul endroit.
          </p>
        </header>

        <section className="space-y-5 rounded-2xl border border-[#ddd8ce] bg-[#fcfaf7] p-6 shadow-sm sm:p-8">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <RegisterInput
                id="firstName"
                label="Prénom"
                icon={User}
                value={formData.firstName}
                onChange={(value) => updateField("firstName", value)}
                placeholder="Marc"
              />
              <RegisterInput
                id="lastName"
                label="Nom"
                icon={User}
                value={formData.lastName}
                onChange={(value) => updateField("lastName", value)}
                placeholder="Dupont"
              />
            </div>
            <RegisterInput
              id="email"
              label="Adresse email"
              type="email"
              icon={Mail}
              value={formData.email}
              onChange={(value) => updateField("email", value)}
              placeholder="votre.mail@exemple.fr"
            />
            <RegisterInput
              id="targetRole"
              label="Poste recherché"
              hint="(optionnel)"
              icon={Briefcase}
              value={formData.targetRole}
              onChange={(value) => updateField("targetRole", value)}
              placeholder="ex : Développeur Full Stack (Alternance)"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PasswordInput
                id="password"
                label="Mot de passe"
                value={formData.password}
                onChange={(value) => updateField("password", value)}
                visible={showPassword}
                onToggle={() => setShowPassword((visible) => !visible)}
              />
              <PasswordInput
                id="confirmPassword"
                label="Confirmation"
                value={formData.confirmPassword}
                onChange={(value) => updateField("confirmPassword", value)}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((visible) => !visible)}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-tight text-[#6b7c77]">
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(event) =>
                  updateField("acceptTerms", event.target.checked)
                }
                className="mt-0.5 size-4 accent-[#1e463e]"
              />
              <span>
                J&apos;accepte les{" "}
                <a href="#terms" className="font-bold text-[#1e463e] underline">
                  conditions d&apos;utilisation
                </a>{" "}
                et la politique de confidentialité.
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e463e] px-4 py-3.5 text-sm font-bold text-[#f7f5f0] shadow-sm transition hover:bg-[#16352f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <span>Créer mon compte</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 rounded-xl border border-[#eae5da] bg-[#f7f5f0] p-3 text-xs text-[#4a5d57]">
            <ShieldCheck className="size-5 shrink-0 text-[#16a34a]" />
            <span>
              Données isolées et chiffrées (Hachage bcrypt & Tokens JWT).
            </span>
          </div>
        </section>

        <p className="text-center text-xs text-[#6b7c77]">
          Vous avez déjà un compte ?{" "}
          <Link
            to="/login"
            className="cursor-pointer font-bold text-[#d96c4a] hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  )
}

type RegisterInputProps = {
  id: string
  label: string
  hint?: string
  type?: string
  icon: typeof User
  value: string
  onChange: (value: string) => void
  placeholder: string
}

function RegisterInput({
  id,
  label,
  hint,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
}: RegisterInputProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-bold tracking-wider text-[#1e463e] uppercase"
      >
        {label}{" "}
        {hint && (
          <span className="font-normal text-[#8b9b95] normal-case">{hint}</span>
        )}
      </label>
      <div className="relative">
        <Icon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8b9b95]" />
        <input
          id={id}
          name={id}
          type={type}
          required={!hint}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#ddd8ce] bg-white py-2.5 pr-3 pl-10 text-sm text-[#192e28] placeholder-[#a0b0aa] transition focus:border-transparent focus:ring-2 focus:ring-[#1e463e] focus:outline-none"
        />
      </div>
    </div>
  )
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
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
        <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8b9b95]" />
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-[#ddd8ce] bg-white py-2.5 pr-9 pl-10 text-sm text-[#192e28] placeholder-[#a0b0aa] transition focus:border-transparent focus:ring-2 focus:ring-[#1e463e] focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1 text-[#8b9b95] hover:text-[#1e463e]"
          aria-label={
            visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
          }
        >
          {visible ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
