import React from 'react'

type Props = {
  items?: any[];
}

const Cart: React.FC<Props> = ({ items = [] }) => {
  if (items.length === 0) return <div>Your cart is empty.</div>

  const total = items.reduce((s, it) => s + (it.price || 0), 0)

  return (
    <div>
      <h4>Cart</h4>
      <ul>
        {items.map((it, idx) => (
          <li key={idx}>{it.name} — ${(it.price / 100).toFixed(2)}</li>
        ))}
      </ul>
      <p><strong>Total:</strong> ${(total / 100).toFixed(2)}</p>
    </div>
  )
}

export default Cart
