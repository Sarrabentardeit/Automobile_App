export type ClientAvecDette = {
  id: number
  clientName: string
  telephoneClient: string
  designation: string
  reste: number
  notes?: string
}

export type ClientDetteInput = {
  clientName: string
  telephoneClient: string
  designation: string
  reste: number
  notes?: string
}
