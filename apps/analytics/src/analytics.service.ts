import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { SupabaseService } from "@app/shared";

@Injectable()
export class AnalyticsService {
  constructor(private supabase: SupabaseService) {}

  async getDashboard() {
    const client = this.supabase.getAdminClient();

    const { data: orders } = await client
      .from("orders")
      .select("total, status, created_at")
      .is("deleted_at", null);

    const allOrders = orders || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthOrders = allOrders.filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const previousMonthOrders = allOrders.filter((o) => {
      const d = new Date(o.created_at);
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const currentRevenue = currentMonthOrders.reduce(
      (s, o) => s + (o.total || 0),
      0,
    );
    const previousRevenue = previousMonthOrders.reduce(
      (s, o) => s + (o.total || 0),
      0,
    );

    const { count: totalCustomers } = await client
      .from("customers")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const { count: totalProducts } = await client
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const { data: lowStock } = await client
      .from("products")
      .select("id, name, stock")
      .lt("stock", 10)
      .is("deleted_at", null)
      .order("stock", { ascending: true });

    const { data: topProducts } = await client
      .from("order_items")
      .select("product_id, product_name, quantity, price")
      .is("deleted_at", null);

    const productMap = new Map<
      string,
      { name: string; sales: number; revenue: number }
    >();
    (topProducts || []).forEach((item) => {
      const existing = productMap.get(item.product_id) || {
        name: item.product_name,
        sales: 0,
        revenue: 0,
      };
      existing.sales += item.quantity;
      existing.revenue += item.price * item.quantity;
      productMap.set(item.product_id, existing);
    });

    const topProductsList = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const monthNames = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const salesByMonth: { month: string; sales: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthOrders = allOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      salesByMonth.push({
        month: monthNames[month],
        sales: monthOrders.reduce((s, o) => s + (o.total || 0), 0),
      });
    }

    const statusCounts = {
      pending: allOrders.filter((o) => o.status === "pending").length,
      processing: allOrders.filter((o) => o.status === "processing").length,
      shipped: allOrders.filter((o) => o.status === "shipped").length,
      delivered: allOrders.filter((o) => o.status === "delivered").length,
      cancelled: allOrders.filter((o) => o.status === "cancelled").length,
    };

    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
    const ordersChange =
      previousMonthOrders.length > 0
        ? ((currentMonthOrders.length - previousMonthOrders.length) /
            previousMonthOrders.length) *
          100
        : 0;

    return {
      revenue: {
        current: Math.round(currentRevenue * 100) / 100,
        previous: Math.round(previousRevenue * 100) / 100,
        change: Math.round(revenueChange * 10) / 10,
      },
      orders: {
        current: currentMonthOrders.length,
        previous: previousMonthOrders.length,
        change: Math.round(ordersChange * 10) / 10,
        by_status: statusCounts,
      },
      customers: { total: totalCustomers || 0 },
      products: { total: totalProducts || 0, low_stock: lowStock || [] },
      sales_by_month: salesByMonth,
      top_products: topProductsList,
    };
  }
}
