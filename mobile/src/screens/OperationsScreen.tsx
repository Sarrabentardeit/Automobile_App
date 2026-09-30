import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  createOperation,
  createOperationEntry,
  deleteOperationEntry,
  fetchOperationEntries,
  fetchOperations,
  type GarageOperation,
  type OperationEntry,
} from '../lib/operationApi'
import { theme } from '../theme/appTheme'

type Props = {
  accessToken: string
  isAdmin: boolean
  canViewEquipeOutils: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

export default function OperationsScreen({ accessToken, isAdmin, canViewEquipeOutils }: Props) {
  const [operations, setOperations] = useState<GarageOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [selected, setSelected] = useState<GarageOperation | null>(null)
  const [entries, setEntries] = useState<OperationEntry[]>([])
  const [boardLoading, setBoardLoading] = useState(false)
  const [vehicule, setVehicule] = useState('')
  const [travaux, setTravaux] = useState('')
  const [prix, setPrix] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const rows = await fetchOperations(accessToken)
      setOperations((Array.isArray(rows) ? rows : []).filter((row) => row.actif))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewEquipeOutils) {
      setLoading(false)
      return
    }
    void load()
  }, [load, canViewEquipeOutils])

  const openBoard = async (operation: GarageOperation) => {
    setSelected(operation)
    setBoardLoading(true)
    try {
      const data = await fetchOperationEntries(accessToken, operation.id)
      setEntries(data.entries ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setEntries([])
    } finally {
      setBoardLoading(false)
    }
  }

  const addOp = async () => {
    const value = nom.trim()
    if (value.length < 2) {
      setError('Indiquez un nom')
      return
    }
    setError(null)
    try {
      await createOperation(accessToken, value)
      setNom('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const addEntry = async () => {
    if (!selected) return
    const amount = Number(prix.replace(',', '.'))
    if (!Number.isFinite(amount)) {
      setError('Prix invalide')
      return
    }
    setError(null)
    try {
      const created = await createOperationEntry(accessToken, selected.id, {
        date: today(),
        vehicule: vehicule.trim(),
        typeTravaux: travaux.trim(),
        prixGarage: null,
        prix: amount,
      })
      setEntries((prev) => [created, ...prev])
      setVehicule('')
      setTravaux('')
      setPrix('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
  }

  if (!canViewEquipeOutils) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Accès aux opérations refusé.</Text>
      </View>
    )
  }

  if (selected) {
    return (
      <View style={styles.page}>
        <Pressable style={styles.back} onPress={() => setSelected(null)}>
          <Ionicons name="chevron-back" size={18} color={theme.text} />
          <Text style={styles.backText}>Opérations</Text>
        </Pressable>
        <Text style={styles.title}>{selected.nom}</Text>
        <View style={styles.form}>
          <TextInput value={vehicule} onChangeText={setVehicule} placeholder="Véhicule" placeholderTextColor="#9ca3af" style={styles.input} />
          <TextInput value={travaux} onChangeText={setTravaux} placeholder="Travaux" placeholderTextColor="#9ca3af" style={styles.input} />
          <TextInput value={prix} onChangeText={setPrix} placeholder="Prix" keyboardType="decimal-pad" placeholderTextColor="#9ca3af" style={styles.input} />
          <Pressable style={styles.addBtn} onPress={() => void addEntry()}>
            <Text style={styles.addBtnText}>Ajouter</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {boardLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.muted}>Aucune ligne.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.vehicule || 'Sans véhicule'}</Text>
                  <Text style={styles.muted}>{item.date} · {item.typeTravaux || '—'}</Text>
                </View>
                <Text style={styles.price}>{item.prix.toFixed(2)} DT</Text>
                <Pressable
                  onPress={() => {
                    void deleteOperationEntry(accessToken, selected.id, item.id).then(() => {
                      setEntries((prev) => prev.filter((row) => row.id !== item.id))
                    })
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    )
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Opérations</Text>
      {isAdmin ? (
        <View style={styles.form}>
          <TextInput
            value={nom}
            onChangeText={setNom}
            placeholder="Nom opération"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
          <Pressable style={styles.addBtn} onPress={() => void addOp()}>
            <Text style={styles.addBtnText}>Ajouter</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={operations}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.muted}>Aucune opération.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => void openBoard(item)}>
              <Ionicons name="construct-outline" size={18} color={theme.primary} />
              <Text style={styles.cardTitle}>{item.nom}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 12 },
  form: { gap: 8, marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
  },
  addBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.text },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backText: { color: theme.text, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontWeight: '600', color: theme.text },
  price: { fontWeight: '700', color: theme.text },
  muted: { color: theme.textMuted, marginTop: 8 },
  error: { color: '#b91c1c', marginBottom: 8 },
})
