import React, { useEffect, useMemo, useState } from 'react'
import EntryForm from './components/EntryForm.jsx'
import EntryList from './components/EntryList.jsx'
import DiscordOutput from './components/DiscordOutput.jsx'

// ---------------- helpers shared in App ----------------
const LS_ENTRIES = 'expungement-entries'
const LS_LIZARD = 'lizard-count'

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

// Build a single line like "Community 3 • Meetings 2 • Letters 1" with zero-suppression
const lineForCounts = (obj, labels) => {
  const parts = []
  for (const k of Object.keys(labels)) {
    const v = Number(obj[k] || 0)
    if (v > 0) parts.push(`${labels[k]} ${v}`)
  }
  return parts.join(' • ')
}

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

const indentForDiscord = (text) =>
  text
    .split('\n')
    .map((l) => (l.trim().length ? `> ${l}` : '>'))
    .join('\n')

// ---------------- component ----------------
export default function App() {
  // entries
  const [entries, setEntries] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_ENTRIES)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    localStorage.setItem(LS_ENTRIES, JSON.stringify(entries))
  }, [entries])

  // 🦎 counter
  const [lizard, setLizard] = useState(() => {
    const raw = localStorage.getItem(LS_LIZARD)
    return raw ? Number(raw) || 0 : 0
  })
  useEffect(() => {
    localStorage.setItem(LS_LIZARD, String(lizard))
  }, [lizard])
  const incLizard = () => setLizard((n) => n + 1)

  // editing
  const [editing, setEditing] = useState(null) // an entry or null

  const removeEntry = (id) => {
    if (!confirm('Remove this person?')) return
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (editing?.id === id) setEditing(null)
  }

  const handleSave = (payload) => {
    setEntries((prev) => {
      const exists = prev.some((p) => p.id === payload.id)
      return exists ? prev.map((p) => (p.id === payload.id ? payload : p)) : [payload, ...prev]
    })
    setEditing(null)
  }

  // totals
  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        acc.community += Number(e.community || 0)
        acc.meetings += Number(e.meetings || 0)
        acc.events += Number(e.events || 0)
        acc.letters += Number(e.letters || 0)
        acc.lawn += Number(e.lawn || 0)
        acc.potatoes += Number(e.potatoes || 0)
        return acc
      },
      { community: 0, meetings: 0, events: 0, letters: 0, lawn: 0, potatoes: 0 }
    )
  }, [entries])

  // master outputs
  const deptTotalsBlock = useMemo(() => {
    const map = {
      community: 'Community Service',
      meetings: 'PA/Pillbox/PD Meetings',
      events: 'Events/Food/Medical Supply Drives',
      letters: 'Letters',
      lawn: 'Lawn/Hedge Care Tasks',
      potatoes: 'Potato Seeds to Plant'
    }
    const list = []
    Object.entries(map).forEach(([k, label]) => {
      const v = Number(totals[k] || 0)
      if (v > 0) list.push(`• ${label}: ${v}`)
    })
    if (!list.length) list.push('• None')
    return (
      `**Department Totals Remaining**\n` +
      list.join('\n') +
      `\n\n*Disclaimer: This does not include HUT Expungement clients or parolees.*`
    )
  }, [totals])

  const tasksByDeadlineBlock = useMemo(() => {
    // group by date
    const groups = {}
    entries.forEach((e) => {
      if (!e.deadline || e.noDeadline) return
      const key = e.deadline
      if (!groups[key]) groups[key] = { community: 0, meetings: 0, events: 0, letters: 0, lawn: 0, potatoes: 0 }
      groups[key].community += Number(e.community || 0)
      groups[key].meetings += Number(e.meetings || 0)
      groups[key].events += Number(e.events || 0)
      groups[key].letters += Number(e.letters || 0)
      groups[key].lawn += Number(e.lawn || 0)
      groups[key].potatoes += Number(e.potatoes || 0)
    })
    const labelMap = {
      community: 'Community',
      meetings: 'Meetings',
      events: 'Events/Drives',
      letters: 'Letters',
      lawn: 'Lawn/Hedge',
      potatoes: 'Potatoes'
    }
    const lines = Object.keys(groups)
      .sort()
      .map((d) => {
        const dl = daysLeft(d)
        const counts = lineForCounts(groups[d], labelMap)
        return `${fmtDateMDY(d)}${dl != null ? ` (in ${dl} ${plural(dl, 'day')})` : ''}: ${counts || 'None'}`
      })
    if (!lines.length) lines.push('No deadlines.')
    return `**Tasks by Deadline**\n` + lines.join('\n')
  }, [entries])

  const allPeopleBlock = useMemo(() => {
    const blocks = entries
      .map((e) => personDiscordBlock(e))
      .map((t) => indentForDiscord(t))
    return `### All People\n\n` + (blocks.length ? blocks.join('\n\n') : '> No people.')
  }, [entries])

  const masterOutput = useMemo(() => {
    return [deptTotalsBlock, tasksByDeadlineBlock, allPeopleBlock].join('\n\n')
  }, [deptTotalsBlock, tasksByDeadlineBlock, allPeopleBlock])

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1>Expungement Tracker</h1>
          <div className="flex items-center gap-3">
            <button className="btn btn-success" onClick={incLizard} aria-label="Lizard">
              🦎
            </button>
            <span className="badge-success">🦎 {lizard}</span>
          </div>
        </header>

        {/* Add / Edit */}
        <section className="card p-6">
          <h2 className="mb-4">{editing ? 'Edit Person' : 'Add Person'}</h2>
          <EntryForm
            editing={editing}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        </section>

        {/* People + Master */}
        <section className="grid lg:grid-cols-2 gap-6">
          {/* People */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2>People</h2>
              <span className="badge">{entries.length} total</span>
            </div>
            <EntryList
              entries={entries}
              onEdit={(id) => setEditing(entries.find((e) => e.id === id) || null)}
              onRemove={removeEntry}
            />
          </div>

          {/* Master output */}
          <div className="card p-6 space-y-4">
            <h2>Master Discordia Output</h2>

            {/* glance totals */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Number(totals.community) > 0 && <span className="badge">Community: {totals.community}</span>}
              {Number(totals.meetings) > 0 && <span className="badge">Meetings: {totals.meetings}</span>}
              {Number(totals.events) > 0 && <span className="badge">Events/Drives: {totals.events}</span>}
              {Number(totals.letters) > 0 && <span className="badge">Letters: {totals.letters}</span>}
              {Number(totals.lawn) > 0 && <span className="badge">Lawn/Hedge: {totals.lawn}</span>}
              {Number(totals.potatoes) > 0 && <span className="badge">Potatoes: {totals.potatoes}</span>}
            </div>

            <DiscordOutput title="Discordia Output — ALL" text={masterOutput} />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-sm text-slate-400 pt-2">
          <div>Tool by Colin Burns.</div>
          <div>Disclaimer: this is a prototype and requires accurate input and maintenance to produce correct output.</div>
        </footer>
      </div>
    </div>
  )
}
