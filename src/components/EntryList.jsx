import React from 'react'
import DiscordOutput from './DiscordOutput.jsx'

// local helper copies (kept here to avoid extra imports)
const fmtDateMDY = (d) => {
  if (!d) return ''
  try {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}
const daysLeft = (d) => {
  if (!d) return null
  const target = new Date(d + 'T00:00:00').getTime()
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}
const plural = (n, s) => (n === 1 ? s : `${s}s`)

const reqLines = (e) => {
  const map = {
    community: 'Community Service',
    meetings: 'PA/Pillbox/PD Meetings',
    events: 'Events/Food/Medical Supply Drives',
    letters: 'Letters',
    lawn: 'Lawn/Hedge Care Tasks',
    potatoes: 'Potato Seeds to Plant'
  }
  const lines = []
  Object.entries(map).forEach(([k, label]) => {
    const v = Number(e[k] || 0)
    if (v > 0) lines.push(`• ${label}: ${v}`)
  })
  return lines
}

const personDiscordBlock = (e) => {
  const top = `**Name:** ${e.name} | **CID:** ${e.cid} | **Phone:** ${e.phone || 'N/A'}`
  const deadline =
    e.noDeadline || !e.deadline
      ? null
      : `**Expungement Deadline:** ${fmtDateMDY(e.deadline)}`
  const dleft = e.noDeadline || !e.deadline ? null : `**Days Left:** ${daysLeft(e.deadline)}`
  const file = e.fileLink ? `**File Submission:** ${e.fileLink}` : null
  const req = reqLines(e)
  const body = req.length
    ? ['**Requirements Remaining:**', ...req].join('\n')
    : '**Requirements Remaining:**\n• None'

  return [top, deadline, dleft, file, body].filter(Boolean).join('\n')
}

export default function EntryList({ entries, onEdit, onRemove }) {
  if (!entries.length) {
    return <p className="text-sm text-slate-400">No people added yet.</p>
  }

  return (
    <ul className="space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="rounded-xl border border-slate-700 p-4 bg-slate-800/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{e.name}</div>
              <div className="text-sm text-slate-300">
                CID: {e.cid} • Phone: {e.phone || 'N/A'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {e.noDeadline || !e.deadline
                  ? 'Deadline: No deadline'
                  : `Deadline: ${fmtDateMDY(e.deadline)}${
                      daysLeft(e.deadline) != null ? ` • ${daysLeft(e.deadline)} ${plural(daysLeft(e.deadline), 'day')} left` : ''
                    }`}
              </div>
              {e.fileLink && (
                <div className="mt-1 text-xs">
                  <a href={e.fileLink} target="_blank" rel="noreferrer">
                    File submission link
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => onEdit(e.id)}>Edit</button>
              <button className="btn" onClick={() => onRemove(e.id)}>Remove</button>
            </div>
          </div>

          {/* badges */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
            {Number(e.community) > 0 && <span className="badge">Community: {e.community}</span>}
            {Number(e.meetings) > 0 && <span className="badge">Meetings: {e.meetings}</span>}
            {Number(e.events) > 0 && <span className="badge">Events/Drives: {e.events}</span>}
            {Number(e.letters) > 0 && <span className="badge">Letters: {e.letters}</span>}
            {Number(e.lawn) > 0 && <span className="badge">Lawn/Hedge: {e.lawn}</span>}
            {Number(e.potatoes) > 0 && <span className="badge">Potatoes: {e.potatoes}</span>}
          </div>

          {/* per-person Discord block */}
          <div className="mt-4">
            <DiscordOutput title="Discordia Output — Person" text={personDiscordBlock(e)} />
          </div>
        </li>
      ))}
    </ul>
  )
}
