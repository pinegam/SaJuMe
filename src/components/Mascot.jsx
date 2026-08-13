import mascotImg from '../assets/mascot.png'

export default function Mascot({ className = '', size = 'md', alt = '사주미 마스코트' }) {
  return (
    <img
      src={mascotImg}
      alt={alt}
      className={`mascot mascot-${size}${className ? ` ${className}` : ''}`}
      draggable={false}
    />
  )
}
