import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApiKeyInput from './ApiKeyInput'

describe('ApiKeyInput', () => {
  it('renders as a masked password input by default', () => {
    render(<ApiKeyInput label="OpenAI" isSet={false} value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText(/openai api key/i)).toHaveAttribute('type', 'password')
  })

  it('shows a replace placeholder when a key is already stored but field is empty', () => {
    render(<ApiKeyInput label="OpenAI" isSet={true} value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText(/openai api key/i)).toHaveAttribute('placeholder', 'Enter new key to replace…')
  })

  it('shows generic placeholder when no key is stored', () => {
    render(<ApiKeyInput label="OpenAI" isSet={false} value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText(/openai api key/i)).toHaveAttribute('placeholder', 'Enter API key…')
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ApiKeyInput label="Groq" isSet={false} value="" onChange={onChange} />)

    await user.type(screen.getByLabelText(/groq api key/i), 'gsk-123')

    expect(onChange).toHaveBeenCalled()
  })

  it('toggles to plain text when the eye button is clicked', async () => {
    const user = userEvent.setup()

    render(<ApiKeyInput label="OpenAI" isSet={false} value="sk-abc" onChange={vi.fn()} />)

    const input = screen.getByLabelText(/openai api key/i)
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /show key/i }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /hide key/i }))
    expect(input).toHaveAttribute('type', 'password')
  })
})
