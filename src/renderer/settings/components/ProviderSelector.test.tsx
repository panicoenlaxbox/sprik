import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProviderSelector from './ProviderSelector'

describe('ProviderSelector', () => {
  it('renders provider and model dropdowns with current values', () => {
    render(<ProviderSelector provider="groq" model="whisper-large-v3-turbo" onChange={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: /provider/i })).toHaveValue('groq')
    expect(screen.getByRole('combobox', { name: /model/i })).toHaveValue('whisper-large-v3-turbo')
  })

  it('calls onChange with new provider and its first model when provider changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ProviderSelector provider="groq" model="whisper-large-v3-turbo" onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /provider/i }), 'openai')

    expect(onChange).toHaveBeenCalledWith('openai', 'gpt-4o-mini-transcribe', '')
  })

  it('calls onChange with same provider and new model when model changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ProviderSelector provider="groq" model="whisper-large-v3-turbo" onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /model/i }), 'whisper-large-v3')

    expect(onChange).toHaveBeenCalledWith('groq', 'whisper-large-v3', undefined)
  })

  it('shows OpenAI models when OpenAI is selected', () => {
    render(<ProviderSelector provider="openai" model="gpt-4o-mini-transcribe" onChange={vi.fn()} />)

    const modelSelect = screen.getByRole('combobox', { name: /model/i })
    expect(modelSelect).toHaveValue('gpt-4o-mini-transcribe')
    const options = Array.from(modelSelect.querySelectorAll('option')).map((o) => o.value)
    expect(options).toContain('whisper-1')
    expect(options).not.toContain('whisper-large-v3-turbo')
  })

  it('shows endpoint and deployment inputs when Azure is selected', () => {
    render(
      <ProviderSelector
        provider="azure"
        model="whisper"
        endpoint="https://my-resource.openai.azure.com"
        onChange={vi.fn()}
      />
    )

    expect(screen.queryByRole('combobox', { name: /model/i })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /azure endpoint/i })).toHaveValue(
      'https://my-resource.openai.azure.com'
    )
    expect(screen.getByRole('textbox', { name: /azure deployment/i })).toHaveValue('whisper')
  })

  it('calls onChange with empty model and endpoint when switching to Azure', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ProviderSelector provider="groq" model="whisper-large-v3-turbo" onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /provider/i }), 'azure')

    expect(onChange).toHaveBeenCalledWith('azure', '', '')
  })
})
