import { forwardRef } from 'react'

const Input = forwardRef(({ style = {}, ...props }, ref) => {
  return (
    <input
      ref={ref}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        transition: 'all 0.3s',
        fontFamily: 'inherit',
        ...style
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#2563eb'
        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
        e.target.style.backgroundColor = '#f0f9ff'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#d1d5db'
        e.target.style.boxShadow = 'none'
        e.target.style.backgroundColor = 'white'
      }}
      {...props}
    />
  )
})

Input.displayName = 'Input'
export default Input
