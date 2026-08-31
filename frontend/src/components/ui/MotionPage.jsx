import { motion } from 'framer-motion';

export default function MotionPage({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
    >
      {children}
    </motion.div>
  );
}
