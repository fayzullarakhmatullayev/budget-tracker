import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { FilterBudgetDto } from './dto/filter-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBudgetDto, userId: string) {
    const existing = await this.prisma.budget.findUnique({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId: dto.categoryId,
          month: dto.month,
          year: dto.year,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Budget for this category and period already exists',
      );
    }

    const budget = await this.prisma.budget.create({
      data: { ...dto, userId },
      include: { category: true },
    });
    return { ...budget, totalSpent: 0, remaining: Number(budget.monthlyLimit) };
  }

  async findAll(userId: string, filter: FilterBudgetDto) {
    const where: Record<string, unknown> = { userId };
    if (filter.month) where.month = filter.month;
    if (filter.year) where.year = filter.year;

    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        skip: filter.skip,
        take: filter.limit,
        include: { category: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.budget.count({ where }),
    ]);

    const enriched = await Promise.all(
      budgets.map(async (b) => {
        const agg = await this.prisma.expense.aggregate({
          where: { budgetId: b.id, userId },
          _sum: { amount: true },
        });
        const totalSpent = Number(agg._sum.amount ?? 0);
        return { ...b, totalSpent, remaining: Number(b.monthlyLimit) - totalSpent };
      }),
    );

    return { data: enriched, total, page: filter.page, limit: filter.limit };
  }

  async findOne(id: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    if (budget.userId !== userId) throw new ForbiddenException();

    const agg = await this.prisma.expense.aggregate({
      where: { budgetId: id, userId },
      _sum: { amount: true },
    });
    const totalSpent = Number(agg._sum.amount ?? 0);
    return { ...budget, totalSpent, remaining: Number(budget.monthlyLimit) - totalSpent };
  }

  async update(id: string, dto: UpdateBudgetDto, userId: string) {
    await this.findOne(id, userId);
    const budget = await this.prisma.budget.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
    const agg = await this.prisma.expense.aggregate({
      where: { budgetId: id, userId },
      _sum: { amount: true },
    });
    const totalSpent = Number(agg._sum.amount ?? 0);
    return { ...budget, totalSpent, remaining: Number(budget.monthlyLimit) - totalSpent };
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.budget.delete({ where: { id } });
    return { message: 'Budget deleted' };
  }
}
