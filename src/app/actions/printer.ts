"use server";

import { prisma } from "@/lib/prisma";
import { PrinterType, PrinterConnectionType } from "@prisma/client";

export async function getPrinters() {
  try {
    const printers = await prisma.printer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, printers };
  } catch (error: any) {
    console.error("Error getting printers:", error);
    return { success: false, error: "خطا در دریافت لیست پرینترها" };
  }
}

export async function createPrinter(data: { name: string; type: PrinterType; connectionType: PrinterConnectionType; ipAddress?: string; port?: number; path?: string; isActive?: boolean }) {
  try {
    const printer = await prisma.printer.create({
      data: {
        name: data.name,
        type: data.type,
        connectionType: data.connectionType,
        ipAddress: data.ipAddress,
        port: data.port,
        path: data.path,
        isActive: data.isActive ?? true
      }
    });
    return { success: true, printer };
  } catch (error: any) {
    console.error("Error creating printer:", error);
    return { success: false, error: "خطا در ساخت پرینتر" };
  }
}

export async function updatePrinter(id: string, data: Partial<{ name: string; type: PrinterType; connectionType: PrinterConnectionType; ipAddress: string; port: number; path: string; isActive: boolean }>) {
  try {
    const printer = await prisma.printer.update({
      where: { id },
      data
    });
    return { success: true, printer };
  } catch (error: any) {
    console.error("Error updating printer:", error);
    return { success: false, error: "خطا در بروزرسانی پرینتر" };
  }
}

export async function deletePrinter(id: string) {
  try {
    await prisma.printer.delete({
      where: { id }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting printer:", error);
    return { success: false, error: "خطا در حذف پرینتر" };
  }
}

export async function printReceipt(orderId: string, printerId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    const printer = await prisma.printer.findUnique({
      where: { id: printerId }
    });

    if (!order || !printer || !printer.isActive) {
      return { success: false, error: "سفارش یا پرینتر یافت نشد" };
    }

    // Generate simple receipt text
    let receiptText = `\n================================\n`;
    receiptText += `           Restaurant OS         \n`;
    receiptText += `================================\n`;
    receiptText += `شماره سفارش: ${order.orderNumber}\n`;
    receiptText += `تاریخ: ${order.createdAt.toLocaleString('fa-IR')}\n`;
    receiptText += `--------------------------------\n`;
    
    order.items.forEach(item => {
      receiptText += `${item.menuItem.title} - ${item.quantity}x - ${item.priceAtTime.toLocaleString()} T\n`;
    });
    
    receiptText += `--------------------------------\n`;
    receiptText += `مجموع: ${order.totalAmount.toLocaleString()} تومان\n`;
    receiptText += `================================\n\n\n\n\n`;

    if (printer.connectionType === 'USB' && printer.path) {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const { writeFile, unlink } = require('fs/promises');
      const { join } = require('path');
      const { tmpdir } = require('os');
      const { randomUUID } = require('crypto');
      const execAsync = promisify(exec);
      
      const tmpFilePath = join(tmpdir(), `receipt-${randomUUID()}.txt`);
      // \uFEFF is the UTF-8 BOM
      await writeFile(tmpFilePath, "\uFEFF" + receiptText, 'utf8');
      
      try {
        await execAsync(`powershell -command "Get-Content -Path '${tmpFilePath}' | Out-Printer -Name '${printer.path}'"`);
      } finally {
        // Clean up the temp file
        await unlink(tmpFilePath).catch(() => {});
      }
    } else if (printer.connectionType === 'NETWORK' && printer.ipAddress && printer.port) {
      const net = require('net');
      await new Promise<void>((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(5000);
        client.connect(printer.port!, printer.ipAddress!, () => {
          client.write(Buffer.from(receiptText, 'utf8')); // UTF-8 fallback
          client.end();
          resolve();
        });
        client.on('error', (err: any) => reject(err));
        client.on('timeout', () => {
          client.destroy();
          reject(new Error('Printer connection timeout'));
        });
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error printing receipt:", error);
    return { success: false, error: "خطا در چاپ فیش: " + error.message };
  }
}

