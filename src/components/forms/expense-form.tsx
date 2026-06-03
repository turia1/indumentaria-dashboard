"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  type: "fixed" | "variable"
  color: string | null
}

interface Location {
  id: string
  name: string
}

interface Props {
  categories: Category[]
  locations:  Location[]
}

export function ExpenseForm({ categories, locations }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const [form, setForm] = useState({
    description: "",
    amount:      "",
    categoryId:  "",
    locationId:  "",
    date:        new Date().toISOString().split("T")[0],
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/v1/expenses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          amount: parseFloat(form.amount.replace(/\./g, "").replace(",", ".")),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al guardar")
        return
      }

      setOpen(false)
      setForm({
        description: "",
        amount:      "",
        categoryId:  "",
        locationId:  "",
        date:        new Date().toISOString().split("T")[0],
      })
      router.refresh()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-2 text-sm transition"
      >
        <Plus className="w-4 h-4" />
        Nuevo gasto
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Card */}
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Nuevo gasto</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Descripción *</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Alquiler local Quilmes junio"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Monto (ARS) *</label>
                  <input
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="150000"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Fecha *</label>
                  <input
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    type="date"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Categoría</label>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type === "fixed" ? "Fijo" : "Variable"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Local (opcional)</label>
                <select
                  name="locationId"
                  value={form.locationId}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General (todos los locales)</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl px-4 py-2.5 text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition",
                    loading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  ) : (
                    "Guardar gasto"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}
