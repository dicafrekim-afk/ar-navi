import React, { useState } from 'react'
import { Text } from '@react-three/drei'
import DashboardPanel from './DashboardPanel'

/**
 * TaskPanel Component
 * Extends DashboardPanel to display tasks with checkbox indicators
 */
export default function TaskPanel({ position, accentColor = '#95E1D3' }) {
  const [checkedTasks, setCheckedTasks] = useState([false, true, false, false])

  const tasks = [
    'Review AR navigation',
    'Update dashboard UI',
    'Test hit-test placement',
    'Deploy to production',
  ]

  const toggleTask = (index) => {
    const newChecked = [...checkedTasks]
    newChecked[index] = !newChecked[index]
    setCheckedTasks(newChecked)
  }

  return (
    <DashboardPanel
      position={position}
      title="Tasks"
      width={2.0}
      height={1.6}
      accentColor={accentColor}
    >
      {/* Task list */}
      {tasks.map((task, index) => (
        <group key={index}>
          {/* Task checkbox - circle that indicates completion */}
          <mesh
            position={[-0.85, 0.35 - index * 0.3, 0]}
            onClick={() => toggleTask(index)}
          >
            <circleGeometry args={[0.12, 32]} />
            <meshStandardMaterial
              color={checkedTasks[index] ? '#48bb78' : '#e2e8f0'}
              emissive={checkedTasks[index] ? '#48bb78' : '#a0aec0'}
              emissiveIntensity={0.6}
            />
          </mesh>

          {/* Checkmark inside checkbox (if completed) */}
          {checkedTasks[index] && (
            <Text
              position={[-0.85, 0.35 - index * 0.3, 0.01]}
              fontSize={0.18}
              color="#1a202c"
              anchorX="center"
              anchorY="middle"
            >
              ✓
            </Text>
          )}

          {/* Task text */}
          <Text
            position={[-0.6, 0.35 - index * 0.3, 0]}
            fontSize={0.16}
            color={checkedTasks[index] ? '#a0aec0' : '#e2e8f0'}
            anchorX="left"
            anchorY="middle"
          >
            {task}
          </Text>
        </group>
      ))}

      {/* Summary text */}
      <Text
        position={[0, -0.55, 0]}
        fontSize={0.14}
        color="#4299e1"
        anchorX="center"
        anchorY="middle"
      >
        1/4 tasks completed
      </Text>
    </DashboardPanel>
  )
}
