import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard } from '../../components/ui/Skeleton.jsx'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/categories'

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Makanan & Minuman', emoji: '🍔', type: 'expense', color: '#ef4444' },
  { id: 'transport', name: 'Transportasi', emoji: '🚗', type: 'expense', color: '#3b82f6' },
  { id: 'shopping', name: 'Belanja Harian', emoji: '🛒', type: 'expense', color: '#f59e0b' },
  { id: 'health', name: 'Kesehatan', emoji: '🏥', type: 'expense', color: '#10b981' },
  { id: 'education', name: 'Pendidikan', emoji: '📚', type: 'expense', color: '#8b5cf6' },
  { id: 'bills', name: 'Tagihan', emoji: '📄', type: 'expense', color: '#ec4899' },
  { id: 'entertainment', name: 'Hiburan', emoji: '🎬', type: 'expense', color: '#06b6d4' },
  { id: 'salary', name: 'Gaji', emoji: '💼', type: 'income', color: '#22c55e' },
  { id: 'allowance', name: 'Uang Jajan', emoji: '💵', type: 'income', color: '#14b8a6' },
  { id: 'gift', name: 'Hadiah', emoji: '🎁', type: 'income', color: '#a855f7' },
  { id: 'other', name: 'Lainnya', emoji: '📦', type: 'both', color: '#6b7280' },
]

const TYPE_COLORS = {
  expense: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/30' },
  income: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
  both: { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/30' },
}

export default function Categories() {
  const { theme } = useTheme()
  const { addToast } = useToast()
  
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editCategory, setEditCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    emoji: '📦',
    type: 'expense',
    color: '#6b7280',
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setIsLoading(true)
    try {
      const data = await getCategories()
      setCategories(data.length > 0 ? data : DEFAULT_CATEGORIES)
    } catch (err) {
      console.error('Error loading categories:', err)
      setCategories(DEFAULT_CATEGORIES)
    } finally {
      setIsLoading(false)
    }
  }

  function openAddModal() {
    setFormData({ name: '', emoji: '📦', type: 'expense', color: '#6b7280' })
    setEditCategory(null)
    setShowAddModal(true)
  }

  function openEditModal(category) {
    setFormData({
      name: category.name,
      emoji: category.emoji,
      type: category.type,
      color: category.color,
    })
    setEditCategory(category)
    setShowAddModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      addToast('Nama kategori tidak boleh kosong', 'error')
      return
    }

    try {
      if (editCategory) {
        await updateCategory(editCategory.id, {
          name: formData.name,
          emoji: formData.emoji,
          type: formData.type,
          color: formData.color,
        })
        addToast('Kategori berhasil diperbarui', 'success')
      } else {
        await createCategory({
          name: formData.name,
          emoji: formData.emoji,
          type: formData.type,
          color: formData.color,
        })
        addToast('Kategori baru ditambahkan', 'success')
      }

      setShowAddModal(false)
      loadCategories()
    } catch (err) {
      console.error('Error saving category:', err)
      addToast(err.message || 'Gagal menyimpan kategori', 'error')
    }
  }

  async function handleDelete(category) {
    if (!confirm(`Hapus kategori "${category.name}"?`)) return

    try {
      await deleteCategory(category.id)
      addToast('Kategori berhasil dihapus', 'success')
      loadCategories()
    } catch (err) {
      console.error('Error deleting category:', err)
      addToast('Gagal menghapus kategori', 'error')
    }
  }

  const typeFilter = ['all', 'expense', 'income']

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Dompet AI
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">📂 Kategori</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Kelola kategori untuk transaksi Anda.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 font-bold text-white hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all"
        >
          ➕ Tambah Kategori
        </button>
      </section>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
        {typeFilter.map((filter) => (
          <button
            key={filter}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {filter === 'all' ? 'Semua' : filter === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
          </button>
        ))}
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => {
            const colorStyle = TYPE_COLORS[category.type] || TYPE_COLORS.both
            return (
              <div
                key={category.id}
                className="group relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      {category.emoji}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {category.name}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorStyle.bg} ${colorStyle.text}`}>
                        {category.type === 'expense' ? 'Pengeluaran' : category.type === 'income' ? 'Pemasukan' : 'Kedua'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editCategory ? '✏️ Edit Kategori' : '➕ Tambah Kategori'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Makan siang"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Emoji
                </label>
                <div className="flex flex-wrap gap-2">
                  {['🍔', '🚗', '🛒', '🏥', '📚', '📄', '🎬', '💼', '💵', '📦', '🎁', '💰', '🏠', '👕', '📱', '🎮'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        formData.emoji === emoji
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-500'
                          : 'bg-slate-100 dark:bg-slate-700 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tipe
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['expense', 'income', 'both'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
                        formData.type === type
                          ? `${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text} ${TYPE_COLORS[type].border}`
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {type === 'expense' ? 'Pengeluaran' : type === 'income' ? 'Pemasukan' : 'Kedua'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Warna
                </label>
                <div className="flex flex-wrap gap-2">
                  {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 dark:bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all"
              >
                {editCategory ? '💾 Simpan Perubahan' : '✅ Tambah Kategori'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
