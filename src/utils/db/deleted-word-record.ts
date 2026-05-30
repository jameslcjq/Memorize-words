import { getUTCUnixTimestamp } from '..'

export interface IDeletedWordRecord {
  id?: number
  word: string
  dict: string
  deletedAt: number
}

export class DeletedWordRecord implements IDeletedWordRecord {
  word: string
  dict: string
  deletedAt: number

  constructor(word: string, dict: string, deletedAt = getUTCUnixTimestamp()) {
    this.word = word
    this.dict = dict
    this.deletedAt = deletedAt
  }
}
