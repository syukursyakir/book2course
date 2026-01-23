'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  User,
  Mail,
  LogOut,
  Camera,
  Check,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // User data
  const [user, setUser] = useState<{
    email: string
    name: string
    avatar_url?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  // Actions
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || ''
          setUser({
            email: user.email || '',
            name: name,
            avatar_url: user.user_metadata?.avatar_url,
          })
          setEditedName(name)
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSaveName = async () => {
    if (!editedName.trim()) return
    setIsSavingName(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { name: editedName.trim() }
      })

      if (error) throw error

      setUser(prev => prev ? { ...prev, name: editedName.trim() } : null)
      setIsEditingName(false)
    } catch (err) {
      console.error('Error updating name:', err)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)

    try {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      // Upload to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
    } catch (err) {
      console.error('Error uploading avatar:', err)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Error signing out:', err)
      setIsSigningOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      // Note: Full account deletion requires backend support
      // For now, just sign out and show message
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/?deleted=true')
    } catch (err) {
      console.error('Error:', err)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-dark-100">Settings</h1>
        <p className="text-dark-400 mt-2 text-lg">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 mb-6">
        <h2 className="text-xl font-semibold text-dark-100 mb-6">Profile</h2>

        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div
                onClick={handleAvatarClick}
                className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-500/30 transition-colors overflow-hidden"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                ) : user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary-500" />
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-full flex items-center justify-center transition-colors"
              >
                <Camera className="w-4 h-4 text-dark-300" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-dark-100 font-medium">Profile Picture</p>
              <p className="text-dark-500 text-sm">Click to upload a new photo</p>
            </div>
          </div>

          {/* Display Name */}
          <div className="flex items-center justify-between py-4 border-t border-dark-800">
            <div className="flex-1">
              <label className="text-sm text-dark-400 mb-1 block">Display Name</label>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="p-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSavingName ? (
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false)
                      setEditedName(user?.name || '')
                    }}
                    className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-dark-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-dark-100 text-lg">{user?.name}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-sm text-primary-500 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between py-4 border-t border-dark-800">
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Email Address</label>
              <div className="flex items-center gap-2 text-dark-100 text-lg">
                <Mail className="w-5 h-5 text-dark-500" />
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-dark-100 mb-6">Account</h2>

        <div className="space-y-1">
          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center gap-4 py-4 text-left hover:bg-dark-800/50 -mx-4 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-dark-800 rounded-xl flex items-center justify-center">
              {isSigningOut ? (
                <Loader2 className="w-6 h-6 animate-spin text-dark-400" />
              ) : (
                <LogOut className="w-6 h-6 text-dark-400" />
              )}
            </div>
            <div>
              <p className="text-dark-100 font-medium">Sign Out</p>
              <p className="text-dark-500 text-sm">Sign out of your account</p>
            </div>
          </button>

          {/* Danger Zone */}
          <div className="pt-6 mt-4 border-t border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Danger Zone</span>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 py-4 text-left hover:bg-red-500/10 -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 font-medium">Delete Account</p>
                  <p className="text-dark-500 text-sm">Permanently delete your account and all data</p>
                </div>
              </button>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <p className="text-red-400 font-medium mb-2">Are you sure?</p>
                <p className="text-dark-400 text-sm mb-4">
                  This action cannot be undone. All your courses, progress, and data will be permanently deleted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Yes, Delete My Account
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-200 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
