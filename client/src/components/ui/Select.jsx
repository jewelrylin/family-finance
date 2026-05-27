import { forwardRef } from 'react'

const Select = forwardRef(({ className = '', error, options = [], ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
})

Select.displayName = 'Select'
export default Select
