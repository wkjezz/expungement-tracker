import React from 'react'

export default function DiscordOutput({ title, text }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      alert('Copied to clipboard!')
    }
  }

  return (
    <div>
      {title && <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</div>}
      <pre className="code-block">{text}</pre>
      <div className="mt-2">
        <button className="btn btn-primary" onClick={copy}>Copy for Discordia</button>
      </div>
    </div>
  )
}
