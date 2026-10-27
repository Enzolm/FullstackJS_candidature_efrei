import { useState } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react"
import {
  type OnboardingProfile,
  useAuth,
} from "@/hooks/auth/useAuth"

const STEPS = [
  { title: "Ton profil", description: "Quelques informations personnelles." },
  { title: "Ta recherche", description: "Ce que tu souhaites trouver." },
  { title: "Tes préférences", description: "Affinons les résultats proposés." },
]

const INITIAL_PROFILE: OnboardingProfile = {
  firstName: "",
  lastName: "",
  educationLevel: "",
  currentDegree: "",
  exactDegreeTitle: "",
  school: "",
  searchDomain: "",
  contractType: "",
  contractDuration: "",
  rhythm: "",
  location: "",
}

const DIPLOMA_OPTIONS: Record<string, string[]> = {
  Bac: ["Bac général", "Bac technologique", "Bac professionnel"],
  "Bac+1": ["Bac+1", "Certificat de spécialisation"],
  "Bac+2": [
    "BTS SIO",
    "BTS informatique",
    "DUT informatique",
    "DUT réseaux et télécommunications",
    "DEUST informatique",
    "Bac+2 autre",
  ],
  "Bac+3": [
    "Licence informatique",
    "Licence professionnelle informatique",
    "Bachelor informatique",
    "BUT informatique",
    "BUT métiers du multimédia et de l'internet",
    "Bac+3 autre",
  ],
  "Bac+4": [
    "Master 1 informatique",
    "Mastère 1 informatique",
    "Bachelor 4 informatique",
    "Bac+4 autre",
  ],
  "Bac+5": [
    "Master informatique",
    "Mastère informatique",
    "Diplôme d'ingénieur informatique",
    "Mastère spécialisé informatique",
    "Bac+5 autre",
  ],
  Doctorat: ["Doctorat en informatique", "Doctorat autre"],
}

