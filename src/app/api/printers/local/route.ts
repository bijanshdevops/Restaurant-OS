import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Run PowerShell command to get installed printers
    const { stdout, stderr } = await execAsync('powershell -command "Get-Printer | Select-Object -ExpandProperty Name"');
    
    if (stderr) {
      console.error('Error fetching printers:', stderr);
      return NextResponse.json({ success: false, error: 'Failed to fetch local printers.' }, { status: 500 });
    }

    // Split by newline and remove empty strings
    const printers = stdout
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return NextResponse.json({ success: true, printers });
  } catch (error) {
    console.error('Error in local printers API:', error);
    return NextResponse.json({ success: false, error: 'Failed to execute printer command.' }, { status: 500 });
  }
}
