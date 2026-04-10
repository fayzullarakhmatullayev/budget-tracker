import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const dateFrom = new Date(targetYear, targetMonth - 1, 1);
    const dateTo = new Date(targetYear, targetMonth, 1);

    const [expensesAgg, budgetsAgg, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: dateFrom, lt: dateTo } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.budget.aggregate({
        where: { userId, month: targetMonth, year: targetYear },
        _sum: { monthlyLimit: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId, date: { gte: dateFrom, lt: dateTo } },
        _sum: { amount: true },
      }),
    ]);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: byCategory.map((b) => b.categoryId) } },
      select: { id: true, name: true, icon: true, color: true },
    });

    const categoryBreakdown = byCategory.map((b) => ({
      ...categories.find((c) => c.id === b.categoryId),
      totalSpent: Number(b._sum.amount ?? 0),
    }));

    const monthlyTrend = await this.getMonthlyTrend(userId, 6);

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month: targetMonth, year: targetYear },
      include: { category: true },
    });

    const budgetVsActual = await Promise.all(
      budgets.map(async (b) => {
        const agg = await this.prisma.expense.aggregate({
          where: { budgetId: b.id, userId },
          _sum: { amount: true },
        });
        const totalSpent = Number(agg._sum.amount ?? 0);
        return {
          id: b.id,
          name: b.name,
          category: b.category,
          monthlyLimit: Number(b.monthlyLimit),
          totalSpent,
          remaining: Number(b.monthlyLimit) - totalSpent,
        };
      }),
    );

    return {
      period: { month: targetMonth, year: targetYear },
      totals: {
        spent: Number(expensesAgg._sum.amount ?? 0),
        budgeted: Number(budgetsAgg._sum.monthlyLimit ?? 0),
        remaining:
          Number(budgetsAgg._sum.monthlyLimit ?? 0) -
          Number(expensesAgg._sum.amount ?? 0),
        expenseCount: expensesAgg._count,
        budgetCount: budgetsAgg._count,
      },
      categoryBreakdown,
      budgetVsActual,
      monthlyTrend,
    };
  }

  private async getMonthlyTrend(userId: string, months: number) {
    const results: { month: number; year: number; total: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const agg = await this.prisma.expense.aggregate({
        where: { userId, date: { gte: from, lt: to } },
        _sum: { amount: true },
      });

      results.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        total: Number(agg._sum.amount ?? 0),
      });
    }

    return results;
  }
}
