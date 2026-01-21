import { Controller, Get, Param, Query, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EntityRelationshipDemoService } from '@bll/services/demo/EntityRelationshipDemoService.service';

/**
 * Entity Relationship Demo Controller
 * 
 * Provides Swagger endpoints to test and demonstrate entity relationships.
 * Shows examples of:
 * - One-to-One relationships (user.leadProfile)
 * - One-to-Many relationships (lead.preferredPrograms - returns array)
 * - Many-to-One relationships (lead.country)
 * - Nested relationships and eager loading
 */
@Controller('demo/relationships')
@ApiTags('Demo - Entity Relationships')
export class EntityRelationshipDemoController implements OnModuleInit {
  private sampleIds: {
    userId?: string;
    leadId?: string;
    countryId?: string;
    prefCountryId?: string;
    uniId?: string;
  } = {};

  constructor(
    private readonly demoService: EntityRelationshipDemoService,
  ) {}

  async onModuleInit() {
    // Fetch sample IDs on module initialization for Swagger examples
    try {
      const ids = await this.demoService.getSampleIds();
      this.sampleIds = {
        userId: ids.userIds[0]?.id,
        leadId: ids.leadIds[0]?.id,
        countryId: ids.countryIds[0]?.id,
        prefCountryId: ids.prefCountryIds[0]?.id,
        uniId: ids.universityIds[0]?.id,
      };
    } catch (error) {
      // Ignore errors - will use placeholder UUIDs
    }
  }

  /**
   * Get sample IDs from database for testing
   * Use these IDs in other endpoints
   */
  @Get('sample-ids')
  @ApiOperation({
    summary: 'Get sample IDs from database',
    description: 'Returns available IDs from your database that can be used to test other endpoints. Use these IDs in the path parameters.',
  })
  @ApiResponse({ status: 200, description: 'Sample IDs from database' })
  async getSampleIds() {
    const ids = await this.demoService.getSampleIds();
    return {
      message: 'Sample IDs from database - use these in other endpoints',
      sampleIds: ids,
      quickStart: {
        userId: ids.userIds[0]?.id || 'No users found',
        leadId: ids.leadIds[0]?.id || 'No leads found',
        countryId: ids.countryIds[0]?.id || 'No countries found',
        prefCountryId: ids.prefCountryIds[0]?.id || 'No preferred countries found',
        uniId: ids.universityIds[0]?.id || 'No universities found',
      },
    };
  }

