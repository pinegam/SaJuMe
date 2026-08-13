import Mascot from './Mascot'

export default function AuthLoading({ message = '준비 중이다-멍...' }) {
  return (
    <div className="page theme-default">
      <div className="auth-shell">
        <Mascot size="lg" className="mascot-bob" />
        <p className="auth-status">{message}</p>
      </div>
    </div>
  )
}
