import { formatDistanceToNow, format } from 'date-fns'

export function relativeFromNow(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return formatDistanceToNow(d, { addSuffix: true })
}

export function absoluteFormat(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return format(d, 'PP p')
}
