import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Props = {
  title: string
  subtitle?: string
}

export default function PlaceholderScreen({
  title,
  subtitle = 'Ce module sera disponible dans une prochaine mise à jour mobile. Utilisez la version web en attendant.',
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Ionicons name="phone-portrait-outline" size={40} color="#f97316" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.hint}>mecano.nav.ovh</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f3f4f6',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    marginTop: 20,
    fontSize: 13,
    color: '#f97316',
    fontWeight: '600',
  },
})
