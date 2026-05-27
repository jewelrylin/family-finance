export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children }) {
  return <div className={`mb-4 ${className}`}>{children}</div>
}

export function CardTitle({ className = '', children }) {
  return <h2 className={`text-2xl font-bold text-gray-900 ${className}`}>{children}</h2>
}

export function CardContent({ className = '', children }) {
  return <div className={`${className}`}>{children}</div>
}
