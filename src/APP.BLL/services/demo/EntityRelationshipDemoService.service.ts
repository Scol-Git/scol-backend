import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

// Import entities
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { LeadPreferredPrograms } from '@entity/entities/LeadPreferredPrograms.entity';
import { LeadPreferredCountries } from '@entity/entities/LeadPreferredCountries.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { LeadEnglishTestSectionResults } from '@entity/entities/LeadEnglishTestSectionResults.entity';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysEnglishTestSections } from '@entity/entities/SysEnglishTestSections.entity';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { UniCourses } from '@entity/entities/UniCourses.entity';

/**
 * Entity Relationship Demo Service
 * 
 * Demonstrates how to access entity relationships and navigation properties.
 * Shows examples of:
 * - One-to-One relationships (user.leadProfile)
 * - One-to-Many relationships (lead.preferredPrograms - returns array)
 * - Many-to-One relationships (lead.country)
 * - Nested relationships and eager loading
 */
@Injectable()
export class EntityRelationshipDemoService {
  constructor(
    @InjectDataSource() private readonly _dbContext: DataSource,
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {}

  // ======================================================
  // ONE-TO-ONE RELATIONSHIP DEMO
  // ======================================================

  /**
   * Demo: Access One-to-One relationship
   * User -> LeadProfile (One-to-One)
   * 
   * @example
   * const user = await this.getUserWithLeadProfile(userId);
   * const leadProfile = user.leadProfile; // One-to-One: returns single object or undefined
   * console.log(leadProfile?.fullName);
   */
  async getUserWithLeadProfile(userId: string): Promise<SysUsers | null> {
    this._logger.LogInfo('Demo: Getting user with lead profile (One-to-One)');

    const userRepo = this._dbContext.getRepository(SysUsers);

    // Load user with leadProfile relationship
    const user = await userRepo.findOne({
      where: { id: userId },
      relations: {
        leadProfile: true, // Include One-to-One relationship
      },
    });

    if (!user) {
      return null;
    }

    // Access One-to-One navigation property
    // user.leadProfile is either a SysLeadProfiles object or undefined
    if (user.leadProfile) {
      this._logger.LogInfo('User has lead profile', {
        userId: user.id,
        leadProfileId: user.leadProfile.id,
        fullName: user.leadProfile.fullName,
      });
    } else {
      this._logger.LogInfo('User does not have a lead profile', { userId: user.id });
    }

    return user;
  }

  /**
   * Demo: Access reverse One-to-One relationship
   * LeadProfile -> User (One-to-One, reverse side)
   * 
   * @example
   * const lead = await this.getLeadProfileWithUser(leadId);
   * const user = lead.user; // One-to-One: returns single object
   * console.log(user.email);
   */
  async getLeadProfileWithUser(leadId: string): Promise<SysLeadProfiles | null> {
    this._logger.LogInfo('Demo: Getting lead profile with user (One-to-One reverse)');

    const leadRepo = this._dbContext.getRepository(SysLeadProfiles);

    const lead = await leadRepo.findOne({
      where: { id: leadId },
      relations: {
        user: true, // Include reverse One-to-One relationship
      },
    });

    if (!lead) {
      return null;
    }

    // Access One-to-One navigation property (always exists on reverse side)
    this._logger.LogInfo('Lead profile user info', {
      leadId: lead.id,
      userId: lead.user.id,
      userEmail: lead.user.email,
      userPhone: lead.user.phone,
    });

    return lead;
  }

  // ======================================================
  // ONE-TO-MANY RELATIONSHIP DEMO (Returns Array)
  // ======================================================

  /**
   * Demo: Access One-to-Many relationship (returns array)
   * Lead -> PreferredPrograms (One-to-Many)
   * 
   * @example
   * const lead = await this.getLeadWithPreferredPrograms(leadId);
   * const programs = lead.preferredPrograms; // One-to-Many: returns array (can be empty [])
   * console.log(programs.length); // Could be 0, 1, or more
   * programs.forEach(p => console.log(p.programme.name));
   */
  async getLeadWithPreferredPrograms(leadId: string): Promise<SysLeadProfiles | null> {
    this._logger.LogInfo('Demo: Getting lead with preferred programs (One-to-Many)');

    const leadRepo = this._dbContext.getRepository(SysLeadProfiles);

    const lead = await leadRepo.findOne({
      where: { id: leadId },
      relations: {
        preferredPrograms: {
          programme: true, // Nested: include the programme entity
        },
      },
    });

    if (!lead) {
      return null;
    }

    // Access One-to-Many navigation property (always returns array)
    const programs = lead.preferredPrograms; // Array: LeadPreferredPrograms[]
    
    this._logger.LogInfo('Lead preferred programs', {
      leadId: lead.id,
      programCount: programs.length, // Could be 0 or more
      programs: programs.map((p) => ({
        id: p.id,
        programmeName: p.programme.name, // Access nested relationship
      })),
    });

    // Check if array is empty
    if (programs.length === 0) {
      this._logger.LogInfo('Lead has no preferred programs');
    }

    return lead;
  }

  /**
   * Demo: Access multiple One-to-Many relationships
   * Lead -> PreferredCountries, PreferredPrograms, AcademicResults, etc.
   * 
   * @example
   * const lead = await this.getLeadWithAllRelations(leadId);
   * const countries = lead.preferredCountries; // Array
   * const programs = lead.preferredPrograms; // Array
   * const academicResults = lead.academicResults; // Array
   */
  async getLeadWithAllRelations(leadId: string): Promise<SysLeadProfiles | null> {
    this._logger.LogInfo('Demo: Getting lead with all One-to-Many relationships');

    const leadRepo = this._dbContext.getRepository(SysLeadProfiles);

    const lead = await leadRepo.findOne({
      where: { id: leadId },
      relations: {
        // All One-to-Many relationships return arrays
        preferredCountries: {
          country: true, // Nested: include country entity
        },
        preferredPrograms: {
          programme: true, // Nested: include programme entity
        },
        academicResults: {
          degree: true, // Nested: include degree entity
        },
        englishTestResults: {
          test: true, // Nested: include test entity
          sectionResults: {
            section: true, // Deeply nested: section results -> sections
          },
        },
        testResults: {
          test: true, // Legacy test results
        },
      },
    });

    if (!lead) {
      return null;
    }

    // All One-to-Many properties return arrays
    const countries = lead.preferredCountries || []; // Array (can be empty)
    const programs = lead.preferredPrograms || []; // Array (can be empty)
    const academicResults = lead.academicResults || []; // Array (can be empty)
    const englishTestResults = lead.englishTestResults || []; // Array (can be empty)

    this._logger.LogInfo('Lead with all relationships', {
      leadId: lead.id,
      preferredCountriesCount: countries.length,
      preferredProgramsCount: programs.length,
      academicResultsCount: academicResults.length,
      englishTestResultsCount: englishTestResults.length,
    });

    return lead;
  }

  // ======================================================
  // MANY-TO-ONE RELATIONSHIP DEMO
  // ======================================================

  /**
   * Demo: Access Many-to-One relationship
   * LeadPreferredCountry -> Country (Many-to-One)
   * 
   * @example
   * const prefCountry = await this.getPreferredCountryWithCountry(prefCountryId);
   * const country = prefCountry.country; // Many-to-One: returns single object
   * console.log(country.countryName);
   */
  async getPreferredCountryWithCountry(
    prefCountryId: string,
  ): Promise<LeadPreferredCountries | null> {
    this._logger.LogInfo('Demo: Getting preferred country with country (Many-to-One)');

    const prefCountryRepo = this._dbContext.getRepository(LeadPreferredCountries);

    const prefCountry = await prefCountryRepo.findOne({
      where: { id: prefCountryId },
      relations: {
        country: true, // Include Many-to-One relationship
        lead: true, // Also include the lead (Many-to-One reverse)
      },
    });

    if (!prefCountry) {
      return null;
    }

    // Access Many-to-One navigation property (always returns single object)
    const country = prefCountry.country; // Single object: SysCountries
    const lead = prefCountry.lead; // Single object: SysLeadProfiles

    this._logger.LogInfo('Preferred country with relationships', {
      prefCountryId: prefCountry.id,
      countryName: country.countryName,
      leadName: lead.fullName,
    });

    return prefCountry;
  }

  /**
   * Demo: Access nested Many-to-One relationships
   * University -> Country, State, City (all Many-to-One)
   * 
   * @example
   * const university = await this.getUniversityWithLocation(uniId);
   * const country = university.country; // Many-to-One
   * const state = university.state; // Many-to-One (optional)
   * const city = university.city; // Many-to-One (optional)
   */
  async getUniversityWithLocation(uniId: string): Promise<SysUniversities | null> {
    this._logger.LogInfo('Demo: Getting university with location (Multiple Many-to-One)');

    const uniRepo = this._dbContext.getRepository(SysUniversities);

    const university = await uniRepo.findOne({
      where: { id: uniId },
      relations: {
        country: true, // Many-to-One: always exists
        state: true, // Many-to-One: optional (can be null)
        city: true, // Many-to-One: optional (can be null)
      },
    });

    if (!university) {
      return null;
    }

    // Access Many-to-One navigation properties
    const country = university.country; // Always exists: SysCountries
    const state = university.state; // Optional: SysStates | undefined
    const city = university.city; // Optional: SysCities | undefined

    this._logger.LogInfo('University location', {
      universityId: university.id,
      universityName: university.uniName,
      country: country.countryName,
      state: state?.stateName || 'N/A',
      city: city?.cityName || 'N/A',
    });

    return university;
  }

  // ======================================================
  // COMPLEX NESTED RELATIONSHIPS DEMO
  // ======================================================

  /**
   * Demo: Deeply nested relationships
   * User -> LeadProfile -> PreferredPrograms -> Programme
   * 
   * @example
   * const user = await this.getUserWithNestedRelations(userId);
   * const programs = user.leadProfile?.preferredPrograms || [];
   * programs.forEach(p => console.log(p.programme.name));
   */
  async getUserWithNestedRelations(userId: string): Promise<SysUsers | null> {
    this._logger.LogInfo('Demo: Getting user with deeply nested relationships');

    const userRepo = this._dbContext.getRepository(SysUsers);

    const user = await userRepo.findOne({
      where: { id: userId },
      relations: {
        leadProfile: {
          // Nested One-to-One -> One-to-Many
          preferredPrograms: {
            programme: true, // Nested Many-to-One
          },
          preferredCountries: {
            country: true, // Nested Many-to-One
          },
          academicResults: {
            degree: true, // Nested Many-to-One
          },
          englishTestResults: {
            test: true, // Nested Many-to-One
            sectionResults: {
              section: true, // Deeply nested: One-to-Many -> Many-to-One
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Navigate through relationships
    const leadProfile = user.leadProfile; // One-to-One: can be undefined

    if (leadProfile) {
      // Access nested One-to-Many (returns array)
      const programs = leadProfile.preferredPrograms || [];
      const countries = leadProfile.preferredCountries || [];
      const academicResults = leadProfile.academicResults || [];
      const englishTests = leadProfile.englishTestResults || [];

      this._logger.LogInfo('User nested relationships', {
        userId: user.id,
        leadProfileId: leadProfile.id,
        programsCount: programs.length,
        countriesCount: countries.length,
        academicResultsCount: academicResults.length,
        englishTestsCount: englishTests.length,
      });

      // Access deeply nested: programme name from preferred program
      if (programs.length > 0) {
        const firstProgram = programs[0];
        const programmeName = firstProgram.programme.name; // Deeply nested access
        this._logger.LogInfo('First preferred programme', { programmeName });
      }

      // Access deeply nested: section results from English test
      if (englishTests.length > 0) {
        const firstTest = englishTests[0];
        const sectionResults = firstTest.sectionResults || []; // Nested One-to-Many
        this._logger.LogInfo('English test section results', {
          testName: firstTest.test.testName,
          sectionCount: sectionResults.length,
        });
      }
    }

    return user;
  }

  /**
   * Demo: Query with conditions on related entities
   * Find leads who prefer a specific country
   * 
   * @example
   * const leads = await this.getLeadsByPreferredCountry(countryId);
   * // leads is an array of LeadPreferredCountries
   */
  async getLeadsByPreferredCountry(countryId: string): Promise<LeadPreferredCountries[]> {
    this._logger.LogInfo('Demo: Querying with relationship conditions');

    const prefCountryRepo = this._dbContext.getRepository(LeadPreferredCountries);

    // Query with condition on Many-to-One relationship
    const preferredCountries = await prefCountryRepo.find({
      where: {
        country: { id: countryId }, // Filter by related entity
      },
      relations: {
        lead: true, // Include the lead
        country: true, // Include the country
      },
    });

    this._logger.LogInfo('Leads by preferred country', {
      countryId,
      count: preferredCountries.length,
    });

    return preferredCountries;
  }

  /**
   * Demo: Query with nested relationship conditions
   * Find universities in a specific country
   * 
   * @example
   * const universities = await this.getUniversitiesByCountry(countryId);
   */
  async getUniversitiesByCountry(countryId: string): Promise<SysUniversities[]> {
    this._logger.LogInfo('Demo: Querying with nested relationship conditions');

    const uniRepo = this._dbContext.getRepository(SysUniversities);

    const universities = await uniRepo.find({
      where: {
        country: { id: countryId }, // Filter by Many-to-One relationship
      },
      relations: {
        country: true,
        state: true,
        city: true,
      },
    });

    this._logger.LogInfo('Universities by country', {
      countryId,
      count: universities.length,
    });

    return universities;
  }

  /**
   * Demo: Using QueryBuilder for complex relationship queries
   * Find leads with specific programme preference
   * 
   * @example
   * const leads = await this.getLeadsByProgramme(programmeId);
   */
  async getLeadsByProgramme(programmeId: string): Promise<SysLeadProfiles[]> {
    this._logger.LogInfo('Demo: Using QueryBuilder with relationships');

    const leadRepo = this._dbContext.getRepository(SysLeadProfiles);

    // Using QueryBuilder for more complex queries
    const leads = await leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.preferredPrograms', 'prefProgram')
      .leftJoinAndSelect('prefProgram.programme', 'programme')
      .leftJoinAndSelect('lead.user', 'user')
      .where('programme.id = :programmeId', { programmeId })
      .getMany();

    this._logger.LogInfo('Leads by programme', {
      programmeId,
      count: leads.length,
    });

    return leads;
  }

  // ======================================================
  // RELATIONSHIP MANIPULATION DEMO
  // ======================================================

  /**
   * Demo: Adding to One-to-Many collection
   * Add a preferred programme to a lead
   * 
   * @example
   * await this.addPreferredProgrammeToLead(leadId, programmeId);
   * // After this, lead.preferredPrograms will include the new programme
   */
  async addPreferredProgrammeToLead(
    leadId: string,
    programmeId: string,
  ): Promise<void> {
    this._logger.LogInfo('Demo: Adding to One-to-Many collection');

    const leadRepo = this._dbContext.getRepository(SysLeadProfiles);
    const programmeRepo = this._dbContext.getRepository(SysProgrammes);

    // Load lead with existing preferred programs
    const lead = await leadRepo.findOne({
      where: { id: leadId },
      relations: { preferredPrograms: { programme: true } },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Load the programme
    const programme = await programmeRepo.findOne({ where: { id: programmeId } });
    if (!programme) {
      throw new Error('Programme not found');
    }

    // Check if already exists
    const exists = lead.preferredPrograms.some(
      (p) => p.programme.id === programmeId,
    );

    if (exists) {
      this._logger.LogInfo('Programme already preferred by lead');
      return;
    }

    // Create new preferred programme entry
    const prefProgramRepo = this._dbContext.getRepository(LeadPreferredPrograms);
    const newPrefProgram = prefProgramRepo.create({
      leadId: lead.id,
      programmeId: programme.id,
      lead: lead, // Set navigation property
      programme: programme, // Set navigation property
    });

    await prefProgramRepo.save(newPrefProgram);

    this._logger.LogInfo('Added preferred programme to lead', {
      leadId,
      programmeId,
      programmeName: programme.name,
    });
  }

  /**
   * Demo: Removing from One-to-Many collection
   * Remove a preferred programme from a lead
   * 
   * @example
   * await this.removePreferredProgrammeFromLead(leadId, programmeId);
   */
  async removePreferredProgrammeFromLead(
    leadId: string,
    programmeId: string,
  ): Promise<void> {
    this._logger.LogInfo('Demo: Removing from One-to-Many collection');

    const prefProgramRepo = this._dbContext.getRepository(LeadPreferredPrograms);

    // Find the preferred programme entry
    const prefProgram = await prefProgramRepo.findOne({
      where: {
        leadId: leadId,
        programmeId: programmeId,
      },
    });

    if (!prefProgram) {
      this._logger.LogInfo('Preferred programme not found');
      return;
    }

    // Delete the relationship entry
    await prefProgramRepo.remove(prefProgram);

    this._logger.LogInfo('Removed preferred programme from lead', {
      leadId,
      programmeId,
    });
  }

  // ======================================================
  // SUMMARY DEMO - All Relationship Types
  // ======================================================

  /**
   * Demo: Complete example showing all relationship types
   * Demonstrates One-to-One, One-to-Many (array), and Many-to-One
   */
  async demonstrateAllRelationships(userId: string): Promise<any> {
    this._logger.LogInfo('Demo: Demonstrating all relationship types');

    const userRepo = this._dbContext.getRepository(SysUsers);

    const user = await userRepo.findOne({
      where: { id: userId },
      relations: {
        // One-to-One
        leadProfile: {
          // One-to-Many (returns array)
          preferredPrograms: {
            programme: true, // Many-to-One
          },
          preferredCountries: {
            country: true, // Many-to-One
          },
          academicResults: {
            degree: true, // Many-to-One
          },
          englishTestResults: {
            test: true, // Many-to-One
            sectionResults: {
              section: true, // Many-to-One (deeply nested)
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const result = {
      // One-to-One relationship
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        // One-to-One: returns single object or undefined
        leadProfile: user.leadProfile
          ? {
              id: user.leadProfile.id,
              fullName: user.leadProfile.fullName,
              // One-to-Many: returns array (can be empty [])
              preferredPrograms: user.leadProfile.preferredPrograms.map((p) => ({
                id: p.id,
                // Many-to-One: returns single object
                programme: {
                  id: p.programme.id,
                  name: p.programme.name,
                },
              })),
              // One-to-Many: returns array
              preferredCountries: user.leadProfile.preferredCountries.map((c) => ({
                id: c.id,
                // Many-to-One: returns single object
                country: {
                  id: c.country.id,
                  countryName: c.country.countryName,
                },
              })),
              // One-to-Many: returns array
              academicResults: user.leadProfile.academicResults.map((ar) => ({
                id: ar.id,
                gpa: ar.gpa,
                // Many-to-One: returns single object
                degree: {
                  id: ar.degree.id,
                  degreeName: ar.degree.degreeName,
                },
              })),
              // One-to-Many: returns array
              englishTestResults: user.leadProfile.englishTestResults.map((etr) => ({
                id: etr.id,
                overallScore: etr.overallScore,
                // Many-to-One: returns single object
                test: {
                  id: etr.test.id,
                  testName: etr.test.testName,
                },
                // One-to-Many: returns array (nested)
                sectionResults: etr.sectionResults.map((sr) => ({
                  id: sr.id,
                  sectionScore: sr.sectionScore,
                  // Many-to-One: returns single object
                  section: {
                    id: sr.section.id,
                    sectionName: sr.section.sectionName,
                  },
                })),
              })),
            }
          : null,
      },
    };

    this._logger.LogInfo('All relationships demonstrated', {
      hasLeadProfile: !!user.leadProfile,
      preferredProgramsCount: user.leadProfile?.preferredPrograms.length || 0,
      preferredCountriesCount: user.leadProfile?.preferredCountries.length || 0,
      academicResultsCount: user.leadProfile?.academicResults.length || 0,
      englishTestResultsCount: user.leadProfile?.englishTestResults.length || 0,
    });

    return result;
  }

  // ======================================================
  // SAMPLE IDS FOR SWAGGER TESTING
  // ======================================================

  /**
   * Get sample IDs from database for Swagger testing
   * Returns available IDs that can be used to test the demo endpoints
   */
  async getSampleIds(): Promise<{
    userIds: Array<{ id: string; email?: string; phone: string }>;
    leadIds: Array<{ id: string; fullName: string; userId: string }>;
    countryIds: Array<{ id: string; countryName: string }>;
    programmeIds: Array<{ id: string; name: string }>;
    prefCountryIds: Array<{ id: string; leadId: string; countryId: string }>;
    prefProgramIds: Array<{ id: string; leadId: string; programmeId: string }>;
    universityIds: Array<{ id: string; uniName: string; countryId: string }>;
  }> {
    this._logger.LogInfo('Demo: Fetching sample IDs from database');

    const userRepo = this._dbContext.getRepository(SysUsers);
    const leadRepo = this._dbContext.getRepository(SysLeadProfiles);
    const countryRepo = this._dbContext.getRepository(SysCountries);
    const programmeRepo = this._dbContext.getRepository(SysProgrammes);
    const prefCountryRepo = this._dbContext.getRepository(LeadPreferredCountries);
    const prefProgramRepo = this._dbContext.getRepository(LeadPreferredPrograms);
    const universityRepo = this._dbContext.getRepository(SysUniversities);

    const [users, leads, countries, programmes, prefCountries, prefPrograms, universities] =
      await Promise.all([
        userRepo.find({ take: 5, select: ['id', 'email', 'phone'] }),
        leadRepo.find({ take: 5, select: ['id', 'fullName', 'userId'] }),
        countryRepo.find({ take: 5, select: ['id', 'countryName'] }),
        programmeRepo.find({ take: 5, select: ['id', 'name'] }),
        prefCountryRepo.find({
          take: 5,
          select: ['id', 'leadId', 'countryId'],
        }),
        prefProgramRepo.find({
          take: 5,
          select: ['id', 'leadId', 'programmeId'],
        }),
        universityRepo.find({ take: 5, select: ['id', 'uniName', 'sysCountryId'] }),
      ]);

    return {
      userIds: users.map((u) => ({ id: u.id, email: u.email, phone: u.phone })),
      leadIds: leads.map((l) => ({ id: l.id, fullName: l.fullName, userId: l.userId })),
      countryIds: countries.map((c) => ({ id: c.id, countryName: c.countryName })),
      programmeIds: programmes.map((p) => ({ id: p.id, name: p.name })),
      prefCountryIds: prefCountries.map((pc) => ({
        id: pc.id,
        leadId: pc.leadId,
        countryId: pc.countryId,
      })),
      prefProgramIds: prefPrograms.map((pp) => ({
        id: pp.id,
        leadId: pp.leadId,
        programmeId: pp.programmeId,
      })),
      universityIds: universities.map((u) => ({
        id: u.id,
        uniName: u.uniName,
        countryId: u.sysCountryId,
      })),
    };
  }
}
