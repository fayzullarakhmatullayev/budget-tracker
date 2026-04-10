import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

class AdminUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform-wide usage statistics' })
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'All users with their usage stats' })
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query, query.search);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change a user role' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    // Prevent admin from demoting themselves
    if (id === adminId) {
      throw new BadRequestException('Cannot change your own role');
    }
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user and all their data' })
  deleteUser(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    if (id === adminId) {
      throw new BadRequestException('Cannot delete your own account from admin panel');
    }
    return this.adminService.deleteUser(id);
  }
}
