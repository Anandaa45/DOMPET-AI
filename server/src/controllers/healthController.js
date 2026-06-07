export function getHealth(req, res) {
  res.json({
    ok: true,
    service: 'dompet-ai-server',
  })
}
