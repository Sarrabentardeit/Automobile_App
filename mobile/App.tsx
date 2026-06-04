import { useEffect, useLayoutEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { apiUrl } from './src/lib/config'
import { setAuthBridge } from './src/lib/api'
import {
  clearSession,
  getRefreshToken,
  loadSession,
  updateAccessTokens,
} from './src/lib/authStorage'
import LoginScreen from './src/screens/LoginScreen'
import MainApp from './src/screens/MainApp'

export default function App() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof loadSession>>>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    void loadSession().then((s) => {
      setSession(s)
      setBooting(false)
    })
  }, [])

  useLayoutEffect(() => {
    setAuthBridge({
      refresh: async () => {
        const refreshToken = await getRefreshToken()
        if (!refreshToken) return null
        try {
          const res = await fetch(apiUrl('/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          const json = (await res.json().catch(() => ({}))) as {
            accessToken?: string
            refreshToken?: string
          }
          if (!res.ok || !json.accessToken) return null
          await updateAccessTokens(json.accessToken, json.refreshToken)
          setSession((prev) =>
            prev ? { ...prev, accessToken: json.accessToken! } : prev
          )
          return json.accessToken
        } catch {
          return null
        }
      },
      onSessionExpired: () => {
        void clearSession().then(() => setSession(null))
      },
    })
    return () => setAuthBridge(null)
  }, [])

  const handleLogout = () => {
    void clearSession().then(() => setSession(null))
  }

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#ea580c" />
        <StatusBar style="light" />
      </View>
    )
  }

  if (!session) {
    return (
      <LoginScreen
        onSuccess={() => {
          void loadSession().then(setSession)
        }}
      />
    )
  }

  return (
    <MainApp
      user={session.user}
      accessToken={session.accessToken}
      onLogout={handleLogout}
    />
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
})
