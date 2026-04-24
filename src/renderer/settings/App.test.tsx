import { render, screen } from '@testing-library/react'
import App from './App'

describe('Settings App', () => {
  it('renders the settings heading', () => {
    render(<App />)
    expect(screen.getByText('Murmur Settings')).toBeInTheDocument()
  })
})
