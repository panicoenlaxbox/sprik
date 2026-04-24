import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApiKeyInput from './ApiKeyInput'

describe('ApiKeyInput', () => {
  it('shows a masked input field', () => {
    render(
      <ApiKeyInput label="OpenAI" isSet={false} value="" onChange={vi.fn()} onClear={vi.fn()} />
    )

    expect(screen.getByLabelText(/openai api key/i)).toHaveAttribute('type', 'password')
  })

  it('shows "Key saved" badge when isSet is true', () => {
    render(
      <ApiKeyInput label="OpenAI" isSet={true} value="" onChange={vi.fn()} onClear={vi.fn()} />
    )

    expect(screen.getByText('Key saved')).toBeInTheDocument()
  })

  it('does not show "Key saved" badge when isSet is false', () => {
    render(
      <ApiKeyInput label="OpenAI" isSet={false} value="" onChange={vi.fn()} onClear={vi.fn()} />
    )

    expect(screen.queryByText('Key saved')).not.toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <ApiKeyInput label="Groq" isSet={false} value="" onChange={onChange} onClear={vi.fn()} />
    )

    await user.type(screen.getByLabelText(/groq api key/i), 'gsk-123')

    expect(onChange).toHaveBeenCalled()
  })

  it('shows Clear button when isSet is true and calls onClear after confirmation', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()

    render(
      <ApiKeyInput label="OpenAI" isSet={true} value="" onChange={vi.fn()} onClear={onClear} />
    )

    await user.click(screen.getByRole('button', { name: /clear openai key/i }))
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    expect(onClear).toHaveBeenCalledOnce()
  })

  it('cancels clear when Cancel is clicked', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()

    render(
      <ApiKeyInput label="OpenAI" isSet={true} value="" onChange={vi.fn()} onClear={onClear} />
    )

    await user.click(screen.getByRole('button', { name: /clear openai key/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClear).not.toHaveBeenCalled()
    expect(screen.getByText('Key saved')).toBeInTheDocument()
  })
})
