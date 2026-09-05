export const config = { path: '/api/generate' }

const STYLES = [
  'ordinary, everyday concepts with clear and familiar opposites',
  'playful and unexpected, with some oddly specific concepts',
  'absurd, surreal and hilariously specific spectrums that still make sense',
]

const isPair = (p: unknown): p is [string, string] =>
  Array.isArray(p) && p.length === 2 && p.every((s) => typeof s === 'string' && s.trim() && s.length < 60)

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  // ponytail: solo il sito stesso può chiamare la funzione; rate limit per IP se la quota viene abusata
  const origin = req.headers.get('origin')
  if (!origin || new URL(origin).host !== new URL(req.url).host) return new Response('Forbidden', { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  const crazyness = Math.min(1, Math.max(0, Number(body.crazyness) || 0))
  const count = Math.min(30, Math.max(1, Number(body.count) || 20))
  const examples = Array.isArray(body.examples) ? body.examples.filter(isPair).slice(0, 8) : []

  const prompt =
    `Generate ${count} spectrum cards for the party game Wavelength. Each card is a pair of opposite extremes, ` +
    `like "Hot" / "Cold" or "Underrated skill" / "Overrated skill". Style: ${STYLES[Math.min(2, Math.floor(crazyness * 3))]}. ` +
    `Each label is 1-4 words. No duplicates.` +
    (examples.length ? ` Match the language and tone of these examples: ${JSON.stringify(examples)}.` : '') +
    ` Reply with JSON only: {"pairs": [["left","right"], ...]}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      temperature: 0.5 + crazyness,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    console.error('groq', res.status, await res.text())
    return new Response('Upstream error', { status: 502 })
  }

  try {
    const data = await res.json()
    const pairs: unknown = JSON.parse(data.choices[0].message.content).pairs
    const clean = Array.isArray(pairs) ? pairs.filter(isPair).map((p) => p.map((s) => s.trim())) : []
    return Response.json({ pairs: clean })
  } catch {
    return new Response('Bad upstream response', { status: 502 })
  }
}
