import { IsOptional, IsDateString, validateSync } from 'class-validator';

class TestDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}

const dto = new TestDto();
dto.date = "";

const errors = validateSync(dto);
console.log(errors);
