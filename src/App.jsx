import React, { useEffect, useMemo, useState } from 'react'
import EntryForm from './components/EntryForm.jsx'
import EntryList from './components/EntryList.jsx'
import DiscordOutput from './components/DiscordOutput.jsx'
import { supabase } from './lib/supabase.js'

/* ---------- Helpers (no timezone text shown to users) ---------- */
function parseYMD(str){ if(!str) return null; const [y,m,d]=str.split('-').map(Number); return y&&m&&d?{y,m,d}:null }
function todayNY_ymd(){ // use America/New_York to align date math with US East, but don't label it
  const nowNY=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}))
  return {y:nowNY.getFullYear(), m:nowNY.getMonth()+1, d:nowNY.getDate()}
}
function daysLeft(deadlineStr){
  const dl=parseYMD(deadlineStr); if(!dl) return null
  const t=todayNY_ymd()
  const a=Date.UTC(t.y,t.m-1,t.d), b=Date.UTC(dl.y,dl.m-1,dl.d)
  return Math.floor((b-a)/86400000)
}
function groupTotalsByDeadline(entries){
  const groups={}
  for(const e of entries){
    if(!e.deadline) continue // skip "No deadline"
    const k=e.deadline
    if(!groups[k]) groups[k]={community:0,meetings:0,events:0,letters:0,lawn:0,potatoes:0}
    groups[k].community+=Number(e.community||0)
    groups[k].meetings +=Number(e.meetings ||0)
    groups[k].events   +=Number(e.events   ||0)
    groups[k].letters  +=Number(e.letters  ||0)
    groups[k].lawn     +=Number(e.lawn     ||0)
    groups[k].potatoes +=Number(e.potatoes ||0)
  }
  return groups
}

/* convenience for hiding zeros in any list of [label, value] */
function linesWithoutZeros(pairs){
  return pairs
    .filter(([,v]) => Number(v) > 0)
    .map(([label,v]) => `• ${label}: ${v}`)
}

