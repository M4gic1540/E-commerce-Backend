/**
 * receipt.service.ts
 *
 * Genera boletas en PDF usando pdfkit y las sube al bucket "receipts"
 * en el Storage de Supabase.
 *
 * Flujo:
 *   1. buildPdf(order)         → Buffer con el PDF
 *   2. ensureBucket()          → crea el bucket si no existe (privado)
 *   3. upload → createSignedUrl → guarda receipt_url en orders
 */

import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService } from "@app/shared";
import PDFDocument = require("pdfkit");

// ── helper ───────────────────────────────────────────────────────────────────
function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);
  private readonly BUCKET = "receipts";

  constructor(private supabase: SupabaseService) {}

  // ── bucket ─────────────────────────────────────────────────────────────────
  private async ensureBucket() {
    const client = this.supabase.getAdminClient();
    const { data: buckets } = await client.storage.listBuckets();
    if (!buckets?.some((b) => b.name === this.BUCKET)) {
      const { error } = await client.storage.createBucket(this.BUCKET, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ["application/pdf"],
      });
      if (error) {
        this.logger.error(`Error creando bucket receipts: ${error.message}`);
      } else {
        this.logger.log(`Bucket "${this.BUCKET}" creado`);
      }
    }
  }

  // ── generación del PDF ─────────────────────────────────────────────────────
  private buildPdf(order: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const {
        order_number,
        created_at,
        customers: customer,
        order_items: items = [],
        total,
        shipping_method,
        payment_method,
        shipping_address,
      } = order;

      const fecha = new Date(created_at).toLocaleString("es-CL", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // ── Encabezado ──────────────────────────────────────────────────────────
      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor("#1a1a2e")
        .text("SHOPHUB.SA", { align: "center" });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#555")
        .text("Francisco Bilbao 881, Santiago, Chile", { align: "center" })
        .text("t.gonzalezb24@gmail.com  ·  +56 9 4038 4760", { align: "center" });

      doc.moveDown(0.6);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#1a1a2e")
        .lineWidth(1.5)
        .stroke();
      doc.moveDown(0.6);

      // ── Título boleta ───────────────────────────────────────────────────────
      doc
        .fontSize(15)
        .font("Helvetica-Bold")
        .fillColor("#1a1a2e")
        .text("BOLETA ELECTRÓNICA", { align: "center" });
      doc.moveDown(0.8);

      // ── Dos columnas: datos de orden + cliente ──────────────────────────────
      const L = 50;
      const R = 310;
      const labelW = 90;
      const y0 = doc.y;

      const row = (
        col: number,
        offsetY: number,
        label: string,
        value: string,
      ) => {
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#333")
          .text(label, col, y0 + offsetY, { width: labelW });
        doc
          .font("Helvetica")
          .fillColor("#000")
          .text(value || "-", col + labelW, y0 + offsetY, { width: 145 });
      };

      row(L, 0, "Nº Pedido:", order_number);
      row(L, 14, "Fecha:", fecha);
      row(L, 28, "Método pago:", payment_method ?? "card");
      row(L, 42, "Envío:", shipping_method ?? "standard");

      if (customer) {
        row(R, 0, "Cliente:", customer.name ?? "-");
        row(R, 14, "Email:", customer.email ?? "-");
      }

      if (shipping_address?.address) {
        row(R, 28, "Dirección:", shipping_address.address);
        const city = [shipping_address.city, shipping_address.region]
          .filter(Boolean)
          .join(", ");
        if (city) row(R, 42, "Ciudad:", city);
      }

      doc.y = y0 + 65;
      doc.moveDown(0.8);

      // ── Tabla de ítems ──────────────────────────────────────────────────────
      const tTop = doc.y;
      const C = { desc: 50, qty: 330, unit: 395, sub: 470 };
      const hH = 20;
      const rH = 18;

      // Cabecera
      doc.rect(50, tTop, 495, hH).fill("#1a1a2e");
      doc
        .fillColor("#fff")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Descripción", C.desc + 5, tTop + 5, { width: 270 })
        .text("Cant.", C.qty, tTop + 5, { width: 55, align: "center" })
        .text("P. Unit.", C.unit, tTop + 5, { width: 65, align: "right" })
        .text("Subtotal", C.sub, tTop + 5, { width: 65, align: "right" });

      let ry = tTop + hH;
      (items as any[]).forEach((item, i) => {
        const bg = i % 2 === 0 ? "#f5f6fa" : "#ffffff";
        const subtotal = (item.price ?? 0) * (item.quantity ?? 1);
        doc.rect(50, ry, 495, rH).fill(bg);
        doc
          .fillColor("#000")
          .font("Helvetica")
          .fontSize(8.5)
          .text(item.product_name ?? "-", C.desc + 5, ry + 4, {
            width: 270,
            ellipsis: true,
          })
          .text(String(item.quantity ?? 1), C.qty, ry + 4, {
            width: 55,
            align: "center",
          })
          .text(formatCLP(item.price ?? 0), C.unit, ry + 4, {
            width: 65,
            align: "right",
          })
          .text(formatCLP(subtotal), C.sub, ry + 4, {
            width: 65,
            align: "right",
          });
        ry += rH;
      });

      // Borde externo tabla
      doc
        .rect(50, tTop, 495, ry - tTop)
        .strokeColor("#ccc")
        .lineWidth(0.5)
        .stroke();

      // ── Totales ─────────────────────────────────────────────────────────────
      doc.y = ry + 10;
      doc.moveDown(0.3);

      const totalX = 370;
      const totalW = 175;

      doc
        .rect(totalX, doc.y - 2, totalW, 26)
        .fill("#1a1a2e");
      doc
        .fillColor("#fff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("TOTAL:", totalX + 8, doc.y + 2, { width: 100 });
      doc
        .fontSize(13)
        .text(formatCLP(total ?? 0), totalX + 8, doc.y - 13, {
          width: totalW - 16,
          align: "right",
        });

      // ── Footer ───────────────────────────────────────────────────────────────
      doc.moveDown(3);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#ccc")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.4);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#888")
        .text(
          "Documento tributario electrónico · Este documento es válido sin firma.",
          { align: "center" },
        )
        .text(
          `Generado el ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago", hour12: false })} · Gracias por su compra.`,
          { align: "center" },
        );

      doc.end();
    });
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /** Genera el PDF, lo sube al bucket y actualiza receipt_url en la orden. */
  async generateAndUpload(order: any): Promise<string> {
    await this.ensureBucket();
    const client = this.supabase.getAdminClient();

    const pdfBuffer = await this.buildPdf(order);
    const filePath = `${order.id}.pdf`;

    const { data, error } = await client.storage
      .from(this.BUCKET)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      throw new RpcException({
        statusCode: 500,
        message: `Error subiendo boleta: ${error.message}`,
      });
    }

    // URL firmada válida 1 año
    const { data: signed, error: signErr } = await client.storage
      .from(this.BUCKET)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    if (signErr || !signed) {
      throw new RpcException({
        statusCode: 500,
        message: `Error generando URL de boleta: ${signErr?.message}`,
      });
    }

    await client
      .from("orders")
      .update({ receipt_url: signed.signedUrl })
      .eq("id", order.id);

    this.logger.log(
      `Boleta generada para orden ${order.order_number} → ${data.path}`,
    );
    return signed.signedUrl;
  }

  /** Genera una URL firmada fresca (1 h) para una boleta ya subida. */
  async getFreshReceiptUrl(orderId: string): Promise<string> {
    const client = this.supabase.getAdminClient();

    const { data, error } = await client.storage
      .from(this.BUCKET)
      .createSignedUrl(`${orderId}.pdf`, 60 * 60); // 1 hora

    if (error || !data) {
      throw new RpcException({
        statusCode: 404,
        message: "Boleta no encontrada. Puede que aún no haya sido generada.",
      });
    }

    return data.signedUrl;
  }
}
