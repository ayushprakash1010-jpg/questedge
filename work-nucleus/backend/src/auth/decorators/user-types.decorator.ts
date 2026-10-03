import { SetMetadata } from '@nestjs/common';
import { UserType } from '@prisma/client';

export const USER_TYPES_KEY = 'user_types';
export const UserTypes = (...userTypes: UserType[]) => SetMetadata(USER_TYPES_KEY, userTypes);
