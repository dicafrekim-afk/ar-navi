import React from 'react'
import { Text } from '@react-three/drei'
import DashboardPanel from './DashboardPanel'

/**
 * NotificationPanel Component
 * Extends DashboardPanel to display notifications/messages
 */
export default function NotificationPanel({ position, accentColor = '#4ECDC4' }) {
  const notifications = [
    'Meeting at 2 PM',
    'Email from Team Lead',
    'Project Update Ready',
    'Slack Message',
  ]

  return (
    <DashboardPanel
      position={position}
      title="Notifications"
      width={2.2}
      height={1.6}
      accentColor={accentColor}
    >
      {/* Notification list */}
      {notifications.map((notification, index) => (
        <group key={index}>
          {/* Notification dot indicator */}
          <mesh position={[-0.9, 0.35 - index * 0.3, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" />
          </mesh>

          {/* Notification text */}
          <Text
            position={[-0.7, 0.35 - index * 0.3, 0]}
            fontSize={0.16}
            color="#e2e8f0"
            anchorX="left"
            anchorY="middle"
          >
            {notification}
          </Text>
        </group>
      ))}

      {/* View all link */}
      <Text
        position={[0, -0.55, 0]}
        fontSize={0.14}
        color="#4299e1"
        anchorX="center"
        anchorY="middle"
      >
        View all notifications
      </Text>
    </DashboardPanel>
  )
}
