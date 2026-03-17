import React from 'react'
import { Text } from '@react-three/drei'
import DashboardPanel from './DashboardPanel'

/**
 * CalendarPanel Component
 * Extends DashboardPanel to display calendar/date information
 */
export default function CalendarPanel({ position, accentColor = '#4ECDC4' }) {
  const today = new Date()
  const month = today.toLocaleString('default', { month: 'long' })
  const day = today.getDate()
  const year = today.getFullYear()
  const dayName = today.toLocaleString('default', { weekday: 'long' })

  return (
    <DashboardPanel
      position={position}
      title="Calendar"
      width={1.8}
      height={1.4}
      accentColor={accentColor}
    >
      {/* Month and year */}
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.25}
        color="#64ffda"
        anchorX="center"
        anchorY="middle"
      >
        {month} {year}
      </Text>

      {/* Day number (large) */}
      <Text
        position={[0, 0.15, 0]}
        fontSize={0.5}
        color="#00d9ff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {day}
      </Text>

      {/* Day of week */}
      <Text
        position={[0, -0.15, 0]}
        fontSize={0.2}
        color="#a0aec0"
        anchorX="center"
        anchorY="middle"
      >
        {dayName}
      </Text>

      {/* Time */}
      <Text
        position={[0, -0.35, 0]}
        fontSize={0.18}
        color="#718096"
        anchorX="center"
        anchorY="middle"
      >
        {today.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </DashboardPanel>
  )
}