  /**
   * Demo: Get user with lead profile (One-to-One)
   * 
   * @example
   * GET /demo/relationships/user/:userId/lead-profile
   */
  @Get('user/:userId/lead-profile')
  @ApiOperation({
    summary: 'Get user with lead profile (One-to-One relationship)',
    description: 'Demonstrates accessing One-to-One: user.leadProfile returns single object or undefined. Get a userId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'User with lead profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserWithLeadProfile(@Param('userId') userId: string) {
    const result = await this.demoService.getUserWithLeadProfile(userId);
    if (!result) {
      return { error: 'User not found', userId };
    }
    return {
      message: 'One-to-One relationship: user.leadProfile',
      user: {
        id: result.id,
        email: result.email,
        phone: result.phone,
        leadProfile: result.leadProfile
          ? {
              id: result.leadProfile.id,
              fullName: result.leadProfile.fullName,
              city: result.leadProfile.city,
            }
          : null,
      },
    };
  }

  /**
   * Demo: Get lead profile with user (One-to-One reverse)
   */
  @Get('lead/:leadId/user')
  @ApiOperation({
    summary: 'Get lead profile with user (One-to-One reverse)',
    description: 'Demonstrates reverse One-to-One: lead.user always returns single object. Get a leadId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'leadId',
    description: 'Lead Profile ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Lead profile with user' })
  async getLeadProfileWithUser(@Param('leadId') leadId: string) {
    const result = await this.demoService.getLeadProfileWithUser(leadId);
    if (!result) {
      return { error: 'Lead profile not found', leadId };
    }
    return {
      message: 'One-to-One reverse: lead.user',
      lead: {
        id: result.id,
        fullName: result.fullName,
        user: {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
        },
      },
    };
  }

  /**
   * Demo: Get lead with preferred programs (One-to-Many - returns array)
   */
  @Get('lead/:leadId/preferred-programs')
  @ApiOperation({
    summary: 'Get lead with preferred programs (One-to-Many relationship)',
    description: 'Demonstrates One-to-Many: lead.preferredPrograms returns array (can be empty []). Get a leadId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'leadId',
    description: 'Lead Profile ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Lead with preferred programs array' })
  async getLeadWithPreferredPrograms(@Param('leadId') leadId: string) {
    const result = await this.demoService.getLeadWithPreferredPrograms(leadId);
    if (!result) {
      return { error: 'Lead profile not found', leadId };
    }
    return {
      message: 'One-to-Many relationship: lead.preferredPrograms (returns array)',
      lead: {
        id: result.id,
        fullName: result.fullName,
        preferredPrograms: result.preferredPrograms.map((p) => ({
          id: p.id,
          programme: {
            id: p.programme.id,
            name: p.programme.name,
          },
        })),
        programCount: result.preferredPrograms.length,
      },
    };
  }

  /**
   * Demo: Get lead with all relationships
   */
  @Get('lead/:leadId/all-relations')
  @ApiOperation({
    summary: 'Get lead with all One-to-Many relationships',
    description: 'Shows all One-to-Many relationships: preferredCountries, preferredPrograms, academicResults, englishTestResults (all return arrays). Get a leadId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'leadId',
    description: 'Lead Profile ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Lead with all relationships' })
  async getLeadWithAllRelations(@Param('leadId') leadId: string) {
    const result = await this.demoService.getLeadWithAllRelations(leadId);
    if (!result) {
      return { error: 'Lead profile not found', leadId };
    }
    return {
      message: 'All One-to-Many relationships (all return arrays)',
      lead: {
        id: result.id,
        fullName: result.fullName,
        preferredCountries: {
          count: result.preferredCountries.length,
          items: result.preferredCountries.map((c) => ({
            id: c.id,
            country: c.country.countryName,
          })),
        },
        preferredPrograms: {
          count: result.preferredPrograms.length,
          items: result.preferredPrograms.map((p) => ({
            id: p.id,
            programme: p.programme.name,
          })),
        },
        academicResults: {
          count: result.academicResults.length,
          items: result.academicResults.map((ar) => ({
            id: ar.id,
            gpa: ar.gpa,
            degree: ar.degree.degreeName,
          })),
        },
        englishTestResults: {
          count: result.englishTestResults.length,
          items: result.englishTestResults.map((etr) => ({
            id: etr.id,
            overallScore: etr.overallScore,
            test: etr.test.testName,
            sectionCount: etr.sectionResults.length,
          })),
        },
      },
    };
  }

  /**
   * Demo: Get preferred country with country (Many-to-One)
   */
  @Get('preferred-country/:prefCountryId/country')
  @ApiOperation({
    summary: 'Get preferred country with country (Many-to-One relationship)',
    description: 'Demonstrates Many-to-One: prefCountry.country returns single object. Get a prefCountryId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'prefCountryId',
    description: 'Preferred Country ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Preferred country with country' })
  async getPreferredCountryWithCountry(@Param('prefCountryId') prefCountryId: string) {
    const result = await this.demoService.getPreferredCountryWithCountry(prefCountryId);
    if (!result) {
      return { error: 'Preferred country not found', prefCountryId };
    }
    return {
      message: 'Many-to-One relationship: prefCountry.country',
      preferredCountry: {
        id: result.id,
        country: {
          id: result.country.id,
          countryName: result.country.countryName,
        },
        lead: {
          id: result.lead.id,
          fullName: result.lead.fullName,
        },
      },
    };
  }

  /**
   * Demo: Get university with location (Multiple Many-to-One)
   */
  @Get('university/:uniId/location')
  @ApiOperation({
    summary: 'Get university with location (Multiple Many-to-One relationships)',
    description: 'Demonstrates multiple Many-to-One: university.country, university.state, university.city. Get a uniId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'uniId',
    description: 'University ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'University with location' })
  async getUniversityWithLocation(@Param('uniId') uniId: string) {
    const result = await this.demoService.getUniversityWithLocation(uniId);
    if (!result) {
      return { error: 'University not found', uniId };
    }
    return {
      message: 'Multiple Many-to-One relationships',
      university: {
        id: result.id,
        uniName: result.uniName,
        country: result.country.countryName,
        state: result.state?.stateName || null,
        city: result.city?.cityName || null,
      },
    };
  }

  /**
   * Demo: Get user with nested relationships
   */
  @Get('user/:userId/nested')
  @ApiOperation({
    summary: 'Get user with deeply nested relationships',
    description: 'Demonstrates nested navigation: user.leadProfile.preferredPrograms[0].programme.name. Get a userId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'User with nested relationships' })
  async getUserWithNestedRelations(@Param('userId') userId: string) {
    const result = await this.demoService.getUserWithNestedRelations(userId);
    if (!result) {
      return { error: 'User not found', userId };
    }
    return {
      message: 'Deeply nested relationships',
      user: {
        id: result.id,
        email: result.email,
        hasLeadProfile: !!result.leadProfile,
        leadProfile: result.leadProfile
          ? {
              id: result.leadProfile.id,
              fullName: result.leadProfile.fullName,
              preferredProgramsCount: result.leadProfile.preferredPrograms.length,
              preferredCountriesCount: result.leadProfile.preferredCountries.length,
              academicResultsCount: result.leadProfile.academicResults.length,
              englishTestResultsCount: result.leadProfile.englishTestResults.length,
            }
          : null,
      },
    };
  }

  /**
   * Demo: Query leads by preferred country
   */
  @Get('leads/by-country/:countryId')
  @ApiOperation({
    summary: 'Query leads by preferred country (relationship condition)',
    description: 'Demonstrates querying with relationship conditions. Get a countryId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'countryId',
    description: 'Country ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Leads who prefer this country' })
  async getLeadsByPreferredCountry(@Param('countryId') countryId: string) {
    const results = await this.demoService.getLeadsByPreferredCountry(countryId);
    return {
      message: 'Querying with relationship conditions',
      countryId,
      count: results.length,
      leads: results.map((pref) => ({
        leadId: pref.lead.id,
        leadName: pref.lead.fullName,
        country: pref.country.countryName,
      })),
    };
  }

  /**
   * Demo: Query universities by country
   */
  @Get('universities/by-country/:countryId')
  @ApiOperation({
    summary: 'Query universities by country (nested relationship condition)',
    description: 'Get a countryId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'countryId',
    description: 'Country ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Universities in this country' })
  async getUniversitiesByCountry(@Param('countryId') countryId: string) {
    const results = await this.demoService.getUniversitiesByCountry(countryId);
    return {
      message: 'Querying with nested relationship conditions',
      countryId,
      count: results.length,
      universities: results.map((uni) => ({
        id: uni.id,
        uniName: uni.uniName,
        country: uni.country.countryName,
        state: uni.state?.stateName || null,
        city: uni.city?.cityName || null,
      })),
    };
  }

  /**
   * Demo: Complete example showing all relationship types
   */
  @Get('user/:userId/complete')
  @ApiOperation({
    summary: 'Complete example: All relationship types',
    description: 'Demonstrates One-to-One, One-to-Many (array), and Many-to-One in one response. Get a userId from /demo/relationships/sample-ids',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID (UUID) - Get from /demo/relationships/sample-ids',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Complete relationship demonstration' })
  async demonstrateAllRelationships(@Param('userId') userId: string) {
    const result = await this.demoService.demonstrateAllRelationships(userId);
    if (!result) {
      return { error: 'User not found', userId };
    }
    return result;
  }
}