export function OnboardingModal() {
  const { user, completeOnboarding, isLoading, error } = useAuth()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<OnboardingProfile>(() => ({
    ...INITIAL_PROFILE,
    ...user?.profile,
  }))
  const [formError, setFormError] = useState("")

  if (!user || user.isOnboarded) return null

  const update = (field: keyof OnboardingProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }))
    setFormError("")
  }

  const next = () => {
    if (
      step === 0 &&
      (!profile.firstName ||
        !profile.lastName ||
        !profile.educationLevel ||
        !profile.currentDegree ||
        !profile.exactDegreeTitle ||
        !profile.school)
    ) {
      setFormError(
        "Complète tes informations personnelles, ton niveau, ton diplôme et ton établissement."
      )
      return
    }
    if (step === 1 && (!profile.searchDomain || !profile.contractType)) {
      setFormError("Renseigne le domaine et le type de contrat recherché.")
      return
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const submit = async () => {
    if (
      !profile.location ||
      (profile.contractType !== "Alternance" && !profile.rhythm) ||
      (profile.contractType !== "CDI" && !profile.contractDuration)
    ) {
      setFormError(
        profile.contractType === "CDI" || profile.contractType === "Alternance"
          ? "Renseigne ta localisation."
          : "Renseigne la durée du contrat, la localisation et le rythme."
      )
      return
    }

    try {
      await completeOnboarding(profile)
    } catch {
      return
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#192e28]/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-3xl bg-[#fcfaf7] p-6 shadow-2xl sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#d96c4a] uppercase">
              Bienvenue sur TrackMyApply
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#192e28]">
              Complète ton profil
            </h1>
            <p className="mt-1 text-sm text-[#6b7c77]">
              Ces informations nous aideront à mieux cibler tes opportunités.
            </p>
          </div>
          <span className="rounded-full bg-[#1e463e]/10 px-3 py-1 text-xs font-bold text-[#1e463e]">
            {step + 1}/{STEPS.length}
          </span>
        </header>

        <div className="mt-6 flex gap-2">
          {STEPS.map((item, index) => (
            <div key={item.title} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  index <= step ? "bg-[#d96c4a]" : "bg-[#eae5da]"
                }`}
              />
              <p className="mt-2 hidden text-[11px] font-bold text-[#1e463e]/60 sm:block">
                {item.title}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 min-h-56">
          <h2 className="text-lg font-bold text-[#1e463e]">{STEPS[step].title}</h2>
          <p className="mt-1 text-sm text-[#6b7c77]">{STEPS[step].description}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {step === 0 && (
              <>
                <Field label="Prénom" value={profile.firstName} onChange={(v) => update("firstName", v)} />
                <Field label="Nom" value={profile.lastName} onChange={(v) => update("lastName", v)} />
                <SelectField
                  label="Niveau d'études"
                  value={profile.educationLevel}
                  onChange={(value) => {
                    update("educationLevel", value)
                    update("currentDegree", "")
                  }}
                  options={Object.keys(DIPLOMA_OPTIONS)}
                />
                <SelectField
                  label="Intitulé du diplôme"
                  value={profile.currentDegree}
                  onChange={(value) => update("currentDegree", value)}
                  options={DIPLOMA_OPTIONS[profile.educationLevel] ?? []}
                  disabled={!profile.educationLevel}
                />
                <Field
                  label="Intitulé exact du diplôme"
                  value={profile.exactDegreeTitle}
                  onChange={(value) => update("exactDegreeTitle", value)}
                  placeholder="Ex : Mastère Dev Manager Full Stack"
                />
                <Field
                  label="Établissement"
                  value={profile.school}
                  onChange={(value) => update("school", value)}
                  placeholder="Nom de l'école ou de l'université"
                />
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Domaine recherché" value={profile.searchDomain} onChange={(v) => update("searchDomain", v)} placeholder="Développement Full-Stack" />
                <SelectField
                  label="Type de contrat"
                  value={profile.contractType}
                  onChange={(value) => {
                    update("contractType", value)
                    update("contractDuration", "")
                    update("rhythm", value === "Alternance" ? "Alternance" : "")
                  }}
                  options={["Alternance", "Stage", "CDI", "CDD"]}
                />
                {profile.contractType !== "CDI" && (
                  <SelectField
                    label="Durée du contrat"
                    value={profile.contractDuration}
                    onChange={(v) => update("contractDuration", v)}
                    options={["Moins de 6 mois", "6 mois", "12 mois", "18 mois", "24 mois", "Plus de 24 mois"]}
                  />
                )}
              </>
            )}
            {step === 2 && (
              <>
                <Field label="Localisation" value={profile.location} onChange={(v) => update("location", v)} placeholder="Île-de-France, Remote..." />
                {profile.contractType !== "Alternance" && (
                  <SelectField
                    label="Rythme / disponibilité"
                    value={profile.rhythm}
                    onChange={(v) => update("rhythm", v)}
                    options={["Temps plein", "Temps partiel", "Disponible immédiatement"]}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {(formError || error) && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <AlertCircle className="size-4 shrink-0" />
            {formError || error}
          </div>
        )}

        <footer className="mt-6 flex justify-between gap-3">
          <button type="button" onClick={() => setStep((current) => current - 1)} disabled={step === 0} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#1e463e] disabled:invisible">
            <ArrowLeft className="size-4" /> Retour
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="flex items-center gap-2 rounded-xl bg-[#1e463e] px-5 py-3 text-sm font-bold text-white hover:bg-[#15332d]">
              Suivant <ArrowRight className="size-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={isLoading} className="flex items-center gap-2 rounded-xl bg-[#1e463e] px-5 py-3 text-sm font-bold text-white disabled:opacity-70">
              {isLoading ? "Enregistrement..." : "Terminer"} <Check className="size-4" />
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="space-y-1.5 text-sm font-bold text-[#1e463e]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#ddd8ce] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1e463e]" />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  disabled?: boolean
}) {
  return (
    <label className="space-y-1.5 text-sm font-bold text-[#1e463e]">
      {label}
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#ddd8ce] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1e463e] disabled:cursor-not-allowed disabled:bg-[#f7f5f0]">
        <option value="">{disabled ? "Choisis d'abord un niveau" : "Choisir..."}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}
