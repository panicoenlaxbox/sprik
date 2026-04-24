import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HotkeyRebinder from './HotkeyRebinder'

describe('HotkeyRebinder', () => {
  it('displays the current shortcut as a button', () => {
    render(
      <HotkeyRebinder label="Toggle recording" value="Ctrl+Alt+Space" onChange={vi.fn()} />
    )

    expect(screen.getByRole('button')).toHaveTextContent('Ctrl+Alt+Space')
  })

  it('enters capture mode when the button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <HotkeyRebinder label="Toggle recording" value="Ctrl+Alt+Space" onChange={vi.fn()} />
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByPlaceholderText(/press keys/i)).toBeInTheDocument()
  })

  it('captures Escape as a shortcut value when pressed alone', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <HotkeyRebinder label="Cancel recording" value="Escape" onChange={onChange} />
    )

    await user.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByPlaceholderText(/press keys/i), { key: 'Escape' })

    expect(onChange).toHaveBeenCalledWith('Escape')
    expect(screen.queryByPlaceholderText(/press keys/i)).not.toBeInTheDocument()
  })

  it('exits capture mode on blur without calling onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <HotkeyRebinder label="Toggle recording" value="Ctrl+Alt+Space" onChange={onChange} />
    )

    await user.click(screen.getByRole('button'))
    fireEvent.blur(screen.getByPlaceholderText(/press keys/i))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText(/press keys/i)).not.toBeInTheDocument()
  })

  it('calls onChange with the captured key combination', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <HotkeyRebinder label="Toggle recording" value="Ctrl+Alt+Space" onChange={onChange} />
    )

    await user.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByPlaceholderText(/press keys/i), {
      key: ' ',
      ctrlKey: true,
      altKey: true
    })

    expect(onChange).toHaveBeenCalledWith('Ctrl+Alt+Space')
  })

  it('ignores standalone modifier key presses', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <HotkeyRebinder label="Toggle recording" value="Ctrl+Alt+Space" onChange={onChange} />
    )

    await user.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByPlaceholderText(/press keys/i), { key: 'Control' })

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/press keys/i)).toBeInTheDocument()
  })
})
