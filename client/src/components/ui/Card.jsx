export default function Card({ children, style = {}, ...props }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '24px',
      ...style
    }} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, style = {} }) {
  return <div style={{ marginBottom: '16px', ...style }}>{children}</div>
}

export function CardTitle({ children, style = {} }) {
  return <h2 style={{
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    ...style
  }}>{children}</h2>
}

export function CardContent({ children, style = {} }) {
  return <div style={style}>{children}</div>
}
