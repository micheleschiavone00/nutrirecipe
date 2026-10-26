import { useState } from 'react'
import { CHANGELOG, APP_VERSION, markUpdateAsSeen, type Release, type ChangeType } from '@/data/changelog'

interface ChangelogModalProps {
  isOpen: boolean
  onClose: () => void
  initialShowAll?: boolean
}

function getTypeBadge(type: ChangeType) {
  switch (type) {
    case 'ai':
      return {
        label: '🤖 AI Smart',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
      }
    case 'feat':
      return {
        label: '✨ Novità',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      }
    case 'fix':
      return {
        label: '🛠️ Miglioria',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      }
    case 'design':
      return {
        label: '🎨 Design',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      }
  }
}

export default function ChangelogModal({ isOpen, onClose, initialShowAll = false }: ChangelogModalProps) {
  const [showAllVersions, setShowAllVersions] = useState(initialShowAll)

  if (!isOpen) return null

  const handleDismiss = () => {
    markUpdateAsSeen()
    onClose()
  }

  const releasesToDisplay: Release[] = showAllVersions ? CHANGELOG : [CHANGELOG[0]]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-gray-100 relative bg-gradient-to-r from-primary-500/10 via-white to-primary-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">
                  {showAllVersions ? 'Storico Versioni & Novità' : 'Cosa c\'è di nuovo'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                    Versione {APP_VERSION}
                  </span>
                  <span className="text-xs text-gray-400">NutriRecipe</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition-colors"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>

          {/* Toggle between latest and full history */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowAllVersions(false)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                !showAllVersions
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✨ Ultimo Aggiornamento
            </button>
            <button
              onClick={() => setShowAllVersions(true)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                showAllVersions
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📜 Tutte le versioni ({CHANGELOG.length})
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 divide-y divide-gray-100">
          {releasesToDisplay.map((release) => (
            <div key={release.version} className="pt-4 first:pt-0 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-gray-900 text-white">
                      v{release.version}
                    </span>
                    {release.isLatest && (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Attuale
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{release.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mt-1.5">{release.title}</h3>
                </div>
              </div>

              {release.summary && (
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  {release.summary}
                </p>
              )}

              {/* Changes list */}
              <div className="space-y-3 pt-1">
                {release.changes.map((item, idx) => {
                  const badge = getTypeBadge(item.type)
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-gray-100 bg-white shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed pl-1">
                        {item.description}
                      </p>
                      {item.howToUse && (
                        <div className="mt-2 bg-primary-50/70 border border-primary-100/80 rounded-xl p-2 text-xs text-primary-900 flex items-start gap-1.5">
                          <span className="text-sm flex-shrink-0">💡</span>
                          <div>
                            <span className="font-semibold text-primary-950">Come provarlo: </span>
                            <span>{item.howToUse}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex flex-col gap-2">
          <button onClick={handleDismiss} className="btn-primary w-full py-3 text-sm font-semibold shadow-md">
            Ho capito, continua! 🎉
          </button>
        </div>
      </div>
    </div>
  )
}
