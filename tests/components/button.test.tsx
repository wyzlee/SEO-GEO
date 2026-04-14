import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('<Button />', () => {
  it('applies the primary variant class by default', () => {
    render(<Button>Lancer</Button>)
    const btn = screen.getByRole('button', { name: 'Lancer' })
    expect(btn).toHaveClass('btn-primary')
  })

  it('applies the secondary variant when requested', () => {
    render(<Button variant="secondary">Annuler</Button>)
    const btn = screen.getByRole('button', { name: 'Annuler' })
    expect(btn).toHaveClass('btn-secondary')
  })
})
