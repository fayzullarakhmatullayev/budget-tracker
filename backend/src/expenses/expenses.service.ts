import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpenseDto } from './dto/filter-expense.dto';

const EXPENSE_INCLUDE = {
  category: true,
  budget: { select: { id: true, name: true, monthlyLimit: true } },
};

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, userId: string) {
    if (dto.budgetId) {
      await this.assertBudgetOwnership(dto.budgetId, userId);
    }
    return this.prisma.expense.create({
      data: { ...dto, date: new Date(dto.date), userId },
      include: EXPENSE_INCLUDE,
    });
  }

  async findAll(userId: string, filter: FilterExpenseDto) {
    const where: Record<string, unknown> = { userId };

    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.budgetId) where.budgetId = filter.budgetId;

    if (filter.month || filter.year) {
      const year = filter.year ?? new Date().getFullYear();
      const month = filter.month;
      where.date = month
        ? { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
        : { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip: filter.skip,
        take: filter.limit,
        include: EXPENSE_INCLUDE,
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page: filter.page, limit: filter.limit };
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: EXPENSE_INCLUDE,
    });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.userId !== userId) throw new ForbiddenException();
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, userId: string) {
    const expense = await this.findOne(id, userId);
    if (dto.budgetId && dto.budgetId !== expense.budgetId) {
      await this.assertBudgetOwnership(dto.budgetId, userId);
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.expense.update({
      where: { id },
      data,
      include: EXPENSE_INCLUDE,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted' };
  }

  private async assertBudgetOwnership(budgetId: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      select: { userId: true },
    });
    if (!budget) throw new BadRequestException('Budget not found');
    if (budget.userId !== userId)
      throw new ForbiddenException('Budget does not belong to you');
  }
}
