import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HotkeyRebinder from './HotkeyRebinder'

describe('HotkeyRebinder', () => {
  it('renders the current shortcut as kbd elements', () => {
    const { container } = render(
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Alt+Space"
        defaultValue="Ctrl+Alt+Space"
        onChange={vi.fn()}
      />
    )

    const keys = container.querySelectorAll('kbd')
    expect(keys).toHaveLength(3)
    expect(keys[0]).toHaveTextContent('Ctrl')
    expect(keys[1]).toHaveTextContent('Alt')
    expect(keys[2]).toHaveTextContent('Space')
  })

  it('enters capture mode when the shortcut button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Alt+Space"
        defaultValue="Ctrl+Alt+Space"
        onChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByPlaceholderText(/press keys/i)).toBeInTheDocument()
  })

  it('cancels capture mode when Escape is pressed without calling onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <HotkeyRebinder
        label="Cancel recording"
        value="Escape"
        defaultValue="Escape"
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByPlaceholderText(/press keys/i), { key: 'Escape' })

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText(/press keys/i)).not.toBeInTheDocument()
  })

  it('exits capture mode on blur without calling onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Alt+Space"
        defaultValue="Ctrl+Alt+Space"
        onChange={onChange}
      />
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
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Alt+Space"
        defaultValue="Ctrl+Alt+Space"
        onChange={onChange}
      />
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
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Alt+Space"
        defaultValue="Ctrl+Alt+Space"
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByPlaceholderText(/press keys/i), { key: 'Control' })

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/press keys/i)).toBeInTheDocument()
  })

  it('does not show reset button when value equals defaultValue', () => {
    render(
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Alt+Space"
        defaultValue="Ctrl+Alt+Space"
        onChange={vi.fn()}
      />
    )

    expect(
      screen.queryByRole('button', { name: /reset toggle recording to default/i })
    ).not.toBeInTheDocument()
  })

  it('shows reset button when value differs from defaultValue', () => {
    render(
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Shift+R"
        defaultValue="Ctrl+Alt+Space"
        onChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: /reset toggle recording to default/i })
    ).toBeInTheDocument()
  })

  it('calls onChange with defaultValue when reset button is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <HotkeyRebinder
        label="Toggle recording"
        value="Ctrl+Shift+R"
        defaultValue="Ctrl+Alt+Space"
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /reset toggle recording to default/i }))

    expect(onChange).toHaveBeenCalledWith('Ctrl+Alt+Space')
  })

  it('renders a single-key shortcut as one kbd element', () => {
    const { container } = render(
      <HotkeyRebinder
        label="Cancel recording"
        value="Escape"
        defaultValue="Escape"
        onChange={vi.fn()}
      />
    )

    const keys = container.querySelectorAll('kbd')
    expect(keys).toHaveLength(1)
    expect(keys[0]).toHaveTextContent('Escape')
  })
})
