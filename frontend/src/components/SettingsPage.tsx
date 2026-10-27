import { useState } from "react"
import { AlertCircle, Check, Lock, Pencil, Save, X } from "lucide-react"
import { useAuth, type OnboardingProfile } from "@/hooks/auth/useAuth"
import { DashboardNavbar } from "@/components/DashboardNavbar"

const LEVELS = ["Bac", "Bac+1", "Bac+2", "Bac+3", "Bac+4", "Bac+5", "Doctorat"]
const CONTRACTS = ["Alternance", "Stage", "CDI", "CDD"]
const DURATIONS = ["Moins de 6 mois", "6 mois", "12 mois", "18 mois", "24 mois", "Plus de 24 mois"]
const RHYTHMS = ["Temps plein", "Temps partiel", "Disponible immédiatement"]
const DIPLOMAS: Record<string, string[]> = {
  Bac: ["Bac général", "Bac technologique", "Bac professionnel"],
  "Bac+1": ["Bac+1", "Certificat de spécialisation"],
  "Bac+2": ["BTS SIO", "BTS informatique", "DUT informatique", "DUT réseaux et télécommunications", "DEUST informatique", "Bac+2 autre"],
  "Bac+3": ["Licence informatique", "Licence professionnelle informatique", "Bachelor informatique", "BUT informatique", "BUT métiers du multimédia et de l'internet", "Bac+3 autre"],
  "Bac+4": ["Master 1 informatique", "Mastère 1 informatique", "Bachelor 4 informatique", "Bac+4 autre"],
  "Bac+5": ["Master informatique", "Mastère informatique", "Diplôme d'ingénieur informatique", "Mastère spécialisé informatique", "Bac+5 autre"],
  Doctorat: ["Doctorat en informatique", "Doctorat autre"],
}

const emptyProfile: OnboardingProfile = {
  firstName: "", lastName: "", educationLevel: "", currentDegree: "",
  exactDegreeTitle: "", school: "", searchDomain: "", contractType: "",
  contractDuration: "", rhythm: "", location: "",
}

