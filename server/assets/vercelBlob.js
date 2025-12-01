import axios from 'axios'

const token = process.env.VERCEL_BLOB_TOKEN
const base = 'https://api.blob.vercel-storage.com/v2'

const hdr = () => ({ Authorization: `Bearer ${token}` })

export const blob = {
  list: async ({ prefix = '' } = {}) => {
    const r = await axios.get(`${base}/list`, { params: { prefix }, headers: hdr() })
    return r.data
  },
  upload: async ({ filename, contentType, dataBase64 }) => {
    const buf = Buffer.from(dataBase64, 'base64')
    const r = await axios.post(`${base}/upload`, buf, {
      headers: { ...hdr(), 'Content-Type': contentType, 'x-vercel-filename': filename }
    })
    return r.data
  },
  remove: async ({ url }) => {
    const r = await axios.delete(`${base}/remove`, { data: { url }, headers: hdr() })
    return r.data
  }
}
