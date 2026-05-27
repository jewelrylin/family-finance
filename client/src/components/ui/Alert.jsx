export default function Alert({ variant = 'info', children, style = {} }) {
  const variants = {
    success: {
      backgroundColor: '#f0fdf4',
      borderLeftColor: '#22c55e',
      color: '#15803d'
    },
    error: {
      backgroundColor: '#fef2f2',
      borderLeftColor: '#ef4444',
      color: '#991b1b'
    },
    info: {
      backgroundColor: '#f0f9ff',
      borderLeftColor: '#2563eb',
      color: '#1e40af'
    },
    warning: {
      backgroundColor: '#fffbeb',
      borderLeftColor: '#f59e0b',
      color: '#92400e'
    }
  }

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '6px',
      borderLeft: '4px solid',
      ...variants[variant],
      ...style
    }}>
      {children}
    </div>
  )
}
