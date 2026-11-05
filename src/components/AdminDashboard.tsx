'use client'

import { useState, useTransition, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Users,
  Activity,
  Dumbbell,
  Layers,
  Search,
  Download,
  RefreshCw,
  Shield,
  ShieldAlert,
  ChevronRight,
  Calendar,
  X,
  Edit3,
  Check,
  Trash2,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import type {
  MemberSummary,
  MemberRole,
  MemberFullDetails,
} from '@/lib/actions/admin'
import {
  getAdminMembersSummary,
  getMemberFullDetails,
  updateMemberRole,
  updateMemberDisplayName,
  deleteMemberWorkout,
} from '@/lib/actions/admin'

interface AdminDashboardProps {
  initialMembers: MemberSummary[]
  currentUserId?: string
  migrationNeeded?: boolean
  locale: string
}

export default function AdminDashboard({
  initialMembers,
  currentUserId,
  migrationNeeded,
  locale,
}: AdminDashboardProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [members, setMembers] = useState<MemberSummary[]>(initialMembers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all')
  const [activityFilter, setActivityFilter] = useState<'all' | 'active7' | 'active30' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'lastActive' | 'joined' | 'workouts' | 'name'>('lastActive')

  // Selected member for detail modal
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberDetails, setMemberDetails] = useState<MemberFullDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingNameValue, setEditingNameValue] = useState('')

  const [isPending, startTransition] = useTransition()
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text })
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  // Refresh data
  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getAdminMembersSummary()
      if (res.members) {
        setMembers(res.members)
        showFeedback(t('updateSuccess'))
      } else if (res.error) {
        showFeedback(res.error, 'error')
      }
    })
  }

  // Open member details
  const handleOpenMember = async (memberId: string) => {
    setSelectedMemberId(memberId)
    setIsLoadingDetails(true)
    setIsEditingName(false)
    const res = await getMemberFullDetails(memberId)
    setIsLoadingDetails(false)
    if (res.details) {
      setMemberDetails(res.details)
      setEditingNameValue(res.details.member.display_name)
    } else if (res.error) {
      showFeedback(res.error, 'error')
      setSelectedMemberId(null)
    }
  }

  // Close modal
  const handleCloseModal = () => {
    setSelectedMemberId(null)
    setMemberDetails(null)
    setIsEditingName(false)
  }

  // Role toggle
  const handleToggleRole = (member: MemberSummary) => {
    const nextRole: MemberRole = member.role === 'admin' ? 'member' : 'admin'
    const confirmText = t('confirmRoleChange', { role: nextRole })
    if (!window.confirm(confirmText)) return

    startTransition(async () => {
      const res = await updateMemberRole(member.id, nextRole)
      if (res.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m))
        )
        if (memberDetails && memberDetails.member.id === member.id) {
          setMemberDetails({
            ...memberDetails,
            member: { ...memberDetails.member, role: nextRole },
          })
        }
        showFeedback(t('updateSuccess'))
      } else if (res.error) {
        showFeedback(res.error, 'error')
      }
    })
  }

  // Save display name
  const handleSaveDisplayName = () => {
    if (!selectedMemberId || !editingNameValue.trim()) return

    startTransition(async () => {
      const res = await updateMemberDisplayName(selectedMemberId, editingNameValue.trim())
      if (res.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === selectedMemberId ? { ...m, display_name: editingNameValue.trim() } : m))
        )
        if (memberDetails) {
          setMemberDetails({
            ...memberDetails,
            member: { ...memberDetails.member, display_name: editingNameValue.trim() },
          })
        }
        setIsEditingName(false)
        showFeedback(t('updateSuccess'))
      } else if (res.error) {
        showFeedback(res.error, 'error')
      }
    })
  }

  // Delete member workout
  const handleDeleteWorkout = (workoutId: string) => {
    if (!window.confirm(t('deleteWorkoutConfirm'))) return

    startTransition(async () => {
      const res = await deleteMemberWorkout(workoutId)
      if (res.success) {
        if (memberDetails) {
          const updatedWorkouts = memberDetails.workouts.filter((w) => w.id !== workoutId)
          const deletedW = memberDetails.workouts.find((w) => w.id === workoutId)
          const setsSub = deletedW ? deletedW.sets_count : 0
          setMemberDetails({
            ...memberDetails,
            workouts: updatedWorkouts,
            member: {
              ...memberDetails.member,
              workouts_count: Math.max(0, memberDetails.member.workouts_count - 1),
              sets_count: Math.max(0, memberDetails.member.sets_count - setsSub),
            },
          })
          setMembers((prev) =>
            prev.map((m) =>
              m.id === memberDetails.member.id
                ? {
                    ...m,
                    workouts_count: Math.max(0, m.workouts_count - 1),
                    sets_count: Math.max(0, m.sets_count - setsSub),
                  }
                : m
            )
          )
        }
        showFeedback(t('deleteSuccess'))
      } else if (res.error) {
        showFeedback(res.error, 'error')
      }
    })
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['User ID', 'Email', 'Display Name', 'Role', 'Created At', 'Workouts Count', 'Sets Count', 'Last Workout Date']
    const rows = filteredMembers.map((m) => [
      m.id,
      m.email,
      `"${m.display_name.replace(/"/g, '""')}"`,
      m.role,
      m.created_at,
      m.workouts_count,
      m.sets_count,
      m.last_workout_date || 'N/A',
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    return members
      .filter((m) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchEmail = m.email.toLowerCase().includes(q)
          const matchName = m.display_name.toLowerCase().includes(q)
          const matchId = m.id.toLowerCase().includes(q)
          if (!matchEmail && !matchName && !matchId) return false
        }

        // Role filter
        if (roleFilter !== 'all' && m.role !== roleFilter) {
          return false
        }

        // Activity filter
        if (activityFilter === 'active7') {
          return m.last_workout_date && m.last_workout_date >= sevenDaysAgo
        }
        if (activityFilter === 'active30') {
          return m.last_workout_date && m.last_workout_date >= thirtyDaysAgo
        }
        if (activityFilter === 'inactive') {
          return !m.last_workout_date || m.workouts_count === 0
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'lastActive') {
          if (!a.last_workout_date && !b.last_workout_date) return 0
          if (!a.last_workout_date) return 1
          if (!b.last_workout_date) return -1
          return b.last_workout_date.localeCompare(a.last_workout_date)
        }
        if (sortBy === 'joined') {
          return b.created_at.localeCompare(a.created_at)
        }
        if (sortBy === 'workouts') {
          return b.workouts_count - a.workouts_count
        }
        if (sortBy === 'name') {
          return a.display_name.localeCompare(b.display_name)
        }
        return 0
      })
  }, [members, searchQuery, roleFilter, activityFilter, sortBy])

  // KPI Calculations
  const totalMembersCount = members.length
  const activeMembers30dCount = members.filter((m) => m.active_days_30d > 0).length
  const totalWorkoutsCount = members.reduce((sum, m) => sum + m.workouts_count, 0)
  const totalSetsCount = members.reduce((sum, m) => sum + m.sets_count, 0)

  return (
    <div className="admin-wide-container w-full space-y-6 pb-20">
      {/* Migration Alert if table missing */}
      {migrationNeeded && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{t('migrationAlert')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              File: <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono">supabase/migrations/20261105_add_profiles_and_admin.sql</code>
            </p>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {feedbackMessage.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {feedbackMessage.text}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('title')}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
            title={t('refresh')}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm"
            title={t('exportCsv')}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t('exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Members */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('totalMembers')}</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-foreground">{totalMembersCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {members.filter((m) => m.role === 'admin').length} {t('filterRoleAdmin')}
            </div>
          </div>
        </div>

        {/* Active Members (30d) */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('activeMembers')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-foreground">{activeMembers30dCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {totalMembersCount > 0 ? Math.round((activeMembers30dCount / totalMembersCount) * 100) : 0}% 活躍率
            </div>
          </div>
        </div>

        {/* Total Workouts */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('totalWorkouts')}</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Dumbbell className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-foreground">{totalWorkoutsCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              平均 {(totalMembersCount > 0 ? totalWorkoutsCount / totalMembersCount : 0).toFixed(1)} 場/人
            </div>
          </div>
        </div>

        {/* Total Sets Completed */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('totalSets')}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-foreground">{totalSetsCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              平均 {(totalWorkoutsCount > 0 ? totalSetsCount / totalWorkoutsCount : 0).toFixed(1)} 組/場
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-medium bg-background border border-border rounded-lg text-foreground focus:outline-none"
            >
              <option value="all">{t('filterRoleAll')}</option>
              <option value="admin">{t('filterRoleAdmin')}</option>
              <option value="member">{t('filterRoleMember')}</option>
            </select>

            {/* Activity Filter */}
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-medium bg-background border border-border rounded-lg text-foreground focus:outline-none"
            >
              <option value="all">{t('filterActivityAll')}</option>
              <option value="active7">{t('filterActivityActive7')}</option>
              <option value="active30">{t('filterActivityActive30')}</option>
              <option value="inactive">{t('filterActivityInactive')}</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-medium bg-background border border-border rounded-lg text-foreground focus:outline-none"
            >
              <option value="lastActive">{t('sortLastActive')}</option>
              <option value="joined">{t('sortJoined')}</option>
              <option value="workouts">{t('sortWorkouts')}</option>
              <option value="name">{t('sortName')}</option>
            </select>
          </div>
        </div>

        {/* Results summary chip */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>顯示 {filteredMembers.length} 位會員（共 {members.length} 位）</span>
          {(searchQuery || roleFilter !== 'all' || activityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setRoleFilter('all')
                setActivityFilter('all')
              }}
              className="text-primary hover:underline font-medium"
            >
              清除所有篩選
            </button>
          )}
        </div>
      </div>

      {/* Members List - Table on Desktop, Cards on Mobile */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-border bg-card">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">{t('noMembersFound')}</p>
          <p className="text-xs text-muted-foreground mt-1">請嘗試變更搜尋字串或重設篩選條件</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">{t('member')}</th>
                  <th className="px-4 py-3">{t('role')}</th>
                  <th className="px-4 py-3 text-center">{t('workouts')}</th>
                  <th className="px-4 py-3 text-center">{t('setsCount')}</th>
                  <th className="px-4 py-3">{t('lastWorkout')}</th>
                  <th className="px-4 py-3">{t('joinedAt')}</th>
                  <th className="px-4 py-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((member) => {
                  const isCurrent = currentUserId === member.id
                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenMember(member.id)}
                    >
                      {/* Member Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary/80 to-blue-400 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                            {member.display_name.slice(0, 2) || member.email.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                              <span>{member.display_name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate font-mono">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleRole(member)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            member.role === 'admin'
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/25'
                              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                          } ${isCurrent ? 'cursor-default opacity-85' : 'cursor-pointer'}`}
                          title={isCurrent ? 'Cannot demote yourself' : '點擊切換權限'}
                        >
                          {member.role === 'admin' ? (
                            <>
                              <Shield className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              <span>{t('filterRoleAdmin')}</span>
                            </>
                          ) : (
                            <span>{t('filterRoleMember')}</span>
                          )}
                        </button>
                      </td>

                      {/* Workouts */}
                      <td className="px-4 py-3.5 text-center font-semibold text-foreground">
                        {member.workouts_count}
                      </td>

                      {/* Sets */}
                      <td className="px-4 py-3.5 text-center text-muted-foreground font-mono">
                        {member.sets_count}
                      </td>

                      {/* Last Workout */}
                      <td className="px-4 py-3.5">
                        {member.last_workout_date ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-foreground">{member.last_workout_date}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">{t('never')}</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {member.created_at ? member.created_at.split('T')[0] : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenMember(member.id)
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <span>{t('viewDetails')}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredMembers.map((member) => {
              const isCurrent = currentUserId === member.id
              return (
                <div
                  key={member.id}
                  onClick={() => handleOpenMember(member.id)}
                  className="p-4 rounded-xl border border-border bg-card shadow-xs active:scale-[0.99] transition-transform cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/80 to-blue-400 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                        {member.display_name.slice(0, 2) || member.email.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
                          <span>{member.display_name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {member.email}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        member.role === 'admin'
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {member.role === 'admin' && <Shield className="h-3 w-3" />}
                      {member.role === 'admin' ? t('filterRoleAdmin') : t('filterRoleMember')}
                    </span>
                  </div>

                  {/* Mobile Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-muted/40 border border-border/50 text-center text-xs">
                    <div>
                      <div className="text-muted-foreground text-[10px]">{t('workouts')}</div>
                      <div className="font-bold text-foreground text-sm">{member.workouts_count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">{t('setsCount')}</div>
                      <div className="font-bold text-foreground text-sm">{member.sets_count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">{t('lastWorkout')}</div>
                      <div className="font-medium text-foreground text-[11px] truncate">
                        {member.last_workout_date || t('never')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>加入：{member.created_at ? member.created_at.split('T')[0] : 'N/A'}</span>
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      {t('viewDetails')} <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Member Details Modal / Drawer */}
      {selectedMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {memberDetails?.member.display_name.slice(0, 2) || 'MB'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    {memberDetails?.member.display_name || t('memberDetails')}
                    {memberDetails && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                          memberDetails.member.role === 'admin'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {memberDetails.member.role === 'admin' ? t('filterRoleAdmin') : t('filterRoleMember')}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {memberDetails?.member.email || selectedMemberId}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={tCommon('close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {isLoadingDetails ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
                </div>
              ) : memberDetails ? (
                <>
                  {/* Basic Info & Role Management Section */}
                  <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t('basicInfo')}
                      </span>

                      {/* Role promote/demote button */}
                      {currentUserId !== memberDetails.member.id && (
                        <button
                          onClick={() => handleToggleRole(memberDetails.member)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                        >
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {memberDetails.member.role === 'admin'
                              ? t('demoteToMember')
                              : t('promoteToAdmin')}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t('userId')}:</span>
                        <div className="font-mono text-foreground mt-0.5 select-all break-all">
                          {memberDetails.member.id}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground">{t('joinedAt')}:</span>
                        <div className="font-medium text-foreground mt-0.5">
                          {memberDetails.member.created_at ? new Date(memberDetails.member.created_at).toLocaleString(locale) : 'N/A'}
                        </div>
                      </div>

                      {/* Display name edit field */}
                      <div className="sm:col-span-2 pt-2 border-t border-border/50">
                        <span className="text-muted-foreground">{t('displayName')}:</span>
                        {isEditingName ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            <button
                              onClick={handleSaveDisplayName}
                              disabled={isPending}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingName(false)
                                setEditingNameValue(memberDetails.member.display_name)
                              }}
                              className="px-2 py-1.5 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold text-foreground">
                              {memberDetails.member.display_name}
                            </span>
                            <button
                              onClick={() => setIsEditingName(true)}
                              className="p-1 text-muted-foreground hover:text-primary transition-colors"
                              title={t('edit')}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Muscle Distribution Tags */}
                  {memberDetails.muscleDistribution.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t('muscleDistribution')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {memberDetails.muscleDistribution.map((item) => (
                          <span
                            key={item.category}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border/60 text-foreground flex items-center gap-1.5"
                          >
                            <span className="capitalize">{item.category}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                              {item.count} 組
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Exercises if any */}
                  {memberDetails.customExercises.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t('customExercises')} ({memberDetails.customExercises.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {memberDetails.customExercises.map((ex) => (
                          <div
                            key={ex.id}
                            className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs space-y-0.5"
                          >
                            <div className="font-semibold text-foreground">
                              {ex.name_zh || ex.name_en || ex.name_hu || 'Exercise'}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                              <span className="capitalize">{ex.category}</span>
                              <span className="font-mono text-[10px]">{ex.calculation_type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Workout History Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t('workoutHistory')} ({memberDetails.workouts.length})
                      </span>
                    </div>

                    {memberDetails.workouts.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
                        {t('noWorkoutsRecorded')}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {memberDetails.workouts.map((w) => (
                          <div
                            key={w.id}
                            className="p-3.5 rounded-xl border border-border bg-background space-y-2 shadow-2xs hover:border-border/80 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">
                                    {w.date}
                                  </span>
                                  {w.title && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      · {w.title}
                                    </span>
                                  )}
                                </div>
                                {w.notes && (
                                  <p className="text-xs text-muted-foreground/80 mt-0.5 italic">
                                    "{w.notes}"
                                  </p>
                                )}
                              </div>

                              <button
                                onClick={() => handleDeleteWorkout(w.id)}
                                disabled={isPending}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors shrink-0"
                                title={t('deleteWorkout')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Exercise breakdown */}
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                              {w.exercises.map((ex, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted/70 text-foreground font-medium flex items-center gap-1"
                                >
                                  <span>{ex.name_zh || ex.name_en || ex.name_hu}</span>
                                  <span className="text-muted-foreground text-[10px]">
                                    ({ex.set_count} 組)
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                {tCommon('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
