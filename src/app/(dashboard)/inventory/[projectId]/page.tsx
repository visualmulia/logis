'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { InventoryItem, Project } from '@/types'
import { toast } from 'sonner'
import {
  Plus,
  ArrowLeft,
  Package,
  AlertTriangle,
  TrendingDown,
  Loader2,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import Link from 'next/link'

type InventoryCategory = 'material' | 'apd' | 'consumable' | 'tool'

const categoryConfig: Record<InventoryCategory, { label: string; color: string }> = {
  material: { label: 'Material', color: '#F97316' },
  apd: { label: 'APD / Safety', color: '#22c55e' },
  consumable: { label: 'Consumable', color: '#38bdf8' },
  tool: { label: 'Alat Kecil', color: '#a78bfa' },
}

export default function InventoryPage() {
  const params = useParams()
  const { companyId, logisUser } = useAuth()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showMutationModal, setShowMutationModal] = useState<{
    item: InventoryItem
    type: 'in' | 'out'
  } | null>(null)
  const [mutationQty, setMutationQty] = useState(1)
  const [mutationNotes, setMutationNotes] = useState('')
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'material' as InventoryCategory,
    quantity: 0,
    unit: 'pcs',
    minimumStock: 5,
  })

  const UNITS = ['pcs', 'kg', 'ton', 'sak', 'liter', 'm', 'm²', 'm³', 'batang', 'lembar', 'roll', 'set', 'unit', 'dus', 'lusin']

  // Fetch project info
  useEffect(() => {
    if (!companyId || !projectId) return
    getDoc(doc(db, 'logis_companies', companyId, 'projects', projectId)).then((snap) => {
      if (snap.exists()) {
        setProject({ id: snap.id, ...snap.data() } as Project)
      }
    })
  }, [companyId, projectId])

  // Realtime inventory
  useEffect(() => {
    if (!companyId || !projectId) return

    const q = query(
      collection(db, 'logis_companies', companyId, 'inventory')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as InventoryItem))
        .filter((item) => item.projectId === projectId)
      setItems(data)
      setLoading(false)
    })

    return () => unsub()
  }, [companyId, projectId])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.name.trim() || !companyId) return

    try {
      await addDoc(collection(db, 'logis_companies', companyId, 'inventory'), {
        projectId,
        companyId,
        name: newItem.name.trim(),
        category: newItem.category,
        quantity: Number(newItem.quantity),
        unit: newItem.unit,
        minimumStock: Number(newItem.minimumStock),
        lastUpdated: serverTimestamp(),
        updatedBy: logisUser?.id || '',
      })
      toast.success(`${newItem.name} berhasil ditambahkan ke gudang`)
      setNewItem({ name: '', category: 'material', quantity: 0, unit: 'pcs', minimumStock: 5 })
      setShowAddForm(false)
    } catch {
      toast.error('Gagal menambah item')
    }
  }

  async function handleMutation() {
    if (!showMutationModal || !companyId) return
    const { item, type } = showMutationModal

    const newQty = type === 'in'
      ? item.quantity + mutationQty
      : item.quantity - mutationQty

    if (newQty < 0) {
      toast.error('Stok tidak boleh minus')
      return
    }

    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'inventory', item.id),
        {
          quantity: newQty,
          lastUpdated: serverTimestamp(),
          updatedBy: logisUser?.id || '',
        }
      )
      toast.success(
        type === 'in'
          ? `+${mutationQty} ${item.unit} masuk ke gudang`
          : `-${mutationQty} ${item.unit} keluar dari gudang`
      )
      setShowMutationModal(null)
      setMutationQty(1)
      setMutationNotes('')
    } catch {
      toast.error('Gagal update stok')
    }
  }

  const criticalItems = items.filter((i) => i.quantity <= i.minimumStock)

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    background: '#0a0a0a',
    border: '1px solid rgba(245,240,235,0.08)',
    color: '#f5f0eb',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,240,235,0.4)',
    marginBottom: '6px',
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/projects"
            className="inline-flex items-center gap-2 text-xs mb-3"
            style={{ color: 'rgba(245,240,235,0.3)' }}>
            <ArrowLeft size={12} />
            Semua Proyek
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: '#F97316' }}>
            Modul 02 — Gudang Digital
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5f0eb' }}>
            {project?.name || 'Memuat...'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
            {items.length} item terdaftar di gudang proyek ini
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest"
          style={{ background: '#F97316', color: '#0a0a0a' }}>
          <Plus size={15} />
          Tambah Item
        </button>
      </div>

      {/* Critical alert */}
      {criticalItems.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-6"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>
              {criticalItems.length} item stok kritis
            </p>
            <p className="text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>
              {criticalItems.map((i) => i.name).join(', ')} — segera lakukan request pengadaan
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'rgba(245,240,235,0.2)' }}>
          <Package size={40} className="mx-auto mb-4 opacity-30" style={{ color: '#f5f0eb' }} />
          <p className="text-sm mb-4">Gudang masih kosong</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: '#F97316' }}>
            <Plus size={14} />
            Tambah item pertama
          </button>
        </div>
      ) : (
        <>
          {/* Category groups */}
          {(Object.keys(categoryConfig) as InventoryCategory[]).map((cat) => {
            const catItems = items.filter((i) => i.category === cat)
            if (catItems.length === 0) return null
            const config = categoryConfig[cat]

            return (
              <div key={cat} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                  <span className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: config.color }}>
                    {config.label}
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(245,240,235,0.2)' }}>
                    ({catItems.length})
                  </span>
                </div>

                <div className="space-y-1">
                  {catItems.map((item) => {
                    const isCritical = item.quantity <= item.minimumStock
                    const isLow = item.quantity <= item.minimumStock * 1.5

                    return (
                      <div key={item.id}
  className="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-4"
                        style={{
                          background: '#111111',
                          border: isCritical
                            ? '1px solid rgba(239,68,68,0.25)'
                            : '1px solid rgba(245,240,235,0.06)',
                        }}>
                        {/* Status dot */}
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: isCritical ? '#ef4444' : isLow ? '#eab308' : '#22c55e',
                            boxShadow: isCritical ? '0 0 6px #ef4444' : 'none',
                          }} />

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#f5f0eb' }}>
                            {item.name}
                          </p>
                          {isCritical && (
                            <p className="text-xs flex items-center gap-1 mt-0.5"
                              style={{ color: '#ef4444' }}>
                              <TrendingDown size={10} />
                              Stok kritis — min {item.minimumStock} {item.unit}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="text-right mr-2 lg:mr-4">
  <span className="text-base lg:text-lg font-black font-mono"
                            style={{
                              color: isCritical ? '#ef4444' : isLow ? '#eab308' : '#f5f0eb',
                            }}>
                            {item.quantity}
                          </span>
                          <span className="text-xs ml-1"
                            style={{ color: 'rgba(245,240,235,0.3)' }}>
                            {item.unit}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => setShowMutationModal({ item, type: 'in' })}
                            className="p-2 transition-all"
                            title="Barang masuk"
                            style={{
                              background: 'rgba(34,197,94,0.1)',
                              border: '1px solid rgba(34,197,94,0.2)',
                              color: '#22c55e',
                            }}>
                            <ArrowUp size={13} />
                          </button>
                          <button
                            onClick={() => setShowMutationModal({ item, type: 'out' })}
                            className="p-2 transition-all"
                            title="Barang keluar"
                            style={{
                              background: 'rgba(249,115,22,0.1)',
                              border: '1px solid rgba(249,115,22,0.2)',
                              color: '#F97316',
                            }}>
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md"
            style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.1)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}>
              <h3 className="text-sm font-bold uppercase tracking-widest"
                style={{ color: '#f5f0eb' }}>
                Tambah Item Gudang
              </h3>
              <button onClick={() => setShowAddForm(false)}
                style={{ color: 'rgba(245,240,235,0.3)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label style={labelStyle}>Nama Barang</label>
                <input value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Semen Portland, Helm Safety, dll"
                  style={inputStyle} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Kategori</label>
                  <select value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as InventoryCategory })}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {(Object.keys(categoryConfig) as InventoryCategory[]).map((cat) => (
                      <option key={cat} value={cat} style={{ background: '#111' }}>
                        {categoryConfig[cat].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Satuan</label>
                  <select value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {UNITS.map((u) => (
                      <option key={u} value={u} style={{ background: '#111' }}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Stok Awal</label>
                  <input type="number" min="0" value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Stok Minimum</label>
                  <input type="number" min="0" value={newItem.minimumStock}
                    onChange={(e) => setNewItem({ ...newItem, minimumStock: Number(e.target.value) })}
                    style={inputStyle} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-widest"
                  style={{ background: '#F97316', color: '#0a0a0a' }}>
                  Tambah ke Gudang
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 text-sm"
                  style={{ border: '1px solid rgba(245,240,235,0.1)', color: 'rgba(245,240,235,0.4)' }}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mutation Modal */}
      {showMutationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm"
            style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.1)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}>
              <h3 className="text-sm font-bold uppercase tracking-widest"
                style={{
                  color: showMutationModal.type === 'in' ? '#22c55e' : '#F97316',
                }}>
                {showMutationModal.type === 'in' ? '↑ Barang Masuk' : '↓ Barang Keluar'}
              </h3>
              <button onClick={() => setShowMutationModal(null)}
                style={{ color: 'rgba(245,240,235,0.3)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3"
                style={{ background: '#0a0a0a', border: '1px solid rgba(245,240,235,0.06)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(245,240,235,0.3)' }}>Item</p>
                <p className="text-sm font-semibold" style={{ color: '#f5f0eb' }}>
                  {showMutationModal.item.name}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(245,240,235,0.4)' }}>
                  Stok saat ini:{' '}
                  <span className="font-bold" style={{ color: '#F97316' }}>
                    {showMutationModal.item.quantity} {showMutationModal.item.unit}
                  </span>
                </p>
              </div>

              <div>
                <label style={labelStyle}>
                  Jumlah {showMutationModal.type === 'in' ? 'Masuk' : 'Keluar'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={mutationQty}
                  onChange={(e) => setMutationQty(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Catatan (opsional)</label>
                <input
                  value={mutationNotes}
                  onChange={(e) => setMutationNotes(e.target.value)}
                  placeholder="Dari PO #001, untuk zona A, dll"
                  style={inputStyle}
                />
              </div>

              {/* Preview */}
              <div className="flex items-center justify-between p-3"
                style={{
                  background: showMutationModal.type === 'in'
                    ? 'rgba(34,197,94,0.05)'
                    : 'rgba(249,115,22,0.05)',
                  border: showMutationModal.type === 'in'
                    ? '1px solid rgba(34,197,94,0.2)'
                    : '1px solid rgba(249,115,22,0.2)',
                }}>
                <span className="text-xs" style={{ color: 'rgba(245,240,235,0.4)' }}>
                  Stok setelah mutasi
                </span>
                <span className="text-lg font-black font-mono"
                  style={{
                    color: showMutationModal.type === 'in' ? '#22c55e' : '#F97316',
                  }}>
                  {showMutationModal.type === 'in'
                    ? showMutationModal.item.quantity + mutationQty
                    : showMutationModal.item.quantity - mutationQty}{' '}
                  <span className="text-xs font-normal">
                    {showMutationModal.item.unit}
                  </span>
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={handleMutation}
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-widest"
                  style={{
                    background: showMutationModal.type === 'in' ? '#22c55e' : '#F97316',
                    color: '#0a0a0a',
                  }}>
                  Konfirmasi
                </button>
                <button onClick={() => setShowMutationModal(null)}
                  className="px-4 py-2.5 text-sm"
                  style={{ border: '1px solid rgba(245,240,235,0.1)', color: 'rgba(245,240,235,0.4)' }}>
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}