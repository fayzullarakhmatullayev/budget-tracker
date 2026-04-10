import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpenseDto } from './dto/filter-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Add an expense' })
  create(@Body() dto: CreateExpenseDto, @CurrentUser('id') userId: string) {
    return this.expensesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List own expenses with filters' })
  findAll(@CurrentUser('id') userId: string, @Query() filter: FilterExpenseDto) {
    return this.expensesService.findAll(userId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.expensesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.expensesService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.expensesService.remove(id, userId);
  }
}
