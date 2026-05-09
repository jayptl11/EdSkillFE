import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function MotionPage({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.main
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: 'blur(8px)' }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  )
}
