import { IsIn, IsOptional, IsString } from 'class-validator';

/** Shared query params for the restaurant/courier list endpoints. */
export class ListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  // active = only active, passive = only passive, all/undefined = everything
  @IsOptional()
  @IsIn(['active', 'passive', 'all'])
  status?: 'active' | 'passive' | 'all';
}
