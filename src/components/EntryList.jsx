import React, { useState } from 'react'
import DiscordOutput from './DiscordOutput.jsx'

export default function EntryList({ entries, onRemove, onUpdate, makePersonBlock, daysLeftET }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)

  const startEdit = (e) => {
    setEditingId(e.id)
    setForm({
      name: e.name,
      cid: e.cid,
      phone: e.phone || '',
      deadline: e.deadline || '',
      community: e.community ?? 0,
      meetings: e.meetings ?? 0,
      events: e.events ?? 0,
      letters: e.letters ?? 0,
      lawn: e.lawn ?? 0,
      potatoes: e.potatoes ?? 0
    })
  }

  const cancelEdit = () => { setEditingId(null); setForm(null) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const saveEdit = () => {
    if (!form.name.trim()) return alert('Name is required')
    if (!form.cid.trim()) return alert('CID is required')
    onUpdate(editingId, {
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
    cancelEdit()
  }

  if (!entries.length) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">No people added yet.</p>
  }

  return (
    <ul className="space-y-4">
      {entries.map((e) => {
        const days = daysLeftET?.(e.deadline)
        return (
          <li key={e.id} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{e.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  CID: {e.cid} • Phone: {e.phone || 'N/A'}
                </div>
                {e.deadline && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Deadline (ET): {e.deadline}{typeof days === 'number' ? ` • ${days} day(s) left` : ''}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {editingId === e.id ? (
                  <>
                    <button className="btn" onClick={cancelEdit}>Cancel</button>
                    <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={() => startEdit(e)}>Edit</button>
                    <button className="btn" onClick={() => onRemove(e.id)}>Remove</button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              <span className="badge">Community: {e.community ?? 0}</span>
              <span className="badge">Meetings: {e.meetings ?? 0}</span>
              <span className="badge">Events/Drives: {e.events ?? 0}</span>
              <span className="badge">Letters: {e.letters ?? 0}</span>
              <span className="badge">Lawn/Hedge: {e.lawn ?? 0}</span>
              <span className="badge">Potato Seeds: {e.potatoes ?? 0}</span>
            </div>

            {editingId === e.id && form && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={form.name} onChange={(ev) => set('name', ev.target.value)} />
                </div>
                <div>
                  <label className="label">CID</label>
                  <input className="input" value={form.cid} onChange={(ev) => set('cid', ev.target.value)} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={(ev) => set('phone', ev.target.value)} />
                </div>
                <div>
                  <label className="label">Expungement Deadline</label>
                  <input type="date" className="input" value={form.deadline} onChange={(ev) => set('deadline', ev.target.value)} />
                </div>

                <div>
                  <label className="label">Community Remaining</label>
                  <input type="number" min="0" className="input" value={form.community} onChange={(ev) => set('community', ev.target.value)} />
                </div>
                <div>
                  <label className="label">Meetings Remaining</label>
                  <input type="number" min="0" className="input" value={form.meetings} onChange={(ev) => set('meetings', ev.target.value)} />
                </div>
                <div>
                  <label className="label">Events/Drives Remaining</label>
                  <input type="number" min="0" className="input" value={form.events} onChange={(ev) => set('events', ev.target.value)} />
                </div>
                <div>
                  <label className="label">Letters Remaining</label>
                  <input type="number" min="0" className="input" value={form.letters} onChange={(ev) => set('letters', ev.target.value)} />
                </div>

                <div>
                  <label className="label">Lawn/Hedge Care Tasks Remaining</label>
                  <input type="number" min="0" className="input" value={form.lawn} onChange={(ev) => set('lawn', ev.target.value)} />
                </div>
                <div>
                  <label className="label">Potato Seeds to Plant</label>
                  <input type="number" min="0" className="input" value={form.potatoes} onChange={(ev) => set('potatoes', ev.target.value)} />
                </div>
              </div>
            )}

            <div className="mt-4">
              <DiscordOutput title="Discordia Output — Person" text={makePersonBlock ? makePersonBlock(e) : ''} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
