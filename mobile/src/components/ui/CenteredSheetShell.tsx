import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from './CenteredBlurModal'
import { getModalLayout } from '../../lib/modalLayout'
import { theme } from '../../theme/appTheme'

type Props = {
  visible: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: number
  maxCard?: number
}

/**
 * Coquille commune pour fiches détail centrées (Android + iOS).
 * Remplace les anciens bottom sheets collés sous la barre système.
 */
export default function CenteredSheetShell({
  visible,
  onClose,
  children,
  footer,
  maxWidth = 420,
  maxCard = 640,
}: Props) {
  const { cardMaxHeight, scrollMaxHeight, footerPaddingBottom } = getModalLayout({
    maxCard,
    chrome: footer ? 140 : 80,
  })

  return (
    <CenteredBlurModal visible={visible} onClose={onClose} maxWidth={maxWidth}>
      <View style={[styles.card, { maxHeight: cardMaxHeight }]}>
        <View style={styles.accent} />
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeFab}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
        <ScrollView
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer ? (
          <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>{footer}</View>
        ) : null}
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    flexShrink: 1,
    elevation: 16,
  },
  accent: { height: 3, backgroundColor: theme.primary },
  closeFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
})
