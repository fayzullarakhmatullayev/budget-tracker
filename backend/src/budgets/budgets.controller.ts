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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { FilterBudgetDto } from './dto/filter-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget' })
  create(@Body() dto: CreateBudgetDto, @CurrentUser('id') userId: string) {
    return this.budgetsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List own budgets' })
  findAll(@CurrentUser('id') userId: string, @Query() filter: FilterBudgetDto) {
    return this.budgetsService.findAll(userId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget with spending totals' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.budgetsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.budgetsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.budgetsService.remove(id, userId);
  }
}