export default function App() {
  // Force dark theme (no toggle)
  useEffect(() => { document.documentElement.classList.add('dark') }, [])

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  /* ---------- Global Lizard counter (Supabase) ---------- */
  const [lizardCount, setLizardCount] = useState(0)
  const [lizardBusy, setLizardBusy] = useState(false)

  const loadLizard = async () => {
    const { data, error } = await supabase
      .from('stats')
      .select('value')
      .eq('key','lizard')
      .single()
    if (!error && data) setLizardCount(Number(data.value || 0))
    if (error && error.code === 'PGRST116') {
      await supabase.from('stats').insert({ key:'lizard', value:0 })
      setLizardCount(0)
    }
  }

  const hitLizard = async () => {
    if (lizardBusy) return
    setLizardBusy(true)
    const { data, error } = await supabase.rpc('inc_counter', { k: 'lizard', delta: 1 })
    if (!error && typeof data === 'number') {
      setLizardCount(data)
    } else {
      const { data: row } = await supabase
        .from('stats')
        .upsert({ key: 'lizard', value: lizardCount + 1 })
        .select()
        .single()
      if (row) setLizardCount(Number(row.value || (lizardCount + 1)))
    }
    setLizardBusy(false)
  }

  /* ---------- Load app data ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await supabase.from('entries').select('*').order('created_at', { ascending: false })
      setEntries(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
    loadLizard()
  }, [])

  /* ---------- CRUD ---------- */
  const addEntry = async (entry) => {
    const payload = {
      name: entry.name,
      cid: entry.cid,
      phone: entry.phone || null,
      deadline: entry.deadline || null, // null when "No deadline"
      community: Number(entry.community || 0),
      meetings: Number(entry.meetings || 0),
      events: Number(entry.events || 0),
      letters: Number(entry.letters || 0),
      lawn: Number(entry.lawn || 0),
      potatoes: Number(entry.potatoes || 0)
    }
    const { data, error } = await supabase.from('entries').insert(payload).select().single()
    if (!error && data) setEntries((prev) => [data, ...prev])
  }

  const updateEntry = async (id, patch) => {
    const payload = {
      ...patch,
      phone: patch.phone ?? undefined,
      deadline: patch.deadline === undefined ? undefined : (patch.deadline || null),
      community: patch.community !== undefined ? Number(patch.community) : undefined,
      meetings: patch.meetings !== undefined ? Number(patch.meetings) : undefined,
      events: patch.events !== undefined ? Number(patch.events) : undefined,
      letters: patch.letters !== undefined ? Number(patch.letters) : undefined,
      lawn: patch.lawn !== undefined ? Number(patch.lawn) : undefined,
      potatoes: patch.potatoes !== undefined ? Number(patch.potatoes) : undefined
    }
    const { data, error } = await supabase.from('entries').update(payload).eq('id', id).select().single()
    if (!error && data) setEntries((prev) => prev.map((e) => (e.id === id ? data : e)))
  }

  const removeEntry = async (id) => {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (!error) setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  /* ---------- Totals / Discord ---------- */
  const totals = useMemo(()=>entries.reduce((acc,e)=>{
    acc.community+=Number(e.community||0)
    acc.meetings +=Number(e.meetings ||0)
    acc.events   +=Number(e.events   ||0)
    acc.letters  +=Number(e.letters  ||0)
    acc.lawn     +=Number(e.lawn     ||0)
    acc.potatoes +=Number(e.potatoes ||0)
    return acc
  },{community:0,meetings:0,events:0,letters:0,lawn:0,potatoes:0}),[entries])

  // Per-person Discord block: hide zero requirements + hide deadline/days if no deadline
  const personBlock = (e) => {
    const d = daysLeft(e.deadline)
    const daysText = (d ?? null) !== null ? `\n**Days Left:** ${d}` : ''
    const deadline = e.deadline ? `\n**Expungement Deadline:** ${e.deadline}` : ''

    const reqLines = linesWithoutZeros([
      ['Community Service', Number(e.community || 0)],
      ['PA/Pillbox/PD Meetings', Number(e.meetings || 0)],
      ['Events/Food/Medical Supply Drives', Number(e.events || 0)],
      ['Letters', Number(e.letters || 0)],
      ['Lawn/Hedge Care Tasks', Number(e.lawn || 0)],
      ['Potato Seeds to Plant', Number(e.potatoes || 0)],
    ])

    const requirementsSection = reqLines.length ? `\n**Requirements Remaining:**\n${reqLines.join('\n')}` : ''

    return (
      `**Name:** ${e.name} | **CID:** ${e.cid} | **Phone:** ${e.phone || 'N/A'}` +
      deadline +
      daysText +
      requirementsSection
    )
  }

  // Build "All People" as blockquotes with a header and blank lines
  const allPeopleBlocks = entries.length ? entries.map(personBlock) : []
  const toBlockquote = (s) => s.split('\n').map(line => `> ${line}`).join('\n')
  const allPeopleDiscord = allPeopleBlocks.length
    ? allPeopleBlocks.map(toBlockquote).join('\n\n')
    : 'No people added yet.'

  // Department totals — hide zeros
  const totalsLines = linesWithoutZeros([
    ['Community Service', totals.community],
    ['PA/Pillbox/PD Meetings', totals.meetings],
    ['Events/Food/Medical Supply Drives', totals.events],
    ['Letters', totals.letters],
    ['Lawn/Hedge Care Tasks', totals.lawn],
    ['Potato Seeds to Plant', totals.potatoes],
  ])
  const cumulativeDiscord =
    `**Department Totals Remaining**\n` +
    (totalsLines.length ? `${totalsLines.join('\n')}\n\n` : '\n') +
    `*Disclaimer: This does not include HUT Expungement clients or parolees.*`

  // Tasks by deadline — hide zeros (and skip dates where everything is zero)
  const byDeadline = useMemo(()=>groupTotalsByDeadline(entries),[entries])
  const byDeadlineDiscord = (() => {
    const keys = Object.keys(byDeadline).sort()
    const perDateLines = []
    for (const date of keys) {
      const d = byDeadline[date]
      const n = daysLeft(date)
      const tail = linesWithoutZeros([
        ['Community', d.community],
        ['Meetings', d.meetings],
        ['Events/Drives', d.events],
        ['Letters', d.letters],
        ['Lawn/Hedge', d.lawn],
        ['Potatoes', d.potatoes],
      ])
      if (!tail.length) continue // skip zero-only dates
      perDateLines.push(`${date}${(n ?? null) !== null ? ` (in ${n} days)` : ''}: ${tail.join(' • ')}`)
    }
    if (!perDateLines.length) return 'No deadlines with tasks.'
    return `**Tasks by Deadline**\n` + perDateLines.join('\n')
  })()

  const megaDiscord =
    `${cumulativeDiscord}\n\n${byDeadlineDiscord}\n\n### All People\n\n${allPeopleDiscord}`

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">Expungement Tracker</h1>
          <div className="flex items-center gap-3">
            <span className="badge-success">🦎 {lizardCount}{lizardBusy ? '…' : ''}</span>
          </div>
        </header>

        <section className="card p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Add Person</h2>
          <EntryForm onAdd={addEntry} onLizard={hitLizard} />
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">People</h2>
              <span className="badge">{loading ? 'Loading…' : `${entries.length} total`}</span>
            </div>
            <EntryList
              entries={entries}
              onRemove={removeEntry}
              onUpdate={updateEntry}
              makePersonBlock={personBlock}
              daysLeft={daysLeft}
            />
          </div>

          <div className="card p-4 md:p-6 space-y-4">
            <h2 className="text-lg font-semibold">Master Discordia Output</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <li className="badge">Community: {totals.community}</li>
              <li className="badge">Meetings: {totals.meetings}</li>
              <li className="badge">Events/Drives: {totals.events}</li>
              <li className="badge">Letters: {totals.letters}</li>
              <li className="badge">Lawn/Hedge: {totals.lawn}</li>
              <li className="badge">Potatoes: {totals.potatoes}</li>
            </ul>
            <DiscordOutput title="Discordia Output — ALL" text={megaDiscord} />
          </div>
        </section>
      </div>
    </div>
  )
}
