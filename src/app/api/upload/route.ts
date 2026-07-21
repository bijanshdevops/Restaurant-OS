import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'هیچ فایلی ارسال نشده است' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename using original extension
    const originalName = file.name;
    const extension = originalName.substring(originalName.lastIndexOf('.')) || '.jpg';
    const uniqueName = `${crypto.randomUUID()}${extension}`;
    
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const path = join(uploadDir, uniqueName);

    await writeFile(path, buffer);
    
    // Return relative URL for Next.js Image or img tag
    const url = `/uploads/${uniqueName}`;
    
    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error('Error uploading file:', err);
    return NextResponse.json({ success: false, error: 'خطا در ذخیره‌سازی فایل' }, { status: 500 });
  }
}