export function SettingsPage() {
  const { user, updateProfile, changePassword, isLoading, error } = useAuth()
  const [profile, setProfile] = useState<OnboardingProfile>({
    ...emptyProfile,
    ...user?.profile,
  })
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [formError, setFormError] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  const update = (field: keyof OnboardingProfile, value: string) =>
    setProfile((current) => ({ ...current, [field]: value }))

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setFormError("")
    try {
      await updateProfile(profile)
      setMessage("Profil mis à jour avec succès.")
      setIsEditingProfile(false)
    } catch {
      return
    }
  }

  const cancelProfileEdit = () => {
    setProfile({ ...emptyProfile, ...user?.profile })
    setIsEditingProfile(false)
  }

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setFormError("")
    if (newPassword !== confirmPassword) {
      setFormError("Les mots de passe ne correspondent pas.")
      return
    }
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage("Mot de passe modifié avec succès.")
    } catch {
      return
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f5f0] font-sans text-[#1e463e] antialiased">
      <DashboardNavbar activeNav="settings" onActiveNavChange={() => undefined} isSidebarOpen={isSidebarOpen} onSidebarOpenChange={setIsSidebarOpen} />
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-30 bg-[#1e463e]/50 backdrop-blur-sm lg:hidden" />}
      <main className="flex flex-1 flex-col overflow-y-auto pt-16 lg:pt-0">
        <div className="max-w-4xl p-6 lg:p-10">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Paramètres</h1>
            <p className="mt-1 text-sm text-[#1e463e]/65">Consulte et modifie les informations de ton profil.</p>
          </header>

          <form onSubmit={saveProfile} className="rounded-2xl border border-[#ddd8ce] bg-[#fcfaf7] p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Mon profil</h2>
                <p className="mt-1 text-sm text-[#6b7c77]">Email associé : {user?.email}</p>
              </div>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center gap-2 rounded-xl border border-[#1e463e] px-4 py-2.5 text-sm font-bold text-[#1e463e] transition-colors hover:bg-[#1e463e] hover:text-white"
                >
                  <Pencil className="size-4" /> Modifier
                </button>
              )}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field disabled={!isEditingProfile} label="Prénom" value={profile.firstName} onChange={(v) => update("firstName", v)} />
              <Field disabled={!isEditingProfile} label="Nom" value={profile.lastName} onChange={(v) => update("lastName", v)} />
              <Select disabled={!isEditingProfile} label="Niveau d'études" value={profile.educationLevel} options={LEVELS} onChange={(v) => { update("educationLevel", v); update("currentDegree", "") }} />
              <Select disabled={!isEditingProfile || !profile.educationLevel} label="Diplôme" value={profile.currentDegree} options={DIPLOMAS[profile.educationLevel] ?? []} onChange={(v) => update("currentDegree", v)} />
              <Field disabled={!isEditingProfile} label="Intitulé exact du diplôme" value={profile.exactDegreeTitle} onChange={(v) => update("exactDegreeTitle", v)} />
              <Field disabled={!isEditingProfile} label="Établissement" value={profile.school} onChange={(v) => update("school", v)} />
              <Field disabled={!isEditingProfile} label="Domaine recherché" value={profile.searchDomain} onChange={(v) => update("searchDomain", v)} />
              <Select disabled={!isEditingProfile} label="Type de contrat" value={profile.contractType} options={CONTRACTS} onChange={(v) => { update("contractType", v); update("contractDuration", ""); update("rhythm", v === "Alternance" ? "Alternance" : "") }} />
              {profile.contractType !== "CDI" && <Select disabled={!isEditingProfile} label="Durée du contrat" value={profile.contractDuration} options={DURATIONS} onChange={(v) => update("contractDuration", v)} />}
              <Field disabled={!isEditingProfile} label="Localisation" value={profile.location} onChange={(v) => update("location", v)} />
              {profile.contractType !== "Alternance" && <Select disabled={!isEditingProfile} label="Disponibilité" value={profile.rhythm} options={RHYTHMS} onChange={(v) => update("rhythm", v)} />}
            </div>
            {isEditingProfile && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="submit" disabled={isLoading} className="flex items-center gap-2 rounded-xl bg-[#1e463e] px-5 py-3 text-sm font-bold text-white disabled:opacity-70">
                  <Save className="size-4" /> Enregistrer le profil
                </button>
                <button type="button" onClick={cancelProfileEdit} className="flex items-center gap-2 rounded-xl border border-[#ddd8ce] px-5 py-3 text-sm font-bold text-[#1e463e] hover:bg-[#f7f5f0]">
                  <X className="size-4" /> Annuler
                </button>
              </div>
            )}
          </form>

          <form onSubmit={savePassword} className="mt-6 max-w-xl rounded-2xl border border-[#ddd8ce] bg-[#fcfaf7] p-6 shadow-sm sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Lock className="size-5 text-[#d96c4a]" /> Changer le mot de passe</h2>
            <div className="mt-5 space-y-4">
              <PasswordField id="current-password" label="Mot de passe actuel" value={currentPassword} onChange={setCurrentPassword} />
              <PasswordField id="new-password" label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} />
              <PasswordField id="confirm-password" label="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={setConfirmPassword} />
            </div>
            <button type="submit" disabled={isLoading} className="mt-5 rounded-xl bg-[#1e463e] px-5 py-3 text-sm font-bold text-white disabled:opacity-70">Modifier le mot de passe</button>
          </form>

          {(formError || error) && <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="size-4" />{formError || error}</div>}
          {message && <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><Check className="size-4" />{message}</div>}
        </div>
      </main>
    </div>
  )
}

function Field({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="space-y-1.5 text-sm font-bold">{label}<input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#ddd8ce] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1e463e] disabled:cursor-not-allowed disabled:bg-[#f7f5f0] disabled:text-[#6b7c77]" /></label>
}

function Select({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="space-y-1.5 text-sm font-bold">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#ddd8ce] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1e463e] disabled:bg-[#f7f5f0]"><option value="">Choisir...</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function PasswordField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1.5 text-sm font-bold">{label}<div className="relative"><Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8b9b95]" /><input id={id} type="password" required minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#ddd8ce] bg-white py-3 pr-4 pl-10 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1e463e]" /></div></label>
}
