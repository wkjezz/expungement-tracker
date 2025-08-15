import React, { useEffect, useMemo, useState } from 'react'
import EntryForm from './components/EntryForm.jsx'
import EntryList from './components/EntryList.jsx'
import DiscordOutput from './components/DiscordOutput.jsx'
import { supabase } from './lib/supabase.js'

/* ---------- Dark mode (persisted) ---------- */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  useEffect(() => {
    const root = document.documentElement
    if (dark) { root.classList.add('dark'); localStorage.setItem('theme','dark') }
    else { root.classList.remove('dark'); localStorage.setItem('theme','light') }
  }, [dark])
  return [dark, setDark]
}

/* ---------- ET helpers ---------- */
function parseYMD(str){ if(!str) return null; const [y,m,d]=str.split('-').map(Number); return y&&m&&d?{y,m,d}:null }
function todayNY_ymd(){ const nowNY=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'})); return {y:nowNY.getFullYear(), m:nowNY.getMonth()+1, d:nowNY.getDate()} }
function daysLeftET(deadlineStr){
  const dl=parseYMD(deadlineStr); if(!dl) return null
  const t=todayNY_ymd()
  const a=Date.UTC(t.y,t.m-1,t.d), b=Date.UTC(dl.y,dl.m-1,dl.d)
  return Math.floor((b-a)/86400000)
}
function groupTotalsByDeadline(entries){
  const groups={}
  for(const e of entries){
    if(!e.deadline) continue
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

export default function App() {
  const [entries, setEntries] = useState([])
  const [dark, setDark] = useDarkMode()
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
    // if not found, the SQL migration already inserted row; but just in case:
    if (error && error.code === 'PGRST116') { // not found
      await supabase.from('stats').insert({ key:'lizard', value:0 })
      setLizardCount(0)
    }
  }

  const hitLizard = async () => {
    if (lizardBusy) return
    setLizardBusy(true)
    // Prefer RPC for atomic increment
    const { data, error } = await supabase.rpc('inc_counter', { k: 'lizard', delta: 1 })
    if (!error && typeof data === 'number') {
      setLizardCount(data)
    } else {
      // Fallback (non-atomic) in case RPC not available
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

  /* ---------- CRUD for entries ---------- */
  const addEntry = async (entry) => {
    const payload = {
      name: entry.name,
      cid: entry.cid,
      phone: entry.phone || null,
      deadline: entry.deadline || null,
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
      deadline: patch.deadline ?? undefined,
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

  /* ---------- Totals/Discord ---------- */
  const totals = useMemo(()=>entries.reduce((acc,e)=>{
    acc.community+=Number(e.community||0)
    acc.meetings +=Number(e.meetings ||0)
    acc.events   +=Number(e.events   ||0)
    acc.letters  +=Number(e.letters  ||0)
    acc.lawn     +=Number(e.lawn     ||0)
    acc.potatoes +=Number(e.potatoes ||0)
    return acc
  },{community:0,meetings:0,events:0,letters:0,lawn:0,potatoes:0}),[entries])

  const headerLine='**Requirements Remaining:**'
  const personBlock = (e) => {
    const d = daysLeftET(e.deadline)
    const daysText = (d ?? null) !== null ? `\n**Days Left (ET):** ${d}` : ''
    const deadline = e.deadline ? `\n**Expungement Deadline:** ${e.deadline}` : ''
    return (
      `**Name:** ${e.name} | **CID:** ${e.cid} | **Phone:** ${e.phone || 'N/A'}` +
      deadline + daysText + `\n${headerLine}\n` +
      `• Community Service: ${e.community}\n` +
      `• PA/Pillbox/PD Meetings: ${e.meetings}\n` +
      `• Events/Food/Medical Supply Drives: ${e.events}\n` +
      `• Letters: ${e.letters}\n` +
      `• Lawn/Hedge Care Tasks: ${e.lawn ?? 0}\n` +
      `• Potato Seeds to Plant: ${e.potatoes ?? 0}`
    )
  }
  const allPeopleDiscord = entries.length ? entries.map(personBlock).join('\n\n') : 'No people added yet.'
  const cumulativeDiscord =
    `**Department Totals Remaining**\n` +
    `• Community Service: ${totals.community}\n` +
    `• PA/Pillbox/PD Meetings: ${totals.meetings}\n` +
    `• Events/Food/Medical Supply Drives: ${totals.events}\n` +
    `• Letters: ${totals.letters}\n` +
    `• Lawn/Hedge Care Tasks: ${totals.lawn}\n` +
    `• Potato Seeds to Plant: ${totals.potatoes}\n\n` +
    `*Disclaimer: This does not include HUT Expungement clients or parolees.*`
  const byDeadline = useMemo(()=>groupTotalsByDeadline(entries),[entries])
  const byDeadlineDiscord = (() => {
    const keys = Object.keys(byDeadline).sort()
    if (!keys.length) return 'No deadlines set.'
    const lines = keys.map(date=>{
      const d = byDeadline[date]
      const n = daysLeftET(date)
      const t = (n ?? null) !== null ? ` (in ${n} days)` : ''
      return `${date}${t}: Community ${d.community} • Meetings ${d.meetings} • Events/Drives ${d.events} • Letters ${d.letters} • Lawn/Hedge ${d.lawn} • Potatoes ${d.potatoes}`
    })
    return `**Tasks by Deadline (ET)**\n` + lines.join('\n')
  })()
  const megaDiscord = `${cumulativeDiscord}\n\n${byDeadlineDiscord}\n\n**All People**\n${allPeopleDiscord}`

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">Expungement Tracker</h1>
          <div className="flex items-center gap-3">
            <span className="badge-success">🦎 {lizardCount}{lizardBusy ? '…' : ''}</span>
            <button className="btn" onClick={()=>setDark(v=>!v)}>{dark ? '🌙 Dark' : '☀️ Light'}</button>
          </div>
        </header>

        <section className="card p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Add Person</h2>
          {/* Lizard is handled globally via Supabase counter */}
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
              daysLeftET={daysLeftET}
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
