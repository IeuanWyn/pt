import React from 'react'

export default function Card({ children, className = '', title, icon }) {
  return (
    <div className={`bg-navy-800 border border-navy-700 rounded-xl p-4 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-3">
          {icon && <span className="text-lg">{icon}</span>}
          {title && <h3 className="font-semibold text-white">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  )
}
