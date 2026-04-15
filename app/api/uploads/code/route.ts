import { NextResponse } from 'next/server'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import {
  MAX_ZIP_BYTES,
  UploadError,
  validateAndExtract,
} from '@/lib/audit/upload/extract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'multipart/form-data required' }, { status: 415 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requête multipart invalide' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Champ `file` manquant' }, { status: 400 })
  }

  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_ZIP_BYTES / 1024 / 1024} Mo)` },
      { status: 413 },
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const result = await validateAndExtract(buffer)
    return NextResponse.json(
      {
        uploadPath: result.rootPath,
        fileCount: result.fileCount,
        skippedCount: result.skippedCount,
        totalBytes: result.totalBytes,
        organizationId: ctx.organizationId,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[upload] extract error', error)
    return NextResponse.json({ error: 'Extraction échouée' }, { status: 500 })
  }
}
