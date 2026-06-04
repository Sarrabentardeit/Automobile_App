import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import type { ContactImportant } from '../../types/contactImportant'

type Props = {
  contact: ContactImportant
  onPress: () => void
}

export default function ContactImportantListItem({ contact, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Contact ${contact.nom}`}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="call" size={20} color={theme.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.nom}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {contact.numero}
          </Text>
          {contact.categorie ? (
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{contact.categorie}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  cardPressed: {
    backgroundColor: theme.surfaceMuted,
    borderColor: theme.primary + '55',
  },
  accent: { width: 4, backgroundColor: theme.primary },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: theme.text },
  phone: { fontSize: 14, fontWeight: '600', color: theme.primary, marginTop: 3 },
  catBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: theme.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  catText: { fontSize: 10, fontWeight: '700', color: theme.textSecondary },
})
