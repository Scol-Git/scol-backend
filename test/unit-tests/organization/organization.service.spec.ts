import { DataSource } from 'typeorm';
import { TestModuleBuilder } from '../../setup/builders/TestModuleBuilder';
import { OrganizationService } from '@bll/services/OrganizationService.service';
import { Organization } from '@entity/entities/Organization.entity';
import {
  ILogger as ILoggerToken,
  IMapper as IMapperToken,
  IOrganizationService,
} from '@shared/tokens/injection.tokens';
import { CreateOrganizationRequestDto } from '@shared/dtos/organizations/CreateOrganizationRequestDto.dto';
import { UpdateOrganizationRequestDto } from '@shared/dtos/organizations/UpdateOrganizationRequestDto.dto';
import { SearchOrganizationsRequestDto } from '@shared/dtos/organizations/SearchOrganizationsRequestDto.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';
import {
  createMockRepository,
  createMockLogger,
  createMockMapper,
  createMockDataSource,
  createMockQueryBuilder,
} from '../../setup/mocks';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockDataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(async () => {
    // Create mocks
    mockRepo = createMockRepository();
    // Use Map or string-based approach for entity-to-repository mapping
    const repositoryMap = new Map();
    repositoryMap.set(Organization, mockRepo);
    mockDataSource = createMockDataSource(repositoryMap as any);
    const mockLogger = createMockLogger();
    const mockMapper = createMockMapper();

    // Build testing module using builder pattern
    const builder = new TestModuleBuilder()
      // Service under test
      .addClassProvider(IOrganizationService, OrganizationService)
      .addClassProvider(OrganizationService, OrganizationService)
      // Dependencies
      .addProvider(DataSource, mockDataSource)
      .addProvider(ILoggerToken, mockLogger)
      .addProvider(IMapperToken, mockMapper);

    const moduleRef = await builder.compile();
    service = moduleRef.get(OrganizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return organization when found', async () => {
      // Arrange
      const id = 'test-id';
      const organization = {
        id,
        name: 'Test Org',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.findOne.mockResolvedValue(organization);

      // Act
      const result = await service.getById(id);

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).toBeDefined();
      expect(result.id).toBe(id);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const id = 'non-existent-id';
      mockRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getById(id)).rejects.toThrow(NotFoundException);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('create', () => {
    it('should create and return new organization', async () => {
      // Arrange
      const dto: CreateOrganizationRequestDto = { name: 'New Org' };
      const savedOrganization = {
        id: 'new-id',
        name: 'New Org',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.findOne.mockResolvedValue(null); // No existing org
      mockRepo.create.mockReturnValue(savedOrganization);
      mockRepo.save.mockResolvedValue(savedOrganization);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockRepo.create).toHaveBeenCalledWith({ name: dto.name });
      expect(mockRepo.save).toHaveBeenCalledWith(savedOrganization);
      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
    });

    it('should throw ConflictException when organization name already exists', async () => {
      // Arrange
      const dto: CreateOrganizationRequestDto = { name: 'Existing Org' };
      const existingOrg = { id: 'existing-id', name: 'Existing Org' };
      mockRepo.findOne.mockResolvedValue(existingOrg);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return organization', async () => {
      // Arrange
      const id = 'test-id';
      const dto: UpdateOrganizationRequestDto = { name: 'Updated Org' };
      const existingOrg = {
        id,
        name: 'Old Org',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedOrg = { ...existingOrg, name: dto.name };
      mockRepo.findOne
        .mockResolvedValueOnce(existingOrg) // Find existing
        .mockResolvedValueOnce(null); // Check name uniqueness
      mockRepo.save.mockResolvedValue(updatedOrg);

      // Act
      const result = await service.update(id, dto);

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.name).toBe(dto.name);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const id = 'non-existent-id';
      const dto: UpdateOrganizationRequestDto = { name: 'Updated Org' };
      mockRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(id, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name conflicts', async () => {
      // Arrange
      const id = 'test-id';
      const dto: UpdateOrganizationRequestDto = { name: 'Conflicting Name' };
      const existingOrg = { id, name: 'Old Name' };
      const conflictingOrg = { id: 'other-id', name: 'Conflicting Name' };
      mockRepo.findOne
        .mockResolvedValueOnce(existingOrg) // Find existing
        .mockResolvedValueOnce(conflictingOrg); // Name conflict

      // Act & Assert
      await expect(service.update(id, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete organization when found', async () => {
      // Arrange
      const id = 'test-id';
      const organization = { id, name: 'Test Org' };
      mockRepo.findOne.mockResolvedValue(organization);
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      // Act
      await service.delete(id);

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(mockRepo.delete).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      const id = 'non-existent-id';
      mockRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(id)).rejects.toThrow(NotFoundException);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return paginated list of organizations', async () => {
      // Arrange
      const searchDto: SearchOrganizationsRequestDto = {
        pageNumber: 1,
        pageSize: 10,
        sortColumns: 'name',
        sortDirections: 'asc',
        filters: [],
      };
      const organizations = [
        { id: '1', name: 'Org 1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Org 2', createdAt: new Date(), updatedAt: new Date() },
      ];
      const totalCount = 2;

      // Setup query builder mocks - createQueryBuilder is called twice
      // First call returns data, second call returns count
      const mockQueryBuilder1 = createMockQueryBuilder();
      const mockQueryBuilder2 = createMockQueryBuilder();
      mockQueryBuilder1.getMany.mockResolvedValue(organizations);
      mockQueryBuilder2.getCount.mockResolvedValue(totalCount);
      
      let callIndex = 0;
      mockDataSource.createQueryBuilder.mockImplementation(() => {
        const qb = callIndex === 0 ? mockQueryBuilder1 : mockQueryBuilder2;
        callIndex++;
        return qb;
      });

      // Act
      const result = await service.list(searchDto);

      // Assert
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledWith(
        Organization,
        'organization',
      );
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(totalCount);
      expect(result.pageNumber).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });
});

