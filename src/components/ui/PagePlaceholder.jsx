export default function PagePlaceholder({ title, description }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
        Dompet AI
      </p>
      <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-2xl text-slate-600">{description}</p>
    </section>
  )
}
