import React, { useEffect, useMemo, useState } from 'react'
import EntryForm from './components/EntryForm.jsx'
import EntryList from './components/EntryList.jsx'
import DiscordOutput from './components/DiscordOutput.jsx'
import { supabase } from './lib/supabase.js'

// ---------------- helpers ----------------
const LS_ENTRIES = 'expungement-entries'

// date helpers
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
  const out = []
  for (const [k, label] of Object.entries(map)) {
    const v = Number(e[k] || 0)
    if (v > 0) out.push(`• ${label}: ${v}`)
  }
  return out
}

const personDiscordBlock = (e) => {
  const top = `**Name:** ${e.name} | **CID:** ${e.cid} | **Phone:** ${e.phone || 'N/A'}`
  const deadline = e.deadline ? `**Expungement Deadline:** ${fmtDateMDY(e.deadline)}` : null
  const dleft = e.deadline ? `**Days Left:** ${daysLeft(e.deadline)}` : null
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

// ---- DB mapping helpers (table: people). We use NULL deadline = "no deadline".
const rowToEntry = (r) => ({
  id: r.id,
  name: r.name,
  cid: r.cid,
  phone: r.phone,
  deadline: r.deadline || '',
  fileLink: r.file_link || '',
  community: r.community ?? 0,
  meetings: r.meetings ?? 0,
  events: r.events ?? 0,
  letters: r.letters ?? 0,
  lawn: r.lawn ?? 0,
  potatoes: r.potatoes ?? 0,
  created_at: r.created_at
})

const entryToRow = (e) => ({
  id: e.id,
  name: e.name,
  cid: e.cid,
  phone: e.phone,
  deadline: e.deadline ? e.deadline : null,  // null means "no deadline"
  file_link: e.fileLink || null,
  community: Number(e.community || 0),
  meetings: Number(e.meetings || 0),
  events: Number(e.events || 0),
  letters: Number(e.letters || 0),
  lawn: Number(e.lawn || 0),
  potatoes: Number(e.potatoes || 0),
})

// ---------------- component ----------------
export default function App() {
  // entries (DB-backed with local cache fallback)
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

  // load from Supabase on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('people')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setEntries((data || []).map(rowToEntry))
      } catch (err) {
        console.warn('Supabase load failed, showing local cache instead:', err?.message || err)
      }
    }
    load()
  }, [])

  // ---------------- LIZARD COUNTER (DB-backed with local fallback) ----------------
  const LS_LIZARD = 'lizard-count'
  const [lizard, setLizard] = useState(() => {
    const raw = localStorage.getItem(LS_LIZARD)
    return raw ? Number(raw) || 0 : 0
  })
  useEffect(() => {
    localStorage.setItem(LS_LIZARD, String(lizard))
  }, [lizard])

  useEffect(() => {
    const fetchLizard = async () => {
      try {
        const { data, error } = await supabase
          .from('stats')
          .select('value')
          .eq('key', 'lizard')
          .maybeSingle()
        if (error) throw error
        if (data?.value != null) {
          setLizard(Number(data.value))
        } else {
          await supabase.from('stats').insert({ key: 'lizard', value: 0 })
          setLizard(0)
        }
      } catch (err) {
        console.warn('Lizard fetch failed; using local fallback:', err?.message || err)
      }
    }
    fetchLizard()
  }, [])

  const incLizard = async () => {
    const next = lizard + 1
    setLizard(next) // optimistic update

    try {
      const { data, error } = await supabase
        .from('stats')
        .upsert(
          { key: 'lizard', value: next, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
        .select('value')
        .single()
      if (error) throw error
      if (data?.value != null) setLizard(Number(data.value))
    } catch (err) {
      console.error('Failed to update lizard count:', err)
      setLizard((n) => Math.max(0, n - 1)) // optional revert
    }
  }
  // -------------------------------------------------------------------------------

  // editing
  const [editing, setEditing] = useState(null)

  const removeEntry = async (id) => {
    if (!confirm('Remove this person?')) return
    try {
      const { error } = await supabase.from('people').delete().eq('id', id)
      if (error) throw error
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (editing?.id === id) setEditing(null)
    } catch (err) {
      alert('Failed to delete from database.')
      console.error(err)
    }
  }

  const handleSave = async (payload) => {
    try {
      const row = entryToRow({ ...payload, id: payload.id || crypto.randomUUID() })

      const { data, error } = await supabase
        .from('people')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      const saved = rowToEntry(data)
      setEntries((prev) => {
        const exists = prev.some((p) => p.id === saved.id)
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
      })
      setEditing(null)
    } catch (err) {
      alert('Failed to save to database.')
      console.error(err)
    }
  }

  // totals / master outputs
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
    const groups = {}
    entries.forEach((e) => {
      if (!e.deadline) return
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
    const blocks = entries.map(personDiscordBlock).map((b) =>
      b
        .split('\n')
        .map((l) => (l.trim().length ? `> ${l}` : '>'))
        .join('\n')
    )
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
          <span className="badge-success">🦎 {lizard}</span>
        </header>

        {/* Add / Edit */}
        <section className="card p-6">
          <h2 className="mb-4">{editing ? 'Edit Person' : 'Add Person'}</h2>
          <EntryForm
            editing={editing}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
            onLizard={incLizard}   // 🦎 updates DB + local
          />
        </section>

        {/* People + Master */}
        <section className="grid lg:grid-cols-2 gap-6">
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

          <div className="card p-6 space-y-4">
            <h2>Master Discordia Output</h2>

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
