import type { ReactNode } from 'react'
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native'
import ModalBlurBackdrop from './ModalBlurBackdrop'
import { getSheetBottomInset } from '../../lib/safeArea'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

type Props = {
  visible: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: number
}

/**
 * Overlay centré dans l'écran parent (pas de Modal RN) pour que le flou
 * capture bien la liste / le contenu derrière, notamment sur Android.
 */
export default function CenteredBlurModal({
  visible,
  onClose,
  children,
  maxWidth = 420,
}: Props) {
  if (!visible) return null

  const bottomInset = getSheetBottomInset()
  const topPad = 24
  const bottomPad = Math.max(24, bottomInset + 8)
  const maxDialogH = Math.max(280, SCREEN_H - topPad - bottomPad)

  return (
    <View
      style={[styles.portal, { paddingTop: topPad, paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.backdropLayer,
          Platform.OS === 'android' && bottomInset > 0 && { bottom: -bottomInset },
        ]}
      >
        <ModalBlurBackdrop onPress={onClose} />
      </View>
      <KeyboardAvoidingView
        style={[
          styles.dialog,
          { width: Math.min(SCREEN_W - 32, maxWidth), maxHeight: maxDialogH },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={[styles.dialogInner, { maxHeight: maxDialogH }]}>{children}</View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  portal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  dialog: {
    backgroundColor: 'transparent',
    zIndex: 2,
    elevation: 24,
  },
  dialogInner: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 20,
    flexShrink: 1,
  },
})
