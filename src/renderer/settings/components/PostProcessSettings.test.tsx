import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostProcessSettings from './PostProcessSettings'
import type { Config } from '../../shared/types'

const disabledConfig: Config['postProcessing'] = {
  enabled: false,
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  prompt: 'Fix grammar.'
}

const enabledConfig: Config['postProcessing'] = {
  enabled: true,
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  prompt: 'Fix grammar.'
}

const azureConfig: Config['postProcessing'] = {
  enabled: true,
  provider: 'azure',
  model: 'gpt-4o',
  prompt: 'Fix grammar.',
  endpoint: 'https://my-resource.openai.azure.com'
}

describe('PostProcessSettings', () => {
  it('shows only the toggle when disabled', () => {
    render(<PostProcessSettings config={disabledConfig} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/enable post-processing/i)).not.toBeChecked()
    expect(screen.queryByRole('combobox', { name: /llm provider/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /instructions/i })).not.toBeInTheDocument()
  })

  it('shows provider, model, and prompt fields when enabled', () => {
    render(<PostProcessSettings config={enabledConfig} onChange={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: /llm provider/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /llm model/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /instructions/i })).toBeInTheDocument()
  })

  it('calls onChange with enabled: true when toggling on', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<PostProcessSettings config={disabledConfig} onChange={onChange} />)
    await user.click(screen.getByLabelText(/enable post-processing/i))

    expect(onChange).toHaveBeenCalledWith({ enabled: true })
  })

  it('resets model to first of new provider when provider changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<PostProcessSettings config={enabledConfig} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: /llm provider/i }), 'openai')

    expect(onChange).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'gpt-5.4-mini',
      endpoint: ''
    })
  })

  it('shows endpoint and deployment inputs when Azure is selected', () => {
    render(<PostProcessSettings config={azureConfig} onChange={vi.fn()} />)

    expect(screen.queryByRole('combobox', { name: /llm model/i })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /llm azure endpoint/i })).toHaveValue(
      'https://my-resource.openai.azure.com'
    )
    expect(screen.getByRole('textbox', { name: /llm azure deployment/i })).toHaveValue('gpt-4o')
  })

  it('calls onChange with empty model and endpoint when switching to Azure', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<PostProcessSettings config={enabledConfig} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: /llm provider/i }), 'azure')

    expect(onChange).toHaveBeenCalledWith({ provider: 'azure', model: '', endpoint: '' })
  })

  it('calls onChange when user edits the prompt', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<PostProcessSettings config={enabledConfig} onChange={onChange} />)
    await user.type(screen.getByRole('textbox', { name: /instructions/i }), '!')

    expect(onChange).toHaveBeenLastCalledWith({ prompt: 'Fix grammar.!' })
  })
})
