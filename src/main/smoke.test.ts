import { app } from 'electron'

describe('main process setup', () => {
  it('electron app mock is wired up', () => {
    expect(app.getVersion()).toBe('0.1.0')
    expect(app.getName()).toBe('Murmur')
  })
})
