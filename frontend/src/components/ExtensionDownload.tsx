import { Download, Puzzle } from "lucide-react"

export const EXTENSION_DOWNLOAD_PATH = "/trackmyapply-extension.zip"

type ExtensionDownloadProps = {
  compact?: boolean
}

export function ExtensionDownload({ compact = false }: ExtensionDownloadProps) {
  return (
    <a
      href={EXTENSION_DOWNLOAD_PATH}
      download="trackmyapply-extension.zip"
      className={
        compact
          ? "flex items-center gap-2 rounded-xl bg-[#d96c4a] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#c55d3e]"
          : "inline-flex items-center gap-2 rounded-xl bg-[#1e463e] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#15332d]"
      }
    >
      {compact ? <Puzzle className="size-4" /> : <Download className="size-4" />}
      <span>{compact ? "Installer l’extension" : "Télécharger l’extension"}</span>
    </a>
  )
}
