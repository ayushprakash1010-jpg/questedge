import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MoveAssessmentDto } from './calibration.dto';

describe('MoveAssessmentDto validation', () => {
  it('accepts valid newRating within 1..5', async () => {
    const dto = plainToInstance(MoveAssessmentDto, {
      employeeId: '11111111-1111-4111-8111-111111111111',
      newRating: 4,
      reason: 'Aligned rating with peer benchmark group',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects missing or out-of-range newRating', async () => {
    const outOfRange = plainToInstance(MoveAssessmentDto, {
      employeeId: '11111111-1111-4111-8111-111111111111',
      newRating: 6,
      reason: 'Exceeds allowed scale maximum',
    });
    const missingRating = plainToInstance(MoveAssessmentDto, {
      employeeId: '11111111-1111-4111-8111-111111111111',
      reason: 'Rating omitted completely',
    });

    expect((await validate(outOfRange)).length).toBeGreaterThan(0);
    expect((await validate(missingRating)).length).toBeGreaterThan(0);
  });
});
