import { Controller } from '@nestjs/common';
import { DriverService } from '../services/driver.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Drivers')
@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}
}
