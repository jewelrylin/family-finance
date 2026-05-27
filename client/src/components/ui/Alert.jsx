export default function Alert({ className = '', variant = 'info', children }) {
  const variants = {
    success: 'bg-green-50 border-l-4 border-green-500 text-green-700',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-700',
    info: 'bg-blue-50 border-l-4 border-blue-500 text-blue-700',
    warning: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700'
  }

  return (
    <div className={`p-4 rounded ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}
