import type { ReactNode } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import ModalBlurBackdrop from './ModalBlurBackdrop'

type Props = {
  visible: boolean
  onClose: () => void
  /** Si true, un tap sur le fond ferme le modal (fiches). Désactivé par défaut pour les formulaires. */
  dismissOnBackdrop?: boolean
  children: ReactNode
}

/** Modal plein écran avec fond flou derrière le contenu */
export default function FullScreenBlurModal({
  visible,
  onClose,
  dismissOnBackdrop = false,
  children,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <ModalBlurBackdrop onPress={dismissOnBackdrop ? onClose : undefined} />
        <View style={styles.content}>{children}</View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    zIndex: 1,
    elevation: 12,
  },
})
