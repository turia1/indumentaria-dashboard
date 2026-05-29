import { cn } from "@/lib/utils"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  loading?: boolean
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-indigo-400",
  loading = false,
}: KpiCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isNeutral = change === undefined || change === 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <div className={cn("p-2 rounded-xl bg-gray-800", iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-gray-800 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-gray-800 rounded-lg animate-pulse w-1/2" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-white mb-2">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
              {isNegative && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
              {isNeutral && <Minus className="w-3.5 h-3.5 text-gray-500" />}
              <span
                className={cn(
                  "text-xs font-medium",
                  isPositive && "text-emerald-400",
                  isNegative && "text-red-400",
                  isNeutral && "text-gray-500"
                )}
              >
                {change > 0 ? "+" : ""}{change?.toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
