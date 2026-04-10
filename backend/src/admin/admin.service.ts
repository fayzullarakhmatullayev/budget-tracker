import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      totalBudgets,
      totalExpenses,
      spentThisMonth,
      spentLastMonth,
      budgetedThisMonth,
      newUsersThisMonth,
      activeUsersThisMonth,
      topCategories,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.budget.count(),
      this.prisma.expense.count(),
      this.prisma.expense.aggregate({
        where: { date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { date: { gte: lastMonthStart, lt: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.budget.aggregate({
        where: {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        _sum: { monthlyLimit: true },
        _count: true,
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: monthStart } },
      }),
      // Users who logged an expense this month
      this.prisma.expense
        .findMany({
          where: { date: { gte: monthStart, lt: monthEnd } },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((r) => r.length),
      // Top 5 categories by expense count this month
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    ]);

    const categoryIds = topCategories.map((c) => c.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    const thisMonthSpent = Number(spentThisMonth._sum.amount ?? 0);
    const lastMonthSpent = Number(spentLastMonth._sum.amount ?? 0);
    const spendingChange =
      lastMonthSpent > 0
        ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100
        : null;

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        activeThisMonth: activeUsersThisMonth,
      },
      budgets: {
        total: totalBudgets,
        activeThisMonth: budgetedThisMonth._count,
        totalLimitThisMonth: Number(budgetedThisMonth._sum.monthlyLimit ?? 0),
      },
      expenses: {
        total: totalExpenses,
        spentThisMonth: thisMonthSpent,
        spentLastMonth: lastMonthSpent,
        spendingChange: spendingChange !== null ? Math.round(spendingChange * 10) / 10 : null,
      },
      topCategories: topCategories.map((c) => ({
        ...categories.find((cat) => cat.id === c.categoryId),
        totalSpent: Number(c._sum.amount ?? 0),
        expenseCount: c._count,
      })),
    };
  }

  async getUsers(pagination: PaginationDto, search?: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              budgets: true,
              expenses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Enrich each user with spending stats
    const enriched = await Promise.all(
      users.map(async (u) => {
        const [allTimeSpent, thisMonthSpent, thisMonthBudgeted, lastExpense] =
          await Promise.all([
            this.prisma.expense.aggregate({
              where: { userId: u.id },
              _sum: { amount: true },
            }),
            this.prisma.expense.aggregate({
              where: { userId: u.id, date: { gte: monthStart, lt: monthEnd } },
              _sum: { amount: true },
            }),
            this.prisma.budget.aggregate({
              where: {
                userId: u.id,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
              },
              _sum: { monthlyLimit: true },
            }),
            this.prisma.expense.findFirst({
              where: { userId: u.id },
              orderBy: { date: 'desc' },
              select: { date: true },
            }),
          ]);

        return {
          ...u,
          stats: {
            budgetCount: u._count.budgets,
            expenseCount: u._count.expenses,
            allTimeSpent: Number(allTimeSpent._sum.amount ?? 0),
            thisMonthSpent: Number(thisMonthSpent._sum.amount ?? 0),
            thisMonthBudgeted: Number(thisMonthBudgeted._sum.monthlyLimit ?? 0),
            lastActiveAt: lastExpense?.date ?? null,
          },
        };
      }),
    );

    return { data: enriched, total, page: pagination.page, limit: pagination.limit };
  }

  async updateUserRole(id: string, role: 'ADMIN' | 'USER') {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }
}
