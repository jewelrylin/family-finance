import { forwardRef } from 'react'

const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: 'white'
  },
  secondary: {
    background: '#e5e7eb',
    color: '#374151'
  },
  danger: {
    background: '#ef4444',
    color: 'white'
  },
  outline: {
    border: '2px solid #2563eb',
    color: '#2563eb',
    background: 'transparent'
  }
}

const sizeStyles = {
  sm: { padding: '6px 12px', fontSize: '13px' },
  md: { padding: '10px 16px', fontSize: '14px' },
  lg: { padding: '12px 20px', fontSize: '16px' }
}

const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  disabled = false,
  style = {},
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: '6px',
        fontWeight: '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.5 : 1,
        ...style
      }}
      disabled={disabled}
      onMouseEnter={(e) => !disabled && (e.target.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.target.style.transform = 'translateY(0)')}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
