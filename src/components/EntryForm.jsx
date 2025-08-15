import React, { useEffect, useMemo, useRef, useState } from 'react'
import lizardSound from '../assets/lizard-button.mp3' // <-- make sure this path exists

const empty = {
  id: null,
  name: '',
  cid: '',
  phone: '',
  deadline: '',
  noDeadline: false,
  fileLink: '',
  community: '',
  meetings: '',
  events: '',
  letters: '',
  lawn: '',
  potatoes: ''
}

export default function EntryForm({ editing, onSave, onCancel, onLizard }) {
  const [form, setForm] = useState(empty)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // --- Lizard sound ---
  const audioRef = useRef(null)
  useEffect(() => {
    const a = new Audio(lizardSound)
    a.preload = 'auto'
    // a.volume = 0.9 // (optional) adjust volume if you like
    audioRef.current = a
  }, [])

  const clickLizard = () => {
    onLizard?.()
    try {
      const a = audioRef.current
      if (a) {
        a.currentTime = 0
        a.play()
      }
    } catch {
      /* ignore gesture/autoplay errors */
    }
  }

  // hydrate form when editing
  useEffect(() => {
    if (!editing) {
      setForm(empty)
      return
    }
    setForm({
      id: editing.id,
      name: editing.name || '',
      cid: editing.cid || '',
      phone: editing.phone || '',
      deadline: editing.deadline || '',
      noDeadline: !editing.deadline,
      fileLink: editing.fileLink || '',
      community: String(editing.community ?? ''),
      meetings: String(editing.meetings ?? ''),
      events: String(editing.events ?? ''),
      letters: String(editing.letters ?? ''),
      lawn: String(editing.lawn ?? ''),
      potatoes: String(editing.potatoes ?? '')
    })
  }, [editing])

  const canSubmit = useMemo(() => {
    return form.name.trim() && form.cid.trim()
  }, [form.name, form.cid])

  const clear = () => setForm(empty)

  const submit = (e) => {
    e.preventDefault()
    if (!canSubmit) {
      alert('Name and CID are required')
      return
    }
    const payload = {
      ...form,
      id: form.id || crypto.randomUUID(),
      community: Number(form.community || 0),
      meetings: Number(form.meetings || 0),
      events: Number(form.events || 0),
      letters: Number(form.letters || 0),
      lawn: Number(form.lawn || 0),
      potatoes: Number(form.potatoes || 0),
      deadline: form.noDeadline ? '' : form.deadline
    }
    onSave(payload)
    setForm(empty)
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-12 gap-4">
      {/* Name */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Name</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Jane Doe"
        />
      </div>

      {/* CID */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">CID</label>
        <input
          className="input"
          value={form.cid}
          onChange={(e) => set('cid', e.target.value)}
          placeholder="12345"
        />
      </div>

      {/* Phone */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Phone</label>
        <input
          className="input"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="555-1234"
        />
      </div>

      {/* Deadline + no deadline */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Expungement Deadline</label>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="input"
            value={form.deadline}
            onChange={(e) => set('deadline', e.target.value)}
            disabled={form.noDeadline}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.noDeadline}
              onChange={(e) => set('noDeadline', e.target.checked)}
            />
            No deadline
          </label>
        </div>
      </div>

      {/* Discord thread link */}
      <div className="field col-span-12 md:col-span-8">
        <label className="label">File Submission Link (Discord thread)</label>
        <input
          className="input"
          value={form.fileLink}
          onChange={(e) => set('fileLink', e.target.value)}
          placeholder="https://discord.com/channels/..."
        />
      </div>

      {/* Community */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Community Service Remaining</label>
        <input
          type="number"
          min="0"
          className="input"
          value={form.community}
          onChange={(e) => set('community', e.target.value)}
        />
      </div>

      {/* Meetings */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">PA/Pillbox/PD Meetings Remaining</label>
        <input
          type="number"
          min="0"
          className="input"
          value={form.meetings}
          onChange={(e) => set('meetings', e.target.value)}
        />
      </div>

      {/* Events */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Events/Drives (Food/Medical) Remaining</label>
        <input
          type="number"
          min="0"
          className="input"
          value={form.events}
          onChange={(e) => set('events', e.target.value)}
        />
      </div>

      {/* Letters */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Letters Remaining</label>
        <input
          type="number"
          min="0"
          className="input"
          value={form.letters}
          onChange={(e) => set('letters', e.target.value)}
        />
      </div>

      {/* Lawn/Hedge */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Lawn/Hedge Care Tasks Remaining</label>
        <input
          type="number"
          min="0"
          className="input"
          value={form.lawn}
          onChange={(e) => set('lawn', e.target.value)}
        />
      </div>

      {/* Potatoes */}
      <div className="field col-span-12 md:col-span-4">
        <label className="label">Potato Seeds to Plant</label>
        <input
          type="number"
          min="0"
          className="input"
          value={form.potatoes}
          onChange={(e) => set('potatoes', e.target.value)}
        />
      </div>

      {/* Buttons */}
      <div className="col-span-12 flex items-center justify-end gap-3 pt-2">
        {editing && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="btn" onClick={clear}>
          Clear
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={clickLizard}
          aria-label="Lizard"
          title="Lizard"
        >
          🦎
        </button>
        <button className="btn btn-primary" type="submit">
          {editing ? 'Update' : 'Add Person'}
        </button>
      </div>
    </form>
  )
}
