import { forwardRef } from 'react'

const Input = forwardRef(({ className = '', error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${className}`}
      {...props}
    />
  )
})

Input.displayName = 'Input'
export default Input
