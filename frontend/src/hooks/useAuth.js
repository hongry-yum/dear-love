import { useCallback, useState } from 'react'
import * as api from '../api.js'

const AUTH_KEY = 'dearlove.auth.v1'

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveAuth(auth) {
  try {
    if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
    else localStorage.removeItem(AUTH_KEY)
  } catch {
    /* best-effort only */
  }
}

export function useAuth() {
  const [auth, setAuth] = useState(loadAuth)

  const doSignup = useCallback(async (username, password) => {
    const result = await api.signup(username, password)
    setAuth(result)
    saveAuth(result)
    return result
  }, [])

  const doLogin = useCallback(async (username, password) => {
    const result = await api.login(username, password)
    setAuth(result)
    saveAuth(result)
    return result
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
    saveAuth(null)
  }, [])

  /** Call when the server reports the session is no longer valid (401). */
  const clearInvalidSession = useCallback(() => {
    setAuth(null)
    saveAuth(null)
  }, [])

  return { auth, doSignup, doLogin, logout, clearInvalidSession }
}
