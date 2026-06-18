import { ApiProperty } from '@nestjs/swagger';

export class HealthServicesDto {
  @ApiProperty({
    description: 'Status of the database connection',
    example: 'up',
  })
  database: string;

  @ApiProperty({
    description: 'Status of the Redis connection',
    example: 'up',
  })
  redis: string;
}

export class HealthStatusDto {
  @ApiProperty({
    description: 'Overall application health status',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Current timestamp of the health check',
    example: '2026-05-18T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Status breakdown of individual backend services',
    type: HealthServicesDto,
  })
  services: HealthServicesDto;
}

export class HealthCheckSuccessResponseDto {
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
    description: 'The health check details',
    type: HealthStatusDto,
  })
  data: HealthStatusDto;
}
