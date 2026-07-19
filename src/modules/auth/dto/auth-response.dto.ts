import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, CompanyStatus } from '@prisma/client';

export class UserInfoDto {
  @ApiProperty({ example: '1234567890' })
  id: string;

  @ApiProperty({ example: 'alex.jones@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Alex Jones', nullable: true })
  name: string | null;

  @ApiProperty({ example: ['USER'], enum: Role, isArray: true })
  roles: Role[];

  @ApiPropertyOptional({ example: 'uuid-string', nullable: true })
  categoryId: string | null;

  @ApiProperty({ example: '2026-05-18T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-18T12:00:00.000Z' })
  updatedAt: Date;
}

export class CompanyInfoDto {
  @ApiProperty({ example: '1234567890' })
  companyId: string;

  @ApiProperty({ example: '+1234567890' })
  phoneNumber: string;

  @ApiProperty({ example: 'John Doe' })
  ownerName: string;

  @ApiProperty({ example: 'Acme Corp' })
  companyName: string;

  @ApiProperty({ example: 'company@example.com' })
  email: string;

  @ApiProperty({ example: 'Dhaka' })
  district: string;

  @ApiProperty({ example: 'Mirpur' })
  upozela: string;

  @ApiProperty({ example: '123 Main St' })
  address: string;

  @ApiProperty({ example: 'APPROVED', enum: CompanyStatus })
  status: CompanyStatus;

  @ApiProperty({ example: ['doc.pdf'] })
  companyDocument: string[];

  @ApiProperty({ example: 'uuid-string' })
  categoryId: string;

  @ApiProperty({ example: '2026-05-18T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-18T12:00:00.000Z' })
  updatedAt: Date;
}

export class PartyInfoDto {
  @ApiProperty({ example: '1234567890' })
  partyId: string;

  @ApiProperty({ example: 'Party Name' })
  partyName: string;

  @ApiProperty({ example: 'Acme Business' })
  businessName: string;

  @ApiProperty({ example: '+1234567890' })
  phoneNumber: string;

  @ApiProperty({ example: 'party@example.com' })
  email: string;

  @ApiProperty({ example: '123 Main St' })
  address: string;

  @ApiProperty({ example: 'Dhaka' })
  district: string;

  @ApiProperty({ example: 'Mirpur' })
  upozela: string;

  @ApiProperty({ example: 'Mirpur Bazaar' })
  bazzarArea: string;

  @ApiProperty({ example: 'Party description' })
  description: string;

  @ApiProperty({ example: 100.0 })
  openingDue: number;

  @ApiProperty({ example: 1000.0 })
  creditLimit: number;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: ['party-doc-1.jpg'] })
  partyDocument: string[];

  @ApiProperty({ example: '2026-05-18T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-18T12:00:00.000Z' })
  updatedAt: Date;
}

export class TokenResponseDto {
  @ApiProperty({
    description:
      'JSON Web Token (JWT) used for authenticating subsequent API requests. Typically expires in 15 minutes.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJhbGV4LmpvbmVzQGV4YW1wbGUuY29tIiwicm9sZXMiOlsiVVNFUiJdLCJpYXQiOjE3NDc1Nzg0MDAsImV4cCI6MTc0NzU3OTMwMH0.xxxx',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'JSON Web Token (JWT) used to acquire a new access token when the current one expires. Typically expires in 7 days.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJhbGV4LmpvbmVzQGV4YW1wbGUuY29tIiwicm9sZXMiOlsiVVNFUiJdLCJpYXQiOjE3NDc1Nzg0MDAsImV4cCI6MTc0ODE4MzIwMH0.yyyy',
  })
  refreshToken: string;

  @ApiPropertyOptional({
    description: 'Detailed user information if authenticated as a standard user/admin',
    type: UserInfoDto,
  })
  user?: UserInfoDto;

  @ApiPropertyOptional({
    description: 'Detailed company information if authenticated as a vendor/company',
    type: CompanyInfoDto,
  })
  company?: CompanyInfoDto;

  @ApiPropertyOptional({
    description: 'Detailed party information if authenticated as an independent party',
    type: PartyInfoDto,
  })
  party?: PartyInfoDto;
}

export class AuthSuccessResponseDto {
  @ApiProperty({
    description: 'Indicates if the API request was processed successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code of the response',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description:
      'The authentication payload containing access and refresh tokens',
    type: TokenResponseDto,
  })
  data: TokenResponseDto;
}

export class AuthCreatedSuccessResponseDto {
  @ApiProperty({
    description: 'Indicates if the API request was processed successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code of the response',
    example: 201,
  })
  statusCode: number;

  @ApiProperty({
    description:
      'The authentication payload containing access and refresh tokens',
    type: TokenResponseDto,
  })
  data: TokenResponseDto;
}

export class LogoutSuccessResponseDto {
  @ApiProperty({
    description: 'Indicates if the API request was processed successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code of the response',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'No data returned on logout',
    type: Object,
    nullable: true,
    example: null,
  })
  data: any;
}

export class BadRequestErrorResponseDto {
  @ApiProperty({
    description: 'Indicates that the request failed',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code for Bad Request',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of the error occurrence',
    example: '2026-05-18T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path where the error occurred',
    example: '/api/v1/auth/signup',
  })
  path: string;

  @ApiProperty({
    description: 'Detailed validation error messages or generic error message',
    example: [
      'email must be an email',
      'password must be longer than or equal to 6 characters',
    ],
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiProperty({
    description: 'HTTP error category',
    example: 'Bad Request',
  })
  error: string;
}

export class UnauthorizedErrorResponseDto {
  @ApiProperty({
    description: 'Indicates that the request failed',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code for Unauthorized access',
    example: 401,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of the error occurrence',
    example: '2026-05-18T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path where the error occurred',
    example: '/api/v1/auth/signin',
  })
  path: string;

  @ApiProperty({
    description: 'Error message description',
    example: 'Access Denied',
  })
  message: string;

  @ApiProperty({
    description: 'HTTP error category',
    example: 'Unauthorized',
  })
  error: string;
}

export class ForbiddenErrorResponseDto {
  @ApiProperty({
    description: 'Indicates that the request failed',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code for Forbidden access',
    example: 403,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of the error occurrence',
    example: '2026-05-18T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path where the error occurred',
    example: '/api/v1/auth/refresh',
  })
  path: string;

  @ApiProperty({
    description: 'Error message description',
    example: 'Access Denied',
  })
  message: string;

  @ApiProperty({
    description: 'HTTP error category',
    example: 'Forbidden',
  })
  error: string;
}
