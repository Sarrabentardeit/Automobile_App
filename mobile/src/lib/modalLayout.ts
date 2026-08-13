import { Dimensions } from 'react-native'
import { getSheetBottomInset } from './safeArea'

/**
 * Dimensions stables pour modals centrés (Android + iOS).
 * Évite ScrollView flex:1 avec parent maxHeight seul → hauteur 0 / champs invisibles.
 */
export function getModalLayout(options?: {
  /** Plafond carte (px) */
  maxCard?: number
  /** Réserve header + footer (px) */
  chrome?: number
}) {
  const winH = Dimensions.get('window').height
  const winW = Dimensions.get('window').width
  const bottomInset = getSheetBottomInset()
  const maxCard = options?.maxCard ?? 680
  const chrome = options?.chrome ?? 150
  const cardMaxHeight = Math.min(winH * 0.86, maxCard)
  const scrollMaxHeight = Math.max(200, cardMaxHeight - chrome - Math.min(bottomInset, 48))
  const cardWidth = Math.min(winW - 32, 440)
  const footerPaddingBottom = Math.max(16, bottomInset)

  return {
    bottomInset,
    cardMaxHeight,
    scrollMaxHeight,
    cardWidth,
    footerPaddingBottom,
  }
}
