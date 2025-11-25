/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Typography } from "antd"

const { Text } = Typography

interface AnimatedNumberProps {
  value: number
  duration?: number
  decimals?: number
  style?: React.CSSProperties
  strong?: boolean
}

export const AnimatedNumber = ({ value, duration = 500, decimals = 2, style, strong = true }: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const previousValue = useRef(value)

  useEffect(() => {
    if (previousValue.current === value) return

    setIsAnimating(true)
    const startValue = previousValue.current
    const endValue = value
    const startTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      const currentValue = startValue + (endValue - startValue) * easeOut
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
        setIsAnimating(false)
        previousValue.current = endValue
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <Text
      strong={strong}
      style={{
        ...style,
        transition: "all 0.3s ease",
        display: "inline-block",
        ...(isAnimating && {
          transform: "scale(1.1)",
          color: "#1890ff",
        }),
      }}
    >
      {displayValue.toFixed(decimals)}
    </Text>
  )
}
