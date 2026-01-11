import { useState, useCallback } from 'react'

export interface User {
  id: string
  username: string
  role: string
  createdAt: string
}

export interface CreateUserData {
  username: string
  password: string
  role: 'ADMIN' | 'USER'
}

export interface UpdateUserData {
  username?: string
  role?: 'ADMIN' | 'USER'
}

/**
 * ユーザー管理用カスタムフック
 * 管理者コンソールでのユーザーCRUD操作を提供
 */
export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * ユーザー一覧を取得
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'ユーザー一覧の取得に失敗しました')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 新規ユーザーを作成
   */
  const createUser = useCallback(async (data: CreateUserData) => {
    setError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'ユーザーの作成に失敗しました')
      }

      const result = await response.json()
      return result.user
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ユーザーの作成に失敗しました'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * ユーザー情報を更新
   */
  const updateUser = useCallback(async (id: string, data: UpdateUserData) => {
    setError(null)

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'ユーザーの更新に失敗しました')
      }

      const result = await response.json()
      return result.user
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ユーザーの更新に失敗しました'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * ユーザーを削除
   */
  const deleteUser = useCallback(async (id: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'ユーザーの削除に失敗しました')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ユーザーの削除に失敗しました'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * ユーザーのパスワードをリセット
   */
  const resetPassword = useCallback(async (id: string, newPassword: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'パスワードのリセットに失敗しました')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'パスワードのリセットに失敗しました'
      setError(errorMessage)
      throw err
    }
  }, [])

  return {
    users,
    loading,
    error,
    setError,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
  }
}
