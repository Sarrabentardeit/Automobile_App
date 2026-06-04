import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import SafeScreen from '../components/SafeScreen'
import { login } from '../lib/api'
import { normalizeStoredUser, saveSession, type StoredUser } from '../lib/authStorage'
import { mergePermissions } from '../types/permissions'

type Props = {
  onSuccess: (user: StoredUser) => void
}

function useLayout() {
  const { width, height } = useWindowDimensions()
  return useMemo(() => {
    const compact = height < 700
    const tiny = height < 600
    const wide = width >= 400
    const horizontalPad = Math.max(16, Math.min(28, width * 0.06))
    const logoSize = tiny ? 64 : compact ? 80 : Math.min(100, width * 0.24)
    return {
      compact,
      tiny,
      wide,
      horizontalPad,
      logoSize,
      titleSize: tiny ? 20 : 22,
      brandSize: tiny ? 16 : 18,
    }
  }, [width, height])
}

export default function LoginScreen({ onSuccess }: Props) {
  const layout = useLayout()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)

  const passwordRef = useRef<TextInput>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(24)).current

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, slideAnim])

  const handleLogin = async () => {
    Keyboard.dismiss()
    setError(null)
    if (!email.trim()) {
      setError('Veuillez saisir votre email')
      return
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe')
      return
    }
    setLoading(true)
    try {
      const res = await login(email, password)
      const user = normalizeStoredUser({
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.fullName,
        role: res.user.role,
        permissions: mergePermissions(res.user.role, res.user.permissions),
      })
      await saveSession(user, res.accessToken, res.refreshToken)
      onSuccess(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient
      colors={['#030712', '#111827', '#0f172a', '#030712']}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar style="light" />
      <View style={styles.glowOrange} />
      <View style={styles.glowCyan} />

      <SafeScreen style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              contentContainerStyle={[
                styles.scroll,
                {
                  paddingHorizontal: layout.horizontalPad,
                  paddingVertical: layout.tiny ? 12 : layout.compact ? 16 : 28,
                  minHeight: '100%',
                },
                layout.compact ? styles.scrollCompact : null,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={[
                  styles.content,
                  layout.wide && styles.contentWide,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <View
                  style={[
                    styles.header,
                    { marginBottom: layout.compact ? 14 : 24 },
                  ]}
                >
                  <View style={styles.logoRing}>
                    <Image
                      source={require('../../assets/logo.jpg')}
                      style={{
                        width: layout.logoSize,
                        height: layout.logoSize,
                        borderRadius: 14,
                      }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.brand, { fontSize: layout.brandSize }]}>
                    EL MECANO
                  </Text>
                  <Text style={styles.tagline}>Système de Gestion Interne</Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardAccent} />
                  <Text style={[styles.cardTitle, { fontSize: layout.titleSize }]}>
                    Connexion
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Accédez à votre espace de travail
                  </Text>

                  <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <View
                      style={[
                        styles.inputRow,
                        emailFocused && styles.inputRowFocused,
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={emailFocused ? '#f97316' : '#9ca3af'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="votre@elmecano.tn"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        textContentType="username"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t)
                          if (error) setError(null)
                        }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Mot de passe</Text>
                    <View
                      style={[
                        styles.inputRow,
                        pwFocused && styles.inputRowFocused,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={pwFocused ? '#f97316' : '#9ca3af'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={passwordRef}
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={!showPw}
                        autoComplete="password"
                        textContentType="password"
                        returnKeyType="done"
                        value={password}
                        onChangeText={(t) => {
                          setPassword(t)
                          if (error) setError(null)
                        }}
                        onFocus={() => setPwFocused(true)}
                        onBlur={() => setPwFocused(false)}
                        onSubmitEditing={() => {
                          if (canSubmit) void handleLogin()
                        }}
                        editable={!loading}
                      />
                      <Pressable
                        style={styles.eyeBtn}
                        onPress={() => setShowPw((v) => !v)}
                        hitSlop={12}
                        accessibilityLabel={
                          showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                        }
                      >
                        <Ionicons
                          name={showPw ? 'eye-off-outline' : 'eye-outline'}
                          size={22}
                          color="#6b7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {error ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={18} color="#dc2626" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => void handleLogin()}
                    disabled={!canSubmit}
                    style={({ pressed }) => [
                      styles.btnWrap,
                      !canSubmit && styles.btnWrapDisabled,
                      pressed && canSubmit && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSubmit }}
                  >
                    <LinearGradient
                      colors={
                        !canSubmit
                          ? ['#d1d5db', '#9ca3af']
                          : loading
                            ? ['#fdba74', '#fb923c']
                            : ['#f97316', '#ea580c']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      {loading ? (
                        <View style={styles.btnRow}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.btnText}>Connexion...</Text>
                        </View>
                      ) : (
                        <View style={styles.btnRow}>
                          <Text style={styles.btnText}>Se connecter</Text>
                          <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </Animated.View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeScreen>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollCompact: {
    justifyContent: 'flex-start',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  contentWide: {
    maxWidth: 440,
  },
  glowOrange: {
    position: 'absolute',
    top: '6%',
    left: '-12%',
    width: '55%',
    aspectRatio: 1,
    maxWidth: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  glowCyan: {
    position: 'absolute',
    bottom: '8%',
    right: '-12%',
    width: '58%',
    aspectRatio: 1,
    maxWidth: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  header: {
    alignItems: 'center',
  },
  logoRing: {
    padding: 6,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  brand: {
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#f97316',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    marginTop: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    minHeight: 52,
    paddingRight: 4,
  },
  inputRowFocused: {
    borderColor: '#f97316',
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
    paddingRight: 8,
    minWidth: 0,
  },
  eyeBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  btnWrap: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  btnWrapDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
  },
  btnGradient: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
