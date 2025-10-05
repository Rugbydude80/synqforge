// Blob storage service stub
export const blobService = {
  upload: async (file: File, path: string) => {
    // TODO: Implement actual blob storage (e.g., AWS S3, Vercel Blob)
    return { url: `/uploads/${path}`, path }
  },
  delete: async (path: string) => {
    // TODO: Implement blob deletion
    return true
  },
}
