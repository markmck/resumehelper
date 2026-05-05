import { Packer } from 'docx'
import { unzipSync } from 'fflate'
import type { Document } from 'docx'

export async function unzipDocxXml(doc: Document): Promise<string> {
  const buffer = await Packer.toBuffer(doc)
  const uint8 = new Uint8Array(buffer)
  const files = unzipSync(uint8)
  return new TextDecoder('utf-8').decode(files['word/document.xml'])
}
