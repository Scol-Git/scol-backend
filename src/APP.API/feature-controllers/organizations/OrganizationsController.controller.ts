import { Controller, Get } from '@nestjs/common';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import './swagger.doc';

@Controller('organizations')
export class OrganizationsController {
  @Get()
  @AddSwaggerDoc('organizations', 'getOrganizations')
  getOrganizations() {
    return { success: true };
  }
}

