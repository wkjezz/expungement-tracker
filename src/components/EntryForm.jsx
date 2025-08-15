import React, { useRef, useState } from 'react'
import lizardSfx from '../assets/lizard-button.mp3'

const empty = {
  name: '',
  cid: '',
  phone: '',
  deadline: '',
  community: '',
  meetings: '',
  events: '',
  letters: '',
  lawn: '',
  potatoes: ''
}

export default function EntryForm({ onAdd, onLizard }) {
  const [form, setForm] = useState(empty)
  const audioRef = useRef(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return alert('Name is required')
    if (!form.cid.trim()) return alert('CID is required')
    onAdd({
      name: form.name.trim(),
      cid: form.cid.trim(),
      phone: form.phone.trim(),
      deadline: form.deadline || null,
      community: Number(form.community || 0),
      meetings: Number(form.meetings || 0),
      events: Number(form.events || 0),
      letters: Number(form.letters || 0),
      lawn: Number(form.lawn || 0),
      potatoes: Number(form.potatoes || 0)
    })
    setForm(empty)
  }

  const handleLizard = (e) => {
    e.preventDefault()
    try {
      if (!audioRef.current) audioRef.current = new Audio(lizardSfx)
      const a = audioRef.current
      a.pause(); a.currentTime = 0; a.play()
    } catch {}
    onLizard?.()
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="label">Name</label>
        <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Doe" />
      </div>
      <div>
        <label className="label">CID</label>
        <input className="input" value={form.cid} onChange={(e) => set('cid', e.target.value)} placeholder="12345" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="555-1234" />
      </div>
      <div>
        <label className="label">Expungement Deadline</label>
        <input type="date" className="input" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
      </div>

      <div>
        <label className="label">Community Service Remaining</label>
        <input type="number" min="0" className="input" value={form.community} onChange={(e) => set('community', e.target.value)} />
      </div>
      <div>
        <label className="label">PA/Pillbox/PD Meetings Remaining</label>
        <input type="number" min="0" className="input" value={form.meetings} onChange={(e) => set('meetings', e.target.value)} />
      </div>
      <div>
        <label className="label">Events/Drives (Food/Medical) Remaining</label>
        <input type="number" min="0" className="input" value={form.events} onChange={(e) => set('events', e.target.value)} />
      </div>
      <div>
        <label className="label">Letters Remaining</label>
        <input type="number" min="0" className="input" value={form.letters} onChange={(e) => set('letters', e.target.value)} />
      </div>

      <div>
        <label className="label">Lawn/Hedge Care Tasks Remaining</label>
        <input type="number" min="0" className="input" value={form.lawn} onChange={(e) => set('lawn', e.target.value)} />
      </div>
      <div>
        <label className="label">Potato Seeds to Plant</label>
        <input type="number" min="0" className="input" value={form.potatoes} onChange={(e) => set('potatoes', e.target.value)} />
      </div>

      <div className="md:col-span-4 flex gap-3 justify-end">
        {/* 🦎 Global Lizard button (sound + counter increment) */}
        <button className="btn btn-success" onClick={handleLizard} type="button">Lizard</button>

        <button type="reset" className="btn" onClick={() => setForm(empty)}>Clear</button>
        <button className="btn btn-primary" type="submit">Add Person</button>
      </div>
    </form>
  )
}
